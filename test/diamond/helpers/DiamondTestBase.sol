// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { Diamond } from 'contracts/diamond/Diamond.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IDiamondLoupe } from 'contracts/diamond/interfaces/IDiamondLoupe.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { DiamondLoupeFacet } from 'contracts/diamond/facets/DiamondLoupeFacet.sol';
import { OwnershipFacet } from 'contracts/diamond/facets/OwnershipFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { AuSysFacet } from 'contracts/diamond/facets/AuSysFacet.sol';
import { AuSysViewFacet } from 'contracts/diamond/facets/AuSysViewFacet.sol';
import { BridgeFacet } from 'contracts/diamond/facets/BridgeFacet.sol';
import { CLOBLogisticsFacet } from 'contracts/diamond/facets/CLOBLogisticsFacet.sol';
import { RWYStakingFacet } from 'contracts/diamond/facets/RWYStakingFacet.sol';
import { OperatorFacet } from 'contracts/diamond/facets/OperatorFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

import { ERC20Mock } from './ERC20Mock.sol';

/**
 * @title DiamondTestBase
 * @notice Base contract for all Diamond facet tests
 * @dev Deploys Diamond with all facets and provides helper functions
 */
abstract contract DiamondTestBase is Test {
    // Diamond contract
    Diamond public diamond;
    
    // Facets
    DiamondCutFacet public diamondCutFacet;
    DiamondLoupeFacet public diamondLoupeFacet;
    OwnershipFacet public ownershipFacet;
    NodesFacet public nodesFacet;
    AssetsFacet public assetsFacet;
    AuSysFacet public auSysFacet;
    AuSysViewFacet public auSysViewFacet;
    BridgeFacet public bridgeFacet;
    CLOBLogisticsFacet public clobLogisticsFacet;
    RWYStakingFacet public rwyStakingFacet;
    OperatorFacet public operatorFacet;

    // Mock tokens
    ERC20Mock public payToken;
    ERC20Mock public quoteToken;

    // Test addresses
    address public owner;
    address public user1;
    address public user2;
    address public driver1;
    address public driver2;
    address public nodeOperator;
    address public admin;

    // Common test data
    bytes32 public testNodeHash;

    function setUp() public virtual {
        // Create test addresses
        owner = makeAddr('owner');
        user1 = makeAddr('user1');
        user2 = makeAddr('user2');
        driver1 = makeAddr('driver1');
        driver2 = makeAddr('driver2');
        nodeOperator = makeAddr('nodeOperator');
        admin = makeAddr('admin');

        // Deploy mock tokens
        payToken = new ERC20Mock('Pay Token', 'PAY', 18);
        quoteToken = new ERC20Mock('Quote Token', 'QUOTE', 18);

        // Fund test accounts
        payToken.mint(owner, 1_000_000 ether);
        payToken.mint(user1, 100_000 ether);
        payToken.mint(user2, 100_000 ether);
        payToken.mint(admin, 100_000 ether);
        payToken.mint(driver1, 10_000 ether);
        payToken.mint(driver2, 10_000 ether);
        quoteToken.mint(owner, 1_000_000 ether);
        quoteToken.mint(user1, 100_000 ether);
        quoteToken.mint(user2, 100_000 ether);
        quoteToken.mint(admin, 100_000 ether);

        // Deploy Diamond infrastructure
        vm.startPrank(owner);
        _deployDiamond();
        _addFacets();
        _initializeFacets();
        vm.stopPrank();
    }

    function _deployDiamond() internal {
        // Deploy facets
        diamondCutFacet = new DiamondCutFacet();
        diamondLoupeFacet = new DiamondLoupeFacet();
        ownershipFacet = new OwnershipFacet();
        nodesFacet = new NodesFacet();
        assetsFacet = new AssetsFacet();
        auSysFacet = new AuSysFacet();
        auSysViewFacet = new AuSysViewFacet();
        bridgeFacet = new BridgeFacet();
        clobLogisticsFacet = new CLOBLogisticsFacet();
        rwyStakingFacet = new RWYStakingFacet();
        operatorFacet = new OperatorFacet();

        // Deploy Diamond
        diamond = new Diamond(owner, address(diamondCutFacet));
    }

    function _addFacets() internal {
        // Add DiamondLoupeFacet
        _addFacet(address(diamondLoupeFacet), _getDiamondLoupeSelectors());
        
        // Add OwnershipFacet
        _addFacet(address(ownershipFacet), _getOwnershipSelectors());
        
        // Add NodesFacet
        _addFacet(address(nodesFacet), _getNodesSelectors());
        
        // Add AssetsFacet
        _addFacet(address(assetsFacet), _getAssetsSelectors());
        
        // Add AuSysFacet
        _addFacet(address(auSysFacet), _getAuSysSelectors());

        // Add AuSysViewFacet
        _addFacet(address(auSysViewFacet), _getAuSysViewSelectors());
        
        // Add BridgeFacet
        _addFacet(address(bridgeFacet), _getBridgeSelectors());
        
        // Add CLOBLogisticsFacet
        _addFacet(address(clobLogisticsFacet), _getCLOBLogisticsSelectors());
        
        // Add RWYStakingFacet
        _addFacet(address(rwyStakingFacet), _getRWYStakingSelectors());
        
        // Add OperatorFacet
        _addFacet(address(operatorFacet), _getOperatorSelectors());
    }

    function _addFacet(address facetAddress, bytes4[] memory selectors) internal {
        if (selectors.length == 0) return;
        
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: facetAddress,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
        DiamondCutFacet(address(diamond)).scheduleDiamondCut(cut, address(0), '');
        vm.warp(block.timestamp + DiamondCutFacet(address(diamond)).getDiamondCutTimelock());
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');
    }

    function _initializeFacets() internal {
        AuSysFacet(address(diamond)).setPayToken(address(payToken));
        BridgeFacet(address(diamond)).setQuoteTokenAddress(address(quoteToken));
        NodesFacet(address(diamond)).setNodeRegistrar(nodeOperator, true);
        NodesFacet(address(diamond)).setNodeRegistrar(user1, true);
        NodesFacet(address(diamond)).setNodeRegistrar(user2, true);
        testNodeHash = _registerTestNode(nodeOperator);
    }

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    function _registerTestNode(address nodeOwner) internal returns (bytes32) {
        vm.stopPrank();
        vm.startPrank(nodeOwner);
        bytes32 nodeHash = NodesFacet(address(diamond)).registerNode(
            'LOGISTICS',
            1000,
            bytes32(0),
            'Test Warehouse',
            '40.7128',
            '-74.0060'
        );
        vm.stopPrank();
        vm.startPrank(owner);
        return nodeHash;
    }

    function _createAssetDefinition(
        string memory name,
        string memory assetClass
    ) internal pure returns (DiamondStorage.AssetDefinition memory) {
        DiamondStorage.Attribute[] memory attrs = new DiamondStorage.Attribute[](1);
        attrs[0] = DiamondStorage.Attribute({
            name: 'weight',
            values: new string[](1),
            description: 'Weight in kg'
        });
        attrs[0].values[0] = '100';

        return DiamondStorage.AssetDefinition({
            name: name,
            assetClass: assetClass,
            attributes: attrs
        });
    }

    function _createLocation(
        string memory lat,
        string memory lng
    ) internal pure returns (DiamondStorage.Location memory) {
        return DiamondStorage.Location({ lat: lat, lng: lng });
    }

    function _createParcelData(
        string memory startLat,
        string memory startLng,
        string memory endLat,
        string memory endLng,
        string memory startName,
        string memory endName
    ) internal pure returns (DiamondStorage.ParcelData memory) {
        return DiamondStorage.ParcelData({
            startLocation: DiamondStorage.Location({ lat: startLat, lng: startLng }),
            endLocation: DiamondStorage.Location({ lat: endLat, lng: endLng }),
            startName: startName,
            endName: endName
        });
    }

    // ============================================================================
    // SELECTOR GETTERS
    // ============================================================================

    function _getDiamondLoupeSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = IDiamondLoupe.facets.selector;
        selectors[1] = IDiamondLoupe.facetFunctionSelectors.selector;
        selectors[2] = IDiamondLoupe.facetAddresses.selector;
        selectors[3] = IDiamondLoupe.facetAddress.selector;
        selectors[4] = bytes4(keccak256('supportsInterface(bytes4)'));
        return selectors;
    }

    function _getOwnershipSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](3);
        selectors[0] = bytes4(keccak256('owner()'));
        selectors[1] = bytes4(keccak256('transferOwnership(address)'));
        selectors[2] = bytes4(keccak256('acceptOwnership()'));
        return selectors;
    }

    function _getNodesSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](15);
        selectors[0] = NodesFacet.registerNode.selector;
        selectors[1] = NodesFacet.updateNode.selector;
        selectors[2] = NodesFacet.deactivateNode.selector;
        selectors[3] = NodesFacet.getNode.selector;
        selectors[4] = NodesFacet.getNodeStatus.selector;
        selectors[5] = NodesFacet.getOwnerNodes.selector;
        selectors[6] = NodesFacet.setNodeAdmin.selector;
        selectors[7] = NodesFacet.revokeNodeAdmin.selector;
        selectors[8] = NodesFacet.isNodeAdmin.selector;
        selectors[9] = NodesFacet.nodeHandoff.selector;
        selectors[10] = NodesFacet.reduceCapacityForOrder.selector;
        selectors[11] = NodesFacet.addNodeItem.selector;
        selectors[12] = NodesFacet.setNodeRegistrar.selector;
        selectors[13] = NodesFacet.hasNodeRole.selector;
        selectors[14] = NodesFacet.getAllowedNodeRegistrars.selector;
        return selectors;
    }

    function _getAssetsSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](23);
        // ERC1155 core
        selectors[0] = AssetsFacet.balanceOf.selector;
        selectors[1] = AssetsFacet.balanceOfBatch.selector;
        selectors[2] = AssetsFacet.setApprovalForAll.selector;
        selectors[3] = AssetsFacet.isApprovedForAll.selector;
        selectors[4] = AssetsFacet.safeTransferFrom.selector;
        selectors[5] = AssetsFacet.safeBatchTransferFrom.selector;
        selectors[6] = AssetsFacet.uri.selector;
        // ERC1155Supply
        selectors[7] = AssetsFacet.totalSupply.selector;
        selectors[8] = AssetsFacet.exists.selector;
        // AuraAsset specific
        selectors[9] = AssetsFacet.setURI.selector;
        selectors[10] = AssetsFacet.nodeMint.selector;
        selectors[11] = AssetsFacet.redeem.selector;
        selectors[12] = AssetsFacet.getCustodyInfo.selector;
        selectors[13] = AssetsFacet.isInCustody.selector;
        selectors[14] = AssetsFacet.addSupportedClass.selector;
        selectors[15] = AssetsFacet.removeSupportedClass.selector;
        selectors[16] = AssetsFacet.mintBatch.selector;
        selectors[17] = AssetsFacet.getTotalCustodyAmount.selector;
        selectors[18] = AssetsFacet.nodeMintForNode.selector;
        selectors[19] = AssetsFacet.redeemFromNode.selector;
        selectors[20] = AssetsFacet.getNodeCustodyInfo.selector;
        selectors[21] = AssetsFacet.getNodeSellableAmount.selector;
        selectors[22] = AssetsFacet.getOwnerNodeSellableBalances.selector;
        return selectors;
    }

    function _getAuSysSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](13);
        selectors[0] = AuSysFacet.setPayToken.selector;
        selectors[1] = AuSysFacet.setAuSysAdmin.selector;
        selectors[2] = AuSysFacet.revokeAuSysAdmin.selector;
        selectors[3] = AuSysFacet.setDriver.selector;
        selectors[4] = AuSysFacet.setDispatcher.selector;
        selectors[5] = AuSysFacet.createAuSysOrder.selector;
        selectors[6] = AuSysFacet.createJourney.selector;
        selectors[7] = AuSysFacet.createOrderJourney.selector;
        selectors[8] = AuSysFacet.assignDriverToJourney.selector;
        selectors[9] = AuSysFacet.packageSign.selector;
        selectors[10] = AuSysFacet.handOn.selector;
        selectors[11] = AuSysFacet.correctOrderTokenQuantity.selector;
        selectors[12] = AuSysFacet.adminRecoverEscrow.selector;
        return selectors;
    }

    function _getAuSysViewSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = AuSysViewFacet.getPayToken.selector;
        selectors[1] = AuSysViewFacet.hasAuSysRole.selector;
        selectors[2] = AuSysViewFacet.getAllowedDrivers.selector;
        selectors[3] = AuSysViewFacet.getAuSysOrder.selector;
        selectors[4] = AuSysViewFacet.domainSeparator.selector;
        selectors[5] = AuSysViewFacet.getOpenP2POffers.selector;
        selectors[6] = AuSysViewFacet.getUserP2POffers.selector;
        selectors[7] = AuSysViewFacet.getJourney.selector;
        selectors[8] = AuSysViewFacet.getDriverJourneyCount.selector;
        selectors[9] = AuSysViewFacet.getPendingTokenDestinations.selector;
        return selectors;
    }

    function _getBridgeSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = BridgeFacet.createUnifiedOrder.selector;
        selectors[1] = BridgeFacet.getUnifiedOrder.selector;
        selectors[2] = BridgeFacet.getBuyerOrders.selector;
        selectors[3] = BridgeFacet.getSellerOrders.selector;
        selectors[4] = BridgeFacet.setBountyPercentage.selector;
        selectors[5] = BridgeFacet.setProtocolFeePercentage.selector;
        selectors[6] = BridgeFacet.updateClobAddress.selector;
        selectors[7] = BridgeFacet.updateAusysAddress.selector;
        selectors[8] = BridgeFacet.setQuoteTokenAddress.selector;
        return selectors;
    }

    function _getCLOBLogisticsSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = CLOBLogisticsFacet.registerDriver.selector;
        selectors[1] = CLOBLogisticsFacet.setDriverAvailability.selector;
        selectors[2] = CLOBLogisticsFacet.updateDriverLocation.selector;
        selectors[3] = CLOBLogisticsFacet.getDriverInfo.selector;
        selectors[4] = CLOBLogisticsFacet.createLogisticsOrder.selector;
        selectors[5] = CLOBLogisticsFacet.acceptDelivery.selector;
        selectors[6] = CLOBLogisticsFacet.confirmPickup.selector;
        selectors[7] = CLOBLogisticsFacet.confirmDelivery.selector;
        selectors[8] = CLOBLogisticsFacet.settleLogisticsOrder.selector;
        selectors[9] = CLOBLogisticsFacet.disputeOrder.selector;
        selectors[10] = CLOBLogisticsFacet.cancelLogisticsOrder.selector;
        selectors[11] = CLOBLogisticsFacet.getLogisticsOrder.selector;
        return selectors;
    }

    function _getRWYStakingSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](18);
        // Admin functions
        selectors[0] = RWYStakingFacet.setRWYCLOBAddress.selector;
        selectors[1] = RWYStakingFacet.setRWYQuoteToken.selector;
        selectors[2] = RWYStakingFacet.setRWYFeeRecipient.selector;
        selectors[3] = RWYStakingFacet.pauseRWY.selector;
        selectors[4] = RWYStakingFacet.unpauseRWY.selector;
        selectors[5] = RWYStakingFacet.initializeRWYStaking.selector;
        // Operator functions
        selectors[6] = RWYStakingFacet.createOpportunity.selector;
        selectors[7] = RWYStakingFacet.setInsurance.selector;
        selectors[8] = RWYStakingFacet.submitCustodyProof.selector;
        selectors[9] = RWYStakingFacet.submitTokenizationProof.selector;
        // Staker functions
        selectors[10] = RWYStakingFacet.stake.selector;
        selectors[11] = RWYStakingFacet.unstake.selector;
        // View functions
        selectors[12] = RWYStakingFacet.getOpportunity.selector;
        selectors[13] = RWYStakingFacet.getInsurance.selector;
        selectors[14] = RWYStakingFacet.getCustodyProofs.selector;
        selectors[15] = RWYStakingFacet.getCustodyProofCount.selector;
        selectors[16] = RWYStakingFacet.getTokenizationProof.selector;
        selectors[17] = RWYStakingFacet.getRWYStake.selector;
        return selectors;
    }

    function _getOperatorSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = OperatorFacet.approveOperator.selector;
        selectors[1] = OperatorFacet.revokeOperator.selector;
        selectors[2] = OperatorFacet.isApprovedOperator.selector;
        selectors[3] = OperatorFacet.setOperatorReputation.selector;
        selectors[4] = OperatorFacet.getOperatorStats.selector;
        selectors[5] = OperatorFacet.getOperatorReputation.selector;
        selectors[6] = OperatorFacet.getOperatorSuccessfulOps.selector;
        selectors[7] = OperatorFacet.getOperatorTotalValueProcessed.selector;
        return selectors;
    }
}
