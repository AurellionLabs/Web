// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2, Vm } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { AuSysFacet } from 'contracts/diamond/facets/AuSysFacet.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IAuSysDiamond } from 'contracts/diamond/interfaces/IAuSysDiamond.sol';

/**
 * @title AuSysFacetTest
 * @notice Tests for AuSysFacet (AuSys.sol parity)
 */
contract AuSysFacetTest is DiamondTestBase {
    IAuSysDiamond public ausys;
    error CallerMustBeBuyer();
    error CallerMustBeSeller();
    error JourneyNotFound();
    error JourneyAlreadyAssigned();
    error OrderNotFound();
    error InvalidOrderStatus();
    error InvalidJourneyRoute();
    error OfferExpired();

    // Role constants (must match AuSysFacet)
    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
    bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
    bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');

    // Events to test
    event AuSysAdminSet(address indexed admin);
    event AuSysAdminRevoked(address indexed admin);
    event EmitSig(address indexed user, bytes32 indexed id);
    event AuSysOrderCreated(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 tokenId,
        uint256 tokenQuantity,
        uint256 price,
        uint256 txFee,
        uint8 currentStatus,
        address[] nodes
    );

    // Verbose journey events
    event JourneyCreated(
        bytes32 indexed journeyId,
        address indexed sender,
        address indexed receiver,
        address driver,
        uint256 bounty,
        uint256 ETA,
        bytes32 orderId,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    event DriverAssigned(
        bytes32 indexed journeyId,
        address indexed driver,
        address sender,
        address receiver,
        uint256 bounty,
        uint256 ETA,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    event AuSysJourneyStatusUpdated(
        bytes32 indexed journeyId,
        uint8 indexed newStatus,
        address sender,
        address receiver,
        address driver,
        uint256 bounty,
        uint256 ETA,
        uint256 journeyStart,
        uint256 journeyEnd,
        string startLat,
        string startLng,
        string endLat,
        string endLng,
        string startName,
        string endName
    );

    function setUp() public override {
        super.setUp();
        ausys = IAuSysDiamond(address(diamond));
        _addMissingAuSysSelectors();

        // Setup admin
        vm.prank(owner);
        ausys.setAuSysAdmin(admin);

        // Setup drivers and dispatcher
        vm.startPrank(admin);
        ausys.setDriver(driver1, true);
        ausys.setDriver(driver2, true);
        ausys.setDispatcher(admin, true); // Admin is also a dispatcher
        vm.stopPrank();
    }

    function _addMissingAuSysSelectors() internal {
        bytes4[] memory sels = new bytes4[](3);
        sels[0] = AuSysFacet.acceptP2POffer.selector;
        sels[1] = AuSysFacet.cancelP2POffer.selector;
        sels[2] = AuSysFacet.handOff.selector;

        vm.startPrank(owner);
        _upsertFacet(address(auSysFacet), sels);
        vm.stopPrank();
    }

    // ============================================================================
    // CONFIGURATION TESTS
    // ============================================================================

    function test_setPayToken() public {
        address newPayToken = makeAddr('newPayToken');

        vm.prank(owner);
        ausys.setPayToken(newPayToken);

        assertEq(ausys.getPayToken(), newPayToken, 'Pay token should be updated');
    }

    function test_setPayToken_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        ausys.setPayToken(makeAddr('fake'));
    }

    function test_getPayToken() public view {
        assertEq(ausys.getPayToken(), address(payToken), 'Pay token should match');
    }

    // ============================================================================
    // RBAC TESTS
    // ============================================================================

    function test_setAuSysAdmin() public {
        address newAdmin = makeAddr('newAdmin');

        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit AuSysAdminSet(newAdmin);
        ausys.setAuSysAdmin(newAdmin);

        assertTrue(ausys.hasAuSysRole(ADMIN_ROLE, newAdmin), 'New admin should have role');
    }

    function test_setAuSysAdmin_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        ausys.setAuSysAdmin(user2);
    }

    function test_revokeAuSysAdmin() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit AuSysAdminRevoked(admin);
        ausys.revokeAuSysAdmin(admin);

        assertFalse(ausys.hasAuSysRole(ADMIN_ROLE, admin), 'Admin role should be revoked');
    }

    function test_setDriver() public {
        address newDriver = makeAddr('newDriver');

        vm.prank(admin);
        ausys.setDriver(newDriver, true);

        assertTrue(ausys.hasAuSysRole(DRIVER_ROLE, newDriver), 'Driver should have role');
    }

    function test_setDriver_disable() public {
        vm.prank(admin);
        ausys.setDriver(driver1, false);

        assertFalse(ausys.hasAuSysRole(DRIVER_ROLE, driver1), 'Driver role should be disabled');
    }

    function test_getAllowedDrivers() public view {
        address[] memory allowedDrivers = ausys.getAllowedDrivers();

        assertEq(allowedDrivers.length, 2, 'Should expose active drivers');
        assertEq(allowedDrivers[0], driver1, 'First driver should match setup');
        assertEq(allowedDrivers[1], driver2, 'Second driver should match setup');
    }

    function test_getAllowedDrivers_removesDisabledDriver() public {
        vm.prank(admin);
        ausys.setDriver(driver1, false);

        address[] memory allowedDrivers = ausys.getAllowedDrivers();
        assertEq(allowedDrivers.length, 1, 'Disabled drivers should be removed from enumeration');
        assertEq(allowedDrivers[0], driver2, 'Remaining driver should stay listed');
    }

    function test_setDriver_revertNotAdmin() public {
        vm.prank(user1);
        vm.expectRevert();
        ausys.setDriver(makeAddr('fake'), true);
    }

    function test_setDispatcher() public {
        address dispatcher = makeAddr('dispatcher');

        vm.prank(admin);
        ausys.setDispatcher(dispatcher, true);

        assertTrue(ausys.hasAuSysRole(DISPATCHER_ROLE, dispatcher), 'Dispatcher should have role');
    }

    function test_hasAuSysRole() public view {
        assertTrue(ausys.hasAuSysRole(ADMIN_ROLE, admin));
        assertTrue(ausys.hasAuSysRole(DRIVER_ROLE, driver1));
        assertFalse(ausys.hasAuSysRole(DRIVER_ROLE, user1));
    }

    // ============================================================================
    // ORDER MANAGEMENT TESTS
    // ============================================================================

    function test_createAuSysOrder() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();

        // User1 needs to approve pay token for escrow
        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 id = ausys.createAuSysOrder(order);
        vm.stopPrank();

        assertTrue(id != bytes32(0), 'Order ID should be set');

        DiamondStorage.AuSysOrder memory storedOrder = ausys.getAuSysOrder(id);
        assertEq(storedOrder.buyer, user1, 'Buyer should match');
        assertEq(storedOrder.seller, user2, 'Seller should match');
        assertEq(storedOrder.price, 1000 ether, 'Price should match');
    }

    function test_createAuSysOrder_multipleOrders() public {
        DiamondStorage.AuSysOrder memory order1 = _createTestOrder();
        DiamondStorage.AuSysOrder memory order2 = _createTestOrder();
        order2.price = 2000 ether;

        vm.startPrank(user1);
        payToken.approve(address(diamond), 50000 ether);
        bytes32 id1 = ausys.createAuSysOrder(order1);
        bytes32 id2 = ausys.createAuSysOrder(order2);
        vm.stopPrank();

        assertTrue(id1 != id2, 'Order IDs should be unique');
    }

    function test_getAuSysOrder() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 id = ausys.createAuSysOrder(order);
        vm.stopPrank();

        DiamondStorage.AuSysOrder memory retrieved = ausys.getAuSysOrder(id);
        assertEq(retrieved.tokenId, 1, 'Token ID should match');
        assertEq(retrieved.tokenQuantity, 10, 'Quantity should match');
    }

    // ============================================================================
    // JOURNEY MANAGEMENT TESTS
    // ============================================================================

    function test_createJourney() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(user2);
        payToken.approve(address(diamond), 1000 ether);

        vm.startPrank(user2);

        vm.recordLogs();
        ausys.createJourney(
            user1,      // sender
            user2,      // receiver (who pays the bounty)
            parcelData,
            10 ether,   // bounty
            block.timestamp + 86400       // ETA (24 hours from now)
        );
        vm.stopPrank();

        // Get the journey ID from the emitted event
        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 journeyId = _extractJourneyIdFromLogs(logs);

        assertTrue(journeyId != bytes32(0), 'Journey ID should be captured');

        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        assertEq(journey.sender, user1, 'Sender should match');
        assertEq(journey.receiver, user2, 'Receiver should match');
        assertEq(journey.bounty, 10 ether, 'Bounty should match');
        assertEq(journey.currentStatus, 0, 'Status should be Pending (0)');
    }

    function test_createJourney_revertWhenSenderEqualsReceiver() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(user1);
        payToken.approve(address(diamond), 1000 ether);

        vm.prank(admin);
        vm.expectRevert(AuSysFacet.CallerMustBeBuyer.selector);
        ausys.createJourney(
            user1,
            user1,
            parcelData,
            10 ether,
            block.timestamp + 86400
        );
    }

    function test_createOrderJourney_revertWhenSenderEqualsReceiver() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);

        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );
        vm.expectRevert(AuSysFacet.InvalidJourneyRoute.selector);
        ausys.createOrderJourney(
            orderId,
            user1,
            user1,
            parcelData,
            10 ether,
            block.timestamp + 86400,
            10,
            1
        );
        vm.stopPrank();
    }

    function test_getJourney() public {
        bytes32 journeyId = _createTestJourney();

        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        assertEq(journey.sender, user1);
        assertEq(journey.receiver, user2);
    }

    // ============================================================================
    // DRIVER ASSIGNMENT TESTS
    // ============================================================================

    function test_assignDriverToJourney() public {
        bytes32 journeyId = _createTestJourney();
        DiamondStorage.AuSysJourney memory journeyBefore = ausys.getJourney(journeyId);

        vm.prank(admin);
        vm.expectEmit(true, true, false, false);
        emit DriverAssigned(
            journeyId,
            driver1,
            journeyBefore.sender,
            journeyBefore.receiver,
            journeyBefore.bounty,
            journeyBefore.ETA,
            journeyBefore.parcelData.startLocation.lat,
            journeyBefore.parcelData.startLocation.lng,
            journeyBefore.parcelData.endLocation.lat,
            journeyBefore.parcelData.endLocation.lng,
            journeyBefore.parcelData.startName,
            journeyBefore.parcelData.endName
        );
        ausys.assignDriverToJourney(driver1, journeyId);

        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        assertEq(journey.driver, driver1, 'Driver should be assigned');
    }

    function test_assignDriverToJourney_revertNotAdmin() public {
        bytes32 journeyId = _createTestJourney();

        // user1 is the sender, but assignDriverToJourney needs admin or dispatcher or sender
        // Let's check if user1 (sender) can do it - based on implementation it might be allowed
        vm.prank(user2); // user2 is neither sender nor admin
        vm.expectRevert();
        ausys.assignDriverToJourney(driver1, journeyId);
    }

    function test_assignDriverToJourney_revertJourneyNotFound() public {
        vm.prank(admin);
        vm.expectRevert(JourneyNotFound.selector);
        ausys.assignDriverToJourney(driver1, keccak256('missing'));
    }

    function test_assignDriverToJourney_revertAlreadyAssigned() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(admin);
        vm.expectRevert(JourneyAlreadyAssigned.selector);
        ausys.assignDriverToJourney(driver2, journeyId);
    }

    function test_assignDriverToJourney_revertWhenDriverEqualsSender() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(user2);
        payToken.approve(address(diamond), 1000 ether);

        vm.recordLogs();
        vm.prank(user2);
        ausys.createJourney(
            driver1,
            user2,
            parcelData,
            10 ether,
            block.timestamp + 86400
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 journeyId = _extractJourneyIdFromLogs(logs);

        vm.prank(admin);
        vm.expectRevert(AuSysFacet.DuplicateJourneyRoleAddress.selector);
        ausys.assignDriverToJourney(driver1, journeyId);
    }

    function test_assignDriverToJourney_revertWhenDriverEqualsReceiver() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(driver1);
        payToken.approve(address(diamond), 1000 ether);

        vm.recordLogs();
        vm.prank(driver1);
        ausys.createJourney(
            user1,
            driver1,
            parcelData,
            10 ether,
            block.timestamp + 86400
        );

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 journeyId = _extractJourneyIdFromLogs(logs);

        vm.prank(admin);
        vm.expectRevert(AuSysFacet.DuplicateJourneyRoleAddress.selector);
        ausys.assignDriverToJourney(driver1, journeyId);
    }

    // ============================================================================
    // SIGNATURE SYSTEM TESTS
    // ============================================================================

    function test_packageSign_sender() public {
        bytes32 journeyId = _createTestJourney();

        // Assign driver first
        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(user1); // sender
        vm.expectEmit(true, true, false, false);
        emit EmitSig(user1, journeyId);
        ausys.packageSign(journeyId);
    }

    function test_packageSign_receiver() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(user2); // receiver
        vm.expectEmit(true, true, false, false);
        emit EmitSig(user2, journeyId);
        ausys.packageSign(journeyId);
    }

    function test_packageSign_driver() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(driver1);
        vm.expectEmit(true, true, false, false);
        emit EmitSig(driver1, journeyId);
        ausys.packageSign(journeyId);
    }

    function test_packageSign_revertNotParticipant() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(makeAddr('stranger'));
        vm.expectRevert();
        ausys.packageSign(journeyId);
    }

    function test_handOn_requiresSignatures() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        // Sign from sender and driver
        vm.prank(user1);
        ausys.packageSign(journeyId);

        vm.prank(driver1);
        ausys.packageSign(journeyId);

        // handOn should work now
        vm.prank(driver1);
        bool success = ausys.handOn(journeyId);
        assertTrue(success, 'handOn should succeed');

        // Check journey status changed to InTransit (1)
        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        assertEq(journey.currentStatus, 1, 'Status should be InTransit');
    }

    function test_handOn_revertWithoutDriverSignature() public {
        bytes32 journeyId = _createTestJourney();

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        // Only sender signs
        vm.prank(user1);
        ausys.packageSign(journeyId);

        // handOn should fail without driver signature
        vm.prank(driver1);
        vm.expectRevert();
        ausys.handOn(journeyId);
    }

    function test_createOrderJourney_revertOrderNotFound() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'Origin', 'Destination'
        );

        vm.prank(user1);
        payToken.approve(address(diamond), 1000 ether);

        vm.prank(user1);
        vm.expectRevert(OrderNotFound.selector);
        ausys.createOrderJourney(
            keccak256('missing-order'),
            user2,
            user1,
            parcelData,
            10 ether,
            block.timestamp + 86400,
            10,
            1
        );
    }

    function test_createOrderJourney_revertSenderMustMatchSeller() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        payToken.approve(address(diamond), 1000 ether);
        vm.expectRevert(InvalidJourneyRoute.selector);
        ausys.createOrderJourney(
            orderId,
            admin,
            user1,
            order.locationData,
            10 ether,
            block.timestamp + 86400,
            order.tokenQuantity,
            order.tokenId
        );
        vm.stopPrank();
    }

    function test_createOrderJourney_revertExpiredOrder() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();
        order.seller = address(0);
        order.targetCounterparty = user2;
        order.expiresAt = block.timestamp + 1 hours;

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 hours + 1);

        vm.prank(user1);
        payToken.approve(address(diamond), 1000 ether);

        vm.prank(user1);
        vm.expectRevert(OfferExpired.selector);
        ausys.createOrderJourney(
            orderId,
            user2,
            user1,
            order.locationData,
            10 ether,
            block.timestamp + 86400,
            order.tokenQuantity,
            order.tokenId
        );
    }

    function test_getAuSysOrder_marksExpiredInView() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();
        order.seller = address(0);
        order.targetCounterparty = user2;
        order.expiresAt = block.timestamp + 1 hours;

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        vm.warp(block.timestamp + 1 hours + 1);

        DiamondStorage.AuSysOrder memory storedOrder = ausys.getAuSysOrder(orderId);
        assertEq(storedOrder.currentStatus, 4, 'Expired offers should surface as expired in reads');
    }

    function test_getOpenP2POffers_filtersExpiredOffers() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();
        order.seller = address(0);
        order.targetCounterparty = user2;
        order.expiresAt = block.timestamp + 1 hours;

        vm.startPrank(user1);
        payToken.approve(address(diamond), 10000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        bytes32[] memory offersBeforeExpiry = ausys.getOpenP2POffers();
        assertEq(offersBeforeExpiry.length, 1, 'Offer should be visible before expiry');
        assertEq(offersBeforeExpiry[0], orderId, 'Offer ID should match before expiry');

        vm.warp(block.timestamp + 1 hours + 1);

        bytes32[] memory offersAfterExpiry = ausys.getOpenP2POffers();
        assertEq(offersAfterExpiry.length, 0, 'Expired offers should be filtered out of open offers');
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    function _createTestOrder() internal view returns (DiamondStorage.AuSysOrder memory) {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'Origin', 'Destination'
        );

        address[] memory nodes = new address[](1);
        nodes[0] = nodeOperator;

        bytes32[] memory journeyIds = new bytes32[](0);

        return DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(payToken),
            tokenId: 1,
            tokenQuantity: 10,
            price: 1000 ether,
            txFee: 10 ether,
            buyer: user1,
            seller: user2,
            journeyIds: journeyIds,
            nodes: nodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0,
            snapshotTreasuryBps: 0,
            snapshotNodeBps: 0,
            sellerNode: bytes32(0)
        });
    }

    function _createTestJourney() internal returns (bytes32 journeyId) {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(user2);
        payToken.approve(address(diamond), 1000 ether);

        vm.startPrank(user2);

        vm.recordLogs();
        ausys.createJourney(
            user1,
            user2,
            parcelData,
            10 ether,
            block.timestamp + 86400
        );
        vm.stopPrank();

        // Extract journeyId from JourneyCreated event
        Vm.Log[] memory logs = vm.getRecordedLogs();
        journeyId = _extractJourneyIdFromLogs(logs);

        return journeyId;
    }

    function _extractJourneyIdFromLogs(Vm.Log[] memory logs) internal pure returns (bytes32 journeyId) {
        bytes32 eventSig = keccak256('JourneyCreated(bytes32,address,address,address,uint256,uint256,bytes32,string,string,string,string,string,string)');
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == eventSig) {
                journeyId = logs[i].topics[1];
                break;
            }
        }
    }

    function test_createAuSysOrder_revertCallerCannotEscrowBuyerFunds() public {
        DiamondStorage.AuSysOrder memory order = _createTestOrder();

        vm.prank(user1);
        payToken.approve(address(diamond), 10000 ether);

        vm.prank(admin);
        vm.expectRevert(CallerMustBeBuyer.selector);
        ausys.createAuSysOrder(order);
    }

    function test_createJourney_revertCallerMustBeReceiver() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.prank(user2);
        payToken.approve(address(diamond), 1000 ether);

        vm.prank(admin);
        vm.expectRevert(CallerMustBeBuyer.selector);
        ausys.createJourney(
            user1,
            user2,
            parcelData,
            10 ether,
            block.timestamp + 86400
        );
    }
}
