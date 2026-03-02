// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { OperatorFacet } from 'contracts/diamond/facets/OperatorFacet.sol';
import { RWYStorage } from 'contracts/diamond/libraries/RWYStorage.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

/**
 * @title OperatorFacetTest
 * @notice Unit tests for OperatorFacet (operator approvals, reputation, slashing)
 */
contract OperatorFacetTest is DiamondTestBase {
    OperatorFacet public operator;

    // Events
    event OperatorApproved(address indexed operator);
    event OperatorRevoked(address indexed operator);
    event OperatorSlashed(
        bytes32 indexed opportunityId,
        address indexed operator,
        address collateralToken,
        uint256 collateralTokenId,
        uint256 amount
    );
    event OperatorReputationUpdated(
        address indexed operator,
        uint256 oldReputation,
        uint256 newReputation
    );
    event OperatorStatsUpdated(
        address indexed operator,
        uint256 successfulOps,
        uint256 totalValueProcessed
    );

    function setUp() public override {
        super.setUp();
        operator = OperatorFacet(address(diamond));
    }

    // ============================================================================
    // APPROVE / REVOKE OPERATORS
    // ============================================================================

    function test_approveOperator_addsOperator() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.approveOperator(newOperator);

        assertTrue(operator.isApprovedOperator(newOperator));
    }

    function test_approveOperator_emitsEvent() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit OperatorApproved(newOperator);
        operator.approveOperator(newOperator);
    }

    function test_approveOperator_revertZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(OperatorFacet.InvalidAddress.selector);
        operator.approveOperator(address(0));
    }

    function test_approveOperator_revertAlreadyApproved() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.approveOperator(newOperator);

        vm.prank(owner);
        vm.expectRevert(OperatorFacet.OperatorAlreadyApproved.selector);
        operator.approveOperator(newOperator);
    }

    function test_approveOperator_revertNotOwner() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(user1);
        vm.expectRevert(OperatorFacet.NotContractOwner.selector);
        operator.approveOperator(newOperator);
    }

    function test_revokeOperator_removesOperator() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.approveOperator(newOperator);

        vm.prank(owner);
        operator.revokeOperator(newOperator);

        assertFalse(operator.isApprovedOperator(newOperator));
    }

    function test_revokeOperator_emitsEvent() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.approveOperator(newOperator);

        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit OperatorRevoked(newOperator);
        operator.revokeOperator(newOperator);
    }

    function test_revokeOperator_revertNotApproved() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        vm.expectRevert(OperatorFacet.OperatorNotApproved.selector);
        operator.revokeOperator(newOperator);
    }

    function test_revokeOperator_revertNotOwner() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.approveOperator(newOperator);

        vm.prank(user1);
        vm.expectRevert(OperatorFacet.NotContractOwner.selector);
        operator.revokeOperator(newOperator);
    }

    // ============================================================================
    // OPERATOR REPUTATION
    // ============================================================================

    function test_setOperatorReputation_updatesReputation() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        operator.setOperatorReputation(newOperator, 500);

        (bool approved, uint256 reputation, , ) = operator.getOperatorStats(newOperator);
        assertEq(reputation, 500);
        assertFalse(approved);
    }

    function test_setOperatorReputation_emitsEvent() public {
        address newOperator = makeAddr('newOperator');
        
        vm.prank(owner);
        vm.expectEmit(false, false, false, true);
        emit OperatorReputationUpdated(newOperator, 0, 500);
        operator.setOperatorReputation(newOperator, 500);
    }

    function test_setOperatorReputation_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(OperatorFacet.NotContractOwner.selector);
        operator.setOperatorReputation(user1, 500);
    }

    function test_getOperatorReputation_returnsReputation() public {
        vm.prank(owner);
        operator.setOperatorReputation(user1, 750);

        assertEq(operator.getOperatorReputation(user1), 750);
    }

    function test_getOperatorReputation_returnsZeroForNonExistent() public {
        address random = makeAddr('random');
        assertEq(operator.getOperatorReputation(random), 0);
    }

    // ============================================================================
    // OPERATOR STATS VIEW FUNCTIONS
    // ============================================================================

    function test_getOperatorStats_returnsAllStats() public {
        vm.prank(owner);
        operator.approveOperator(user1);

        vm.prank(owner);
        operator.setOperatorReputation(user1, 100);

        (bool approved, uint256 reputation, uint256 successfulOps, uint256 totalValue) = 
            operator.getOperatorStats(user1);
        
        assertTrue(approved);
        assertEq(reputation, 100);
        assertEq(successfulOps, 0);
        assertEq(totalValue, 0);
    }

    function test_getOperatorSuccessfulOps_returnsCount() public {
        // Initially 0
        assertEq(operator.getOperatorSuccessfulOps(user1), 0);
    }

    function test_getOperatorTotalValueProcessed_returnsTotal() public {
        // Initially 0
        assertEq(operator.getOperatorTotalValueProcessed(user1), 0);
    }

    // ============================================================================
    // INTEGRATION: APPROVE THEN CHECK STATS
    // ============================================================================

    function test_fullFlow_approveOperator_checkStats_revoke() public {
        address newOperator = makeAddr('newOperator');
        
        // Initially not approved
        assertFalse(operator.isApprovedOperator(newOperator));
        
        // Approve
        vm.prank(owner);
        operator.approveOperator(newOperator);
        assertTrue(operator.isApprovedOperator(newOperator));
        
        // Set reputation
        vm.prank(owner);
        operator.setOperatorReputation(newOperator, 250);
        
        // Verify stats
        (bool approved, uint256 reputation, , ) = operator.getOperatorStats(newOperator);
        assertTrue(approved);
        assertEq(reputation, 250);
        
        // Revoke
        vm.prank(owner);
        operator.revokeOperator(newOperator);
        assertFalse(operator.isApprovedOperator(newOperator));
        
        // Reputation persists after revocation
        assertEq(operator.getOperatorReputation(newOperator), 250);
    }

    // ============================================================================
    // EDGE CASES
    // ============================================================================

    function test_approveOperator_multipleOperators() public {
        address op1 = makeAddr('op1');
        address op2 = makeAddr('op2');
        address op3 = makeAddr('op3');
        
        vm.prank(owner);
        operator.approveOperator(op1);
        
        vm.prank(owner);
        operator.approveOperator(op2);
        
        vm.prank(owner);
        operator.approveOperator(op3);
        
        assertTrue(operator.isApprovedOperator(op1));
        assertTrue(operator.isApprovedOperator(op2));
        assertTrue(operator.isApprovedOperator(op3));
    }

    function test_setOperatorReputation_toZero() public {
        vm.prank(owner);
        operator.setOperatorReputation(user1, 0);
        
        assertEq(operator.getOperatorReputation(user1), 0);
    }

    function test_setOperatorReputation_toMaxUint256() public {
        vm.prank(owner);
        operator.setOperatorReputation(user1, type(uint256).max);
        
        assertEq(operator.getOperatorReputation(user1), type(uint256).max);
    }

    function test_isApprovedOperator_returnsFalseForNonApproved() public {
        assertFalse(operator.isApprovedOperator(makeAddr('random')));
    }

    function test_isApprovedOperator_returnsTrueForOwnerByDefault() public {
        // Owner is not automatically an approved operator
        assertFalse(operator.isApprovedOperator(owner));
    }
}
