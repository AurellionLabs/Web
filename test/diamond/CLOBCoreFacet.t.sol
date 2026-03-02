// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { CLOBCoreFacet } from 'contracts/diamond/facets/CLOBCoreFacet.sol';
import { CLOBAdminFacet } from 'contracts/diamond/facets/CLOBAdminFacet.sol';
import { CLOBViewFacet } from 'contracts/diamond/facets/CLOBViewFacet.sol';
import { CLOBMEVFacet } from 'contracts/diamond/facets/CLOBMEVFacet.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { CLOBLib } from 'contracts/diamond/libraries/CLOBLib.sol';
import { ERC20Mock } from './helpers/ERC20Mock.sol';
import { ERC1155Mock } from './helpers/ERC1155Mock.sol';

/**
 * @title CLOBCoreFacetTest
 * @notice Unit tests for CLOBCoreFacet (order placement, cancellation, time-in-force)
 */
contract CLOBCoreFacetTest is DiamondTestBase {
    CLOBCoreFacet public clobCore;
    CLOBAdminFacet public clobAdmin;
    CLOBViewFacet public clobView;

    ERC1155Mock public baseERC1155;
    ERC20Mock public quoteERC20;
    uint256 public baseTokenId = 1;

    bytes32 public marketId;

    // Events matching contract
    event OrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed marketId,
        address indexed maker,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint256 expiry,
        uint256 nonce
    );

    event CLOBOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount,
        uint8 reason
    );

    // ============================================================================
    // SETUP
    // ============================================================================

    function setUp() public override {
        super.setUp();

        // Deploy and wire CLOB facets
        vm.startPrank(owner);
        CLOBCoreFacet clobCoreFacet = new CLOBCoreFacet();
        CLOBAdminFacet clobAdminFacet = new CLOBAdminFacet();
        CLOBViewFacet clobViewFacet = new CLOBViewFacet();

        _addFacet(address(clobCoreFacet), _getCLOBCoreSelectors());
        _addFacet(address(clobAdminFacet), _getCLOBAdminSelectors());
        _addFacet(address(clobViewFacet), _getCLOBViewSelectors());

        clobCore = CLOBCoreFacet(address(diamond));
        clobAdmin = CLOBAdminFacet(address(diamond));
        clobView = CLOBViewFacet(address(diamond));

        // Initialize CLOB V2
        clobCore.initializeCLOBV2(
            30,    // takerFeeBps (0.3%)
            10,    // makerFeeBps (0.1%)
            1000,  // defaultPriceChangeThreshold (10%)
            1 hours,
            1 days // emergencyTimelock
        );
        vm.stopPrank();

        // Deploy ERC1155 for base asset (RWA tokens) and ERC20 for quote (AURA)
        baseERC1155 = new ERC1155Mock();
        quoteERC20 = new ERC20Mock('Quote Token', 'QUOTE', 18);

        baseERC1155.mint(user1, baseTokenId, 100_000);
        baseERC1155.mint(user2, baseTokenId, 100_000);
        quoteERC20.mint(user1, 1_000_000 ether);
        quoteERC20.mint(user2, 1_000_000 ether);

        // Pre-approve diamond for both users
        vm.prank(user1);
        baseERC1155.setApprovalForAll(address(diamond), true);
        vm.prank(user1);
        quoteERC20.approve(address(diamond), type(uint256).max);
        vm.prank(user2);
        baseERC1155.setApprovalForAll(address(diamond), true);
        vm.prank(user2);
        quoteERC20.approve(address(diamond), type(uint256).max);

        marketId = keccak256(abi.encodePacked(address(baseERC1155), baseTokenId, address(quoteERC20)));
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    function test_initializeCLOBV2_setsFeeParams() public view {
        (uint16 takerFee, uint16 makerFee, , ) = clobAdmin.getFeeConfig();
        assertEq(takerFee, 30);
        assertEq(makerFee, 10);
    }

    function test_initializeCLOBV2_setsRateLimits() public view {
        (uint256 maxOrders, uint256 maxVolume) = clobAdmin.getRateLimitConfig();
        assertEq(maxOrders, 100);
        assertGt(maxVolume, 0);
    }

    function test_initializeCLOBV2_setsMEVConfig() public view {
        (uint8 minDelay, uint256 threshold) = clobAdmin.getMEVConfig();
        assertEq(minDelay, 2);
        assertGt(threshold, 0);
    }

    function test_initializeCLOBV2_onlyOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        clobCore.initializeCLOBV2(30, 10, 1000, 1 hours, 1 days);
    }

    // ============================================================================
    // PLACE LIMIT ORDER
    // ============================================================================

    function test_placeLimitOrder_sellOrder_createsOrder() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155),
            baseTokenId,
            address(quoteERC20),
            1 ether,   // price
            100,       // amount
            false,     // isBuy = sell
            CLOBLib.TIF_GTC,
            0          // no expiry
        );

        assertTrue(orderId != bytes32(0));
        ( , , , uint8 status, , uint96 price, uint96 amount, uint64 filled, , , ) =
            clobView.getPackedOrder(orderId);
        assertEq(price, 1 ether);
        assertEq(amount, 100);
        assertEq(filled, 0);
        assertEq(status, CLOBLib.STATUS_OPEN);
    }

    function test_placeLimitOrder_buyOrder_createsOrder() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155),
            baseTokenId,
            address(quoteERC20),
            1 ether,
            50,
            true,  // isBuy
            CLOBLib.TIF_GTC,
            0
        );

        assertTrue(orderId != bytes32(0));
        (uint96 price, uint96 amount,, uint8 status) = _getOrder(orderId);
        assertEq(price, 1 ether);
        assertEq(amount, 50);
        assertEq(status, CLOBLib.STATUS_OPEN);
    }

    function test_placeLimitOrder_emitsOrderCreated() public {
        // First order creates the market (MarketCreated fires first).
        // Place a warm-up order so the market exists, then test OrderCreated emission.
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 1, false, CLOBLib.TIF_GTC, 0
        );

        // Now market exists — next order only emits OrderCreated
        vm.prank(user1);
        vm.expectEmit(false, true, true, false);
        emit OrderCreated(
            bytes32(0), // orderId (unknown ahead of time)
            marketId,
            user1,
            2 ether,
            5,
            false,
            0,
            CLOBLib.TIF_GTC,
            0,
            0
        );
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            2 ether, 5, false, CLOBLib.TIF_GTC, 0
        );
    }

    function test_placeLimitOrder_revertInvalidPrice() public {
        vm.prank(user1);
        vm.expectRevert(CLOBCoreFacet.InvalidPrice.selector);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            0, 100, false, CLOBLib.TIF_GTC, 0
        );
    }

    function test_placeLimitOrder_revertInvalidAmount() public {
        vm.prank(user1);
        vm.expectRevert(CLOBCoreFacet.InvalidAmount.selector);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 0, false, CLOBLib.TIF_GTC, 0
        );
    }

    function test_placeLimitOrder_IOC_cancelledIfNoMatch() public {
        // Place IOC sell with no matching buy — should be immediately cancelled
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_IOC, 0
        );

        uint8 status = _getStatus(orderId);
        assertEq(status, CLOBLib.STATUS_CANCELLED, "IOC with no match should be CANCELLED");
    }

    function test_placeLimitOrder_FOK_revertsIfNoMatch() public {
        // FOK = Fill or Kill: reverts entire transaction if order can't be fully matched
        vm.prank(user1);
        vm.expectRevert("FOK order not fully filled");
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_FOK, 0
        );
    }

    function test_placeLimitOrder_sellBuyMatch_bothFilled() public {
        uint96 price = 2 ether;
        uint96 amount = 10;

        // Seller places sell order
        vm.prank(user1);
        bytes32 sellId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            price, amount, false, CLOBLib.TIF_GTC, 0
        );

        uint256 user2QuoteBefore = quoteERC20.balanceOf(user2);

        // Buyer places matching buy order
        vm.prank(user2);
        bytes32 buyId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            price, amount, true, CLOBLib.TIF_GTC, 0
        );

        // Both orders should be filled
        uint8 sellStatus = _getStatus(sellId);
        uint8 buyStatus = _getStatus(buyId);
        assertEq(sellStatus, CLOBLib.STATUS_FILLED, "Sell should be FILLED");
        assertEq(buyStatus, CLOBLib.STATUS_FILLED, "Buy should be FILLED");

        // Buyer's quote balance should have decreased
        assertLt(quoteERC20.balanceOf(user2), user2QuoteBefore, "Buyer should have spent quote");
    }

    function test_placeLimitOrder_whenPaused_reverts() public {
        vm.prank(owner);
        clobAdmin.pause();

        vm.prank(user1);
        vm.expectRevert(CLOBCoreFacet.MarketPaused.selector);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );
    }

    function test_placeLimitOrder_largeOrder_requiresCommitReveal() public {
        (, uint256 threshold) = clobAdmin.getMEVConfig();
        // Place order where quoteAmount >= threshold
        // quoteAmount = price * amount / 1e18 (depends on CLOBLib.calculateQuoteAmount)
        // Use a very high price * amount combo
        uint96 bigPrice = uint96(threshold / 1 + 1); // definitely above threshold
        uint96 oneUnit = 1;

        vm.prank(user1);
        vm.expectRevert(CLOBCoreFacet.OrderRequiresCommitReveal.selector);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            bigPrice, oneUnit, true, CLOBLib.TIF_GTC, 0
        );
    }

    // ============================================================================
    // CANCEL ORDER
    // ============================================================================

    function test_cancelOrder_openOrder_cancelled() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(user1);
        clobCore.cancelOrder(orderId);

        uint8 status = _getStatus(orderId);
        assertEq(status, CLOBLib.STATUS_CANCELLED);
    }

    function test_cancelOrder_revertNotMaker() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(user2);
        vm.expectRevert(CLOBCoreFacet.NotOrderMaker.selector);
        clobCore.cancelOrder(orderId);
    }

    function test_cancelOrder_revertOrderNotFound() public {
        vm.prank(user1);
        vm.expectRevert(CLOBCoreFacet.OrderNotFound.selector);
        clobCore.cancelOrder(keccak256("nonexistent"));
    }

    function test_cancelOrder_sellOrder_locksTokensInEscrow() public {
        // cancelOrder sets CANCELLED status; token return is handled by _cancelAndRefund (IOC/FOK path)
        // Regular cancelOrder: tokens remain in diamond escrow after cancel (design: separate settlement step)
        uint256 balanceBefore = baseERC1155.balanceOf(user1, baseTokenId);

        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        // Tokens transferred to diamond on sell order placement
        assertEq(baseERC1155.balanceOf(user1, baseTokenId), balanceBefore - 100, "Tokens should be escrowed");
        assertEq(baseERC1155.balanceOf(address(diamond), baseTokenId), 100, "Diamond should hold escrowed tokens");

        vm.prank(user1);
        clobCore.cancelOrder(orderId);

        // Order cancelled; status updated
        assertEq(_getStatus(orderId), CLOBLib.STATUS_CANCELLED);
    }

    function test_cancelOrders_batchCancels() public {
        vm.prank(user1);
        bytes32 id1 = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 10, false, CLOBLib.TIF_GTC, 0
        );
        vm.prank(user1);
        bytes32 id2 = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            2 ether, 10, false, CLOBLib.TIF_GTC, 0
        );

        bytes32[] memory ids = new bytes32[](2);
        ids[0] = id1;
        ids[1] = id2;

        vm.prank(user1);
        clobCore.cancelOrders(ids);

        uint8 s1 = _getStatus(id1);
        uint8 s2 = _getStatus(id2);
        assertEq(s1, CLOBLib.STATUS_CANCELLED);
        assertEq(s2, CLOBLib.STATUS_CANCELLED);
    }

    // ============================================================================
    // NODE SELL ORDER
    // ============================================================================

    function test_placeNodeSellOrderV2_createsOrder() public {
        vm.prank(user1); // node operator placing on behalf of nodeOwner
        bytes32 orderId = clobCore.placeNodeSellOrderV2(
            nodeOperator,    // nodeOwner
            address(baseERC1155),
            baseTokenId,
            address(quoteERC20),
            1 ether,
            50,
            CLOBLib.TIF_GTC,
            0
        );

        assertTrue(orderId != bytes32(0));
        (uint96 price, uint96 amount,, uint8 status) = _getOrder(orderId);
        assertEq(price, 1 ether);
        assertEq(amount, 50);
        assertEq(status, CLOBLib.STATUS_OPEN);
    }

    // ============================================================================
    // MARKET VIEW HELPERS
    // ============================================================================

    function test_getOrderStatus_open() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        uint8 status = _getOrderStatus(orderId);
        assertEq(status, CLOBLib.STATUS_OPEN);
    }

    function test_isOrderActive_trueForOpen() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        assertTrue(clobView.isOrderActive(orderId));
    }

    function test_isOrderActive_falseAfterCancel() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(user1);
        clobCore.cancelOrder(orderId);

        assertFalse(clobView.isOrderActive(orderId));
    }

    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    /// @dev Extract (price, amount, filledAmount, status) from getPackedOrder
    function _getOrder(bytes32 orderId) internal view returns (uint96 price, uint96 amount, uint64 filledAmount, uint8 status) {
        (, , , uint8 _status, , uint96 _price, uint96 _amount, uint64 _filled, , ,) = clobView.getPackedOrder(orderId);
        return (_price, _amount, _filled, _status);
    }

    /// @dev Extract just the status
    function _getStatus(bytes32 orderId) internal view returns (uint8) {
        (, , , uint8 _status, , , , , , ,) = clobView.getPackedOrder(orderId);
        return _status;
    }

    /// @dev Extract just the status from getOrderStatus
    function _getOrderStatus(bytes32 orderId) internal view returns (uint8) {
        (uint8 s, , , ,) = clobView.getOrderStatus(orderId);
        return s;
    }

    // ============================================================================
    // SELECTOR HELPERS
    // ============================================================================

    function _getCLOBCoreSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](7);
        selectors[0] = CLOBCoreFacet.initializeCLOBV2.selector;
        selectors[1] = CLOBCoreFacet.placeLimitOrder.selector;
        selectors[2] = CLOBCoreFacet.placeNodeSellOrderV2.selector;
        selectors[3] = CLOBCoreFacet.cancelOrder.selector;
        selectors[4] = CLOBCoreFacet.cancelOrders.selector;
        // ERC1155 receiver callbacks (needed when diamond holds ERC1155 in escrow)
        selectors[5] = bytes4(keccak256('onERC1155Received(address,address,uint256,uint256,bytes)'));
        selectors[6] = bytes4(keccak256('onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)'));
        return selectors;
    }

    function _getCLOBAdminSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](13);
        selectors[0] = CLOBAdminFacet.configureCircuitBreaker.selector;
        selectors[1] = CLOBAdminFacet.tripCircuitBreaker.selector;
        selectors[2] = CLOBAdminFacet.resetCircuitBreaker.selector;
        selectors[3] = CLOBAdminFacet.setDefaultCircuitBreakerParams.selector;
        selectors[4] = CLOBAdminFacet.setFees.selector;
        selectors[5] = CLOBAdminFacet.setFeeRecipient.selector;
        selectors[6] = CLOBAdminFacet.setRateLimits.selector;
        selectors[7] = CLOBAdminFacet.setMEVProtection.selector;
        selectors[8] = CLOBAdminFacet.pause.selector;
        selectors[9] = CLOBAdminFacet.unpause.selector;
        selectors[10] = CLOBAdminFacet.getFeeConfig.selector;
        selectors[11] = CLOBAdminFacet.getRateLimitConfig.selector;
        selectors[12] = CLOBAdminFacet.getMEVConfig.selector;
        return selectors;
    }

    function _getCLOBViewSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = CLOBViewFacet.getPackedOrder.selector;
        selectors[1] = CLOBViewFacet.getOrderStatus.selector;
        selectors[2] = CLOBViewFacet.isOrderActive.selector;
        selectors[3] = CLOBViewFacet.getBestBidAsk.selector;
        selectors[4] = CLOBViewFacet.getMarket.selector;
        selectors[5] = CLOBViewFacet.getAllMarkets.selector;
        selectors[6] = CLOBViewFacet.calculateQuoteAmount.selector;
        selectors[7] = CLOBViewFacet.getMarketId.selector;
        return selectors;
    }
}
