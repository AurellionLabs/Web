// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Test.sol";
import "../contracts/RWYVault.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC1155 for testing
contract MockERC1155 is ERC1155 {
    constructor() ERC1155("https://test.uri/") {}

    function mint(address to, uint256 id, uint256 amount) external {
        _mint(to, id, amount, "");
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external {
        _mintBatch(to, ids, amounts, "");
    }
}

// Mock ERC20 (AURUM) for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock AURUM", "AURUM") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RWYVaultTest is Test {
    RWYVault public vault;
    MockERC1155 public inputToken;
    MockERC1155 public outputToken;
    MockERC20 public quoteToken;

    address public owner = address(1);
    address public operator = address(2);
    address public staker1 = address(3);
    address public staker2 = address(4);
    address public feeRecipient = address(5);

    uint256 public constant INPUT_TOKEN_ID = 1;
    uint256 public constant OUTPUT_TOKEN_ID = 2;
    uint256 public constant TARGET_AMOUNT = 100 ether;
    uint256 public constant EXPECTED_OUTPUT = 500 ether;
    uint256 public constant MIN_SALE_PRICE = 10 ether;
    uint256 public constant PROMISED_YIELD_BPS = 1500; // 15%
    uint256 public constant OPERATOR_FEE_BPS = 500; // 5%

    function setUp() public {
        vm.startPrank(owner);

        // Deploy mock tokens
        inputToken = new MockERC1155();
        outputToken = new MockERC1155();
        quoteToken = new MockERC20();

        // Deploy vault
        vault = new RWYVault(feeRecipient, address(0), address(quoteToken));

        // Approve operator
        vault.approveOperator(operator);

        vm.stopPrank();

        // Mint tokens to stakers
        inputToken.mint(staker1, INPUT_TOKEN_ID, 50 ether);
        inputToken.mint(staker2, INPUT_TOKEN_ID, 50 ether);

        // Mint output tokens to operator (for processing completion)
        outputToken.mint(operator, OUTPUT_TOKEN_ID, EXPECTED_OUTPUT);

        // Mint quote tokens for profit distribution testing
        quoteToken.mint(address(vault), 10000 ether);
    }

    // ==================== OPERATOR TESTS ====================

    function test_CreateOpportunity() public {
        vm.startPrank(operator);

        uint256 collateral = (TARGET_AMOUNT * MIN_SALE_PRICE * 2000) / (10000 * 1e18);
        
        bytes32 oppId = vault.createOpportunity{value: collateral}(
            "Goat Processing Q1",
            "Process live goats into meat products",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            PROMISED_YIELD_BPS,
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14, // funding days
            30  // processing days
        );

        vm.stopPrank();

        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);
        
        assertEq(opp.operator, operator);
        assertEq(opp.name, "Goat Processing Q1");
        assertEq(opp.targetAmount, TARGET_AMOUNT);
        assertEq(opp.stakedAmount, 0);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.FUNDING));
        assertEq(opp.promisedYieldBps, PROMISED_YIELD_BPS);
    }

    function test_CreateOpportunity_RevertIfNotApproved() public {
        address notApproved = address(99);
        vm.startPrank(notApproved);
        vm.deal(notApproved, 100 ether);

        vm.expectRevert(RWYVault.NotApprovedOperator.selector);
        vault.createOpportunity{value: 1 ether}(
            "Test",
            "Test",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            PROMISED_YIELD_BPS,
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14,
            30
        );

        vm.stopPrank();
    }

    function test_CreateOpportunity_RevertIfInsufficientCollateral() public {
        vm.startPrank(operator);
        vm.deal(operator, 0.001 ether);

        vm.expectRevert(RWYVault.InsufficientCollateral.selector);
        vault.createOpportunity{value: 0.001 ether}(
            "Test",
            "Test",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            PROMISED_YIELD_BPS,
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14,
            30
        );

        vm.stopPrank();
    }

    function test_CreateOpportunity_RevertIfYieldTooHigh() public {
        vm.startPrank(operator);
        vm.deal(operator, 100 ether);

        vm.expectRevert(RWYVault.InvalidYield.selector);
        vault.createOpportunity{value: 10 ether}(
            "Test",
            "Test",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            6000, // 60% - exceeds max 50%
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14,
            30
        );

        vm.stopPrank();
    }

    // ==================== STAKING TESTS ====================

    function test_Stake() public {
        bytes32 oppId = _createOpportunity();

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 30 ether);
        vm.stopPrank();

        IRWYVault.Stake memory stake = vault.getStake(oppId, staker1);
        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);

        assertEq(stake.amount, 30 ether);
        assertEq(opp.stakedAmount, 30 ether);
        assertFalse(stake.claimed);
    }

    function test_Stake_MultiplStakers() public {
        bytes32 oppId = _createOpportunity();

        // Staker 1 stakes
        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 30 ether);
        vm.stopPrank();

        // Staker 2 stakes
        vm.startPrank(staker2);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 20 ether);
        vm.stopPrank();

        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);
        assertEq(opp.stakedAmount, 50 ether);

        address[] memory stakers = vault.getOpportunityStakers(oppId);
        assertEq(stakers.length, 2);
    }

    function test_Stake_FullyFunded() public {
        bytes32 oppId = _createOpportunity();

        // Staker 1 stakes half
        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        // Staker 2 stakes remaining half - should trigger FUNDED status
        vm.startPrank(staker2);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.FUNDED));
        assertGt(opp.fundedAt, 0);
        assertGt(opp.processingDeadline, 0);
    }

    function test_Stake_RevertIfExceedsTarget() public {
        bytes32 oppId = _createOpportunity();

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);

        // Try to stake more than target
        inputToken.mint(staker1, INPUT_TOKEN_ID, 200 ether);
        
        vm.expectRevert(RWYVault.ExceedsTarget.selector);
        vault.stake(oppId, 150 ether);

        vm.stopPrank();
    }

    function test_Stake_RevertAfterDeadline() public {
        bytes32 oppId = _createOpportunity();

        // Fast forward past funding deadline
        vm.warp(block.timestamp + 15 days);

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);

        vm.expectRevert(RWYVault.FundingDeadlinePassed.selector);
        vault.stake(oppId, 30 ether);

        vm.stopPrank();
    }

    // ==================== UNSTAKE TESTS ====================

    function test_Unstake() public {
        bytes32 oppId = _createOpportunity();

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 30 ether);
        
        uint256 balanceBefore = inputToken.balanceOf(staker1, INPUT_TOKEN_ID);
        vault.unstake(oppId, 10 ether);
        uint256 balanceAfter = inputToken.balanceOf(staker1, INPUT_TOKEN_ID);
        
        vm.stopPrank();

        assertEq(balanceAfter - balanceBefore, 10 ether);
        
        IRWYVault.Stake memory stake = vault.getStake(oppId, staker1);
        assertEq(stake.amount, 20 ether);
    }

    function test_Unstake_RevertIfFunded() public {
        bytes32 oppId = _createOpportunity();

        // Fully fund the opportunity
        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        vm.startPrank(staker2);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        // Try to unstake after funded
        vm.startPrank(staker1);
        vm.expectRevert(RWYVault.CannotUnstake.selector);
        vault.unstake(oppId, 10 ether);
        vm.stopPrank();
    }

    // ==================== OPERATOR LIFECYCLE TESTS ====================

    function test_FullLifecycle() public {
        bytes32 oppId = _createOpportunity();

        // 1. Stakers fund the opportunity
        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        vm.startPrank(staker2);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 50 ether);
        vm.stopPrank();

        // Verify FUNDED status
        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.FUNDED));

        // 2. Operator starts delivery
        vm.startPrank(operator);
        vault.startDelivery(oppId, bytes32("journey1"));
        vm.stopPrank();

        opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.IN_TRANSIT));

        // 3. Operator confirms delivery
        vm.startPrank(operator);
        vault.confirmDelivery(oppId, TARGET_AMOUNT);
        vm.stopPrank();

        opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.PROCESSING));

        // 4. Operator completes processing
        vm.startPrank(operator);
        outputToken.setApprovalForAll(address(vault), true);
        vault.completeProcessing(oppId, OUTPUT_TOKEN_ID, EXPECTED_OUTPUT);
        vm.stopPrank();

        opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.SELLING));
    }

    function test_CancelOpportunity() public {
        bytes32 oppId = _createOpportunity();

        // Stake some tokens
        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 30 ether);
        vm.stopPrank();

        // Operator cancels
        uint256 operatorBalanceBefore = operator.balance;
        
        vm.startPrank(operator);
        vault.cancelOpportunity(oppId, "Market conditions changed");
        vm.stopPrank();

        IRWYVault.Opportunity memory opp = vault.getOpportunity(oppId);
        assertEq(uint256(opp.status), uint256(IRWYVault.OpportunityStatus.CANCELLED));

        // Verify collateral returned
        assertGt(operator.balance, operatorBalanceBefore);

        // Staker can now unstake
        vm.startPrank(staker1);
        vault.unstake(oppId, 30 ether);
        vm.stopPrank();

        IRWYVault.Stake memory stake = vault.getStake(oppId, staker1);
        assertEq(stake.amount, 0);
    }

    // ==================== ADMIN TESTS ====================

    function test_ApproveOperator() public {
        address newOperator = address(100);
        
        vm.prank(owner);
        vault.approveOperator(newOperator);

        assertTrue(vault.isApprovedOperator(newOperator));
    }

    function test_RevokeOperator() public {
        vm.prank(owner);
        vault.revokeOperator(operator);

        assertFalse(vault.isApprovedOperator(operator));
    }

    function test_SetMinCollateralBps() public {
        vm.prank(owner);
        vault.setMinCollateralBps(3000); // 30%

        // Create opportunity with new collateral requirement
        vm.startPrank(operator);
        vm.deal(operator, 100 ether);

        // Should revert with old collateral amount
        uint256 oldCollateral = (TARGET_AMOUNT * MIN_SALE_PRICE * 2000) / (10000 * 1e18);
        vm.expectRevert(RWYVault.InsufficientCollateral.selector);
        vault.createOpportunity{value: oldCollateral}(
            "Test",
            "Test",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            PROMISED_YIELD_BPS,
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14,
            30
        );

        vm.stopPrank();
    }

    function test_Pause() public {
        vm.prank(owner);
        vault.pause();

        bytes32 oppId = _createOpportunity();

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        
        vm.expectRevert("Pausable: paused");
        vault.stake(oppId, 30 ether);
        
        vm.stopPrank();
    }

    function test_Unpause() public {
        vm.prank(owner);
        vault.pause();

        vm.prank(owner);
        vault.unpause();

        bytes32 oppId = _createOpportunity();

        vm.startPrank(staker1);
        inputToken.setApprovalForAll(address(vault), true);
        vault.stake(oppId, 30 ether);
        vm.stopPrank();

        IRWYVault.Stake memory stake = vault.getStake(oppId, staker1);
        assertEq(stake.amount, 30 ether);
    }

    // ==================== VIEW FUNCTION TESTS ====================

    function test_GetOperatorStats() public {
        bytes32 oppId = _createOpportunity();

        (bool approved, uint256 reputation, uint256 successfulOps, uint256 totalValue) = 
            vault.getOperatorStats(operator);

        assertTrue(approved);
        assertEq(reputation, 0);
        assertEq(successfulOps, 0);
        assertEq(totalValue, 0);
    }

    function test_CalculateExpectedProfit() public {
        bytes32 oppId = _createOpportunity();

        (uint256 expectedProfit, uint256 userShareBps) = 
            vault.calculateExpectedProfit(oppId, 50 ether);

        // 50% share of expected proceeds
        assertGt(expectedProfit, 0);
        assertEq(userShareBps, 5000); // 50%
    }

    function test_GetAllOpportunities() public {
        _createOpportunity();
        _createOpportunity();
        _createOpportunity();

        bytes32[] memory allOpps = vault.getAllOpportunities();
        assertEq(allOpps.length, 3);
    }

    // ==================== HELPER FUNCTIONS ====================

    function _createOpportunity() internal returns (bytes32) {
        vm.startPrank(operator);
        vm.deal(operator, 100 ether);

        uint256 collateral = (TARGET_AMOUNT * MIN_SALE_PRICE * 2000) / (10000 * 1e18);
        
        bytes32 oppId = vault.createOpportunity{value: collateral}(
            "Goat Processing Q1",
            "Process live goats into meat products",
            address(inputToken),
            INPUT_TOKEN_ID,
            TARGET_AMOUNT,
            address(outputToken),
            EXPECTED_OUTPUT,
            PROMISED_YIELD_BPS,
            OPERATOR_FEE_BPS,
            MIN_SALE_PRICE,
            14,
            30
        );

        vm.stopPrank();
        return oppId;
    }
}

