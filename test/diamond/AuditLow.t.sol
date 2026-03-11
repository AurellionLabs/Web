// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondTestBase, ReentrancyInit } from './helpers/DiamondTestBase.sol';
import { OwnershipFacet } from 'contracts/diamond/facets/OwnershipFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { AuSysFacet } from 'contracts/diamond/facets/AuSysFacet.sol';
import { AuSysAdminFacet } from 'contracts/diamond/facets/AuSysAdminFacet.sol';
import { AuSysViewFacet } from 'contracts/diamond/facets/AuSysViewFacet.sol';
import { ERC1155ReceiverFacet } from 'contracts/diamond/facets/ERC1155ReceiverFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { ERC20Mock } from './helpers/ERC20Mock.sol';

/**
 * @title AuditLow
 * @notice Tests for Low findings: L-01, L-03, L-05, L-06, L-08
 */
contract AuditLowTest is DiamondTestBase {
    OwnershipFacet internal ownership;
    NodesFacet internal nodesFacetProxy;
    AssetsFacet internal assetsFacetProxy;
    AuSysFacet internal ausys;
    AuSysAdminFacet internal ausysAdmin;
    AuSysViewFacet internal ausysView;
    ERC1155ReceiverFacet internal receiver;

    function setUp() public override {
        super.setUp();
        ownership = OwnershipFacet(address(diamond));
        nodesFacetProxy = NodesFacet(address(diamond));
        assetsFacetProxy = AssetsFacet(address(diamond));
        ausys = AuSysFacet(address(diamond));
        ausysAdmin = AuSysAdminFacet(address(diamond));
        ausysView = AuSysViewFacet(address(diamond));
        receiver = ERC1155ReceiverFacet(address(diamond));
    }

    // ========================================================================
    // L-01: Two-Step Renounce Ownership with Timelock
    // ========================================================================

    function test_L01_renounceOwnership_requiresTwoSteps() public {
        // First call should only schedule
        vm.prank(owner);
        ownership.renounceOwnership();
        assertEq(ownership.owner(), owner, 'Owner should not change on first call');

        // Second call before delay should revert
        vm.prank(owner);
        vm.expectRevert('Renounce delay not elapsed');
        ownership.renounceOwnership();
    }

    function test_L01_renounceOwnership_executesAfterDelay() public {
        // Schedule
        vm.prank(owner);
        ownership.renounceOwnership();

        // Wait for delay
        vm.warp(block.timestamp + 2 days);

        // Execute
        vm.prank(owner);
        ownership.renounceOwnership();
        assertEq(ownership.owner(), address(0), 'Owner should be zero after renounce');
    }

    function test_L01_cancelRenounceOwnership() public {
        // Schedule
        vm.prank(owner);
        ownership.renounceOwnership();

        // Cancel
        vm.prank(owner);
        ownership.cancelRenounceOwnership();

        // Wait for delay
        vm.warp(block.timestamp + 2 days);

        // Now first call should schedule again (not execute)
        vm.prank(owner);
        ownership.renounceOwnership();
        assertEq(ownership.owner(), owner, 'Owner should not change after cancel + reschedule');
    }

    // ========================================================================
    // L-03: Node Registrar Cap
    // ========================================================================

    function test_L03_registerNode_respectsCap() public {
        // Set cap to 2
        vm.prank(owner);
        nodesFacetProxy.setMaxNodesPerRegistrar(2);

        // Register 2 nodes (nodeOperator already has 1 from setUp)
        _registerTestNode(nodeOperator);
        vm.stopPrank();

        // Third should fail
        vm.prank(nodeOperator);
        vm.expectRevert('Exceeds max nodes per registrar');
        nodesFacetProxy.registerNode('LOGISTICS', 100, bytes32(0), 'Node3', '1.0', '2.0');
    }

    function test_L03_registerNode_unlimitedByDefault() public {
        // Cap is 0 by default = unlimited
        // Register many nodes for same operator
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(nodeOperator);
            nodesFacetProxy.registerNode('LOGISTICS', 100, bytes32(0), 'Node', '1.0', '2.0');
        }
        // Should succeed without revert
    }

    // ========================================================================
    // L-05: Swap-and-Pop for Asset/Class Removal
    // ========================================================================

    function test_L05_removeSupportedClass_noTombstone() public {
        vm.startPrank(owner);
        assetsFacetProxy.addSupportedClass('ClassA');
        assetsFacetProxy.addSupportedClass('ClassB');
        assetsFacetProxy.addSupportedClass('ClassC');

        // Remove middle one
        assetsFacetProxy.removeSupportedClass('ClassB');

        // Check no empty strings
        string[] memory classes = assetsFacetProxy.getSupportedClasses();
        assertEq(classes.length, 2, 'Should have 2 classes after removal');
        for (uint256 i = 0; i < classes.length; i++) {
            assertTrue(bytes(classes[i]).length > 0, 'No tombstones should exist');
        }
        vm.stopPrank();
    }

    function test_L05_removeSupportedAsset_noTombstone() public {
        vm.startPrank(owner);

        DiamondStorage.AssetDefinition memory asset1 = _createAssetDefinition('Asset1', 'ClassA');
        DiamondStorage.AssetDefinition memory asset2 = _createAssetDefinition('Asset2', 'ClassA');
        assetsFacetProxy.addSupportedAsset(asset1);
        assetsFacetProxy.addSupportedAsset(asset2);

        // Remove first
        assetsFacetProxy.removeSupportedAsset(asset1);

        string[] memory assetNames = assetsFacetProxy.getSupportedAssets();
        assertEq(assetNames.length, 1, 'Should have 1 asset after removal');
        assertTrue(bytes(assetNames[0]).length > 0, 'No tombstones');
        vm.stopPrank();
    }

    // ========================================================================
    // L-06: ERC1155 Receiver Whitelist
    // ========================================================================

    function test_L06_erc1155Receiver_whitelistDisabledByDefault() public {
        // With whitelist disabled, any token should be accepted
        bytes4 result = receiver.onERC1155Received(address(0), address(0), 0, 0, '');
        assertEq(result, receiver.onERC1155Received.selector);
    }

    function test_L06_erc1155Receiver_rejectsNonWhitelisted() public {
        // Enable whitelist
        vm.prank(owner);
        ausysAdmin.setERC1155WhitelistEnabled(true);

        // Try receiving from non-whitelisted token — should revert
        address fakeToken = makeAddr('fakeToken');
        vm.prank(fakeToken);
        vm.expectRevert(ERC1155ReceiverFacet.TokenNotWhitelisted.selector);
        receiver.onERC1155Received(address(0), address(0), 0, 0, '');
    }

    function test_L06_erc1155Receiver_acceptsWhitelisted() public {
        address whitelistedToken = makeAddr('whitelistedToken');

        vm.startPrank(owner);
        ausysAdmin.setERC1155WhitelistEnabled(true);
        ausysAdmin.setAcceptedTokenContract(whitelistedToken, true);
        vm.stopPrank();

        vm.prank(whitelistedToken);
        bytes4 result = receiver.onERC1155Received(address(0), address(0), 0, 0, '');
        assertEq(result, receiver.onERC1155Received.selector);
    }

    function test_L06_erc1155BatchReceiver_rejectsNonWhitelisted() public {
        vm.prank(owner);
        ausysAdmin.setERC1155WhitelistEnabled(true);

        address fakeToken = makeAddr('fakeToken');
        uint256[] memory ids;
        uint256[] memory values;

        vm.prank(fakeToken);
        vm.expectRevert(ERC1155ReceiverFacet.TokenNotWhitelisted.selector);
        receiver.onERC1155BatchReceived(address(0), address(0), ids, values, '');
    }

    // ========================================================================
    // L-08: userP2POffers Cleanup
    // ========================================================================

    function test_L08_cancelP2P_removesFromUserOffers() public {
        // Setup
        vm.startPrank(owner);
        ausysAdmin.initAuSysFees();
        assetsFacetProxy.addSupportedClass('Metal');
        vm.stopPrank();

        bytes32 sellerNode = _registerTestNode(user2);
        vm.stopPrank();

        vm.prank(user2);
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Silver', 'Metal');
        (bytes32 hash, uint256 tokenId) = AssetsFacet(address(diamond)).nodeMint(user2, assetDef, 100, 'Metal', '');

        vm.prank(user2);
        IERC1155(address(diamond)).setApprovalForAll(address(diamond), true);

        // Create offer
        bytes32 orderId = _createSellerOffer(user2, tokenId, 50 ether);

        // Check user offers before cancel
        bytes32[] memory userOffersBefore = ausysView.getUserP2POffers(user2);
        assertEq(userOffersBefore.length, 1);

        // Cancel
        vm.prank(user2);
        ausys.cancelP2POffer(orderId);

        // User offers should be cleaned up
        bytes32[] memory userOffersAfter = ausysView.getUserP2POffers(user2);
        assertEq(userOffersAfter.length, 0, 'User offers should be empty after cancel');
    }

    // ========================================================================
    // HELPERS
    // ========================================================================

    function _createSellerOffer(address seller, uint256 _tokenId, uint256 price) internal returns (bytes32) {
        bytes32[] memory journeyIds;
        address[] memory orderNodes;
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.006', '34.0522', '-118.2437', 'NYC', 'LA'
        );

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(diamond),
            tokenId: _tokenId,
            tokenQuantity: 5,
            price: price,
            txFee: 0,
            buyer: address(0),
            seller: seller,
            journeyIds: journeyIds,
            nodes: orderNodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: true,
            targetCounterparty: address(0),
            expiresAt: 0,
            snapshotTreasuryBps: 0,
            snapshotNodeBps: 0
        });

        vm.prank(seller);
        return ausys.createAuSysOrder(order);
    }
}
