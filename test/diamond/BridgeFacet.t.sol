// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { BridgeFacet } from 'contracts/diamond/facets/BridgeFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

/**
 * @title BridgeFacetTest
 * @notice Tests for BridgeFacet (OrderBridge.sol parity)
 */
contract BridgeFacetTest is DiamondTestBase {
    BridgeFacet public bridge;

    // Events
    event UnifiedOrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed clobOrderId,
        address buyer,
        address sellerNode,
        uint256 price,
        uint256 quantity
    );
    event BountyPercentageUpdated(uint256 newPercentage);
    event ProtocolFeePercentageUpdated(uint256 newPercentage);

    function setUp() public override {
        super.setUp();
        bridge = BridgeFacet(address(diamond));
    }

    // ============================================================================
    // UNIFIED ORDER CREATION TESTS
    // ============================================================================

    function test_createUnifiedOrder() public {
        bytes32 clobOrderId = keccak256('clob-order-1');
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060',
            '34.0522', '-118.2437',
            'New York', 'Los Angeles'
        );

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 2000 ether);

        bytes32 orderId = bridge.createUnifiedOrder(
            clobOrderId,
            nodeOperator,
            100 ether,
            10,
            block.timestamp + 7 days,
            parcelData
        );
        vm.stopPrank();

        assertTrue(orderId != bytes32(0), 'Order ID should be set');

        bytes32[] memory buyerOrders = bridge.getBuyerOrders(user1);
        assertEq(buyerOrders.length, 1, 'User1 should have 1 order');
        assertEq(buyerOrders[0], orderId, 'Order ID should match');
    }

    function test_createUnifiedOrder_multipleOrders() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Dest'
        );

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 20000 ether);

        bytes32 orderId1 = bridge.createUnifiedOrder(
            keccak256('order-1'), nodeOperator, 100 ether, 10, block.timestamp + 7 days, parcelData
        );
        bytes32 orderId2 = bridge.createUnifiedOrder(
            keccak256('order-2'), nodeOperator, 200 ether, 20, block.timestamp + 7 days, parcelData
        );
        vm.stopPrank();

        assertTrue(orderId1 != orderId2, 'Order IDs should be unique');

        bytes32[] memory buyerOrders = bridge.getBuyerOrders(user1);
        assertEq(buyerOrders.length, 2, 'User1 should have 2 orders');
    }

    // ============================================================================
    // ORDER LOOKUP TESTS
    // ============================================================================

    function test_getUnifiedOrder() public {
        bytes32 clobOrderId = keccak256('test-order');
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40', '-74', '34', '-118', 'A', 'B'
        );

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 2000 ether);
        bytes32 orderId = bridge.createUnifiedOrder(
            clobOrderId, nodeOperator, 100 ether, 10, block.timestamp + 7 days, parcelData
        );
        vm.stopPrank();

        (
            bytes32 returnedClobOrderId,
            ,  // clobTradeId
            ,  // ausysOrderId
            address buyer,
            ,  // seller
            address sellerNode,
            ,  // token
            ,  // tokenId
            uint256 tokenQuantity,
            uint256 price,
            ,  // bounty
            ,  // status
            ,  // logisticsStatus
            ,  // createdAt
            ,  // matchedAt
            ,  // deliveredAt
               // settledAt
        ) = bridge.getUnifiedOrder(orderId);

        assertEq(buyer, user1, 'Buyer should match');
        assertEq(sellerNode, nodeOperator, 'Seller node should match');
        assertEq(price, 100 ether, 'Price should match');
        assertEq(tokenQuantity, 10, 'Quantity should match');
        assertEq(returnedClobOrderId, clobOrderId, 'CLOB order ID should match');
    }

    function test_getBuyerOrders() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40', '-74', '34', '-118', 'A', 'B'
        );

        vm.startPrank(user1);
        quoteToken.approve(address(diamond), 20000 ether);
        bridge.createUnifiedOrder(keccak256('o1'), nodeOperator, 100 ether, 10, block.timestamp + 7 days, parcelData);
        bridge.createUnifiedOrder(keccak256('o2'), nodeOperator, 200 ether, 20, block.timestamp + 7 days, parcelData);
        vm.stopPrank();

        bytes32[] memory buyerOrders = bridge.getBuyerOrders(user1);
        assertEq(buyerOrders.length, 2, 'User1 should have 2 orders');
    }

    function test_getSellerOrders() public view {
        // Note: Seller orders are populated when order is matched/filled
        // This test verifies the function exists and returns empty for new orders
        bytes32[] memory sellerOrders = bridge.getSellerOrders(user2);
        assertEq(sellerOrders.length, 0, 'Should start with 0 seller orders');
    }

    // ============================================================================
    // ADMIN FUNCTION TESTS
    // ============================================================================

    function test_setBountyPercentage() public {
        vm.prank(owner);
        bridge.setBountyPercentage(300); // 3%

        // Verify by creating an order and checking bounty calculation
    }

    function test_setBountyPercentage_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        bridge.setBountyPercentage(300);
    }

    function test_setProtocolFeePercentage() public {
        vm.prank(owner);
        bridge.setProtocolFeePercentage(50); // 0.5%
    }

    function test_setProtocolFeePercentage_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        bridge.setProtocolFeePercentage(50);
    }

    function test_updateClobAddress() public {
        address newClob = makeAddr('newCLOB');

        vm.prank(owner);
        bridge.updateClobAddress(newClob);
    }

    function test_updateClobAddress_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        bridge.updateClobAddress(makeAddr('fake'));
    }

    function test_updateAusysAddress() public {
        address newAusys = makeAddr('newAuSys');

        vm.prank(owner);
        bridge.updateAusysAddress(newAusys);
    }

    function test_updateAusysAddress_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        bridge.updateAusysAddress(makeAddr('fake'));
    }
}
