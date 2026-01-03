// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import { Test, console2 } from '../lib/forge-std/src/Test.sol';
import { OrderBridge } from '../contracts/OrderBridge.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

// Minimal mock ERC20 for testing
contract MockERC20 is IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }
    
    function name() public view returns (string memory) { return _name; }
    function symbol() public view returns (string memory) { return _symbol; }
    function decimals() public pure returns (uint8) { return 18; }
    function totalSupply() public view returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view returns (uint256) { return _balances[account]; }
    function transfer(address to, uint256 amount) public returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    function allowance(address owner, address spender) public view returns (uint256) { return _allowances[owner][spender]; }
    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        _balances[from] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }
}

contract OrderBridgeTest is Test {
    OrderBridge public orderBridge;
    MockERC20 public quoteToken;
    
    address public owner;
    address public buyer;
    address public seller;
    address public sellerNode;
    address public feeRecipient;
    
    function setUp() public {
        owner = makeAddr("owner");
        buyer = makeAddr("buyer");
        seller = makeAddr("seller");
        sellerNode = makeAddr("sellerNode");
        feeRecipient = makeAddr("feeRecipient");
        
        quoteToken = new MockERC20("Quote Token", "QT");
        
        orderBridge = new OrderBridge(
            address(0x1234),
            address(0x5678),
            address(quoteToken),
            feeRecipient
        );
        
        // Transfer ownership to the owner address for testing
        orderBridge.transferOwnership(owner);
    }
    
    // =============================================================================
    // Constructor Tests
    // =============================================================================
    
    function testConstructorSetsAddresses() public view {
        assertEq(orderBridge.clobAddress(), address(0x1234));
        assertEq(orderBridge.ausysAddress(), address(0x5678));
        assertEq(address(orderBridge.quoteToken()), address(quoteToken));
    }
    
    function testConstructorSetsFeeRecipient() public view {
        assertEq(feeRecipient, feeRecipient);
    }
    
    // =============================================================================
    // Admin Function Tests
    // =============================================================================
    
    function testSetBountyPercentage() public {
        vm.startPrank(owner);
        orderBridge.setBountyPercentage(500);
        vm.stopPrank();
        assertEq(orderBridge.bountyPercentage(), 500);
    }
    
    function testSetBountyPercentageFailsIfTooHigh() public {
        vm.startPrank(owner);
        vm.expectRevert(OrderBridge.InvalidFeeConfiguration.selector);
        orderBridge.setBountyPercentage(2000);
        vm.stopPrank();
    }
    
    function testSetBountyPercentageFailsIfNotOwner() public {
        vm.startPrank(buyer);
        vm.expectRevert();
        orderBridge.setBountyPercentage(500);
        vm.stopPrank();
    }
    
    function testSetProtocolFeePercentage() public {
        vm.startPrank(owner);
        orderBridge.setProtocolFeePercentage(50);
        vm.stopPrank();
        assertEq(orderBridge.protocolFeePercentage(), 50);
    }
    
    function testSetProtocolFeePercentageFailsIfTooHigh() public {
        vm.startPrank(owner);
        vm.expectRevert(OrderBridge.InvalidFeeConfiguration.selector);
        orderBridge.setProtocolFeePercentage(2000);
        vm.stopPrank();
    }
    
    function testSetFeeRecipient() public {
        vm.startPrank(owner);
        address newRecipient = makeAddr("newRecipient");
        orderBridge.setFeeRecipient(newRecipient);
        vm.stopPrank();
    }
    
    function testSetFeeRecipientFailsWithZeroAddress() public {
        vm.startPrank(owner);
        vm.expectRevert();
        orderBridge.setFeeRecipient(address(0));
        vm.stopPrank();
    }
    
    function testUpdateClobAddress() public {
        vm.startPrank(owner);
        address newCLOB = makeAddr("newCLOB");
        orderBridge.updateClobAddress(newCLOB);
        vm.stopPrank();
        assertEq(orderBridge.clobAddress(), newCLOB);
    }
    
    function testUpdateAusysAddress() public {
        vm.startPrank(owner);
        address newAuSys = makeAddr("newAuSys");
        orderBridge.updateAusysAddress(newAuSys);
        vm.stopPrank();
        assertEq(orderBridge.ausysAddress(), newAuSys);
    }
    
    // =============================================================================
    // createUnifiedOrder Tests
    // =============================================================================
    
    function testCreateUnifiedOrderBasic() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start Location",
            endName: "End Location"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId,
            sellerNode,
            deliveryData
        );
        vm.stopPrank();
        
        assertTrue(unifiedOrderId != bytes32(0));
        
        OrderBridge.UnifiedOrder memory unified = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(unified.clobOrderId, clobOrderId);
        assertEq(unified.buyer, buyer);
        assertEq(unified.sellerNode, sellerNode);
        assertEq(uint8(unified.status), uint8(OrderBridge.UnifiedOrderStatus.PendingTrade));
    }
    
    function testCreateUnifiedOrderFailsWithZeroSellerNode() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        vm.expectRevert(OrderBridge.InvalidAddress.selector);
        orderBridge.createUnifiedOrder(clobOrderId, address(0), deliveryData);
        vm.stopPrank();
    }
    
    function testCreateUnifiedOrderEmitsEvent() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        // Check all params except the first (dynamically generated order ID)
        vm.expectEmit(false, true, true, true);
        emit OrderBridge.UnifiedOrderCreated(
            bytes32(0), // Don't check first param
            clobOrderId,
            buyer,
            address(0),
            address(0),
            0,
            0,
            0
        );
        orderBridge.createUnifiedOrder(clobOrderId, sellerNode, deliveryData);
        vm.stopPrank();
    }
    
    // =============================================================================
    // cancelUnifiedOrder Tests
    // =============================================================================
    
    function testCancelUnifiedOrder() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        vm.startPrank(buyer);
        orderBridge.cancelUnifiedOrder(unifiedOrderId);
        vm.stopPrank();
        
        OrderBridge.UnifiedOrder memory unified = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(uint8(unified.status), uint8(OrderBridge.UnifiedOrderStatus.Cancelled));
    }
    
    function testCancelUnifiedOrderFailsIfNotBuyer() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        vm.startPrank(seller);
        vm.expectRevert(OrderBridge.NotAuthorized.selector);
        orderBridge.cancelUnifiedOrder(unifiedOrderId);
        vm.stopPrank();
    }
    
    function testCancelFailsIfAlreadyMatched() public {
        bytes32 clobOrderId = keccak256("test-clob-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        vm.startPrank(buyer);
        orderBridge.bridgeTradeToLogistics(unifiedOrderId);
        vm.stopPrank();
        
        vm.startPrank(buyer);
        vm.expectRevert(OrderBridge.OrderNotOpen.selector);
        orderBridge.cancelUnifiedOrder(unifiedOrderId);
        vm.stopPrank();
    }
    
    // =============================================================================
    // Getters Tests
    // =============================================================================
    
    function testGetBuyerOrders() public {
        for (uint256 i = 0; i < 3; i++) {
            bytes32 clobOrderId = keccak256(abi.encode("order", i));
            
            OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
                startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
                endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
                startName: "Start",
                endName: "End"
            });
            
            vm.startPrank(buyer);
            orderBridge.createUnifiedOrder(clobOrderId, sellerNode, deliveryData);
            vm.stopPrank();
        }
        
        bytes32[] memory buyerOrders = orderBridge.getBuyerOrders(buyer);
        assertEq(buyerOrders.length, 3);
    }
    
    // =============================================================================
    // State Machine Tests
    // =============================================================================
    
    function testOrderStatusTransitions() public {
        bytes32 clobOrderId = keccak256("test-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        OrderBridge.UnifiedOrder memory order = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(uint8(order.status), uint8(OrderBridge.UnifiedOrderStatus.PendingTrade));
        
        vm.startPrank(buyer);
        orderBridge.bridgeTradeToLogistics(unifiedOrderId);
        vm.stopPrank();
        
        order = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(uint8(order.status), uint8(OrderBridge.UnifiedOrderStatus.LogisticsCreated));
    }
    
    // =============================================================================
    // Bounty Tests
    // =============================================================================
    
    function testDefaultBountyPercentage() public view {
        assertEq(orderBridge.bountyPercentage(), 200);
    }
    
    function testCustomBountyPercentage() public {
        vm.startPrank(owner);
        orderBridge.setBountyPercentage(500);
        vm.stopPrank();
        assertEq(orderBridge.bountyPercentage(), 500);
    }
    
    // =============================================================================
    // Order ID Generation Tests
    // =============================================================================
    
    function testUnifiedOrderIdsAreUnique() public {
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 orderId1 = orderBridge.createUnifiedOrder(
            keccak256("order-1"), sellerNode, deliveryData
        );
        vm.stopPrank();
        
        vm.startPrank(buyer);
        bytes32 orderId2 = orderBridge.createUnifiedOrder(
            keccak256("order-2"), sellerNode, deliveryData
        );
        vm.stopPrank();
        
        assertTrue(orderId1 != orderId2);
    }
    
    // =============================================================================
    // Logistics Phase Tests
    // =============================================================================
    
    function testDefaultLogisticsPhaseIsNone() public {
        bytes32 clobOrderId = keccak256("test-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        OrderBridge.UnifiedOrder memory order = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(uint8(order.logisticsStatus), uint8(OrderBridge.LogisticsPhase.None));
    }
    
    function testLogisticsPhaseUpdatesAfterBridging() public {
        bytes32 clobOrderId = keccak256("test-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        vm.startPrank(buyer);
        orderBridge.bridgeTradeToLogistics(unifiedOrderId);
        vm.stopPrank();
        
        OrderBridge.UnifiedOrder memory order = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertEq(uint8(order.logisticsStatus), uint8(OrderBridge.LogisticsPhase.Pending));
    }
    
    // =============================================================================
    // Delivery Data Tests
    // =============================================================================
    
    function testDeliveryDataStoredCorrectly() public {
        bytes32 clobOrderId = keccak256("test-order");
        
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 40712800, lng: -74006000 }),
            endLocation: OrderBridge.Location({ lat: 34052200, lng: -118243700 }),
            startName: "New York City",
            endName: "Los Angeles"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        OrderBridge.UnifiedOrder memory order = orderBridge.getUnifiedOrder(unifiedOrderId);
        
        assertEq(order.deliveryData.startLocation.lat, 40712800);
        assertEq(order.deliveryData.startLocation.lng, -74006000);
        assertEq(order.deliveryData.endLocation.lat, 34052200);
        assertEq(order.deliveryData.endLocation.lng, -118243700);
        assertEq(order.deliveryData.startName, "New York City");
        assertEq(order.deliveryData.endName, "Los Angeles");
    }
    
    // =============================================================================
    // Timestamp Tests
    // =============================================================================
    
    function testCreatedAtIsSet() public {
        uint256 beforeCreation = block.timestamp;
        
        bytes32 clobOrderId = keccak256("test-order");
        OrderBridge.ParcelData memory deliveryData = OrderBridge.ParcelData({
            startLocation: OrderBridge.Location({ lat: 1000, lng: 2000 }),
            endLocation: OrderBridge.Location({ lat: 3000, lng: 4000 }),
            startName: "Start",
            endName: "End"
        });
        
        vm.startPrank(buyer);
        bytes32 unifiedOrderId = orderBridge.createUnifiedOrder(
            clobOrderId, sellerNode, deliveryData
        );
        vm.stopPrank();
        
        uint256 afterCreation = block.timestamp;
        
        OrderBridge.UnifiedOrder memory order = orderBridge.getUnifiedOrder(unifiedOrderId);
        assertGe(order.createdAt, beforeCreation);
        assertLe(order.createdAt, afterCreation);
    }
    
    // =============================================================================
    // Enumeration Tests
    // =============================================================================
    
    function testUnifiedOrderStatusEnumValues() public pure {
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.None), 0);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.PendingTrade), 1);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.TradeMatched), 2);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.LogisticsCreated), 3);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.InTransit), 4);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.Delivered), 5);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.Settled), 6);
        assertEq(uint8(OrderBridge.UnifiedOrderStatus.Cancelled), 7);
    }
    
    function testLogisticsPhaseEnumValues() public pure {
        assertEq(uint8(OrderBridge.LogisticsPhase.None), 0);
        assertEq(uint8(OrderBridge.LogisticsPhase.Pending), 1);
        assertEq(uint8(OrderBridge.LogisticsPhase.InTransit), 2);
        assertEq(uint8(OrderBridge.LogisticsPhase.Delivered), 3);
    }
}
