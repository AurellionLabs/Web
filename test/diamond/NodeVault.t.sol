// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {DiamondTestBase} from './helpers/DiamondTestBase.sol';
import {AssetsFacet} from 'contracts/diamond/facets/AssetsFacet.sol';
import {NodesFacet} from 'contracts/diamond/facets/NodesFacet.sol';
import {NodeVault} from 'contracts/diamond/facets/NodeVault.sol';
import {DiamondStorage} from 'contracts/diamond/libraries/DiamondStorage.sol';
import {INodeVault} from 'contracts/interfaces/INodeVault.sol';

contract NodeVaultTest is DiamondTestBase {
    AssetsFacet internal assets;
    NodesFacet internal nodes;

    bool private testClassAdded;

    function setUp() public override {
        super.setUp();
        assets = AssetsFacet(address(diamond));
        nodes = NodesFacet(address(diamond));
    }

    function test_createNodeVault_requiresNodeOwner_andIsSingleUse() public {
        _seedNodeInventory(5, 20 ether);

        vm.prank(user1);
        vm.expectRevert('Not node owner');
        nodes.createNodeVault(testNodeHash, 'Node Vault', 'NVLT');

        vm.prank(nodeOperator);
        address vaultAddress = nodes.createNodeVault(
            testNodeHash,
            'Node Vault',
            'NVLT'
        );

        assertEq(nodes.getNodeVault(testNodeHash), vaultAddress);
        assertEq(nodes.getNodeVaultNav(testNodeHash), 100 ether);

        vm.prank(nodeOperator);
        vm.expectRevert('Vault already exists');
        nodes.createNodeVault(testNodeHash, 'Node Vault', 'NVLT');
    }

    function test_totalAssets_usesInventoryNav_andImmediateWithdrawsAreLiquidityGated()
        public
    {
        _seedNodeInventory(10, 20 ether);

        vm.prank(nodeOperator);
        NodeVault vault = NodeVault(
            nodes.createNodeVault(testNodeHash, 'Node Vault', 'NVLT')
        );

        assertEq(vault.balanceOf(nodeOperator), 200 ether);
        assertEq(vault.grossManagedAssets(), 200 ether);
        assertEq(vault.totalAssets(), 200 ether);

        vm.startPrank(user1);
        quoteToken.approve(address(vault), 100 ether);
        uint256 mintedShares = vault.deposit(100 ether, user1);
        vm.stopPrank();

        assertEq(mintedShares, 100 ether);
        assertEq(vault.grossManagedAssets(), 300 ether);
        assertEq(vault.totalAssets(), 300 ether);
        assertEq(nodes.getNodeVaultNav(testNodeHash), 300 ether);
        assertEq(vault.maxWithdraw(user1), 100 ether);
        assertEq(vault.maxRedeem(user1), 100 ether);
    }

    function test_requestRedeem_queuesWhenUnderfunded_andClaimsAfterFullFunding()
        public
    {
        _seedNodeInventory(10, 20 ether);

        vm.prank(nodeOperator);
        NodeVault vault = NodeVault(
            nodes.createNodeVault(testNodeHash, 'Node Vault', 'NVLT')
        );

        vm.startPrank(user1);
        quoteToken.approve(address(vault), 100 ether);
        vault.deposit(100 ether, user1);
        vm.stopPrank();

        vm.prank(nodeOperator);
        (uint256 requestId, uint256 assetsOwed) = vault.requestRedeem(
            120 ether,
            nodeOperator
        );

        assertEq(requestId, 1);
        assertEq(assetsOwed, 120 ether);
        assertEq(vault.balanceOf(nodeOperator), 80 ether);
        assertEq(vault.balanceOf(address(vault)), 120 ether);
        assertEq(vault.totalAssets(), 180 ether);
        assertEq(vault.maxWithdraw(user1), 0);

        vault.processRedemptionQueue(1);
        INodeVault.RedemptionRequest memory pendingRequest = vault
            .getRedemptionRequest(requestId);
        assertEq(pendingRequest.status, 1);

        vm.prank(owner);
        quoteToken.transfer(address(vault), 20 ether);

        vault.processRedemptionQueue(1);
        INodeVault.RedemptionRequest memory claimableRequest = vault
            .getRedemptionRequest(requestId);
        assertEq(claimableRequest.status, 2);

        uint256 operatorQuoteBefore = quoteToken.balanceOf(nodeOperator);

        vm.prank(nodeOperator);
        uint256 claimedAssets = vault.claimQueuedRedemption(requestId, address(0));

        assertEq(claimedAssets, 120 ether);
        assertEq(quoteToken.balanceOf(nodeOperator), operatorQuoteBefore + 120 ether);
        assertEq(vault.balanceOf(address(vault)), 0);
        assertEq(vault.totalQueuedAssets(), 0);
        assertEq(vault.totalQueuedShares(), 0);
    }

    function _seedNodeInventory(
        uint256 inventoryAmount,
        uint256 pricePerUnit
    ) internal {
        if (!testClassAdded) {
            vm.prank(owner);
            assets.addSupportedClass('TEST');
            testClassAdded = true;
        }

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition(
            string(abi.encodePacked('Node Vault Asset ', vm.toString(block.timestamp))),
            'TEST'
        );

        vm.startPrank(nodeOperator);
        (, uint256 tokenId) = assets.nodeMint(
            nodeOperator,
            assetDef,
            inventoryAmount,
            'TEST',
            ''
        );
        nodes.addSupportedAsset(
            testNodeHash,
            address(diamond),
            tokenId,
            pricePerUnit,
            inventoryAmount * 2
        );
        assets.setApprovalForAll(address(diamond), true);
        nodes.depositTokensToNode(testNodeHash, tokenId, inventoryAmount);
        vm.stopPrank();
    }
}
