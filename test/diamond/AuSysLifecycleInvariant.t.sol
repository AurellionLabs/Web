// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { StdInvariant } from 'forge-std/StdInvariant.sol';
import { Test } from 'forge-std/Test.sol';
import { Vm } from 'forge-std/Vm.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { AuSysFacet } from 'contracts/diamond/facets/AuSysFacet.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IAuSysDiamond } from 'contracts/diamond/interfaces/IAuSysDiamond.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { OrderStatus } from 'contracts/diamond/libraries/OrderStatus.sol';
import { ERC1155Mock } from './helpers/ERC1155Mock.sol';

contract AuSysLifecycleHandler is Test {
    IAuSysDiamond internal immutable ausys;
    ERC1155Mock internal immutable assetToken;
    address internal immutable diamondAddress;
    address internal immutable admin;
    address internal immutable nodeOperator;

    address[] internal buyers;
    address[] internal sellers;
    address[] internal drivers;
    mapping(address => bytes32) internal buyerNodeIds;

    bytes32[] internal trackedOrders;
    bytes32[] internal trackedJourneys;

    uint256 internal constant TOKEN_ID = 7;

    constructor(
        IAuSysDiamond _ausys,
        ERC1155Mock _assetToken,
        address _diamondAddress,
        address _admin,
        address _nodeOperator,
        address[] memory _buyers,
        address[] memory _sellers,
        address[] memory _drivers,
        bytes32[] memory _nodeIds
    ) {
        ausys = _ausys;
        assetToken = _assetToken;
        diamondAddress = _diamondAddress;
        admin = _admin;
        nodeOperator = _nodeOperator;
        buyers = _buyers;
        sellers = _sellers;
        drivers = _drivers;

        for (uint256 i = 0; i < _buyers.length; i++) {
            buyerNodeIds[_buyers[i]] = _nodeIds[i];
        }
    }

    function initializeApprovals(address payToken) external {
        for (uint256 i = 0; i < buyers.length; i++) {
            vm.prank(buyers[i]);
            ERC20MockLike(payToken).approve(diamondAddress, type(uint256).max);
        }

        for (uint256 i = 0; i < sellers.length; i++) {
            assetToken.mint(sellers[i], TOKEN_ID, 10_000);
            vm.prank(sellers[i]);
            assetToken.setApprovalForAll(diamondAddress, true);
        }
    }

    function createSellerOffer(uint256 sellerSeed, uint256 quantitySeed, uint256 priceSeed, uint256 expirySeed) external {
        address seller = sellers[_boundIndex(sellerSeed, sellers.length)];
        uint256 quantity = bound(quantitySeed, 1, 25);
        uint256 price = bound(priceSeed, 1 ether, 1_000 ether);
        uint256 expiryMode = expirySeed % 3;
        uint256 expiresAt = 0;

        if (expiryMode == 1) {
            expiresAt = block.timestamp + bound(expirySeed, 1 hours, 3 days);
        } else if (expiryMode == 2) {
            expiresAt = block.timestamp + 1;
        }

        DiamondStorage.ParcelData memory parcelData = _parcelData();
        address[] memory nodes = new address[](1);
        nodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(assetToken),
            tokenId: TOKEN_ID,
            tokenQuantity: quantity,
            price: price,
            txFee: 0,
            buyer: address(0),
            seller: seller,
            journeyIds: journeyIds,
            nodes: nodes,
            locationData: parcelData,
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: true,
            targetCounterparty: address(0),
            expiresAt: expiresAt
        });

        vm.prank(seller);
        try ausys.createAuSysOrder(order) returns (bytes32 orderId) {
            trackedOrders.push(orderId);
        } catch { }
    }

    function acceptOffer(uint256 orderSeed, uint256 buyerSeed) external {
        if (trackedOrders.length == 0) return;

        bytes32 orderId = trackedOrders[_boundIndex(orderSeed, trackedOrders.length)];
        DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(orderId);
        if (order.id == bytes32(0)) return;

        address buyer = buyers[_boundIndex(buyerSeed, buyers.length)];
        vm.prank(buyer);
        try ausys.acceptP2POffer(orderId) { } catch { }
    }

    function createJourneyForAcceptedOrder(
        uint256 orderSeed,
        uint256 bountySeed,
        uint256 etaSeed
    ) external {
        if (trackedOrders.length == 0) return;

        bytes32 orderId = trackedOrders[_boundIndex(orderSeed, trackedOrders.length)];
        DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(orderId);
        if (order.id == bytes32(0) || order.buyer == address(0) || order.seller == address(0)) return;

        uint256 bounty = bound(bountySeed, 1 ether, 50 ether);
        uint256 eta = block.timestamp + bound(etaSeed, 1 hours, 7 days);

        vm.prank(order.buyer);
        try ausys.createOrderJourney(
            orderId,
            order.seller,
            order.buyer,
            _parcelData(),
            bounty,
            eta,
            order.tokenQuantity,
            order.tokenId
        ) {
            DiamondStorage.AuSysOrder memory updatedOrder = ausys.getAuSysOrder(orderId);
            if (updatedOrder.journeyIds.length > order.journeyIds.length) {
                trackedJourneys.push(updatedOrder.journeyIds[updatedOrder.journeyIds.length - 1]);
            }
        } catch { }
    }

    function assignDriver(uint256 journeySeed, uint256 driverSeed) external {
        if (trackedJourneys.length == 0) return;

        bytes32 journeyId = trackedJourneys[_boundIndex(journeySeed, trackedJourneys.length)];
        address driver = drivers[_boundIndex(driverSeed, drivers.length)];

        vm.prank(admin);
        try ausys.assignDriverToJourney(driver, journeyId) { } catch { }
    }

    function handOnJourney(uint256 journeySeed) external {
        if (trackedJourneys.length == 0) return;

        bytes32 journeyId = trackedJourneys[_boundIndex(journeySeed, trackedJourneys.length)];
        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        if (journey.journeyId == bytes32(0) || journey.driver == address(0)) return;

        vm.prank(journey.sender);
        try ausys.packageSign(journeyId) { } catch { }

        vm.prank(journey.driver);
        try ausys.packageSign(journeyId) { } catch { }

        vm.prank(journey.driver);
        try ausys.handOn(journeyId) { } catch { }
    }

    function handOffJourney(uint256 journeySeed) external {
        if (trackedJourneys.length == 0) return;

        bytes32 journeyId = trackedJourneys[_boundIndex(journeySeed, trackedJourneys.length)];
        DiamondStorage.AuSysJourney memory journey = ausys.getJourney(journeyId);
        if (journey.journeyId == bytes32(0) || journey.driver == address(0)) return;

        vm.prank(journey.receiver);
        try ausys.packageSign(journeyId) { } catch { }

        vm.prank(journey.driver);
        try ausys.packageSign(journeyId) { } catch { }

        vm.prank(journey.driver);
        try ausys.handOff(journeyId) { } catch { }
    }

    function cancelOffer(uint256 orderSeed) external {
        if (trackedOrders.length == 0) return;

        bytes32 orderId = trackedOrders[_boundIndex(orderSeed, trackedOrders.length)];
        DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(orderId);
        if (order.id == bytes32(0)) return;

        address creator = order.isSellerInitiated ? order.seller : order.buyer;
        if (creator == address(0)) return;

        vm.prank(creator);
        try ausys.cancelP2POffer(orderId) { } catch { }
    }

    function selectDestination(uint256 orderSeed, uint256 burnSeed) external {
        if (trackedOrders.length == 0) return;

        bytes32 orderId = trackedOrders[_boundIndex(orderSeed, trackedOrders.length)];
        DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(orderId);
        if (order.id == bytes32(0) || order.buyer == address(0)) return;

        bool burn = burnSeed % 2 == 0;
        bytes32 nodeId = burn ? bytes32(0) : buyerNodeIds[order.buyer];

        vm.prank(order.buyer);
        try ausys.selectTokenDestination(orderId, nodeId, burn) { } catch { }
    }

    function advanceTime(uint256 deltaSeed) external {
        vm.warp(block.timestamp + bound(deltaSeed, 1, 3 days));
    }

    function trackedOrderCount() external view returns (uint256) {
        return trackedOrders.length;
    }

    function trackedJourneyCount() external view returns (uint256) {
        return trackedJourneys.length;
    }

    function trackedOrderAt(uint256 index) external view returns (bytes32) {
        return trackedOrders[index];
    }

    function trackedJourneyAt(uint256 index) external view returns (bytes32) {
        return trackedJourneys[index];
    }

    function buyerAt(uint256 index) external view returns (address) {
        return buyers[index];
    }

    function driverAt(uint256 index) external view returns (address) {
        return drivers[index];
    }

    function buyerCount() external view returns (uint256) {
        return buyers.length;
    }

    function driverCount() external view returns (uint256) {
        return drivers.length;
    }

    function _parcelData() internal pure returns (DiamondStorage.ParcelData memory parcelData) {
        parcelData.startLocation = DiamondStorage.Location({ lat: '40.7128', lng: '-74.0060' });
        parcelData.endLocation = DiamondStorage.Location({ lat: '34.0522', lng: '-118.2437' });
        parcelData.startName = 'Origin';
        parcelData.endName = 'Destination';
    }

    function _boundIndex(uint256 seed, uint256 length) internal pure returns (uint256) {
        return seed % length;
    }
}

interface ERC20MockLike {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract AuSysLifecycleInvariantTest is StdInvariant, DiamondTestBase {
    IAuSysDiamond internal ausys;
    ERC1155Mock internal erc1155Token;
    AuSysLifecycleHandler internal handler;

    function setUp() public override {
        super.setUp();
        ausys = IAuSysDiamond(address(diamond));
        erc1155Token = new ERC1155Mock();
        _addExtendedAuSysSelectors();

        vm.prank(owner);
        ausys.setAuSysAdmin(admin);

        vm.startPrank(admin);
        ausys.setDriver(driver1, true);
        ausys.setDriver(driver2, true);
        ausys.setDispatcher(admin, true);
        vm.stopPrank();

        address[] memory buyers = new address[](2);
        buyers[0] = user1;
        buyers[1] = user2;

        address[] memory sellers = new address[](2);
        sellers[0] = admin;
        sellers[1] = nodeOperator;

        address[] memory drivers = new address[](2);
        drivers[0] = driver1;
        drivers[1] = driver2;

        bytes32[] memory nodeIds = new bytes32[](2);
        vm.prank(user1);
        nodeIds[0] = NodesFacet(address(diamond)).registerNode('LOGISTICS', 1000, bytes32(0), 'User1 Hub', '51.5074', '-0.1278');
        vm.prank(user2);
        nodeIds[1] = NodesFacet(address(diamond)).registerNode('LOGISTICS', 1000, bytes32(0), 'User2 Hub', '48.8566', '2.3522');

        handler = new AuSysLifecycleHandler(
            ausys,
            erc1155Token,
            address(diamond),
            admin,
            nodeOperator,
            buyers,
            sellers,
            drivers,
            nodeIds
        );
        handler.initializeApprovals(address(payToken));

        bytes4[] memory selectors = new bytes4[](8);
        selectors[0] = AuSysLifecycleHandler.createSellerOffer.selector;
        selectors[1] = AuSysLifecycleHandler.acceptOffer.selector;
        selectors[2] = AuSysLifecycleHandler.createJourneyForAcceptedOrder.selector;
        selectors[3] = AuSysLifecycleHandler.assignDriver.selector;
        selectors[4] = AuSysLifecycleHandler.handOnJourney.selector;
        selectors[5] = AuSysLifecycleHandler.handOffJourney.selector;
        selectors[6] = AuSysLifecycleHandler.cancelOffer.selector;
        selectors[7] = AuSysLifecycleHandler.selectDestination.selector;
        targetSelector(FuzzSelector({ addr: address(handler), selectors: selectors }));
        targetContract(address(handler));
        targetSelector(FuzzSelector({
            addr: address(handler),
            selectors: _singleSelector(AuSysLifecycleHandler.advanceTime.selector)
        }));
    }

    function invariant_openOffersAreActuallyOpen() public view {
        bytes32[] memory openOffers = ausys.getOpenP2POffers();
        for (uint256 i = 0; i < openOffers.length; i++) {
            DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(openOffers[i]);
            assertEq(order.currentStatus, OrderStatus.AUSYS_CREATED, 'open offers must remain created');
            assertTrue(order.expiresAt == 0 || block.timestamp <= order.expiresAt, 'expired offers must not stay open');
        }
    }

    function invariant_driverCountsMatchTrackedActiveJourneys() public view {
        uint256 driverCount = handler.driverCount();
        uint256 journeyCount = handler.trackedJourneyCount();

        for (uint256 d = 0; d < driverCount; d++) {
            address driver = handler.driverAt(d);
            uint256 expectedCount = 0;

            for (uint256 j = 0; j < journeyCount; j++) {
                DiamondStorage.AuSysJourney memory journey = ausys.getJourney(handler.trackedJourneyAt(j));
                if (
                    journey.driver == driver &&
                    (journey.currentStatus == OrderStatus.JOURNEY_PENDING ||
                        journey.currentStatus == OrderStatus.JOURNEY_IN_TRANSIT)
                ) {
                    expectedCount++;
                }
            }

            assertEq(ausys.getDriverJourneyCount(driver), expectedCount, 'driver active count drifted');
        }
    }

    function invariant_pendingDestinationsBelongToSettledBuyerOrders() public view {
        uint256 buyerCount = handler.buyerCount();
        for (uint256 i = 0; i < buyerCount; i++) {
            address buyer = handler.buyerAt(i);
            bytes32[] memory pending = ausys.getPendingTokenDestinations(buyer);
            for (uint256 j = 0; j < pending.length; j++) {
                DiamondStorage.AuSysOrder memory order = ausys.getAuSysOrder(pending[j]);
                assertEq(order.currentStatus, OrderStatus.AUSYS_SETTLED, 'pending destination must come from settled order');
                assertEq(order.buyer, buyer, 'pending destination buyer mismatch');
            }
        }
    }

    function _singleSelector(bytes4 selector) internal pure returns (bytes4[] memory selectors) {
        selectors = new bytes4[](1);
        selectors[0] = selector;
    }

    function _addExtendedAuSysSelectors() internal {
        bytes4[] memory sels = new bytes4[](5);
        sels[0] = AuSysFacet.acceptP2POffer.selector;
        sels[1] = AuSysFacet.cancelP2POffer.selector;
        sels[2] = AuSysFacet.handOff.selector;
        sels[3] = AuSysFacet.selectTokenDestination.selector;
        sels[4] = AuSysFacet.onERC1155Received.selector;

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
}

contract AuSysLifecycleFuzzTest is DiamondTestBase {
    IAuSysDiamond internal ausys;
    ERC1155Mock internal erc1155Token;
    bytes32 internal buyerNodeId;

    error CallerMustBeBuyer();
    error InvalidJourneyRoute();
    error QuantityExceedsRequested();

    function setUp() public override {
        super.setUp();
        ausys = IAuSysDiamond(address(diamond));
        erc1155Token = new ERC1155Mock();
        _addExtendedAuSysSelectors();

        vm.prank(owner);
        ausys.setAuSysAdmin(admin);

        vm.startPrank(admin);
        ausys.setDriver(driver1, true);
        ausys.setDispatcher(admin, true);
        vm.stopPrank();

        vm.prank(user1);
        buyerNodeId = NodesFacet(address(diamond)).registerNode('LOGISTICS', 1000, bytes32(0), 'Buyer Hub', '51.5074', '-0.1278');

        erc1155Token.mint(user2, 7, 10_000);
        vm.prank(user2);
        erc1155Token.setApprovalForAll(address(diamond), true);

        vm.prank(user1);
        payToken.approve(address(diamond), type(uint256).max);
    }

    function testFuzz_getOpenP2POffers_filtersExpiredOffers(
        uint256 priceSeed,
        uint256 qtySeed,
        uint256 expirySeed,
        uint256 warpSeed
    ) public {
        uint256 price = bound(priceSeed, 1 ether, 1_000 ether);
        uint256 quantity = bound(qtySeed, 1, 50);
        uint256 expiresAt = block.timestamp + bound(expirySeed, 1 hours, 7 days);

        bytes32 orderId = _createSellerOffer(user2, price, quantity, expiresAt);
        bytes32[] memory offersBeforeExpiry = ausys.getOpenP2POffers();
        assertEq(offersBeforeExpiry.length, 1, 'offer should be open before expiry');
        assertEq(offersBeforeExpiry[0], orderId, 'offer id should match');

        vm.warp(block.timestamp + bound(warpSeed, expiresAt - block.timestamp + 1, 14 days));
        bytes32[] memory offersAfterExpiry = ausys.getOpenP2POffers();
        assertEq(offersAfterExpiry.length, 0, 'expired offer should be filtered');
        assertEq(ausys.getAuSysOrder(orderId).currentStatus, OrderStatus.AUSYS_EXPIRED, 'view should surface expiry');
    }

    function testFuzz_createOrderJourney_rejectsMismatchedSellerAndQuantity(
        uint256 priceSeed,
        uint256 qtySeed,
        uint256 bountySeed,
        uint256 etaSeed,
        uint256 badQtySeed
    ) public {
        uint256 price = bound(priceSeed, 1 ether, 1_000 ether);
        uint256 quantity = bound(qtySeed, 1, 50);
        uint256 bounty = bound(bountySeed, 1 ether, 25 ether);
        uint256 eta = block.timestamp + bound(etaSeed, 1 hours, 7 days);
        uint256 wrongQuantity = quantity + bound(badQtySeed, 1, 50);

        bytes32 orderId = _createBuyerOrder(user1, user2, price, quantity);

        vm.prank(user1);
        vm.expectRevert(InvalidJourneyRoute.selector);
        ausys.createOrderJourney(
            orderId,
            admin,
            user1,
            _parcelData(),
            bounty,
            eta,
            quantity,
            7
        );

        vm.prank(user1);
        vm.expectRevert(QuantityExceedsRequested.selector);
        ausys.createOrderJourney(
            orderId,
            user2,
            user1,
            _parcelData(),
            bounty,
            eta,
            wrongQuantity,
            7
        );
    }

    function testFuzz_settledOrderPendingDestinationBelongsToBuyer(
        uint256 priceSeed,
        uint256 qtySeed,
        uint256 bountySeed,
        uint256 etaSeed
    ) public {
        uint256 price = bound(priceSeed, 1 ether, 1_000 ether);
        uint256 quantity = bound(qtySeed, 1, 25);
        uint256 bounty = bound(bountySeed, 1 ether, 25 ether);
        uint256 eta = block.timestamp + bound(etaSeed, 1 hours, 7 days);

        bytes32 orderId = _createBuyerOrder(user1, user2, price, quantity);
        bytes32 journeyId = _createJourney(orderId, user2, user1, bounty, eta, quantity);

        vm.prank(admin);
        ausys.assignDriverToJourney(driver1, journeyId);

        vm.prank(user2);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.handOn(journeyId);

        vm.prank(user1);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.packageSign(journeyId);
        vm.prank(driver1);
        ausys.handOff(journeyId);

        bytes32[] memory pending = ausys.getPendingTokenDestinations(user1);
        assertEq(pending.length, 1, 'buyer should have one pending destination');
        assertEq(pending[0], orderId, 'pending destination should point at settled order');
    }

    function _createSellerOffer(
        address seller,
        uint256 price,
        uint256 quantity,
        uint256 expiresAt
    ) internal returns (bytes32) {
        address[] memory nodes = new address[](1);
        nodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(erc1155Token),
            tokenId: 7,
            tokenQuantity: quantity,
            price: price,
            txFee: 0,
            buyer: address(0),
            seller: seller,
            journeyIds: journeyIds,
            nodes: nodes,
            locationData: _parcelData(),
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: true,
            targetCounterparty: address(0),
            expiresAt: expiresAt
        });

        vm.prank(seller);
        return ausys.createAuSysOrder(order);
    }

    function _createBuyerOrder(
        address buyer,
        address seller,
        uint256 price,
        uint256 quantity
    ) internal returns (bytes32) {
        address[] memory nodes = new address[](1);
        nodes[0] = nodeOperator;
        bytes32[] memory journeyIds = new bytes32[](0);

        DiamondStorage.AuSysOrder memory order = DiamondStorage.AuSysOrder({
            id: bytes32(0),
            token: address(erc1155Token),
            tokenId: 7,
            tokenQuantity: quantity,
            price: price,
            txFee: 0,
            buyer: buyer,
            seller: seller,
            journeyIds: journeyIds,
            nodes: nodes,
            locationData: _parcelData(),
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: false,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        vm.prank(buyer);
        return ausys.createAuSysOrder(order);
    }

    function _createJourney(
        bytes32 orderId,
        address sender,
        address receiver,
        uint256 bounty,
        uint256 eta,
        uint256 quantity
    ) internal returns (bytes32 journeyId) {
        vm.startPrank(user1);
        vm.recordLogs();
        ausys.createOrderJourney(orderId, sender, receiver, _parcelData(), bounty, eta, quantity, 7);
        Vm.Log[] memory logs = vm.getRecordedLogs();
        vm.stopPrank();

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

    function _parcelData() internal pure returns (DiamondStorage.ParcelData memory parcelData) {
        parcelData.startLocation = DiamondStorage.Location({ lat: '40.7128', lng: '-74.0060' });
        parcelData.endLocation = DiamondStorage.Location({ lat: '34.0522', lng: '-118.2437' });
        parcelData.startName = 'Origin';
        parcelData.endName = 'Destination';
    }

    function _addExtendedAuSysSelectors() internal {
        bytes4[] memory sels = new bytes4[](5);
        sels[0] = AuSysFacet.acceptP2POffer.selector;
        sels[1] = AuSysFacet.cancelP2POffer.selector;
        sels[2] = AuSysFacet.handOff.selector;
        sels[3] = AuSysFacet.selectTokenDestination.selector;
        sels[4] = AuSysFacet.onERC1155Received.selector;

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
}
