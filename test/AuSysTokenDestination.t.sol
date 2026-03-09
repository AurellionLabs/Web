// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2, Vm } from 'forge-std/Test.sol';
import { DiamondTestBase } from './diamond/helpers/DiamondTestBase.sol';
import { AuSysFacet } from 'contracts/diamond/facets/AuSysFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IAuSysDiamond } from 'contracts/diamond/interfaces/IAuSysDiamond.sol';
import { ERC1155Mock } from './diamond/helpers/ERC1155Mock.sol';

/**
 * @title AuSysTokenDestinationTest
 * @notice Tests for selectTokenDestination (PR #44, branch feature/settlement-token-destination)
 */
contract AuSysTokenDestinationTest is DiamondTestBase {
    IAuSysDiamond public ausys;
    AssetsFacet public assets;
    ERC1155Mock public erc1155Token;

    address public buyer;
    address public seller;
    bytes32 public buyerNodeId;

    uint256 constant TOKEN_ID = 42;
    uint256 constant TOKEN_QTY = 10;
    uint256 constant ORDER_PRICE = 1000 ether;
    uint256 constant BOUNTY = 10 ether;

    // Events
    event TokenDestinationSelected(bytes32 indexed orderId, address destination, bytes32 nodeId, bool burned);

    // Errors
    error NoPendingDestination();
    error InvalidCaller();

    function setUp() public override {
        super.setUp();
        ausys = IAuSysDiamond(address(diamond));
        assets = AssetsFacet(address(diamond));

        // Deploy ERC1155 mock
        erc1155Token = new ERC1155Mock();

        buyer = user1;
        seller = user2;

        // Add missing AuSys selectors to diamond (new functions not in DiamondTestBase)
        _addMissingAuSysSelectors();

        // Setup roles
        vm.prank(owner);
        ausys.setAuSysAdmin(admin);

        vm.startPrank(admin);
        ausys.setDriver(driver1, true);
        ausys.setDispatcher(admin, true);
        vm.stopPrank();

        // Register a node owned by buyer
        vm.prank(buyer);
        buyerNodeId = NodesFacet(address(diamond)).registerNode(
            'LOGISTICS', 1000, bytes32(0), 'Buyer Warehouse', '40.7128', '-74.0060'
        );

        // Mint ERC1155 tokens to seller and approve diamond
        erc1155Token.mint(seller, TOKEN_ID, TOKEN_QTY);
        vm.prank(seller);
        erc1155Token.setApprovalForAll(address(diamond), true);
    }

    function _addMissingAuSysSelectors() internal {
        bytes4[] memory sels = new bytes4[](6);
        sels[0] = AuSysFacet.selectTokenDestination.selector;
        sels[1] = AuSysFacet.handOff.selector;
        sels[2] = AuSysFacet.onERC1155Received.selector;
        sels[3] = AuSysFacet.onERC1155BatchReceived.selector;
        sels[4] = AuSysFacet.acceptP2POffer.selector;
        sels[5] = AuSysFacet.cancelP2POffer.selector;

        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(auSysFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: sels
        });

        vm.prank(owner);
        DiamondCutFacet(address(diamond)).scheduleDiamondCut(cut, address(0), '');
        vm.warp(block.timestamp + DiamondCutFacet(address(diamond)).getDiamondCutTimelock());
        vm.prank(owner);
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');
    }

    /// @dev Creates a buyer-initiated order, runs the full journey lifecycle
    ///      (handOn -> handOff -> _settleOrder), and returns the orderId
    ///      with pendingTokenDestination == true.
    function _createSettledOrder() internal returns (bytes32 orderId) {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );

        address[] memory orderNodes = new address[](1);
        orderNodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(erc1155Token),
            tokenId: TOKEN_ID,
            tokenQuantity: TOKEN_QTY,
            price: ORDER_PRICE,
            txFee: 0, // calculated by contract as 2% of price
            buyer: buyer,
            seller: seller,
            journeyIds: journeyIds,
            nodes: orderNodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        // Buyer creates order — escrows payToken (price + txFee)
        vm.startPrank(buyer);
        payToken.approve(address(diamond), 10_000 ether);
        orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        // Create order journey (sender=seller, receiver=buyer)
        // Bounty is pulled from buyer via safeTransferFrom inside createOrderJourney
        vm.startPrank(buyer);
        payToken.approve(address(diamond), BOUNTY);
        vm.recordLogs();
        ausys.createOrderJourney(
            orderId,
            seller, // sender
            buyer, // receiver (must be buyer for _settleOrder to fire)
            parcelData,
            BOUNTY,
            block.timestamp + 86400,
            TOKEN_QTY,
            TOKEN_ID
        );
        vm.stopPrank();

        Vm.Log[] memory logs = vm.getRecordedLogs();
        bytes32 journeyId = _extractJourneyId(logs);

        // Assign driver
        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        // Phase 1: handOn (PENDING -> IN_TRANSIT)
        vm.prank(seller); // sender signs
        ausys.packageSign(journeyId);

        vm.prank(driver1); // driver signs for pickup (journey PENDING)
        ausys.packageSign(journeyId);

        vm.prank(driver1); // handOn — also escrows ERC1155 from seller into diamond
        ausys.handOn(journeyId);

        // Phase 2: handOff (IN_TRANSIT -> DELIVERED + _settleOrder)
        vm.prank(buyer); // receiver signs
        ausys.packageSign(journeyId);

        vm.prank(driver1); // driver signs for delivery (journey IN_TRANSIT)
        ausys.packageSign(journeyId);

        vm.prank(driver1); // handOff — settles order, sets pendingTokenDestination
        ausys.handOff(journeyId);

        return orderId;
    }

    function _extractJourneyId(Vm.Log[] memory logs) internal pure returns (bytes32) {
        bytes32 eventSig = keccak256(
            'JourneyCreated(bytes32,address,address,address,uint256,uint256,bytes32,string,string,string,string,string,string)'
        );
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == eventSig) {
                return logs[i].topics[1];
            }
        }
        revert('JourneyCreated event not found');
    }

    function _createJourneyForOrder(
        bytes32 orderId,
        address receiver,
        DiamondStorage.ParcelData memory parcelData
    ) internal returns (bytes32 journeyId) {
        vm.startPrank(buyer);
        payToken.approve(address(diamond), BOUNTY);
        vm.recordLogs();
        ausys.createOrderJourney(
            orderId,
            seller,
            receiver,
            parcelData,
            BOUNTY,
            block.timestamp + 86400,
            TOKEN_QTY,
            TOKEN_ID
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        vm.stopPrank();
        return _extractJourneyId(logs);
    }

    function _createJourneyForOrderWithAssetId(
        bytes32 orderId,
        address receiver,
        DiamondStorage.ParcelData memory parcelData,
        uint256 assetId
    ) internal returns (bytes32 journeyId) {
        vm.startPrank(buyer);
        payToken.approve(address(diamond), BOUNTY);
        vm.recordLogs();
        ausys.createOrderJourney(
            orderId,
            seller,
            receiver,
            parcelData,
            BOUNTY,
            block.timestamp + 86400,
            TOKEN_QTY,
            assetId
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        vm.stopPrank();
        return _extractJourneyId(logs);
    }

    // ============================================================================
    // HAPPY PATH TESTS
    // ============================================================================

    /// @notice 1. Buyer selects node destination — tokens arrive at node owner address
    function test_selectTokenDestination_toNode() public {
        bytes32 orderId = _createSettledOrder();

        // buyerNodeId is owned by buyer, so tokens should arrive at buyer's address
        uint256 balBefore = erc1155Token.balanceOf(buyer, TOKEN_ID);

        vm.prank(buyer);
        ausys.selectTokenDestination(orderId, buyerNodeId, false);

        uint256 balAfter = erc1155Token.balanceOf(buyer, TOKEN_ID);
        assertEq(balAfter - balBefore, TOKEN_QTY, 'Tokens should arrive at node owner (buyer)');
    }

    /// @notice 2. Buyer selects burn — tokens sent to 0xdead
    function test_selectTokenDestination_burn() public {
        bytes32 orderId = _createSettledOrder();

        vm.prank(buyer);
        ausys.selectTokenDestination(orderId, bytes32(0), true);

        uint256 deadBal = erc1155Token.balanceOf(address(0xdead), TOKEN_ID);
        assertEq(deadBal, TOKEN_QTY, 'Tokens should be sent to 0xdead');
    }

    // ============================================================================
    // REVERT TESTS
    // ============================================================================

    /// @notice 3. Non-buyer calls selectTokenDestination — InvalidCaller
    function test_selectTokenDestination_revert_nonBuyer() public {
        bytes32 orderId = _createSettledOrder();

        vm.prank(seller);
        vm.expectRevert(InvalidCaller.selector);
        ausys.selectTokenDestination(orderId, buyerNodeId, false);
    }

    /// @notice 4. Called on non-pending order — NoPendingDestination
    function test_selectTokenDestination_revert_noPending() public {
        bytes32 fakeOrderId = keccak256('nonexistent');

        vm.prank(buyer);
        vm.expectRevert(NoPendingDestination.selector);
        ausys.selectTokenDestination(fakeOrderId, buyerNodeId, false);
    }

    /// @notice 5. Node not owned by buyer — require fail
    function test_selectTokenDestination_revert_notNodeOwner() public {
        bytes32 orderId = _createSettledOrder();

        // testNodeHash is registered to nodeOperator, not buyer
        vm.prank(buyer);
        vm.expectRevert();
        ausys.selectTokenDestination(orderId, testNodeHash, false);
    }

    /// @notice 6. Called twice on same order — NoPendingDestination (state cleared)
    function test_selectTokenDestination_revert_calledTwice() public {
        bytes32 orderId = _createSettledOrder();

        vm.startPrank(buyer);
        ausys.selectTokenDestination(orderId, bytes32(0), true); // first call succeeds

        vm.expectRevert(NoPendingDestination.selector);
        ausys.selectTokenDestination(orderId, buyerNodeId, false); // second call reverts
        vm.stopPrank();
    }

    // ============================================================================
    // STATE VERIFICATION
    // ============================================================================

    /// @notice 7. After selection, pendingTokenDestination[orderId] == false
    function test_selectTokenDestination_clearsPendingState() public {
        bytes32 orderId = _createSettledOrder();

        // Before: order should appear in pending destinations
        bytes32[] memory pendingBefore = ausys.getPendingTokenDestinations(buyer);
        bool foundBefore = false;
        for (uint256 i = 0; i < pendingBefore.length; i++) {
            if (pendingBefore[i] == orderId) {
                foundBefore = true;
                break;
            }
        }
        assertTrue(foundBefore, 'Order should be pending before selection');

        vm.prank(buyer);
        ausys.selectTokenDestination(orderId, bytes32(0), true);

        // After: order should no longer appear
        bytes32[] memory pendingAfter = ausys.getPendingTokenDestinations(buyer);
        bool foundAfter = false;
        for (uint256 i = 0; i < pendingAfter.length; i++) {
            if (pendingAfter[i] == orderId) {
                foundAfter = true;
                break;
            }
        }
        assertFalse(foundAfter, 'Order should NOT be pending after selection');
    }

    function test_selectTokenDestination_creditsNodeSellableForDiamondErc1155() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 tokenId) = assets.nodeMint(seller, assetDef, TOKEN_QTY, 'COMMODITY', '');

        vm.prank(seller);
        assets.setApprovalForAll(address(diamond), true);

        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );
        address[] memory orderNodes = new address[](1);
        orderNodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(diamond),
            tokenId: tokenId,
            tokenQuantity: TOKEN_QTY,
            price: ORDER_PRICE,
            txFee: 0,
            buyer: buyer,
            seller: seller,
            journeyIds: journeyIds,
            nodes: orderNodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        vm.startPrank(buyer);
        payToken.approve(address(diamond), 10_000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        payToken.approve(address(diamond), BOUNTY);
        vm.recordLogs();
        ausys.createOrderJourney(
            orderId,
            seller,
            buyer,
            parcelData,
            BOUNTY,
            block.timestamp + 86400,
            TOKEN_QTY,
            tokenId
        );
        Vm.Log[] memory logs = vm.getRecordedLogs();
        vm.stopPrank();

        bytes32 journeyId = _extractJourneyId(logs);

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(seller);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.handOn(journeyId);

        vm.prank(buyer);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.handOff(journeyId);

        vm.prank(buyer);
        ausys.selectTokenDestination(orderId, buyerNodeId, false);

        assertEq(assets.balanceOf(buyer, tokenId), TOKEN_QTY, 'Buyer should receive settled tokens');
        assertEq(
            assets.getNodeSellableAmount(buyer, tokenId, buyerNodeId),
            TOKEN_QTY,
            'Node sellable should be credited on settlement'
        );
    }

    function test_handOn_escrowsSellerTokensOnlyOncePerOrder() public {
        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );
        address[] memory orderNodes = new address[](1);
        orderNodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(erc1155Token),
            tokenId: TOKEN_ID,
            tokenQuantity: TOKEN_QTY,
            price: ORDER_PRICE,
            txFee: 0,
            buyer: buyer,
            seller: seller,
            journeyIds: journeyIds,
            nodes: orderNodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        vm.startPrank(buyer);
        payToken.approve(address(diamond), 10_000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        bytes32 firstJourneyId = _createJourneyForOrder(orderId, buyer, parcelData);
        bytes32 secondJourneyId = _createJourneyForOrder(orderId, nodeOperator, parcelData);

        vm.startPrank(admin);
        ausys.assignDriverToJourney(driver1, firstJourneyId);
        ausys.assignDriverToJourney(driver1, secondJourneyId);
        vm.stopPrank();

        vm.prank(seller);
        ausys.packageSign(firstJourneyId);
        vm.prank(driver1);
        ausys.packageSign(firstJourneyId);
        vm.prank(driver1);
        ausys.handOn(firstJourneyId);

        uint256 escrowAfterFirstHandOn = erc1155Token.balanceOf(address(diamond), TOKEN_ID);
        assertEq(escrowAfterFirstHandOn, TOKEN_QTY, 'First handOn should escrow tokens once');

        vm.prank(seller);
        ausys.packageSign(secondJourneyId);
        vm.prank(driver1);
        ausys.packageSign(secondJourneyId);
        vm.prank(driver1);
        ausys.handOn(secondJourneyId);

        uint256 escrowAfterSecondHandOn = erc1155Token.balanceOf(address(diamond), TOKEN_ID);
        assertEq(escrowAfterSecondHandOn, TOKEN_QTY, 'Second handOn must not escrow the order twice');
    }

    function test_createSellerInitiatedOffer_debitsNodeSellableForDiamondAsset() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 tokenId) = assets.nodeMint(seller, assetDef, TOKEN_QTY, 'COMMODITY', '');

        vm.prank(seller);
        assets.setApprovalForAll(address(diamond), true);

        uint256 sellQty = 4;
        uint256 beforeSellable = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);

        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );
        address[] memory orderNodes = new address[](0);
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(diamond),
            tokenId: tokenId,
            tokenQuantity: sellQty,
            price: ORDER_PRICE,
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
            expiresAt: 0
        });

        vm.prank(seller);
        ausys.createAuSysOrder(order);

        uint256 afterSellable = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(afterSellable, beforeSellable - sellQty, 'Sellable should be debited on seller escrow');
    }

    function test_cancelSellerInitiatedOffer_restoresNodeSellableForDiamondAsset() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 tokenId) = assets.nodeMint(seller, assetDef, TOKEN_QTY, 'COMMODITY', '');

        vm.prank(seller);
        assets.setApprovalForAll(address(diamond), true);

        uint256 sellQty = 4;
        uint256 beforeSellable = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);

        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );
        address[] memory orderNodes = new address[](0);
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(diamond),
            tokenId: tokenId,
            tokenQuantity: sellQty,
            price: ORDER_PRICE,
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
            expiresAt: 0
        });

        vm.prank(seller);
        bytes32 orderId = ausys.createAuSysOrder(order);

        uint256 debitedSellable = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(debitedSellable, beforeSellable - sellQty, 'Sellable should be debited while offer is open');

        vm.prank(seller);
        ausys.cancelP2POffer(orderId);

        uint256 restoredSellable = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(restoredSellable, beforeSellable, 'Sellable should be restored after cancellation');
    }

    function test_handOn_debitsDiamondSellableOnlyOnceForNonSellerInitiatedFlow() public {
        vm.startPrank(owner);
        assets.addSupportedClass('COMMODITY');
        vm.stopPrank();

        DiamondStorage.AssetDefinition memory assetDef = _createAssetDefinition('Gold Bar', 'COMMODITY');

        vm.prank(nodeOperator);
        (, uint256 tokenId) = assets.nodeMint(seller, assetDef, TOKEN_QTY, 'COMMODITY', '');

        vm.prank(seller);
        assets.setApprovalForAll(address(diamond), true);

        DiamondStorage.ParcelData memory parcelData = _createParcelData(
            '40.7128', '-74.0060', '34.0522', '-118.2437', 'Origin', 'Destination'
        );
        address[] memory orderNodes = new address[](1);
        orderNodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(diamond),
            tokenId: tokenId,
            tokenQuantity: TOKEN_QTY,
            price: ORDER_PRICE,
            txFee: 0,
            buyer: buyer,
            seller: seller,
            journeyIds: journeyIds,
            nodes: orderNodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        vm.startPrank(buyer);
        payToken.approve(address(diamond), 10_000 ether);
        bytes32 orderId = ausys.createAuSysOrder(order);
        vm.stopPrank();

        uint256 sellableBeforeHandOn = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(sellableBeforeHandOn, TOKEN_QTY, 'Mint should initialize sellable balance');

        bytes32 firstJourneyId = _createJourneyForOrderWithAssetId(orderId, buyer, parcelData, tokenId);
        bytes32 secondJourneyId = _createJourneyForOrderWithAssetId(orderId, nodeOperator, parcelData, tokenId);

        vm.startPrank(admin);
        ausys.assignDriverToJourney(driver1, firstJourneyId);
        ausys.assignDriverToJourney(driver1, secondJourneyId);
        vm.stopPrank();

        vm.prank(seller);
        ausys.packageSign(firstJourneyId);
        vm.prank(driver1);
        ausys.packageSign(firstJourneyId);
        vm.prank(driver1);
        ausys.handOn(firstJourneyId);

        uint256 sellableAfterFirstHandOn = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(sellableAfterFirstHandOn, 0, 'First handOn should debit sellable once');

        vm.prank(seller);
        ausys.packageSign(secondJourneyId);
        vm.prank(driver1);
        ausys.packageSign(secondJourneyId);
        vm.prank(driver1);
        ausys.handOn(secondJourneyId);

        uint256 sellableAfterSecondHandOn = assets.getNodeSellableAmount(seller, tokenId, testNodeHash);
        assertEq(sellableAfterSecondHandOn, 0, 'Second handOn must not debit sellable again');
    }
}
