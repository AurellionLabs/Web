// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

/**
 * @title NodesFacetAlignedTest
 * @notice Tests for NodesFacet aligned features (Aurum.sol/AurumNodeManager parity)
 */
contract NodesFacetAlignedTest is DiamondTestBase {
    NodesFacet public nodes;

    // Events
    event NodeAdminSet(address indexed admin);
    event NodeAdminRevoked(address indexed admin);
    event NodeRegistered(bytes32 indexed nodeHash, address indexed owner, string nodeType);
    event NodeUpdated(bytes32 indexed nodeHash, string nodeType, uint256 capacity);
    event NodeDeactivated(bytes32 indexed nodeHash);

    function setUp() public override {
        super.setUp();
        nodes = NodesFacet(address(diamond));
    }

    // ============================================================================
    // NODE ADMIN SYSTEM TESTS
    // ============================================================================

    function test_setNodeAdmin() public {
        vm.prank(owner);
        vm.expectEmit(true, false, false, false);
        emit NodeAdminSet(admin);
        nodes.setNodeAdmin(admin);

        assertTrue(nodes.isNodeAdmin(admin), 'Admin should be set');
    }

    function test_setNodeAdmin_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        nodes.setNodeAdmin(admin);
    }

    function test_revokeNodeAdmin() public {
        vm.startPrank(owner);
        nodes.setNodeAdmin(admin);
        assertTrue(nodes.isNodeAdmin(admin));

        vm.expectEmit(true, false, false, false);
        emit NodeAdminRevoked(admin);
        nodes.revokeNodeAdmin(admin);
        vm.stopPrank();

        assertFalse(nodes.isNodeAdmin(admin), 'Admin should be revoked');
    }

    function test_isNodeAdmin() public {
        assertFalse(nodes.isNodeAdmin(user1), 'Non-admin should return false');

        vm.prank(owner);
        nodes.setNodeAdmin(user1);

        assertTrue(nodes.isNodeAdmin(user1), 'Admin should return true');
    }

    // ============================================================================
    // NODE REGISTRATION TESTS
    // ============================================================================

    function test_registerNode() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode(
            'WAREHOUSE',
            500,
            bytes32(0),
            'Test Location',
            '40.7128',
            '-74.0060'
        );

        assertTrue(nodeHash != bytes32(0), 'Node hash should be set');
    }

    function test_registerNode_multipleByOwner() public {
        vm.startPrank(user1);
        bytes32 hash1 = nodes.registerNode('WAREHOUSE', 500, bytes32(0), 'Loc1', '40', '-74');
        bytes32 hash2 = nodes.registerNode('RETAIL', 200, bytes32(0), 'Loc2', '41', '-75');
        vm.stopPrank();

        assertTrue(hash1 != hash2, 'Hashes should be unique');

        bytes32[] memory userNodes = nodes.getOwnerNodes(user1);
        assertEq(userNodes.length, 2, 'User should have 2 nodes');
    }

    function test_getNode() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Main Hub', '40.7', '-74.0');

        (
            address nodeOwner,
            string memory nodeType,
            uint256 capacity,
            ,
            bool active,
            ,
            ,
            ,
            ,
            
        ) = nodes.getNode(nodeHash);

        assertEq(nodeOwner, user1, 'Owner should match');
        assertEq(nodeType, 'LOGISTICS', 'Type should match');
        assertEq(capacity, 1000, 'Capacity should match');
        assertTrue(active, 'Node should be active');
    }

    function test_getNodeStatus() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Hub', '40', '-74');

        // getNodeStatus takes an address (the owner), not a node hash
        bytes1 status = nodes.getNodeStatus(user1);
        assertEq(status, bytes1(uint8(1)), 'Status should be active (1)');
    }

    function test_updateNode() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Hub', '40', '-74');

        vm.prank(user1);
        nodes.updateNode(nodeHash, 'WAREHOUSE', 2000);

        (, string memory nodeType, uint256 capacity, , , , , , ,) = nodes.getNode(nodeHash);
        assertEq(nodeType, 'WAREHOUSE', 'Type should be updated');
        assertEq(capacity, 2000, 'Capacity should be updated');
    }

    function test_updateNode_revertNotOwner() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Hub', '40', '-74');

        vm.prank(user2);
        vm.expectRevert();
        nodes.updateNode(nodeHash, 'WAREHOUSE', 2000);
    }

    function test_deactivateNode() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Hub', '40', '-74');

        vm.prank(user1);
        vm.expectEmit(true, false, false, false);
        emit NodeDeactivated(nodeHash);
        nodes.deactivateNode(nodeHash);

        (, , , , bool active, , , , ,) = nodes.getNode(nodeHash);
        assertFalse(active, 'Node should be deactivated');
    }

    function test_deactivateNode_revertNotOwner() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('LOGISTICS', 1000, bytes32(0), 'Hub', '40', '-74');

        vm.prank(user2);
        vm.expectRevert();
        nodes.deactivateNode(nodeHash);
    }

    // ============================================================================
    // CAPACITY MANAGEMENT TESTS
    // ============================================================================

    function test_reduceCapacityForOrder_revertNonOwner() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('WAREHOUSE', 1000, bytes32(0), 'Hub', '40', '-74');

        // Try to reduce capacity as non-owner/non-admin - should fail authorization
        vm.prank(user2);
        vm.expectRevert('Not authorized');
        nodes.reduceCapacityForOrder(nodeHash, address(payToken), 1, 100);
    }

    function test_reduceCapacityForOrder_asAdmin() public {
        vm.prank(user1);
        bytes32 nodeHash = nodes.registerNode('WAREHOUSE', 1000, bytes32(0), 'Hub', '40', '-74');

        // Set admin and try to reduce capacity - will fail on balance but pass authorization
        vm.prank(owner);
        nodes.setNodeAdmin(admin);

        // As admin, we pass authorization but will fail on balance (which is expected)
        vm.prank(admin);
        vm.expectRevert('Insufficient balance');
        nodes.reduceCapacityForOrder(nodeHash, address(payToken), 1, 100);
        // The revert on balance means authorization passed
    }
}
