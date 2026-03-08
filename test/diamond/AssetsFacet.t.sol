// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { IERC1155Receiver } from '@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol';

/**
 * @title AssetsFacetTest
 * @notice Tests for AssetsFacet (ERC1155 + AuraAsset parity)
 */
contract AssetsFacetTest is DiamondTestBase {
    AssetsFacet public assets;
    NodesFacet public nodes;

    // Test data
    uint256 public tokenId;
    bytes32 public assetHash;

    function setUp() public override {
        super.setUp();
        assets = AssetsFacet(address(diamond));
        nodes = NodesFacet(address(diamond));
    }

    // ============================================================================
    // ERC1155 CORE TESTS
    // ============================================================================

    function test_balanceOf_initiallyZero() public view {
        uint256 balance = assets.balanceOf(user1, 1);
        assertEq(balance, 0, 'Initial balance should be 0');
    }

    function test_balanceOfBatch() public {
        // First mint some tokens to same user (same custodian)
        _mintTestToken(user1, 100);
        uint256 firstTokenId = tokenId;
        
        // Advance timestamp so we get a different asset/token
        vm.warp(block.timestamp + 1);
        _mintTestToken(user1, 200);
        uint256 secondTokenId = tokenId;

        address[] memory accounts = new address[](2);
        accounts[0] = user1;
        accounts[1] = user1;

        uint256[] memory ids = new uint256[](2);
        ids[0] = firstTokenId;
        ids[1] = secondTokenId;

        uint256[] memory balances = assets.balanceOfBatch(accounts, ids);
        assertEq(balances[0], 100, 'First token balance mismatch');
        assertEq(balances[1], 200, 'Second token balance mismatch');
    }

    function test_balanceOfBatch_revertArrayMismatch() public {
        address[] memory accounts = new address[](2);
        accounts[0] = user1;
        accounts[1] = user2;

        uint256[] memory ids = new uint256[](3); // Different length
        ids[0] = 1;
        ids[1] = 2;
        ids[2] = 3;

        vm.expectRevert();
        assets.balanceOfBatch(accounts, ids);
    }

    function test_setApprovalForAll() public {
        vm.prank(user1);
        assets.setApprovalForAll(user2, true);

        assertTrue(assets.isApprovedForAll(user1, user2), 'Approval should be set');
    }

    function test_setApprovalForAll_revoke() public {
        vm.startPrank(user1);
        assets.setApprovalForAll(user2, true);
        assertTrue(assets.isApprovedForAll(user1, user2));

        assets.setApprovalForAll(user2, false);
        assertFalse(assets.isApprovedForAll(user1, user2), 'Approval should be revoked');
        vm.stopPrank();
    }

    function test_safeTransferFrom() public {
        _mintTestToken(user1, 100);

        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, tokenId, 50, '');

        assertEq(assets.balanceOf(user1, tokenId), 50, 'Sender balance should decrease');
        assertEq(assets.balanceOf(user2, tokenId), 50, 'Receiver balance should increase');
        assertEq(
            assets.getNodeSellableAmount(user1, tokenId, testNodeHash),
            50,
            'Sender node sellable should decrease'
        );
        assertEq(
            assets.getNodeSellableAmount(user2, tokenId, testNodeHash),
            50,
            'Receiver node sellable should increase'
        );
    }

    function test_safeTransferFrom_withApproval() public {
        _mintTestToken(user1, 100);

        // User1 approves user2
        vm.prank(user1);
        assets.setApprovalForAll(user2, true);

        // User2 transfers on behalf of user1
        vm.prank(user2);
        assets.safeTransferFrom(user1, owner, tokenId, 30, '');

        assertEq(assets.balanceOf(user1, tokenId), 70);
        assertEq(assets.balanceOf(owner, tokenId), 30);
    }

    function test_safeTransferFrom_revertInsufficientBalance() public {
        _mintTestToken(user1, 100);

        vm.prank(user1);
        vm.expectRevert();
        assets.safeTransferFrom(user1, user2, tokenId, 200, ''); // More than balance
    }

    function test_safeTransferFrom_revertNotApproved() public {
        _mintTestToken(user1, 100);

        vm.prank(user2); // User2 is not approved
        vm.expectRevert();
        assets.safeTransferFrom(user1, owner, tokenId, 50, '');
    }

    function test_safeBatchTransferFrom() public {
        // Mint multiple tokens to same user
        _mintTestToken(user1, 100);
        uint256 firstTokenId = tokenId;
        
        vm.warp(block.timestamp + 1);
        _mintTestToken(user1, 200);
        uint256 secondTokenId = tokenId;

        uint256[] memory ids = new uint256[](2);
        ids[0] = firstTokenId;
        ids[1] = secondTokenId;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50;
        amounts[1] = 100;

        vm.prank(user1);
        assets.safeBatchTransferFrom(user1, user2, ids, amounts, '');

        assertEq(assets.balanceOf(user1, firstTokenId), 50);
        assertEq(assets.balanceOf(user1, secondTokenId), 100);
        assertEq(assets.balanceOf(user2, firstTokenId), 50);
        assertEq(assets.balanceOf(user2, secondTokenId), 100);
    }

    // ============================================================================
    // ERC1155 SUPPLY TESTS
    // ============================================================================

    function test_totalSupply() public {
        assertEq(assets.totalSupply(1), 0, 'Initial supply should be 0');

        _mintTestToken(user1, 100);
        assertEq(assets.totalSupply(tokenId), 100, 'Supply should match minted amount');

        // Mint more to the same user (same custodian)
        uint256 firstTokenId = tokenId;
        vm.warp(block.timestamp + 1);
        _mintTestToken(user1, 50);
        uint256 secondTokenId = tokenId;
        
        assertEq(assets.totalSupply(firstTokenId), 100, 'First token supply unchanged');
        assertEq(assets.totalSupply(secondTokenId), 50, 'Second token supply should match');
    }

    function test_exists() public {
        assertFalse(assets.exists(999), 'Non-existent token should return false');

        _mintTestToken(user1, 100);
        assertTrue(assets.exists(tokenId), 'Minted token should exist');
    }

    // ============================================================================
    // AURA ASSET - NODE MINTING TESTS
    // ============================================================================

    function test_nodeMint_validNode() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (bytes32 hash, uint256 id) = assets.nodeMint(
            user1,
            assetDef,
            100,
            'COMMODITY',
            ''
        );

        assertTrue(hash != bytes32(0), 'Asset hash should be set');
        assertEq(assets.balanceOf(user1, id), 100, 'Balance should match minted amount');
        assertTrue(assets.exists(id), 'Token should exist');
    }

    function test_nodeMint_revertInvalidNode() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(user1); // user1 is not a node operator
        vm.expectRevert();
        assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');
    }

    function test_nodeMint_establishesCustody() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 id) = assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');

        assertTrue(assets.isInCustody(id), 'Token should be in custody');
        
        uint256 amount = assets.getCustodyInfo(id, user1);
        assertEq(amount, 100, 'Custody amount should match');
        
        uint256 totalAmount = assets.getTotalCustodyAmount(id);
        assertEq(totalAmount, 100, 'Total custody amount should match');
        assertEq(
            assets.getNodeCustodyInfo(id, testNodeHash),
            100,
            'Node custody amount should match'
        );
        assertEq(
            assets.getNodeSellableAmount(user1, id, testNodeHash),
            100,
            'Node sellable amount should match'
        );
    }

    function test_addNodeItem_requiresDepositBeforeNodeInventoryIsTradable() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        bytes32 userNode = _registerTestNode(user1);
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(user1);
        uint256 id = nodes.addNodeItem(userNode, user1, 25, assetDef, 'COMMODITY', '');

        assertEq(assets.balanceOf(user1, id), 25, 'Wallet should receive minted tokens');
        assertEq(
            nodes.getNodeTokenBalance(userNode, id),
            0,
            'Node inventory should remain zero until tokens are deposited into Diamond custody'
        );
        assertEq(
            assets.getNodeSellableAmount(user1, id, userNode),
            25,
            'Sellable allocation should stay on the wallet until deposit'
        );
    }

    function test_nodeMintForNode_tracksIndependentNodeSellableAllocations() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        bytes32 firstNode = _registerTestNode(user1);
        bytes32 secondNode = _registerTestNode(user1);
        vm.stopPrank();
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(user1);
        (, uint256 id) = assets.nodeMintForNode(user1, assetDef, 40, 'COMMODITY', '', firstNode);

        vm.prank(user1);
        assets.nodeMintForNode(user1, assetDef, 60, 'COMMODITY', '', secondNode);

        assertEq(assets.balanceOf(user1, id), 100, 'Total balance should accumulate');
        assertEq(assets.getNodeCustodyInfo(id, firstNode), 40, 'First node custody mismatch');
        assertEq(assets.getNodeCustodyInfo(id, secondNode), 60, 'Second node custody mismatch');
        assertEq(assets.getNodeSellableAmount(user1, id, firstNode), 40, 'First node sellable mismatch');
        assertEq(assets.getNodeSellableAmount(user1, id, secondNode), 60, 'Second node sellable mismatch');
    }

    function test_safeTransferFrom_movesNodeSellableAllocationAcrossNodes() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        bytes32 firstNode = _registerTestNode(user1);
        bytes32 secondNode = _registerTestNode(user1);
        vm.stopPrank();
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(user1);
        (, uint256 id) = assets.nodeMintForNode(user1, assetDef, 40, 'COMMODITY', '', firstNode);

        vm.prank(user1);
        assets.nodeMintForNode(user1, assetDef, 60, 'COMMODITY', '', secondNode);

        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, id, 50, '');

        assertEq(assets.getNodeSellableAmount(user1, id, firstNode), 0, 'First node should be fully consumed');
        assertEq(assets.getNodeSellableAmount(user1, id, secondNode), 50, 'Second node remainder mismatch');
        assertEq(assets.getNodeSellableAmount(user2, id, firstNode), 40, 'Receiver first node mismatch');
        assertEq(assets.getNodeSellableAmount(user2, id, secondNode), 10, 'Receiver second node mismatch');
    }

    function test_redeemFromNode_debitsExactNodeSellableAllocation() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        bytes32 firstNode = _registerTestNode(user1);
        bytes32 secondNode = _registerTestNode(user1);
        vm.stopPrank();
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(user1);
        (, uint256 id) = assets.nodeMintForNode(user1, assetDef, 40, 'COMMODITY', '', firstNode);

        vm.prank(user1);
        assets.nodeMintForNode(user1, assetDef, 60, 'COMMODITY', '', secondNode);

        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, id, 50, '');

        vm.prank(user2);
        assets.redeemFromNode(id, 40, user1, firstNode);

        assertEq(assets.balanceOf(user2, id), 10, 'Redeemer balance should decrease');
        assertEq(assets.getNodeSellableAmount(user2, id, firstNode), 0, 'First node sellable should be consumed');
        assertEq(assets.getNodeSellableAmount(user2, id, secondNode), 10, 'Second node sellable should remain');
        assertEq(assets.getNodeCustodyInfo(id, firstNode), 0, 'First node custody should be released');
    }

    // ============================================================================
    // AURA ASSET - REDEMPTION TESTS
    // ============================================================================

    function test_redeem_revertCustodianCannotRedeemOwnCustody() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 id) = assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');

        vm.prank(user1);
        vm.expectRevert(AssetsFacet.CannotRedeemOwnCustody.selector);
        assets.redeem(id, 10, user1);
    }

    function test_redeem_releasesCustody() public {
        // Mint first
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 id) = assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');

        // Non-custodian holder receives part of the balance.
        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, id, 50, '');

        // Non-custodian holder can redeem.
        vm.prank(user2);
        assets.redeem(id, 50, user1);

        uint256 custodyAmount = assets.getCustodyInfo(id, user1);
        assertEq(custodyAmount, 50, 'Custody amount should decrease');
    }

    function test_redeem_burnsTokens() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 id) = assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');

        uint256 supplyBefore = assets.totalSupply(id);

        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, id, 50, '');

        vm.prank(user2);
        assets.redeem(id, 50, user1);

        assertEq(assets.balanceOf(user2, id), 0, 'Redeemer balance should decrease');
        assertEq(assets.totalSupply(id), supplyBefore - 50, 'Supply should decrease');
    }

    function test_redeem_revertInsufficientBalance() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 id) = assets.nodeMint(user1, assetDef, 100, 'COMMODITY', '');

        vm.prank(user1);
        assets.safeTransferFrom(user1, user2, id, 10, '');

        vm.prank(user2);
        vm.expectRevert(AssetsFacet.InsufficientBalance.selector);
        assets.redeem(id, 200, user1); // More than balance

        vm.prank(user1);
        vm.expectRevert(AssetsFacet.CannotRedeemOwnCustody.selector);
        assets.redeem(id, 1, user1); // Custodian redemption should be blocked
    }

    // ============================================================================
    // AURA ASSET - CLASS MANAGEMENT TESTS
    // ============================================================================

    function test_addSupportedClass() public {
        vm.prank(owner);
        assets.addSupportedClass('NEW_CLASS');

        // Should be able to mint with this class now
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Test Item', 'NEW_CLASS');

        vm.prank(nodeOperator);
        (bytes32 hash, ) = assets.nodeMint(user1, assetDef, 10, 'NEW_CLASS', '');
        assertTrue(hash != bytes32(0));
    }

    function test_addSupportedClass_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        assets.addSupportedClass('UNAUTHORIZED_CLASS');
    }

    function test_removeSupportedClass() public {
        vm.startPrank(owner);
        assets.addSupportedClass('TEMP_CLASS');
        assets.removeSupportedClass('TEMP_CLASS');
        vm.stopPrank();

        // Should fail to mint with removed class
        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Test Item', 'TEMP_CLASS');

        vm.prank(nodeOperator);
        vm.expectRevert();
        assets.nodeMint(user1, assetDef, 10, 'TEMP_CLASS', '');
    }

    // ============================================================================
    // AURA ASSET - BATCH MINTING TESTS
    // ============================================================================

    function test_mintBatch() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 100;
        ids[1] = 101;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 50;
        amounts[1] = 75;

        vm.prank(owner);
        assets.mintBatch(user1, ids, amounts, '');

        assertEq(assets.balanceOf(user1, 100), 50);
        assertEq(assets.balanceOf(user1, 101), 75);
    }

    function test_mintBatch_revertNotOwner() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = 100;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 50;

        vm.prank(user1);
        vm.expectRevert();
        assets.mintBatch(user1, ids, amounts, '');
    }

    // ============================================================================
    // URI TESTS
    // ============================================================================

    function test_setURI() public {
        string memory newURI = 'https://example.com/api/{id}.json';

        vm.prank(owner);
        assets.setURI(newURI);

        assertEq(assets.uri(1), newURI);
    }

    function test_setURI_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        assets.setURI('https://malicious.com/{id}');
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    bool private testClassAdded;

    function _mintTestToken(address to, uint256 amount) internal {
        if (!testClassAdded) {
            vm.startPrank(owner);
            assets.addSupportedClass('TEST');
            vm.stopPrank();
            testClassAdded = true;
        }

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition(
            string(abi.encodePacked('Test Asset ', vm.toString(block.timestamp))),
            'TEST'
        );

        vm.prank(nodeOperator);
        (, tokenId) = assets.nodeMint(to, assetDef, amount, 'TEST', '');
    }
}

/**
 * @title ERC1155ReceiverMock
 * @notice Mock contract that can receive ERC1155 tokens
 */
contract ERC1155ReceiverMock is IERC1155Receiver {
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }
}
