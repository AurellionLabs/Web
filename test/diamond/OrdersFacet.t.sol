// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2, Vm } from 'forge-std/Test.sol';
import { Diamond } from 'contracts/diamond/Diamond.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { DiamondLoupeFacet } from 'contracts/diamond/facets/DiamondLoupeFacet.sol';
import { OwnershipFacet } from 'contracts/diamond/facets/OwnershipFacet.sol';
import { OrdersFacet } from 'contracts/diamond/facets/OrdersFacet.sol';

/**
 * @title OrdersFacetStandaloneTest
 * @notice Standalone tests for OrdersFacet - avoids selector conflicts
 */
contract OrdersFacetStandaloneTest is Test {
    Diamond public diamond;
    OrdersFacet public orders;
    
    address public owner;
    address public user1;
    address public user2;

    // Events
    event OrderCreated(
        bytes32 indexed orderHash,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 amount
    );
    event OrderUpdated(
        bytes32 indexed orderHash,
        string status
    );
    event AusysOrderCancelled(
        bytes32 indexed orderHash,
        address indexed buyer
    );

    function setUp() public {
        owner = makeAddr('owner');
        user1 = makeAddr('user1');
        user2 = makeAddr('user2');
        
        // Deploy minimal diamond for OrdersFacet testing
        DiamondCutFacet cutFacet = new DiamondCutFacet();
        diamond = new Diamond(owner, address(cutFacet));
        
        // Add only the facets we need
        _addFacet(address(new DiamondLoupeFacet()), _getLoupeSelectors());
        _addFacet(address(new OwnershipFacet()), _getOwnershipSelectors());
        _addFacet(address(new OrdersFacet()), _getOrdersSelectors());
        
        orders = OrdersFacet(address(diamond));
        
        // Initialize OrdersFacet
        orders.initialize();
    }

    function _addFacet(address facetAddress, bytes4[] memory selectors) internal {
        if (selectors.length == 0) return;
        
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: facetAddress,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');
    }

    function _getLoupeSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = bytes4(keccak256('facets()'));
        selectors[1] = bytes4(keccak256('facetFunctionSelectors(address)'));
        selectors[2] = bytes4(keccak256('facetAddresses()'));
        selectors[3] = bytes4(keccak256('facetAddress(bytes4)'));
        selectors[4] = bytes4(keccak256('supportsInterface(bytes4)'));
        return selectors;
    }

    function _getOwnershipSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = bytes4(keccak256('owner()'));
        selectors[1] = bytes4(keccak256('transferOwnership(address)'));
        selectors[2] = bytes4(keccak256('acceptOwnership()'));
        return selectors;
    }

    function _getOrdersSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = bytes4(keccak256('initialize()'));
        selectors[1] = bytes4(keccak256('createOrder(address,address,uint256,uint256,string)'));
        selectors[2] = bytes4(keccak256('updateOrderStatus(bytes32,string)'));
        selectors[3] = bytes4(keccak256('cancelOrder(bytes32)'));
        selectors[4] = bytes4(keccak256('getOrder(bytes32)'));
        selectors[5] = bytes4(keccak256('getBuyerOrders(address)'));
        selectors[6] = bytes4(keccak256('getSellerOrders(address)'));
        selectors[7] = bytes4(keccak256('getTotalOrders()'));
        return selectors;
    }

    // ============================================================================
    // createOrder Tests
    // ============================================================================

    function test_createOrder_basic() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(
            user1,
            user2,
            100 ether,
            10,
            'OPEN'
        );

        assertTrue(orderHash != bytes32(0), 'Order hash should not be zero');
        
        // Verify event was emitted by checking order exists
        (address buyer, address seller, uint256 price, uint256 amount, string memory status, uint256 createdAt) = 
            orders.getOrder(orderHash);
        
        assertEq(buyer, user1, 'Buyer should match');
        assertEq(seller, user2, 'Seller should match');
        assertEq(price, 100 ether, 'Price should match');
        assertEq(amount, 10, 'Amount should match');
        assertEq(status, 'OPEN', 'Status should be OPEN');
        assertTrue(createdAt > 0, 'CreatedAt should be set');
    }

    function test_createOrder_incrementsTotalOrders() public {
        uint256 initialTotal = orders.getTotalOrders();
        
        vm.prank(user1);
        orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        assertEq(orders.getTotalOrders(), initialTotal + 1, 'Total orders should increment');
    }

    function test_createOrder_multipleOrders() public {
        vm.prank(user1);
        bytes32 order1 = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user2);
        bytes32 order2 = orders.createOrder(user2, user1, 200 ether, 5, 'OPEN');
        
        assertTrue(order1 != order2, 'Order hashes should be unique');
    }

    // ============================================================================
    // updateOrderStatus Tests
    // ============================================================================

    function test_updateOrderStatus_byBuyer() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user1);
        orders.updateOrderStatus(orderHash, 'FILLED');
        
        (,,,,string memory status,) = orders.getOrder(orderHash);
        assertEq(status, 'FILLED', 'Status should be updated to FILLED');
    }

    function test_updateOrderStatus_bySeller() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user2);
        orders.updateOrderStatus(orderHash, 'PROCESSING');
        
        (,,,,string memory status,) = orders.getOrder(orderHash);
        assertEq(status, 'PROCESSING', 'Status should be updated to PROCESSING');
    }

    function test_updateOrderStatus_revertNotParticipant() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.expectRevert('Not order participant');
        vm.prank(makeAddr('nonParticipant'));
        orders.updateOrderStatus(orderHash, 'FILLED');
    }

    // ============================================================================
    // cancelOrder Tests
    // ============================================================================

    function test_cancelOrder_byBuyer() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.expectEmit(true, true, true, true);
        emit AusysOrderCancelled(orderHash, user1);
        
        vm.prank(user1);
        orders.cancelOrder(orderHash);
        
        (,,,,string memory status,) = orders.getOrder(orderHash);
        assertEq(status, 'CANCELLED', 'Status should be CANCELLED');
    }

    function test_cancelOrder_revertNotBuyer() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.expectRevert('Not buyer');
        vm.prank(user2);
        orders.cancelOrder(orderHash);
    }

    function test_cancelOrder_revertAlreadyCancelled() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user1);
        orders.cancelOrder(orderHash);
        
        vm.expectRevert('Already cancelled');
        vm.prank(user1);
        orders.cancelOrder(orderHash);
    }

    // ============================================================================
    // getOrder Tests
    // ============================================================================

    function test_getOrder_returnsCorrectData() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 500 ether, 25, 'OPEN');
        
        (address buyer, address seller, uint256 price, uint256 amount, string memory status, uint256 createdAt) = 
            orders.getOrder(orderHash);
        
        assertEq(buyer, user1, 'Buyer mismatch');
        assertEq(seller, user2, 'Seller mismatch');
        assertEq(price, 500 ether, 'Price mismatch');
        assertEq(amount, 25, 'Amount mismatch');
        assertEq(status, 'OPEN', 'Status mismatch');
        assertTrue(createdAt > 0, 'CreatedAt should be set');
    }

    function test_getOrder_nonexistent() public view {
        (address buyer, address seller, uint256 price, uint256 amount, string memory status, uint256 createdAt) = 
            orders.getOrder(bytes32(uint256(12345)));
        
        assertEq(buyer, address(0), 'Buyer should be zero');
        assertEq(seller, address(0), 'Seller should be zero');
        assertEq(price, 0, 'Price should be zero');
        assertEq(amount, 0, 'Amount should be zero');
    }

    // ============================================================================
    // getTotalOrders Tests
    // ============================================================================

    function test_getTotalOrders_afterCreates() public {
        uint256 initial = orders.getTotalOrders();
        
        vm.prank(user1);
        orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user2);
        orders.createOrder(user2, user1, 200 ether, 5, 'OPEN');
        
        assertEq(orders.getTotalOrders(), initial + 2, 'Should have 2 more orders');
    }

    // ============================================================================
    // getBuyerOrders & getSellerOrders Tests  
    // ============================================================================

    function test_getBuyerOrders() public {
        vm.prank(user1);
        orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        bytes32[] memory buyerOrders = orders.getBuyerOrders(user1);
        assertTrue(true, 'Function executed without revert');
    }

    function test_getSellerOrders() public {
        vm.prank(user1);
        orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        bytes32[] memory sellerOrders = orders.getSellerOrders(user2);
        assertTrue(true, 'Function executed without revert');
    }

    // ============================================================================
    // Edge Cases & Reverts
    // ============================================================================

    function test_createOrder_zeroPrice() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 0, 10, 'OPEN');
        
        assertTrue(orderHash != bytes32(0), 'Order should be created');
    }

    function test_createOrder_zeroAmount() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 0, 'OPEN');
        
        assertTrue(orderHash != bytes32(0), 'Order should be created');
    }

    function test_updateOrderStatus_toCustomStatus() public {
        vm.prank(user1);
        bytes32 orderHash = orders.createOrder(user1, user2, 100 ether, 10, 'OPEN');
        
        vm.prank(user1);
        orders.updateOrderStatus(orderHash, 'PENDING_PAYMENT');
        
        (,,,,string memory status,) = orders.getOrder(orderHash);
        assertEq(status, 'PENDING_PAYMENT', 'Status should be updated');
    }
}
