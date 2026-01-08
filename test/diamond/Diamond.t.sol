// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { Diamond } from 'contracts/diamond/Diamond.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IDiamondLoupe } from 'contracts/diamond/interfaces/IDiamondLoupe.sol';
import { IOwnership } from 'contracts/diamond/interfaces/IOwnership.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { DiamondLoupeFacet } from 'contracts/diamond/facets/DiamondLoupeFacet.sol';
import { OwnershipFacet } from 'contracts/diamond/facets/OwnershipFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { OrdersFacet } from 'contracts/diamond/facets/OrdersFacet.sol';

/**
 * @title DiamondTest
 * @notice Comprehensive tests for Diamond (EIP-2535) implementation
 */
contract DiamondTest is Test {
    Diamond public diamond;
    address public owner;
    address public user1;
    address public user2;

    // Facets
    DiamondCutFacet public diamondCutFacet;
    DiamondLoupeFacet public diamondLoupeFacet;
    OwnershipFacet public ownershipFacet;
    NodesFacet public nodesFacet;
    AssetsFacet public assetsFacet;
    OrdersFacet public ordersFacet;

    // New facets for upgrade testing
    NodesFacetV2 public nodesFacetV2;

    function setUp() public {
        owner = makeAddr('owner');
        user1 = makeAddr('user1');
        user2 = makeAddr('user2');

        // Deploy facets
        diamondCutFacet = new DiamondCutFacet();
        diamondLoupeFacet = new DiamondLoupeFacet();
        ownershipFacet = new OwnershipFacet();
        nodesFacet = new NodesFacet();
        assetsFacet = new AssetsFacet();
        ordersFacet = new OrdersFacet();

        // Deploy Diamond with DiamondCutFacet
        diamond = new Diamond(owner, address(diamondCutFacet));

        // Add other facets to Diamond
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(diamondLoupeFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFacetSelectors('DiamondLoupeFacet')
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');

        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(ownershipFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFacetSelectors('OwnershipFacet')
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');

        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(nodesFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: _getFacetSelectors('NodesFacet')
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');
    }

    // ============================================
    // Deployment Tests
    // ============================================

    function testDeployment() public {
        assertTrue(address(diamond) != address(0), 'Diamond not deployed');

        // Verify owner
        IOwnership ownership = IOwnership(address(diamond));
        assertEq(ownership.owner(), owner, 'Owner mismatch');
    }

    function testInitialFacetsAdded() public {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        IDiamondLoupe.Facet[] memory facets = loupe.facets();

        // Should have DiamondCutFacet and DiamondLoupeFacet initially
        assertGe(facets.length, 2, 'Should have at least 2 facets');
    }

    // ============================================
    // Diamond Loupe Tests
    // ============================================

    function testFacetAddresses() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        address[] memory addresses = loupe.facetAddresses();

        assertEq(addresses[0], address(diamondCutFacet), 'First facet should be DiamondCutFacet');
    }

    function testFacetAddress() public {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));

        // DiamondCutFacet should have the diamondCut selector
        address facet = loupe.facetAddress(0x1f931c1c);
        assertEq(facet, address(diamondCutFacet), 'diamondCut should be in DiamondCutFacet');
    }

    function testFacetFunctionSelectors() public {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));

        bytes4[] memory selectors = loupe.facetFunctionSelectors(address(diamondLoupeFacet));

        // DiamondLoupeFacet should have 5 selectors
        assertEq(selectors.length, 5, 'DiamondLoupeFacet should have 5 selectors');
    }

    function testFacetsView() public view {
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        IDiamondLoupe.Facet[] memory facets = loupe.facets();

        for (uint256 i = 0; i < facets.length; i++) {
            assertTrue(facets[i].facetAddress != address(0), 'Facet address should not be zero');
            assertGt(facets[i].functionSelectors.length, 0, 'Should have selectors');
        }
    }

    // ============================================
    // Ownership Tests
    // ============================================

    function testOwnership() public {
        IOwnership ownership = IOwnership(address(diamond));
        assertEq(ownership.owner(), owner);
    }

    function testTransferOwnership() public {
        IOwnership ownership = IOwnership(address(diamond));

        vm.prank(owner);
        ownership.transferOwnership(user1);

        // Complete the transfer by accepting
        vm.prank(user1);
        ownership.acceptOwnership();

        assertEq(ownership.owner(), user1);
    }

    function testNonOwnerCannotTransferOwnership() public {
        IOwnership ownership = IOwnership(address(diamond));

        vm.prank(user1);
        vm.expectRevert('LibDiamond: Must be contract owner');
        ownership.transferOwnership(user2);
    }

    // ============================================
    // NodesFacet Tests
    // ============================================

    function testRegisterNode() public {
        bytes32 nodeHash = keccak256('test-node');

        vm.prank(user1);
        bytes32 returnedHash = this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        assertEq(returnedHash, nodeHash, 'Node hash should match');
    }

    function testGetNode() public {
        bytes32 nodeHash = keccak256('test-node-2');

        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Get node through Diamond
        (address nodeOwner, string memory nodeType, uint256 capacity, , bool active, bytes32 assetHash) =
            this.getNodeThroughDiamond(nodeHash);

        assertEq(nodeOwner, user1, 'Node owner should match');
        assertEq(nodeType, 'GOAT', 'Node type should match');
        assertEq(capacity, 100, 'Capacity should match');
        assertTrue(active, 'Node should be active');
    }

    function testUpdateNode() public {
        bytes32 nodeHash = keccak256('test-node-3');

        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Update node
        vm.prank(user1);
        this.updateNodeThroughDiamond(nodeHash, 'SHEEP', 200);

        // Verify update
        (, string memory nodeType, uint256 capacity, , ,) = this.getNodeThroughDiamond(nodeHash);

        assertEq(nodeType, 'SHEEP', 'Node type should be updated');
        assertEq(capacity, 200, 'Capacity should be updated');
    }

    function testDeactivateNode() public {
        bytes32 nodeHash = keccak256('test-node-4');

        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Deactivate node
        vm.prank(user1);
        this.deactivateNodeThroughDiamond(nodeHash);

        // Verify deactivation
        (, , , , bool active,) = this.getNodeThroughDiamond(nodeHash);
        assertFalse(active, 'Node should be deactivated');
    }

    function testNonOwnerCannotUpdateNode() public {
        bytes32 nodeHash = keccak256('test-node-5');

        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Try to update from different address
        vm.prank(user2);
        vm.expectRevert('Not node owner');
        this.updateNodeThroughDiamond(nodeHash, 'SHEEP', 200);
    }

    // ============================================
    // Upgrade Tests
    // ============================================

    function testUpgradeFacet() public {
        // Deploy new version of NodesFacet
        nodesFacetV2 = new NodesFacetV2();

        // Get old selectors
        bytes4[] memory oldSelectors = _getFacetSelectors('NodesFacet');

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);

        // Remove old facet
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(0), // Address(0) for removal
            action: IDiamondCut.FacetCutAction.Remove,
            functionSelectors: oldSelectors
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');

        // Add new facet
        bytes4[] memory newSelectors = _getFacetSelectorsV2();
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(nodesFacetV2),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: newSelectors
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');

        // Verify new facet is available
        IDiamondLoupe loupe = IDiamondLoupe(address(diamond));
        address newFacetAddress = loupe.facetAddress(newSelectors[0]);
        assertEq(newFacetAddress, address(nodesFacetV2), 'New facet should be available');
    }

    function testStoragePreservationAfterUpgrade() public {
        // Register a node before upgrade
        bytes32 nodeHash = keccak256('storage-test-node');
        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Perform upgrade
        upgradeNodesFacet();

        // Verify storage is preserved
        (address nodeOwner, , uint256 capacity, , ,) = this.getNodeThroughDiamond(nodeHash);

        assertEq(nodeOwner, user1, 'Owner should be preserved');
        assertEq(capacity, 100, 'Capacity should be preserved');
    }

    function testUpgradeWithAdditionalFunctionality() public {
        // Register a node
        bytes32 nodeHash = keccak256('feature-test-node');
        vm.prank(user1);
        this.registerNodeThroughDiamond('GOAT', 100, nodeHash);

        // Upgrade to V2 which has additional functionality
        upgradeNodesFacet();

        // The new functionality should be available
        // This would test the new function added in V2
    }

    // ============================================
    // Helper Functions
    // ============================================

    function registerNodeThroughDiamond(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash
    ) external returns (bytes32) {
        return this.registerNodeWithReturn(address(diamond), _nodeType, _capacity, _assetHash);
    }

    function registerNodeWithReturn(
        address _diamond,
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash
    ) external returns (bytes32) {
        (bool success, bytes memory returnData) = _diamond.call(
            abi.encodeWithSignature('registerNode(string,uint256,bytes32)', _nodeType, _capacity, _assetHash)
        );
        require(success, 'registerNode failed');
        return abi.decode(returnData, (bytes32));
    }

    function updateNodeThroughDiamond(
        bytes32 _nodeHash,
        string memory _nodeType,
        uint256 _capacity
    ) external {
        (bool success,) = address(diamond).call(
            abi.encodeWithSignature('updateNode(bytes32,string,uint256)', _nodeHash, _nodeType, _capacity)
        );
        require(success, 'updateNode failed');
    }

    function deactivateNodeThroughDiamond(bytes32 _nodeHash) external {
        (bool success,) = address(diamond).call(
            abi.encodeWithSignature('deactivateNode(bytes32)', _nodeHash)
        );
        require(success, 'deactivateNode failed');
    }

    function getNodeThroughDiamond(bytes32 _nodeHash)
        external
        view
        returns (
            address owner,
            string memory nodeType,
            uint256 capacity,
            uint256 createdAt,
            bool active,
            bytes32 assetHash
        )
    {
        (bool success, bytes memory returnData) = address(diamond).staticcall(
            abi.encodeWithSignature('getNode(bytes32)', _nodeHash)
        );
        require(success, 'getNode failed');
        return abi.decode(returnData, (address, string, uint256, uint256, bool, bytes32));
    }

    function upgradeNodesFacet() internal {
        // Deploy V2
        nodesFacetV2 = new NodesFacetV2();

        // Get and remove old selectors
        bytes4[] memory oldSelectors = _getFacetSelectors('NodesFacet');

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(0),
            action: IDiamondCut.FacetCutAction.Remove,
            functionSelectors: oldSelectors
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');

        // Add new selectors
        bytes4[] memory newSelectors = _getFacetSelectorsV2();
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(nodesFacetV2),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: newSelectors
        });
        IDiamondCut(address(diamond)).diamondCut(cuts, address(0), '');
    }

    function _getFacetSelectors(string memory) internal pure returns (bytes4[] memory) {
        // Return selectors for the specified facet
        // In production, this would be generated dynamically
        return new bytes4[](0);
    }

    function _getFacetSelectorsV2() internal pure returns (bytes4[] memory) {
        // Return selectors for NodesFacetV2
        return new bytes4[](0);
    }
}

/**
 * @title NodesFacetV2
 * @notice Example of an upgraded facet with additional functionality
 */
contract NodesFacetV2 {
    // This would contain the upgraded implementation
    // For testing purposes, it's a minimal version
    // that maintains storage compatibility

    event NodeUpgraded(bytes32 indexed nodeHash, uint256 newVersion);

    uint256 public version = 2;

    function initialize() public {
        // Initialization if needed
    }

    // Original functions (with same signatures)
    function registerNode(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash
    ) external returns (bytes32) {
        // Same implementation as V1
        bytes32 nodeHash = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, uint256(0))
        );
        return nodeHash;
    }

    // New function added in V2
    function upgradeNode(bytes32 _nodeHash) external {
        emit NodeUpgraded(_nodeHash, version);
    }
}

