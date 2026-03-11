// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondTestBase, ReentrancyInit } from './helpers/DiamondTestBase.sol';
import { OwnershipFacet } from 'contracts/diamond/facets/OwnershipFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

/**
 * @title AuditCritical
 * @notice Tests for Critical findings: C-01 (two-step ownership), C-02 (mintBatch nodeHash)
 */
contract AuditCriticalTest is DiamondTestBase {
    OwnershipFacet internal ownership;
    AssetsFacet internal assets;

    function setUp() public override {
        super.setUp();
        ownership = OwnershipFacet(address(diamond));
        assets = AssetsFacet(address(diamond));
    }

    // ========================================================================
    // C-01: Two-Step Ownership Transfer
    // ========================================================================

    function test_C01_transferOwnership_setsPending_notImmediate() public {
        vm.prank(owner);
        ownership.transferOwnership(user1);

        // Owner should NOT have changed yet
        assertEq(ownership.owner(), owner, 'Owner should not change before acceptance');
    }

    function test_C01_acceptOwnership_onlyPendingCanAccept() public {
        vm.prank(owner);
        ownership.transferOwnership(user1);

        // Random address should revert
        vm.prank(user2);
        vm.expectRevert('Not pending owner');
        ownership.acceptOwnership();
    }

    function test_C01_twoStepOwnership_fullFlow() public {
        vm.prank(owner);
        ownership.transferOwnership(user1);

        // Pending owner accepts
        vm.prank(user1);
        ownership.acceptOwnership();

        assertEq(ownership.owner(), user1, 'User1 should be new owner');
    }

    function test_C01_transferOwnership_canOverwritePending() public {
        vm.prank(owner);
        ownership.transferOwnership(user1);

        // Owner changes their mind
        vm.prank(owner);
        ownership.transferOwnership(user2);

        // user1 can no longer accept
        vm.prank(user1);
        vm.expectRevert('Not pending owner');
        ownership.acceptOwnership();

        // user2 can accept
        vm.prank(user2);
        ownership.acceptOwnership();
        assertEq(ownership.owner(), user2);
    }

    function test_C01_transferOwnership_emitsEvent() public {
        vm.prank(owner);
        vm.expectEmit(true, true, false, false);
        emit OwnershipTransferStarted(owner, user1);
        ownership.transferOwnership(user1);
    }

    // ========================================================================
    // C-02: mintBatch with Node Attribution
    // ========================================================================

    function test_C02_mintBatch_withNode_tokensTransferable() public {
        // Setup: register a node for user1
        bytes32 nodeHash = _registerTestNode(user1);
        vm.stopPrank();

        uint256[] memory ids = new uint256[](2);
        ids[0] = 100;
        ids[1] = 101;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50;
        amounts[1] = 75;

        // Mint with node attribution
        vm.prank(owner);
        assets.mintBatch(user1, ids, amounts, nodeHash, '');

        // Verify balances
        assertEq(assets.balanceOf(user1, 100), 50);
        assertEq(assets.balanceOf(user1, 101), 75);

        // Verify node sellable amounts
        assertEq(assets.getNodeSellableAmount(user1, 100, nodeHash), 50);
        assertEq(assets.getNodeSellableAmount(user1, 101, nodeHash), 75);

        // Verify tokens are transferable
        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, 100, 25, '');
        assertEq(assets.balanceOf(user2, 100), 25);
    }

    function test_C02_mintBatch_withoutNode_stillMints() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = 200;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100;

        vm.prank(owner);
        assets.mintBatch(user1, ids, amounts, bytes32(0), '');

        assertEq(assets.balanceOf(user1, 200), 100);
    }

    // ========================================================================
    // Events
    // ========================================================================

    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
}
