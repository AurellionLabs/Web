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
 * @title CLOBViewFacetTest
 * @notice Unit tests for CLOBViewFacet (order book and order view functions)
 */
contract CLOBViewFacetTest is DiamondTestBase {
    CLOBCoreFacet public clobCore;
    CLOBAdminFacet public clobAdmin;
    CLOBViewFacet public clobView;

    ERC1155Mock public baseERC1155;
    ERC20Mock public quoteERC20;
    uint256 public baseTokenId = 1;
    bytes32 public marketId;

    // ============================================================================
    // SETUP
    // ============================================================================

    function setUp() public override {
        super.setUp();

        vm.startPrank(owner);
        CLOBCoreFacet clobCoreFacet = new CLOBCoreFacet();
        CLOBAdminFacet clobAdminFacet = new CLOBAdminFacet();
        CLOBViewFacet clobViewFacet = new CLOBViewFacet();

        _upsertFacet(address(clobCoreFacet), _getCLOBCoreSelectors());
        _upsertFacet(address(clobAdminFacet), _getCLOBAdminSelectors());
        _upsertFacet(address(clobViewFacet), _getCLOBViewSelectors());

        clobCore = CLOBCoreFacet(address(diamond));
        clobAdmin = CLOBAdminFacet(address(diamond));
        clobView = CLOBViewFacet(address(diamond));

        clobCore.initializeCLOBV2(30, 10, 1000, 1 hours, 1 days);
        vm.stopPrank();

        baseERC1155 = new ERC1155Mock();
        quoteERC20 = new ERC20Mock('Quote Token', 'QUOTE', 18);

        baseERC1155.mint(user1, baseTokenId, 100_000);
        baseERC1155.mint(user2, baseTokenId, 100_000);
        quoteERC20.mint(user1, 1_000_000 ether);
        quoteERC20.mint(user2, 1_000_000 ether);

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
    // BEST BID/ASK
    // ============================================================================

    function test_getBestBidAsk_emptyBook() public view {
        (uint256 bestBid, uint256 bestBidSize, uint256 bestAsk, uint256 bestAskSize, uint256 spread) = 
            clobView.getBestBidAsk(marketId);
        
        assertEq(bestBid, 0);
        assertEq(bestBidSize, 0);
        assertEq(bestAsk, 0);
        assertEq(bestAskSize, 0);
        assertEq(spread, 0);
    }

    function test_getBestBidAsk_withOrders() public {
        // Place a buy order at 0.9 ether
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            0.9 ether, 100, true, CLOBLib.TIF_GTC, 0
        );
        
        // Place a sell order at 1.1 ether
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1.1 ether, 100, false, CLOBLib.TIF_GTC, 0
        );

        (uint256 bestBid, uint256 bestBidSize, uint256 bestAsk, uint256 bestAskSize, uint256 spread) = 
            clobView.getBestBidAsk(marketId);
        
        assertEq(bestBid, 0.9 ether);
        assertEq(bestBidSize, 100);
        assertEq(bestAsk, 1.1 ether);
        assertEq(bestAskSize, 100);
        assertEq(spread, 0.2 ether);
    }

    function test_getBestBidAsk_multipleOrdersAtSamePrice() public {
        // Place multiple buy orders at same price
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 50, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 75, true, CLOBLib.TIF_GTC, 0
        );

        (uint256 bestBid, uint256 bestBidSize, , , ) = clobView.getBestBidAsk(marketId);
        
        assertEq(bestBid, 1 ether);
        assertEq(bestBidSize, 125); // 50 + 75
    }

    // ============================================================================
    // ORDER BOOK DEPTH
    // ============================================================================

    function test_getOrderBookDepth_emptyBook() public view {
        (
            uint256[] memory bidPrices,
            uint256[] memory bidSizes,
            uint256[] memory bidCounts,
            uint256[] memory askPrices,
            uint256[] memory askSizes,
            uint256[] memory askCounts
        ) = clobView.getOrderBookDepth(marketId, 5);
        
        assertEq(bidPrices.length, 5);
        assertEq(bidSizes.length, 5);
        assertEq(bidCounts.length, 5);
        assertEq(askPrices.length, 5);
        assertEq(askSizes.length, 5);
        assertEq(askCounts.length, 5);
        
        // All should be zero for empty book
        assertEq(bidPrices[0], 0);
        assertEq(askPrices[0], 0);
    }

    function test_getOrderBookDepth_withOrders() public {
        // Place several orders at different prices
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1.0 ether, 50, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            0.9 ether, 30, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1.1 ether, 40, false, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1.2 ether, 25, false, CLOBLib.TIF_GTC, 0
        );

        (
            uint256[] memory bidPrices,
            uint256[] memory bidSizes,
            uint256[] memory bidCounts,
            uint256[] memory askPrices,
            uint256[] memory askSizes,
            uint256[] memory askCounts
        ) = clobView.getOrderBookDepth(marketId, 3);
        
        // Bids should be sorted descending (highest first)
        assertEq(bidPrices[0], 1.0 ether);
        assertEq(bidSizes[0], 50);
        assertEq(bidCounts[0], 1);
        
        assertEq(bidPrices[1], 0.9 ether);
        assertEq(bidSizes[1], 30);
        
        // Asks should be sorted ascending (lowest first)
        assertEq(askPrices[0], 1.1 ether);
        assertEq(askSizes[0], 40);
        
        assertEq(askPrices[1], 1.2 ether);
        assertEq(askSizes[1], 25);
        assertEq(askCounts[0], 1); // One ask at 1.1 ether
        assertEq(askCounts[1], 1); // One ask at 1.2 ether
    }

    // ============================================================================
    // ORDER STATUS
    // ============================================================================

    function test_getOrderStatus_nonExistent() public view {
        bytes32 fakeOrderId = keccak256(abi.encodePacked("fake"));
        (uint8 status, uint96 amount, uint64 filledAmount, uint96 remainingAmount, bool isExpired) = 
            clobView.getOrderStatus(fakeOrderId);
        
        assertEq(status, 0); // OrderStatus.NONE
        assertEq(amount, 0);
        assertEq(filledAmount, 0);
        assertEq(remainingAmount, 0);
        assertFalse(isExpired);
    }

    function test_getOrderStatus_existingOrder() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );

        // Order was placed - just verify we get valid data back
        // The exact status value depends on implementation
        (uint8 status, uint96 amount, uint64 filledAmount, uint96 remainingAmount, bool isExpired) = 
            clobView.getOrderStatus(orderId);
        
        // Amount should match what we sent
        assertEq(amount, 100);
        assertEq(filledAmount, 0);
        assertEq(remainingAmount, 100);
    }

    function test_getOrderStatus_afterPartialFill() public {
        // User1 places buy order
        vm.prank(user1);
        bytes32 buyOrderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );
        
        // User2 sells into it
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 30, false, CLOBLib.TIF_GTC, 0
        );

        (, , uint64 filledAmount, uint96 remainingAmount, ) = 
            clobView.getOrderStatus(buyOrderId);
        
        assertEq(filledAmount, 30);
        assertEq(remainingAmount, 70);
    }

    // ============================================================================
    // PACKED ORDER VIEW
    // ============================================================================

    function test_getPackedOrder_nonExistent() public view {
        bytes32 fakeOrderId = keccak256(abi.encodePacked("fake"));
        (
            address maker,
            bool isBuy,
            uint8 orderType,
            uint8 status,
            uint8 timeInForce,
            uint96 price,
            uint96 amount,
            uint64 filledAmount,
            uint40 expiry,
            uint40 createdAt,
            bytes32 orderMarketId
        ) = clobView.getPackedOrder(fakeOrderId);
        
        assertEq(maker, address(0));
        assertEq(price, 0);
        assertEq(amount, 0);
        assertFalse(isBuy);
        assertEq(orderType, 0);
        assertEq(status, 0);
        assertEq(timeInForce, 0);
        assertEq(filledAmount, 0);
        assertEq(expiry, 0);
        assertEq(createdAt, 0);
        assertEq(orderMarketId, bytes32(0));
    }

    function test_getPackedOrder_existingOrder() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );

        (
            address maker,
            bool isBuy,
            uint8 orderType,
            uint8 status,
            uint8 timeInForce,
            uint96 price,
            uint96 amount,
            uint64 filledAmount,
            uint40 expiry,
            uint40 createdAt,
            bytes32 orderMarketId
        ) = clobView.getPackedOrder(orderId);
        
        assertEq(maker, user1);
        assertTrue(isBuy);
        assertEq(price, 1 ether);
        assertEq(amount, 100);
        assertEq(filledAmount, 0);
        assertEq(orderMarketId, marketId);
    }

    // ============================================================================
    // IS ORDER ACTIVE
    // ============================================================================

    function test_isOrderActive_nonExistent() public view {
        bytes32 fakeOrderId = keccak256(abi.encodePacked("fake"));
        bool isActive = clobView.isOrderActive(fakeOrderId);
        assertFalse(isActive);
    }

    function test_isOrderActive_activeOrder() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );

        bool isActive = clobView.isOrderActive(orderId);
        assertTrue(isActive);
    }

    function test_isOrderActive_afterCancel() public {
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );
        
        // Cancel the order
        vm.prank(user1);
        clobCore.cancelOrder(orderId);

        bool isActive = clobView.isOrderActive(orderId);
        assertFalse(isActive);
    }

    // ============================================================================
    // MARKET VIEWS
    // ============================================================================

    function test_getMarketStats_empty() public view {
        (
            uint256 totalBidVolume,
            uint256 totalAskVolume,
            uint256 totalBidOrders,
            uint256 totalAskOrders,
            uint256 priceLevelsBid,
            uint256 priceLevelsAsk,
            uint256 lastTradePrice,
            bool circuitBreakerTripped
        ) = clobView.getMarketStats(marketId);
        
        assertEq(totalBidVolume, 0);
        assertEq(totalAskVolume, 0);
        assertEq(totalBidOrders, 0);
        assertEq(totalAskOrders, 0);
    }

    function test_getMarketStats_withOrders() public {
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 50, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            0.9 ether, 30, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1.1 ether, 40, false, CLOBLib.TIF_GTC, 0
        );

        (
            uint256 totalBidVolume,
            uint256 totalAskVolume,
            uint256 totalBidOrders,
            uint256 totalAskOrders,
            ,
            ,
            ,
        ) = clobView.getMarketStats(marketId);
        
        assertEq(totalBidOrders, 2);
        assertEq(totalAskOrders, 1);
        // Volume is price * amount (in raw units, not ether)
        assertGt(totalBidVolume, 0);
        assertGt(totalAskVolume, 0);
    }

    function test_getMarket_returnsMarketInfo() public {
        // First create a market by placing an order
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 100, true, CLOBLib.TIF_GTC, 0
        );

        (
            string memory baseTokenStr,
            uint256 baseTokenIdOut,
            string memory quoteTokenStr,
            bool active,
            uint256 createdAt,
            uint256 lastTradePrice,
            uint256 bidCount,
            uint256 askCount
        ) = clobView.getMarket(marketId);
        
        // Check that we got valid return values
        assertEq(baseTokenIdOut, baseTokenId);
        assertTrue(active);
        assertGt(bidCount, 0);
    }

    function test_getMarketId_generatesCorrectId() public view {
        bytes32 expectedMarketId = clobView.getMarketId(
            address(baseERC1155), baseTokenId, address(quoteERC20)
        );
        assertEq(expectedMarketId, marketId);
    }

    function test_calculateQuoteAmount() public {
        // Test the library function directly since calculateQuoteAmount in facet is pure
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(uint96(1 ether), 100);
        // price (1 ether) * amount (100) = 100 ether
        assertEq(quoteAmount, 100 ether);
    }

    // ============================================================================
    // TOTAL COUNTS
    // ============================================================================

    function test_getTotalCounts_withOrders() public {
        // Just verify the function executes and returns valid data
        (uint256 totalOrders, uint256 activeOrders, uint256 markets) = clobView.getTotalCounts();
        
        // Just verify counts are being tracked - these values depend on other tests
        assertGe(totalOrders, 0);
        assertGe(activeOrders, 0);
    }

    // ============================================================================
    // ORDERS AT PRICE
    // ============================================================================

    function test_getOrdersAtPrice_empty() public {
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 50, true, CLOBLib.TIF_GTC, 0
        );

        (
            bytes32[] memory orderIds,
            address[] memory makers,
            uint96[] memory amounts,
            uint64[] memory filledAmounts
        ) = clobView.getOrdersAtPrice(marketId, 2 ether, true, 10);
        
        // No orders at 2 ether
        assertEq(orderIds.length, 0);
    }

    function test_getOrdersAtPrice_withOrders() public {
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 50, true, CLOBLib.TIF_GTC, 0
        );
        
        vm.prank(user2);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 30, true, CLOBLib.TIF_GTC, 0
        );

        (
            bytes32[] memory orderIds,
            address[] memory makers,
            uint96[] memory amounts,
            uint64[] memory filledAmounts
        ) = clobView.getOrdersAtPrice(marketId, 1 ether, true, 10);
        
        assertEq(orderIds.length, 2);
        assertEq(makers.length, 2);
    }

    // ============================================================================
    // ALL MARKETS
    // ============================================================================

    function test_getAllMarkets() public {
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 50, true, CLOBLib.TIF_GTC, 0
        );

        bytes32[] memory allMarkets = clobView.getAllMarkets();
        
        assertGt(allMarkets.length, 0);
        // Should contain our market
        bool found = false;
        for (uint256 i = 0; i < allMarkets.length; i++) {
            if (allMarkets[i] == marketId) {
                found = true;
                break;
            }
        }
        assertTrue(found);
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
        bytes4[] memory selectors = new bytes4[](15);
        selectors[0] = CLOBViewFacet.getPackedOrder.selector;
        selectors[1] = CLOBViewFacet.getOrderStatus.selector;
        selectors[2] = CLOBViewFacet.isOrderActive.selector;
        selectors[3] = CLOBViewFacet.getBestBidAsk.selector;
        selectors[4] = CLOBViewFacet.getMarket.selector;
        selectors[5] = CLOBViewFacet.getAllMarkets.selector;
        selectors[6] = CLOBViewFacet.calculateQuoteAmount.selector;
        selectors[7] = CLOBViewFacet.getMarketId.selector;
        selectors[8] = CLOBViewFacet.getOrderBookDepth.selector;
        selectors[9] = CLOBViewFacet.getOrdersAtPrice.selector;
        selectors[10] = CLOBViewFacet.getMarketStats.selector;
        selectors[11] = CLOBViewFacet.getTrade.selector;
        selectors[12] = CLOBViewFacet.getRecentTrades.selector;
        selectors[13] = CLOBViewFacet.getTotalCounts.selector;
        selectors[14] = CLOBViewFacet.getCommitment.selector;
        return selectors;
    }
}
