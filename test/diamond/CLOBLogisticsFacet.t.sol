// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { CLOBLogisticsFacet } from 'contracts/diamond/facets/CLOBLogisticsFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { OrderStatus } from 'contracts/diamond/libraries/OrderStatus.sol';
import { ECDSA } from '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
import { MessageHashUtils } from '@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol';

/**
 * @title CLOBLogisticsFacetTest
 * @notice Tests for CLOBLogisticsFacet (driver and delivery management)
 */
contract CLOBLogisticsFacetTest is DiamondTestBase {
    using ECDSA for bytes32;

    CLOBLogisticsFacet public logistics;

    bytes32 internal constant PICKUP_TYPEHASH = keccak256(
        "PickupConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)"
    );
    bytes32 internal constant DELIVERY_TYPEHASH = keccak256(
        "DeliveryConfirmation(bytes32 orderId,address driver,string lat,string lng,uint256 nonce,uint256 deadline)"
    );

    // Events (matching actual contract)
    event DriverRegistered(address indexed driver);
    event DriverAvailabilityUpdated(address indexed driver, bool isAvailable);
    event DriverLocationUpdated(address indexed driver, string lat, string lng);
    event DeliveryAccepted(
        bytes32 indexed orderId,
        address indexed driver,
        uint256 estimatedPickupTime,
        uint256 estimatedDeliveryTime
    );
    event PickupConfirmed(
        bytes32 indexed orderId,
        address indexed driver,
        string lat,
        string lng
    );
    event DeliveryConfirmed(
        bytes32 indexed orderId,
        address indexed driver,
        string lat,
        string lng
    );
    event LogisticsOrderSettled(bytes32 indexed orderId, uint256 driverPayout);
    event LogisticsOrderDisputed(bytes32 indexed orderId, string reason);
    event LogisticsOrderCancelled(bytes32 indexed orderId, string reason);

    function setUp() public override {
        super.setUp();
        logistics = CLOBLogisticsFacet(address(diamond));
    }

    function _domainSeparator() internal view returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256("AuraCLOB"),
                keccak256("1"),
                block.chainid,
                address(diamond)
            )
        );
    }

    function _signPickup(
        bytes32 orderId,
        address driver,
        string memory lat,
        string memory lng,
        uint256 deadline,
        uint256 signerPk
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            PICKUP_TYPEHASH,
            orderId,
            driver,
            keccak256(bytes(lat)),
            keccak256(bytes(lng)),
            uint256(0),
            deadline
        ));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _signDelivery(
        bytes32 orderId,
        address driver,
        string memory lat,
        string memory lng,
        uint256 deadline,
        uint256 signerPk
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            DELIVERY_TYPEHASH,
            orderId,
            driver,
            keccak256(bytes(lat)),
            keccak256(bytes(lng)),
            uint256(0),
            deadline
        ));
        bytes32 digest = MessageHashUtils.toTypedDataHash(_domainSeparator(), structHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        return abi.encodePacked(r, s, v);
    }

    // ============================================================================
    // DRIVER REGISTRATION TESTS
    // ============================================================================

    function test_registerDriver() public {
        vm.prank(driver1);
        vm.expectEmit(true, false, false, false);
        emit DriverRegistered(driver1);
        logistics.registerDriver();

        DiamondStorage.DriverInfo memory info = logistics.getDriverInfo(driver1);
        assertEq(info.driver, driver1, 'Driver address should match');
        assertTrue(info.isActive, 'Driver should be active');
        assertTrue(info.isAvailable, 'Driver should be available by default');
    }

    function test_registerDriver_multipleDrivers() public {
        vm.prank(driver1);
        logistics.registerDriver();

        vm.prank(driver2);
        logistics.registerDriver();

        DiamondStorage.DriverInfo memory info1 = logistics.getDriverInfo(driver1);
        DiamondStorage.DriverInfo memory info2 = logistics.getDriverInfo(driver2);

        assertTrue(info1.isActive);
        assertTrue(info2.isActive);
        assertTrue(info1.driver != info2.driver);
    }

    // ============================================================================
    // DRIVER AVAILABILITY TESTS
    // ============================================================================

    function test_setDriverAvailability() public {
        vm.prank(driver1);
        logistics.registerDriver();

        // Driver starts available, toggle to unavailable
        vm.prank(driver1);
        vm.expectEmit(true, false, false, true);
        emit DriverAvailabilityUpdated(driver1, false);
        logistics.setDriverAvailability(false);

        DiamondStorage.DriverInfo memory info = logistics.getDriverInfo(driver1);
        assertFalse(info.isAvailable, 'Driver should be unavailable');
    }

    function test_setDriverAvailability_toggle() public {
        vm.startPrank(driver1);
        logistics.registerDriver();

        // Toggle off
        logistics.setDriverAvailability(false);
        assertFalse(logistics.getDriverInfo(driver1).isAvailable);

        // Toggle on
        logistics.setDriverAvailability(true);
        assertTrue(logistics.getDriverInfo(driver1).isAvailable);
        vm.stopPrank();
    }

    function test_setDriverAvailability_revertNotRegistered() public {
        vm.prank(user1); // Not registered as driver
        vm.expectRevert();
        logistics.setDriverAvailability(true);
    }

    // ============================================================================
    // DRIVER LOCATION TESTS
    // ============================================================================

    function test_updateDriverLocation() public {
        vm.prank(driver1);
        logistics.registerDriver();

        DiamondStorage.Location memory location = _createLocation('40.7128', '-74.0060');

        vm.prank(driver1);
        logistics.updateDriverLocation(location);

        DiamondStorage.DriverInfo memory info = logistics.getDriverInfo(driver1);
        assertEq(info.currentLocation.lat, '40.7128');
        assertEq(info.currentLocation.lng, '-74.0060');
    }

    // ============================================================================
    // LOGISTICS ORDER CREATION TESTS
    // ============================================================================

    function test_createLogisticsOrder() public {
        _registerDriver(driver1);

        DiamondStorage.Location memory pickup = _createLocation('40.7128', '-74.0060');
        DiamondStorage.Location memory delivery = _createLocation('34.0522', '-118.2437');

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 200 ether);

        bytes32 orderId = logistics.createLogisticsOrder(
            bytes32(0),
            user1,
            user2,
            nodeOperator,
            address(quoteToken),
            1,
            10,
            100 ether,
            pickup,
            delivery
        );
        vm.stopPrank();

        assertTrue(orderId != bytes32(0), 'Order ID should be set');

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.buyer, user1, 'Buyer should match');
        assertEq(order.seller, user2, 'Seller should match');
        assertEq(order.quantity, 10, 'Quantity should match');
        assertEq(order.driverBounty, 2 ether, 'Bounty should be 2% of price');
        assertEq(order.status, OrderStatus.LOGISTICS_CREATED, 'Status should be Created');
    }

    // ============================================================================
    // DELIVERY FLOW TESTS
    // ============================================================================

    function test_acceptDelivery() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.assignedDriver, driver1, 'Driver should be assigned');
        assertEq(order.status, 1, 'Status should be Accepted (1)');
    }

    function test_acceptDelivery_revertNotRegistered() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(user1); // Not a registered driver
        vm.expectRevert();
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);
    }

    function test_confirmPickup() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        DiamondStorage.Location memory location = _createLocation('40.7128', '-74.0060');

        vm.prank(owner);
        logistics.confirmPickup(orderId, block.timestamp + 1 hours, '', location);

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.status, OrderStatus.LOGISTICS_IN_TRANSIT, 'Status should be InTransit');
    }

    function test_confirmPickup_revertNotAssignedDriver() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        DiamondStorage.Location memory location = _createLocation('40.7128', '-74.0060');

        vm.prank(driver2);
        vm.expectRevert();
        logistics.confirmPickup(orderId, block.timestamp + 1 hours, '', location);
    }

    function test_confirmDelivery() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        DiamondStorage.Location memory pickupLoc = _createLocation('40.7128', '-74.0060');
        vm.prank(owner);
        logistics.confirmPickup(orderId, block.timestamp + 1 hours, '', pickupLoc);

        DiamondStorage.Location memory deliveryLoc = _createLocation('34.0522', '-118.2437');
        vm.prank(owner);
        logistics.confirmDelivery(orderId, block.timestamp + 1 hours, '', deliveryLoc);

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.status, OrderStatus.LOGISTICS_DELIVERED, 'Status should be Delivered');
    }

    function test_settleLogisticsOrder() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);
        vm.prank(owner);
        logistics.confirmPickup(orderId, block.timestamp + 1 hours, '', _createLocation('40', '-74'));
        vm.prank(owner);
        logistics.confirmDelivery(orderId, block.timestamp + 1 hours, '', _createLocation('34', '-118'));

        vm.prank(owner);
        logistics.settleLogisticsOrder(orderId);

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.status, OrderStatus.LOGISTICS_SETTLED, 'Status should be Settled');
    }

    function test_settleLogisticsOrder_revertNotDelivered() public {
        bytes32 orderId = _createTestLogisticsOrder();

        // Only accept, don't complete delivery
        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        vm.prank(owner);
        vm.expectRevert();
        logistics.settleLogisticsOrder(orderId);
    }

    // ============================================================================
    // DISPUTE AND CANCEL TESTS
    // ============================================================================

    function test_disputeOrder() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        vm.prank(user1); // Buyer
        logistics.disputeOrder(orderId, 'Damaged goods');

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.status, OrderStatus.LOGISTICS_DISPUTED, 'Status should be Disputed');
    }

    function test_cancelLogisticsOrder() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(user1);
        logistics.cancelLogisticsOrder(orderId, 'Changed my mind');

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.status, OrderStatus.LOGISTICS_CANCELLED, 'Status should be Cancelled');
    }

    function test_cancelLogisticsOrder_revertAfterAccepted() public {
        bytes32 orderId = _createTestLogisticsOrder();

        vm.prank(driver1);
        logistics.acceptDelivery(orderId, block.timestamp + 3600, block.timestamp + 7200);

        vm.prank(user1);
        vm.expectRevert();
        logistics.cancelLogisticsOrder(orderId, 'Too late');
    }

    // ============================================================================
    // VIEW FUNCTION TESTS
    // ============================================================================

    function test_getDriverInfo() public {
        vm.startPrank(driver1);
        logistics.registerDriver();
        logistics.updateDriverLocation(_createLocation('40.7', '-74.0'));
        vm.stopPrank();

        DiamondStorage.DriverInfo memory info = logistics.getDriverInfo(driver1);
        assertEq(info.driver, driver1);
        assertTrue(info.isActive);
        assertTrue(info.isAvailable);
        assertEq(info.currentLocation.lat, '40.7');
    }

    function test_getLogisticsOrder() public {
        bytes32 orderId = _createTestLogisticsOrder();

        DiamondStorage.LogisticsOrder memory order = logistics.getLogisticsOrder(orderId);
        assertEq(order.buyer, user1);
        assertEq(order.totalPrice, 100 ether);
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    function _registerDriver(address driver) internal {
        vm.prank(driver);
        logistics.registerDriver();
    }

    function _createTestLogisticsOrder() internal returns (bytes32) {
        _registerDriver(driver1);

        DiamondStorage.Location memory pickup = _createLocation('40.7128', '-74.0060');
        DiamondStorage.Location memory delivery = _createLocation('34.0522', '-118.2437');

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 200 ether);

        bytes32 orderId = logistics.createLogisticsOrder(
            bytes32(0),
            user1,
            user2,
            nodeOperator,
            address(quoteToken),
            1,
            10,
            100 ether,
            pickup,
            delivery
        );
        vm.stopPrank();

        return orderId;
    }
}
