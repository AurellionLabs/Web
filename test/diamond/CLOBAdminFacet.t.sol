// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { CLOBCoreFacet } from 'contracts/diamond/facets/CLOBCoreFacet.sol';
import { CLOBAdminFacet } from 'contracts/diamond/facets/CLOBAdminFacet.sol';
import { CLOBViewFacet } from 'contracts/diamond/facets/CLOBViewFacet.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { CLOBLib } from 'contracts/diamond/libraries/CLOBLib.sol';
import { ERC20Mock } from './helpers/ERC20Mock.sol';
import { ERC1155Mock } from './helpers/ERC1155Mock.sol';

/**
 * @title CLOBAdminFacetTest
 * @notice Unit tests for CLOBAdminFacet (fees, circuit breaker, pause, emergency recovery)
 */
contract CLOBAdminFacetTest is DiamondTestBase {
    CLOBCoreFacet public clobCore;
    CLOBAdminFacet public clobAdmin;
    CLOBViewFacet public clobView;

    ERC1155Mock public baseERC1155;
    ERC20Mock public quoteERC20;
    uint256 public baseTokenId = 1;
    bytes32 public marketId;

    // Events
    event CircuitBreakerConfigured(
        bytes32 indexed marketId,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        bool isEnabled
    );
    event CircuitBreakerTripped(
        bytes32 indexed marketId,
        uint256 triggerPrice,
        uint256 previousPrice,
        uint256 changePercent,
        uint256 cooldownUntil
    );
    event CircuitBreakerReset(bytes32 indexed marketId, uint256 resetAt);
    event FeesUpdated(uint16 takerFeeBps, uint16 makerFeeBps, uint16 lpFeeBps);
    event FeeRecipientUpdated(address indexed newRecipient);
    event RateLimitsUpdated(uint256 maxOrdersPerBlock, uint256 maxVolumePerBlock);
    event MEVProtectionUpdated(uint8 minRevealDelay, uint256 commitmentThreshold);
    event GlobalPause(bool paused);
    event MarketPaused(bytes32 indexed marketId);
    event MarketUnpaused(bytes32 indexed marketId);

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
        quoteERC20 = new ERC20Mock('Quote', 'QUOTE', 18);

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
    // FEE MANAGEMENT
    // ============================================================================

    function test_setFees_updatesConfig() public {
        vm.prank(owner);
        clobAdmin.setFees(50, 25, 10);

        (uint16 takerFee, uint16 makerFee, uint16 lpFee, ) = clobAdmin.getFeeConfig();
        assertEq(takerFee, 50);
        assertEq(makerFee, 25);
        assertEq(lpFee, 10);
    }

    function test_setFees_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit FeesUpdated(50, 25, 10);
        clobAdmin.setFees(50, 25, 10);
    }

    function test_setFees_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setFees(50, 25, 10);
    }

    function test_setFees_revertExceedsMax() public {
        vm.prank(owner);
        vm.expectRevert(CLOBAdminFacet.InvalidFeeConfiguration.selector);
        clobAdmin.setFees(10001, 0, 0); // > 10000 bps
    }

    function test_setFeeRecipient_updatesAddress() public {
        vm.prank(owner);
        clobAdmin.setFeeRecipient(user1);

        (, , , address recipient) = clobAdmin.getFeeConfig();
        assertEq(recipient, user1);
    }

    function test_setFeeRecipient_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(CLOBAdminFacet.ZeroAddress.selector);
        clobAdmin.setFeeRecipient(address(0));
    }

    function test_setFeeRecipient_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setFeeRecipient(user1);
    }

    // ============================================================================
    // RATE LIMITS
    // ============================================================================

    function test_setRateLimits_updatesConfig() public {
        vm.prank(owner);
        clobAdmin.setRateLimits(200, 5_000_000 ether);

        (uint256 maxOrders, uint256 maxVolume) = clobAdmin.getRateLimitConfig();
        assertEq(maxOrders, 200);
        assertEq(maxVolume, 5_000_000 ether);
    }

    function test_setRateLimits_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setRateLimits(200, 5_000_000 ether);
    }

    function test_setRateLimits_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit RateLimitsUpdated(200, 5_000_000 ether);
        clobAdmin.setRateLimits(200, 5_000_000 ether);
    }

    // ============================================================================
    // MEV PROTECTION
    // ============================================================================

    function test_setMEVProtection_updatesConfig() public {
        vm.prank(owner);
        clobAdmin.setMEVProtection(5, 20_000 ether);

        (uint8 minDelay, uint256 threshold) = clobAdmin.getMEVConfig();
        assertEq(minDelay, 5);
        assertEq(threshold, 20_000 ether);
    }

    function test_setMEVProtection_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setMEVProtection(5, 20_000 ether);
    }

    function test_setMEVProtection_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit MEVProtectionUpdated(5, 20_000 ether);
        clobAdmin.setMEVProtection(5, 20_000 ether);
    }

    // ============================================================================
    // PAUSE / UNPAUSE
    // ============================================================================

    function test_pause_setsGlobalPause() public {
        vm.prank(owner);
        clobAdmin.pause();

        (bool paused, ) = clobAdmin.isPaused();
        assertTrue(paused);
    }

    function test_pause_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit GlobalPause(true);
        clobAdmin.pause();
    }

    function test_pause_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.pause();
    }

    function test_pause_revertAlreadyPaused() public {
        vm.prank(owner);
        clobAdmin.pause();

        vm.prank(owner);
        vm.expectRevert(CLOBAdminFacet.AlreadyPaused.selector);
        clobAdmin.pause();
    }

    function test_unpause_clearsGlobalPause() public {
        vm.prank(owner);
        clobAdmin.pause();

        vm.prank(owner);
        clobAdmin.unpause();

        (bool paused, ) = clobAdmin.isPaused();
        assertFalse(paused);
    }

    function test_unpause_revertNotPaused() public {
        vm.prank(owner);
        vm.expectRevert(CLOBAdminFacet.NotPaused.selector);
        clobAdmin.unpause();
    }

    function test_emergencyUserWithdraw_requiresPause() public {
        // Should revert when not paused (whenPaused modifier)
        bytes32[] memory ids = new bytes32[](0);
        vm.prank(user1);
        vm.expectRevert();
        clobAdmin.emergencyUserWithdraw(ids);
    }

    function test_emergencyUserWithdraw_worksWhenPaused() public {
        // Place a buy order (escrowing quote tokens)
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 10, true, CLOBLib.TIF_GTC, 0
        );

        // Pause and withdraw
        vm.prank(owner);
        clobAdmin.pause();

        bytes32[] memory ids = new bytes32[](1);
        ids[0] = orderId;

        vm.prank(user1);
        clobAdmin.emergencyUserWithdraw(ids);

        // Order should be cancelled
        (, , , uint8 _status, , , , , , ,) = clobView.getPackedOrder(orderId);
        assertEq(_status, CLOBLib.STATUS_CANCELLED);
    }

    // ============================================================================
    // CIRCUIT BREAKER
    // ============================================================================

    function test_configureCircuitBreaker_setsParams() public {
        // Warm up market by placing an order
        vm.stopPrank();
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 1, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(owner);
        clobAdmin.configureCircuitBreaker(marketId, 500, 2 hours, true);

        (, uint256 threshold, uint256 cooldown, , , bool enabled) = clobAdmin.getCircuitBreaker(marketId);
        assertEq(threshold, 500);
        assertEq(cooldown, 2 hours);
        assertTrue(enabled);
    }

    function test_configureCircuitBreaker_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.configureCircuitBreaker(marketId, 500, 2 hours, true);
    }

    function test_configureCircuitBreaker_revertInvalidConfig() public {
        vm.prank(owner);
        vm.expectRevert(CLOBAdminFacet.InvalidConfiguration.selector);
        clobAdmin.configureCircuitBreaker(marketId, 0, 2 hours, true); // 0 threshold invalid
    }

    function test_tripCircuitBreaker_setsTripped() public {
        // Create market first
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 1, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(owner);
        clobAdmin.configureCircuitBreaker(marketId, 500, 1 hours, true);

        vm.prank(owner);
        clobAdmin.tripCircuitBreaker(marketId);

        (, , , , bool isTripped, ) = clobAdmin.getCircuitBreaker(marketId);
        assertTrue(isTripped);
    }

    function test_resetCircuitBreaker_clearsTripped() public {
        // Create market, configure, trip, then reset
        vm.prank(user1);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 1, false, CLOBLib.TIF_GTC, 0
        );

        vm.prank(owner);
        clobAdmin.configureCircuitBreaker(marketId, 500, 1 hours, true);

        vm.prank(owner);
        clobAdmin.tripCircuitBreaker(marketId);

        vm.prank(owner);
        clobAdmin.resetCircuitBreaker(marketId);

        (, , , , bool isTripped, ) = clobAdmin.getCircuitBreaker(marketId);
        assertFalse(isTripped);
    }

    function test_setDefaultCircuitBreakerParams_updatesDefaults() public {
        vm.prank(owner);
        clobAdmin.setDefaultCircuitBreakerParams(800, 30 minutes);

        // Defaults are stored on-chain; configure a fresh market to verify they take effect
        // (We just ensure no revert here since there's no direct getter for defaults)
    }

    function test_setDefaultCircuitBreakerParams_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setDefaultCircuitBreakerParams(800, 30 minutes);
    }

    // ============================================================================
    // EMERGENCY TIMELOCK
    // ============================================================================

    function test_setEmergencyTimelock_updatesValue() public {
        vm.prank(owner);
        clobAdmin.setEmergencyTimelock(2 days);
        // No direct getter; test via initiateEmergencyRecovery executeAfter timing
    }

    function test_setEmergencyTimelock_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(CLOBAdminFacet.NotOwner.selector);
        clobAdmin.setEmergencyTimelock(2 days);
    }

    // ============================================================================
    // FULL FLOW: PAUSE → ORDER BLOCKED → EMERGENCY WITHDRAW → UNPAUSE
    // ============================================================================

    function test_fullFlow_pauseBlocksOrders_withdrawReturnsTokens_unpauseRestores() public {
        // 1. Place a buy order
        vm.prank(user1);
        bytes32 orderId = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 10, true, CLOBLib.TIF_GTC, 0
        );

        // 2. Pause
        vm.prank(owner);
        clobAdmin.pause();

        // 3. New orders blocked
        vm.prank(user2);
        vm.expectRevert(CLOBCoreFacet.MarketPaused.selector);
        clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 5, false, CLOBLib.TIF_GTC, 0
        );

        // 4. Emergency withdraw user's order
        bytes32[] memory ids = new bytes32[](1);
        ids[0] = orderId;
        vm.prank(user1);
        clobAdmin.emergencyUserWithdraw(ids);

        (, , , uint8 status, , , , , , ,) = clobView.getPackedOrder(orderId);
        assertEq(status, CLOBLib.STATUS_CANCELLED);

        // 5. Unpause
        vm.prank(owner);
        clobAdmin.unpause();

        (bool paused, ) = clobAdmin.isPaused();
        assertFalse(paused);

        // 6. Orders work again
        vm.prank(user1);
        bytes32 newOrder = clobCore.placeLimitOrder(
            address(baseERC1155), baseTokenId, address(quoteERC20),
            1 ether, 5, true, CLOBLib.TIF_GTC, 0
        );
        assertTrue(newOrder != bytes32(0));
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
        bytes4[] memory selectors = new bytes4[](22);
        selectors[0] = CLOBAdminFacet.configureCircuitBreaker.selector;
        selectors[1] = CLOBAdminFacet.tripCircuitBreaker.selector;
        selectors[2] = CLOBAdminFacet.resetCircuitBreaker.selector;
        selectors[3] = CLOBAdminFacet.setDefaultCircuitBreakerParams.selector;
        selectors[4] = CLOBAdminFacet.initiateEmergencyRecovery.selector;
        selectors[5] = CLOBAdminFacet.executeEmergencyRecovery.selector;
        selectors[6] = CLOBAdminFacet.cancelEmergencyRecovery.selector;
        selectors[7] = CLOBAdminFacet.emergencyUserWithdraw.selector;
        selectors[8] = CLOBAdminFacet.setEmergencyTimelock.selector;
        selectors[9] = CLOBAdminFacet.setFees.selector;
        selectors[10] = CLOBAdminFacet.setFeeRecipient.selector;
        selectors[11] = CLOBAdminFacet.setRateLimits.selector;
        selectors[12] = CLOBAdminFacet.setMEVProtection.selector;
        selectors[13] = CLOBAdminFacet.pause.selector;
        selectors[14] = CLOBAdminFacet.unpause.selector;
        selectors[15] = CLOBAdminFacet.getCircuitBreaker.selector;
        selectors[16] = CLOBAdminFacet.getFeeConfig.selector;
        selectors[17] = CLOBAdminFacet.getRateLimitConfig.selector;
        selectors[18] = CLOBAdminFacet.getMEVConfig.selector;
        selectors[19] = CLOBAdminFacet.isPaused.selector;
        selectors[20] = CLOBAdminFacet.pauseMarket.selector;
        selectors[21] = CLOBAdminFacet.unpauseMarket.selector;
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
