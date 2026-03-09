// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from 'forge-std/Test.sol';
import {DiamondTestBase} from './helpers/DiamondTestBase.sol';
import {ERC1155Mock} from './helpers/ERC1155Mock.sol';
import {RWYStakingFacet} from 'contracts/diamond/facets/RWYStakingFacet.sol';
import {OperatorFacet} from 'contracts/diamond/facets/OperatorFacet.sol';
import {RWYStorage} from 'contracts/diamond/libraries/RWYStorage.sol';

/**
 * @title RWYStakingLifecycleTest
 * @notice Comprehensive lifecycle tests for RWY staking core business logic:
 *         createOpportunity → stake → unstake / cancel+emergencyClaim / full lifecycle+claimProfits
 *
 * @dev These tests fill the gap left by RWYStakingFacet.t.sol (admin-only).
 *
 * KEY FINDING (documented by these tests):
 * PR #127 proposed adding `isApprovedForAll(address(this), address(this))` checks before
 * ERC1155 unstaking. This is ALWAYS FALSE by default and would BRICK the unstake/emergencyClaim
 * functions. The tests in Group 4 (ERC1155 unstake) explicitly assert that
 * `isApprovedForAll(diamond, diamond) == false` throughout — and the transfers still succeed.
 * This is because OZ ERC1155 checks `from == _msgSender()` first; when the Diamond calls
 * `safeTransferFrom(address(this), recipient, ...)`, `from == _msgSender()` is always true.
 * Self-approval is unnecessary and wrong.
 */
contract RWYStakingLifecycleTest is DiamondTestBase {
    RWYStakingFacet public rwy;
    OperatorFacet public ops;
    ERC1155Mock public rwaToken;  // used as both input (ERC1155 staking) and output token

    address public operator;
    address public staker1;
    address public staker2;

    uint256 constant TARGET = 1000 ether;
    uint256 constant ERC1155_TOKEN_ID = 42;
    uint256 constant ERC1155_TARGET = 1000; // 1000 tokens (no decimals)

    // ============================================================================
    // SETUP
    // ============================================================================

    function setUp() public override {
        super.setUp();

        rwy = RWYStakingFacet(address(diamond));
        ops = OperatorFacet(address(diamond));
        rwaToken = new ERC1155Mock();

        operator = makeAddr('rwyOperator');
        staker1  = makeAddr('staker1');
        staker2  = makeAddr('staker2');

        // Initialize RWY staking (sets defaults: minCollateralBps=2000, maxYieldBps=5000, fee=100, processingDays=30)
        vm.prank(owner);
        rwy.initializeRWYStaking();

        // Set quote token for profit distribution
        vm.prank(owner);
        rwy.setRWYQuoteToken(address(quoteToken));

        // Approve operator
        vm.prank(owner);
        ops.approveOperator(operator);

        // Fund stakers with ERC20 tokens
        payToken.mint(staker1, TARGET * 2);
        payToken.mint(staker2, TARGET * 2);

        // Fund stakers with ERC1155 tokens
        rwaToken.mint(staker1, ERC1155_TOKEN_ID, ERC1155_TARGET);
        rwaToken.mint(staker2, ERC1155_TOKEN_ID, ERC1155_TARGET);
    }

    // ============================================================================
    // HELPERS
    // ============================================================================

    /// @dev Creates an ERC20 staking opportunity (payToken in, rwaToken out, 0 collateral)
    function _createERC20Opportunity() internal returns (bytes32) {
        vm.prank(operator);
        return rwy.createOpportunity(
            'Gold Processing',
            'Process gold into refined bars',
            address(payToken),        // inputToken (ERC20)
            0,                        // inputTokenId = 0 → ERC20 path
            TARGET,                   // targetAmount
            address(rwaToken),        // outputToken
            TARGET * 105 / 100,       // expectedOutputAmount (5% yield)
            500,                      // promisedYieldBps (5%)
            200,                      // operatorFeeBps (2%)
            0,                        // minSalePrice (0 → collateral check skipped)
            30,                       // fundingDays
            30,                       // processingDays
            address(0),               // collateralToken (none)
            0,                        // collateralTokenId
            0                         // collateralAmount = 0 → trusted operator
        );
    }

    /// @dev Creates an ERC1155 staking opportunity (rwaToken in, quoteToken out, 0 collateral)
    function _createERC1155Opportunity() internal returns (bytes32) {
        vm.prank(operator);
        return rwy.createOpportunity(
            'RWA Token Processing',
            'Stake RWA tokens for commodity processing',
            address(rwaToken),        // inputToken (ERC1155)
            ERC1155_TOKEN_ID,         // inputTokenId > 0 → ERC1155 path
            ERC1155_TARGET,           // targetAmount (integer, no 18 decimals)
            address(quoteToken),      // outputToken
            ERC1155_TARGET * 105 / 100, // expectedOutputAmount
            500,                      // promisedYieldBps (5%)
            200,                      // operatorFeeBps (2%)
            0,                        // minSalePrice
            30,                       // fundingDays
            30,                       // processingDays
            address(0),               // no collateral
            0,
            0
        );
    }

    /// @dev Stakes ERC20 tokens as staker1 (approves + stakes)
    function _stakeERC20(bytes32 oppId, address staker, uint256 amount) internal {
        vm.startPrank(staker);
        payToken.approve(address(diamond), amount);
        rwy.stake(oppId, amount, 0);
        vm.stopPrank();
    }

    /// @dev Stakes ERC1155 tokens as a staker (setApprovalForAll + stakes)
    function _stakeERC1155(bytes32 oppId, address staker, uint256 amount) internal {
        vm.startPrank(staker);
        rwaToken.setApprovalForAll(address(diamond), true);
        rwy.stake(oppId, amount, 0);
        vm.stopPrank();
    }

    // ============================================================================
    // GROUP 1: createOpportunity
    // ============================================================================

    function test_createOpportunity_ERC20() public {
        vm.expectEmit(false, true, false, false);
        emit RWYStakingFacet.OpportunityCreated(
            bytes32(0), operator, address(payToken), 0, TARGET, 500
        );

        bytes32 oppId = _createERC20Opportunity();

        assertNotEq(oppId, bytes32(0), 'opportunity ID must be non-zero');
    }

    function test_createOpportunity_ERC1155() public {
        bytes32 oppId = _createERC1155Opportunity();
        assertNotEq(oppId, bytes32(0), 'ERC1155 opportunity ID must be non-zero');
    }

    function test_createOpportunity_revertNotApprovedOperator() public {
        address notOperator = makeAddr('notOperator');
        vm.prank(notOperator);
        vm.expectRevert(RWYStakingFacet.NotApprovedOperator.selector);
        rwy.createOpportunity(
            'Bad', 'Bad',
            address(payToken), 0, TARGET,
            address(rwaToken), TARGET, 500, 200, 0,
            30, 30, address(0), 0, 0
        );
    }

    function test_createOpportunity_revertInvalidAmount() public {
        vm.prank(operator);
        vm.expectRevert('Invalid amount');
        rwy.createOpportunity(
            'Bad', 'Bad',
            address(payToken), 0,
            0,  // targetAmount = 0 → revert
            address(rwaToken), 0, 500, 200, 0,
            30, 30, address(0), 0, 0
        );
    }

    function test_createOpportunity_revertExceedsMaxYield() public {
        vm.prank(operator);
        vm.expectRevert('Invalid yield');
        rwy.createOpportunity(
            'Bad', 'Bad',
            address(payToken), 0, TARGET,
            address(rwaToken), TARGET, 9999, 200, 0, // 99.99% > maxYieldBps(5000=50%)
            30, 30, address(0), 0, 0
        );
    }

    function test_createOpportunity_revertInvalidTimeline() public {
        vm.prank(operator);
        vm.expectRevert('Invalid timeline');
        rwy.createOpportunity(
            'Bad', 'Bad',
            address(payToken), 0, TARGET,
            address(rwaToken), TARGET, 500, 200, 0,
            0, 30, // fundingDays = 0 → revert
            address(0), 0, 0
        );
    }

    // ============================================================================
    // GROUP 2: ERC20 staking
    // ============================================================================

    function test_stake_ERC20() public {
        bytes32 oppId = _createERC20Opportunity();
        uint256 balBefore = payToken.balanceOf(staker1);

        vm.expectEmit(true, true, false, true);
        emit RWYStakingFacet.CommodityStaked(oppId, staker1, TARGET / 2, TARGET / 2);

        _stakeERC20(oppId, staker1, TARGET / 2);

        assertEq(payToken.balanceOf(staker1), balBefore - TARGET / 2, 'staker balance decreased');
        assertEq(payToken.balanceOf(address(diamond)), TARGET / 2, 'diamond received tokens');
    }

    function test_stake_ERC20_multipleStakers() public {
        bytes32 oppId = _createERC20Opportunity();

        _stakeERC20(oppId, staker1, TARGET / 4);
        _stakeERC20(oppId, staker2, TARGET / 4);

        // Both contributed, diamond holds the sum
        assertEq(payToken.balanceOf(address(diamond)), TARGET / 2);
    }

    function test_stake_ERC20_fullFunding_triggersStatus() public {
        bytes32 oppId = _createERC20Opportunity();

        // Half from staker1
        _stakeERC20(oppId, staker1, TARGET / 2);

        // Second half — should emit OpportunityFunded
        vm.expectEmit(true, false, false, true);
        emit RWYStakingFacet.OpportunityFunded(oppId, TARGET);

        _stakeERC20(oppId, staker2, TARGET / 2);

        // Subsequent stake must fail (FUNDED, not FUNDING)
        vm.startPrank(staker1);
        payToken.approve(address(diamond), 1 ether);
        vm.expectRevert(RWYStakingFacet.InvalidStatus.selector);
        rwy.stake(oppId, 1 ether, 0);
        vm.stopPrank();
    }

    function test_stake_revertFundingDeadlinePassed() public {
        bytes32 oppId = _createERC20Opportunity();

        vm.warp(block.timestamp + 31 days); // past 30-day deadline

        vm.startPrank(staker1);
        payToken.approve(address(diamond), TARGET / 2);
        vm.expectRevert(RWYStakingFacet.FundingDeadlinePassed.selector);
        rwy.stake(oppId, TARGET / 2, 0);
        vm.stopPrank();
    }

    function test_stake_revertExceedsTarget() public {
        bytes32 oppId = _createERC20Opportunity();

        vm.startPrank(staker1);
        payToken.approve(address(diamond), TARGET + 1 ether);
        vm.expectRevert(RWYStakingFacet.ExceedsTarget.selector);
        rwy.stake(oppId, TARGET + 1 ether, 0);
        vm.stopPrank();
    }

    function test_stake_revertZeroAmount() public {
        bytes32 oppId = _createERC20Opportunity();

        vm.startPrank(staker1);
        payToken.approve(address(diamond), 0);
        vm.expectRevert(RWYStakingFacet.InvalidAmount.selector);
        rwy.stake(oppId, 0, 0);
        vm.stopPrank();
    }

    // ============================================================================
    // GROUP 3: ERC1155 staking
    // ============================================================================

    function test_stake_ERC1155() public {
        bytes32 oppId = _createERC1155Opportunity();
        uint256 balBefore = rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID);

        _stakeERC1155(oppId, staker1, ERC1155_TARGET / 2);

        assertEq(
            rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID),
            balBefore - ERC1155_TARGET / 2,
            'ERC1155 staker balance decreased'
        );
        assertEq(
            rwaToken.balanceOf(address(diamond), ERC1155_TOKEN_ID),
            ERC1155_TARGET / 2,
            'diamond holds ERC1155 tokens'
        );
    }

    function test_stake_ERC1155_fullFunding() public {
        bytes32 oppId = _createERC1155Opportunity();

        vm.expectEmit(true, false, false, true);
        emit RWYStakingFacet.OpportunityFunded(oppId, ERC1155_TARGET);

        _stakeERC1155(oppId, staker1, ERC1155_TARGET / 2);
        _stakeERC1155(oppId, staker2, ERC1155_TARGET / 2);

        // Diamond holds the full target
        assertEq(rwaToken.balanceOf(address(diamond), ERC1155_TOKEN_ID), ERC1155_TARGET);
    }

    // ============================================================================
    // GROUP 4: unstake ERC20
    // ============================================================================

    function test_unstake_ERC20_partial() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);

        uint256 balBefore = payToken.balanceOf(staker1);

        vm.prank(staker1);
        rwy.unstake(oppId, TARGET / 4, 0);

        assertEq(payToken.balanceOf(staker1), balBefore + TARGET / 4, 'tokens returned');
        assertEq(payToken.balanceOf(address(diamond)), TARGET / 4, 'diamond reduced balance');
    }

    function test_unstake_ERC20_full() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);
        uint256 stakedAmt = TARGET / 2;

        uint256 balBefore = payToken.balanceOf(staker1);

        vm.prank(staker1);
        rwy.unstake(oppId, stakedAmt, 0);

        assertEq(payToken.balanceOf(staker1), balBefore + stakedAmt, 'all tokens returned');
        assertEq(payToken.balanceOf(address(diamond)), 0, 'diamond empty');
    }

    function test_unstake_revertInsufficientStake() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 4);

        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.InsufficientStake.selector);
        rwy.unstake(oppId, TARGET / 2, 0); // more than staked
    }

    function test_unstake_revertAfterFunded() public {
        bytes32 oppId = _createERC20Opportunity();
        // Fund the opportunity fully
        _stakeERC20(oppId, staker1, TARGET / 2);
        _stakeERC20(oppId, staker2, TARGET / 2);
        // Opportunity is now FUNDED → cannot unstake

        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.CannotUnstake.selector);
        rwy.unstake(oppId, TARGET / 2, 0);
    }

    // ============================================================================
    // GROUP 5: ERC1155 unstake — CRITICAL: Proving PR #127 was wrong
    //
    // PR #127 added: require(isApprovedForAll(address(this), address(this)), ...)
    // before ERC1155 transfers. This would ALWAYS revert because:
    //   - isApprovedForAll(address(this), address(this)) returns false by default
    //   - OpenZeppelin ERC1155 checks `from == _msgSender()` FIRST
    //   - When Diamond calls safeTransferFrom(address(this), user, ...) it IS the owner
    //   - No approval is needed; the require would brick unstaking permanently
    //
    // These tests explicitly assert the invariant throughout.
    // ============================================================================

    function test_unstake_ERC1155_noSelfApprovalNeeded() public {
        bytes32 oppId = _createERC1155Opportunity();
        uint256 stakeAmt = ERC1155_TARGET / 2;
        _stakeERC1155(oppId, staker1, stakeAmt);

        // Explicitly confirm the diamond has NOT granted self-approval at any point
        assertFalse(
            rwaToken.isApprovedForAll(address(diamond), address(diamond)),
            'PRE-UNSTAKE: diamond must NOT have self-approval (PR #127 check would always fail here)'
        );

        uint256 balBefore = rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID);

        // Unstake succeeds WITHOUT any self-approval — proving PR #127 was wrong
        vm.prank(staker1);
        rwy.unstake(oppId, stakeAmt, 0);

        // Confirm self-approval is still false after unstake
        assertFalse(
            rwaToken.isApprovedForAll(address(diamond), address(diamond)),
            'POST-UNSTAKE: self-approval still false (transfer worked without it)'
        );

        assertEq(
            rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID),
            balBefore + stakeAmt,
            'ERC1155 tokens returned to staker'
        );
        assertEq(
            rwaToken.balanceOf(address(diamond), ERC1155_TOKEN_ID),
            0,
            'diamond ERC1155 balance zero'
        );
    }

    function test_unstake_ERC1155_partialUnstake() public {
        bytes32 oppId = _createERC1155Opportunity();
        _stakeERC1155(oppId, staker1, ERC1155_TARGET / 2);

        vm.prank(staker1);
        rwy.unstake(oppId, ERC1155_TARGET / 4, 0);

        assertEq(rwaToken.balanceOf(address(diamond), ERC1155_TOKEN_ID), ERC1155_TARGET / 4);
        assertEq(
            rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID),
            ERC1155_TARGET - ERC1155_TARGET / 4, // original mint minus remaining stake
            'partial unstake correct'
        );
    }

    // ============================================================================
    // GROUP 6: cancel + emergencyClaim
    // ============================================================================

    function test_cancelOpportunity() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);

        vm.expectEmit(true, false, false, false);
        emit RWYStakingFacet.OpportunityCancelled(oppId, 'test cancel');

        vm.prank(operator);
        rwy.cancelOpportunity(oppId, 'test cancel');
    }

    function test_cancelOpportunity_revertNotOperator() public {
        bytes32 oppId = _createERC20Opportunity();

        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.NotOperator.selector);
        rwy.cancelOpportunity(oppId, 'not my opp');
    }

    function test_cancelOpportunity_revertAfterFunded() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);
        _stakeERC20(oppId, staker2, TARGET / 2);
        // Now FUNDED

        vm.prank(operator);
        vm.expectRevert(RWYStakingFacet.InvalidStatus.selector);
        rwy.cancelOpportunity(oppId, 'too late');
    }

    function test_emergencyClaim_ERC20() public {
        bytes32 oppId = _createERC20Opportunity();
        uint256 stakeAmt = TARGET / 2;
        _stakeERC20(oppId, staker1, stakeAmt);

        vm.prank(operator);
        rwy.cancelOpportunity(oppId, 'cancel for test');

        uint256 balBefore = payToken.balanceOf(staker1);

        vm.prank(staker1);
        rwy.emergencyClaim(oppId);

        assertEq(payToken.balanceOf(staker1), balBefore + stakeAmt, 'ERC20 tokens recovered');
    }

    function test_emergencyClaim_ERC1155_noSelfApprovalNeeded() public {
        bytes32 oppId = _createERC1155Opportunity();
        uint256 stakeAmt = ERC1155_TARGET / 2;
        _stakeERC1155(oppId, staker1, stakeAmt);

        vm.prank(operator);
        rwy.cancelOpportunity(oppId, 'cancel ERC1155');

        // Assert: no self-approval before claiming
        assertFalse(
            rwaToken.isApprovedForAll(address(diamond), address(diamond)),
            'PRE-CLAIM: no self-approval'
        );

        uint256 balBefore = rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID);

        // emergencyClaim works without self-approval (proving CEI pattern + from==msgSender)
        vm.prank(staker1);
        rwy.emergencyClaim(oppId);

        assertFalse(
            rwaToken.isApprovedForAll(address(diamond), address(diamond)),
            'POST-CLAIM: self-approval still false'
        );

        assertEq(
            rwaToken.balanceOf(staker1, ERC1155_TOKEN_ID),
            balBefore + stakeAmt,
            'ERC1155 tokens recovered on emergencyClaim'
        );
    }

    function test_emergencyClaim_revertDoubleClaim() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);

        vm.prank(operator);
        rwy.cancelOpportunity(oppId, 'cancel');

        vm.prank(staker1);
        rwy.emergencyClaim(oppId);

        // Second claim must revert
        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.AlreadyClaimed.selector);
        rwy.emergencyClaim(oppId);
    }

    function test_emergencyClaim_revertNotCancelled() public {
        bytes32 oppId = _createERC20Opportunity();
        _stakeERC20(oppId, staker1, TARGET / 2);
        // Status is still FUNDING, not CANCELLED

        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.InvalidStatus.selector);
        rwy.emergencyClaim(oppId);
    }

    function test_emergencyClaim_revertNoStake() public {
        bytes32 oppId = _createERC20Opportunity();

        vm.prank(operator);
        rwy.cancelOpportunity(oppId, 'empty cancel');

        // staker2 never staked
        vm.prank(staker2);
        vm.expectRevert(RWYStakingFacet.NoStake.selector);
        rwy.emergencyClaim(oppId);
    }

    // ============================================================================
    // GROUP 7: Full ERC20 lifecycle → createOpportunity → fund → deliver → process
    //          → recordSaleProceeds → claimProfits (two stakers, split 50/50)
    // ============================================================================

    function test_fullLifecycle_ERC20_profitDistribution() public {
        // ── 1. Create opportunity ────────────────────────────────────────────────
        bytes32 oppId = _createERC20Opportunity();

        // ── 2. Two stakers fund the opportunity 50/50 ───────────────────────────
        _stakeERC20(oppId, staker1, TARGET / 2);
        _stakeERC20(oppId, staker2, TARGET / 2);
        // Status → FUNDED

        // ── 3. Operator starts delivery ─────────────────────────────────────────
        bytes32 journeyId = keccak256('test-journey');
        vm.prank(operator);
        rwy.startDelivery(oppId, journeyId);

        // ── 4. Operator confirms delivery (delivered full target) ─────────────────
        vm.prank(operator);
        rwy.confirmDelivery(oppId, TARGET);

        // ── 5. Operator completes processing: transfers ERC1155 output to diamond ─
        //    Mint output tokens to operator, approve diamond, then completeProcessing
        uint256 outputTokenId = 99;
        uint256 outputAmount  = TARGET * 105 / 100; // 5% more than input
        rwaToken.mint(operator, outputTokenId, outputAmount);

        vm.startPrank(operator);
        rwaToken.setApprovalForAll(address(diamond), true);
        rwy.completeProcessing(oppId, outputTokenId, outputAmount);
        vm.stopPrank();
        // Status → SELLING

        // ── 6. Owner records sale proceeds (quoteToken) ──────────────────────────
        //    Fund diamond with proceeds, then record
        uint256 proceeds = 1200 ether; // 20% profit on 1000 ether staked
        quoteToken.mint(address(diamond), proceeds);

        vm.prank(owner);
        rwy.recordSaleProceeds(oppId, proceeds);
        // Status → DISTRIBUTING

        // ── 7. Calculate expected shares ─────────────────────────────────────────
        //    protocolFeeBps = 100 (1%), operatorFeeBps = 200 (2%)
        //    protocolFee = 1200 * 100 / 10000 = 12 ether
        //    operatorFee  = 1200 * 200 / 10000 = 24 ether
        //    distributable = 1200 - 12 - 24 = 1164 ether
        //    staker1 share (50%): 1164 * 5000 / 10000 = 582 ether
        //    staker2 share (50%): 582 ether
        uint256 protocolFee    = proceeds * 100 / 10000;
        uint256 operatorFee    = proceeds * 200 / 10000;
        uint256 distributable  = proceeds - protocolFee - operatorFee;
        uint256 expectedShare1 = distributable / 2;
        uint256 expectedShare2 = distributable / 2;

        // ── 8. Staker1 claims profits ─────────────────────────────────────────────
        uint256 qtBalBefore1 = quoteToken.balanceOf(staker1);

        vm.expectEmit(true, true, false, false);
        emit RWYStakingFacet.ProfitDistributed(oppId, staker1, TARGET / 2, expectedShare1);

        vm.prank(staker1);
        rwy.claimProfits(oppId);

        assertEq(
            quoteToken.balanceOf(staker1),
            qtBalBefore1 + expectedShare1,
            'staker1 received correct profit share'
        );

        // ── 9. Staker2 claims profits ─────────────────────────────────────────────
        uint256 qtBalBefore2 = quoteToken.balanceOf(staker2);

        vm.prank(staker2);
        rwy.claimProfits(oppId);

        assertEq(
            quoteToken.balanceOf(staker2),
            qtBalBefore2 + expectedShare2,
            'staker2 received correct profit share'
        );

        // ── 10. Double claim reverts ──────────────────────────────────────────────
        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.AlreadyClaimed.selector);
        rwy.claimProfits(oppId);
    }

    // ============================================================================
    // GROUP 8: Opportunity not found
    // ============================================================================

    function test_stake_revertOpportunityNotFound() public {
        bytes32 fakeId = keccak256('nonexistent');

        vm.startPrank(staker1);
        payToken.approve(address(diamond), TARGET);
        vm.expectRevert(RWYStakingFacet.OpportunityNotFound.selector);
        rwy.stake(fakeId, TARGET, 0);
        vm.stopPrank();
    }

    function test_unstake_revertOpportunityNotFound() public {
        bytes32 fakeId = keccak256('nonexistent');

        vm.prank(staker1);
        vm.expectRevert(RWYStakingFacet.OpportunityNotFound.selector);
        rwy.unstake(fakeId, 1, 0);
    }
}
