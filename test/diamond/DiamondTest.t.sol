// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { Diamond } from 'contracts/diamond/Diamond.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { IDiamondLoupe } from 'contracts/diamond/interfaces/IDiamondLoupe.sol';
import { LibDiamond } from 'contracts/diamond/libraries/LibDiamond.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

/**
 * @title DiamondTest
 * @notice Comprehensive tests for the Diamond proxy and all facets
 */
contract DiamondTest is Test {
    address owner;
    address user1;
    address user2;
    address nodeOperator;

    // Diamond contract
    address diamond;

    // Facet addresses (will be deployed)
    address diamondCutFacet;
    address diamondLoupeFacet;
    address ownershipFacet;
    address nodesFacet;
    address assetsFacet;
    address ordersFacet;
    address stakingFacet;
    address bridgeFacet;
    address clobFacet;

    // Events for testing
    event NodeRegistered(bytes32 indexed nodeHash, address indexed owner, string nodeType);
    event NodeUpdated(bytes32 indexed nodeHash, string nodeType, uint256 capacity);
    event NodeDeactivated(bytes32 indexed nodeHash);
    event UpdateLocation(string indexed addressName, string lat, string lng, bytes32 indexed node);
    event UpdateOwner(address indexed owner, bytes32 indexed node);
    event UpdateStatus(bytes1 indexed status, bytes32 indexed node);
    event NodeCapacityUpdated(bytes32 indexed nodeHash, uint256[] quantities);
    event SupportedAssetAdded(bytes32 indexed nodeHash, address token, uint256 tokenId, uint256 price, uint256 capacity);
    event SupportedAssetsUpdated(bytes32 indexed nodeHash, uint256 count);
    event AssetClassAdded(string indexed assetClass);
    event AssetAdded(bytes32 indexed assetHash, string name, string assetClass);
    event OrderPlaced(bytes32 indexed orderId, address indexed maker, bytes32 indexed marketId, uint256 price, uint256 amount, bool isBuy, uint8 orderType);
    event OrderMatched(bytes32 indexed takerOrderId, bytes32 indexed makerOrderId, bytes32 indexed tradeId, uint256 fillAmount, uint256 fillPrice, uint256 quoteAmount);
    event OrderCancelled(bytes32 indexed orderId, address indexed maker, uint256 remainingAmount);
    event TradeExecuted(bytes32 indexed tradeId, address indexed taker, address indexed maker, bytes32 marketId, uint256 price, uint256 amount, uint256 quoteAmount, uint256 timestamp);

    function setUp() public {
        owner = makeAddr('owner');
        user1 = makeAddr('user1');
        user2 = makeAddr('user2');
        nodeOperator = makeAddr('nodeOperator');

        // Deploy facets first
        deployFacets();

        // Deploy Diamond with DiamondCutFacet
        deployDiamond();
    }

    function deployFacets() internal {
        // Deploy DiamondCutFacet
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = IDiamondCut.diamondCut.selector;
        diamondCutFacet = address(new DiamondCutFacetTest());

        // Deploy other facets (simplified for testing)
        diamondLoupeFacet = address(new DiamondLoupeFacetTest());
        ownershipFacet = address(new OwnershipFacetTest());
        nodesFacet = address(new NodesFacetTest());
        assetsFacet = address(new AssetsFacetTest());
        ordersFacet = address(new OrdersFacetTest());
        stakingFacet = address(new StakingFacetTest());
        bridgeFacet = address(new BridgeFacetTest());
        clobFacet = address(new CLOBFacetTest());
    }

    function deployDiamond() internal {
        // Deploy Diamond contract
        diamond = address(new Diamond(owner, diamondCutFacet));

        // Add other facets to Diamond
        addFacet(diamondCutFacet, getDiamondCutFacetSelectors());
        addFacet(diamondLoupeFacet, getDiamondLoupeFacetSelectors());
        addFacet(ownershipFacet, getOwnershipFacetSelectors());
        addFacet(nodesFacet, getNodesFacetSelectors());
        addFacet(assetsFacet, getAssetsFacetSelectors());
        addFacet(ordersFacet, getOrdersFacetSelectors());
        addFacet(stakingFacet, getStakingFacetSelectors());
        addFacet(bridgeFacet, getBridgeFacetSelectors());
        addFacet(clobFacet, getCLOBFacetSelectors());
    }

    function addFacet(address facetAddress, bytes4[] memory selectors) internal {
        IDiamondCut.FacetCut[] memory facetCuts = new IDiamondCut.FacetCut[](1);
        facetCuts[0] = IDiamondCut.FacetCut({
            facetAddress: facetAddress,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });

        IDiamondCut(diamond).diamondCut(facetCuts, address(0), '');
    }

    // ======= Selector Getters =======

    function getDiamondCutFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = IDiamondCut.diamondCut.selector;
        return selectors;
    }

    function getDiamondLoupeFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = 0x7a0d627f; // facets()
        selectors[1] = 0xcdffacc6; // facetFunctionSelectors()
        selectors[2] = 0x52ef6deb; // facetAddresses()
        selectors[3] = 0xadfca15e; // facetAddress()
        selectors[4] = 0x0e18b681; // selectors()
        return selectors;
    }

    function getOwnershipFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](4);
        selectors[0] = 0x8f283970; // owner()
        selectors[1] = 0x198f9396; // transferOwnership()
        selectors[2] = 0x5935d4f3; // acceptOwnership()
        selectors[3] = 0xf2fde38b; // renounceOwnership()
        return selectors;
    }

    function getNodesFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = 0x6c1c6f8d; // registerNode()
        selectors[1] = 0x7535d7a5; // updateNode()
        selectors[2] = 0x5c4b1802; // deactivateNode()
        selectors[3] = 0x4f44c4b6; // updateNodeLocation()
        selectors[4] = 0x8f2c0b2c; // updateNodeOwner()
        selectors[5] = 0x9d37a75f; // updateNodeStatus()
        selectors[6] = 0x4b1c7e5a; // updateNodeCapacity()
        selectors[7] = 0x8a1d2c6a; // addSupportedAsset()
        selectors[8] = 0x9e8b3e2d; // updateSupportedAssets()
        selectors[9] = 0x7610d32b; // getNode()
        return selectors;
    }

    function getAssetsFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = 0x06f26f5a; // addAssetClass()
        selectors[1] = 0x40d0f3b3; // addAsset()
        selectors[2] = 0x727cd088; // getAsset()
        selectors[3] = 0x7a91df9c; // getAssetByHash()
        selectors[4] = 0xc2985578; // getTotalAssets()
        return selectors;
    }

    function getOrdersFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](5);
        selectors[0] = 0x9f3d926a; // createOrder()
        selectors[1] = 0xce5c8d27; // cancelOrder()
        selectors[2] = 0x7701f22f; // getOrder()
        selectors[3] = 0x5a0b1d2b; // getBuyerOrders()
        selectors[4] = 0x8b5b8b3c; // getSellerOrders()
        return selectors;
    }

    function getStakingFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](6);
        selectors[0] = 0xa694fc3a; // stake()
        selectors[1] = 0x3b1d21c4; // withdraw()
        selectors[2] = 0xc6dbd5b7; // claimRewards()
        selectors[3] = 0x490e603c; // earned()
        selectors[4] = 0xb5dc6d9b; // getStake()
        selectors[5] = 0x5a3b7e4f; // getTotalStaked()
        return selectors;
    }

    function getBridgeFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](10);
        selectors[0] = 0x4a6a0f91; // createUnifiedOrder()
        selectors[1] = 0x7c8c5e2d; // bridgeTradeToLogistics()
        selectors[2] = 0x8c5b7e6a; // createLogisticsOrder()
        selectors[3] = 0x9d7f8a2b; // assignDriver()
        selectors[4] = 0x6e4c8f3d; // updateJourneyStatus()
        selectors[5] = 0x5f8a9b2e; // settleOrder()
        selectors[6] = 0x7c9f8a6d; // cancelUnifiedOrder()
        selectors[7] = 0x8d0a1b3e; // getUnifiedOrder()
        selectors[8] = 0x9e1b2c4f; // getJourney()
        selectors[9] = 0xaf2c3d5e; // getTotalUnifiedOrders()
        return selectors;
    }

    function getCLOBFacetSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](12);
        selectors[0] = 0x7f5c8f3a; // createMarket()
        selectors[1] = 0x8a6d9f4b; // placeOrder()
        selectors[2] = 0x9b7e0a5c; // cancelOrder()
        selectors[3] = 0xac8f1b6d; // createPool()
        selectors[4] = 0xbd9e2c7e; // addLiquidity()
        selectors[5] = 0xceaf3d8f; // removeLiquidity()
        selectors[6] = 0xdfbe4e90; // getOrder()
        selectors[7] = 0xe0cf5fa1; // getTrade()
        selectors[8] = 0xf1e06bb2; // getPool()
        selectors[9] = 0x02f17bc3; // getMarket()
        selectors[10] = 0x13f28cd4; // getBestBid()
        selectors[11] = 0x24f39de5; // getBestAsk()
        return selectors;
    }

    // ======= Diamond Tests =======

    function testDiamondDeployment() public {
        assertEq(LibDiamond.diamondStorage().contractOwner, owner);
        assertTrue(diamond != address(0));
    }

    function testDiamondFallback() public {
        // Test that Diamond fallback correctly routes to facets
        vm.prank(user1);
        (bool success, ) = diamond.call(abi.encodeWithSelector(0x8f283970)); // owner() selector
        assertTrue(success);
    }

    // ======= NodesFacet Tests =======

    function testNodeRegistration() public {
        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit NodeRegistered(bytes32(0), nodeOperator, "LOGISTICS");

        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        assertTrue(nodeHash != bytes32(0));
    }

    function testNodeUpdate() public {
        // Register node first
        vm.prank(nodeOperator);
        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit NodeUpdated(nodeHash, "LOGISTICS", 2000);

        NodesFacetTest(address(nodesFacet)).updateNodeTest(nodeHash, "LOGISTICS", 2000);
    }

    function testNodeDeactivation() public {
        vm.prank(nodeOperator);
        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit NodeDeactivated(nodeHash);

        NodesFacetTest(address(nodesFacet)).deactivateNodeTest(nodeHash);
    }

    function testNodeLocationUpdate() public {
        vm.prank(nodeOperator);
        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit UpdateLocation("Warehouse B", "40.7500", "-73.9900", nodeHash);

        NodesFacetTest(address(nodesFacet)).updateNodeLocationTest(
            nodeHash,
            "Warehouse B",
            "40.7500",
            "-73.9900"
        );
    }

    function testNodeOwnerTransfer() public {
        vm.prank(nodeOperator);
        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit UpdateOwner(user1, nodeHash);

        NodesFacetTest(address(nodesFacet)).updateNodeOwnerTest(nodeHash, user1);
    }

    function testSupportedAssetAddition() public {
        vm.prank(nodeOperator);
        bytes32 nodeHash = NodesFacetTest(address(nodesFacet)).registerNodeTest(
            "LOGISTICS",
            1000,
            bytes32(0),
            "Warehouse A",
            "40.7128",
            "-74.0060"
        );

        vm.prank(nodeOperator);
        vm.expectEmit(true, true, true, true);
        emit SupportedAssetAdded(nodeHash, address(0x1234), 1, 100, 500);

        uint256 assetId = NodesFacetTest(address(nodesFacet)).addSupportedAssetTest(
            nodeHash,
            address(0x1234),
            1,
            100,
            500
        );

        assertEq(assetId, 0);
    }

    // ======= AssetsFacet Tests =======

    function testAddAssetClass() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit AssetClassAdded("LOGISTICS");

        AssetsFacetTest(address(assetsFacet)).addAssetClassTest("LOGISTICS");
    }

    function testAddAsset() public {
        vm.prank(owner);
        AssetsFacetTest(address(assetsFacet)).addAssetClassTest("LOGISTICS");

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit AssetAdded(bytes32(0), "Container Unit", "LOGISTICS");

        bytes32 assetHash = AssetsFacetTest(address(assetsFacet)).addAssetTest(
            "Container Unit",
            "LOGISTICS",
            new string[](0)
        );

        assertTrue(assetHash != bytes32(0));
    }

    // ======= OrdersFacet Tests =======

    function testOrderCreation() public {
        bytes32 orderHash = OrdersFacetTest(address(ordersFacet)).createOrderTest(
            user1,
            user2,
            100 ether,
            50,
            "PENDING"
        );

        assertTrue(orderHash != bytes32(0));
    }

    function testOrderCancellation() public {
        bytes32 orderHash = OrdersFacetTest(address(ordersFacet)).createOrderTest(
            user1,
            user2,
            100 ether,
            50,
            "PENDING"
        );

        vm.prank(user1);
        OrdersFacetTest(address(ordersFacet)).cancelOrderTest(orderHash);
    }

    // ======= StakingFacet Tests =======

    function testStake() public {
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit Staked(user1, 1000 ether);

        StakingFacetTest(address(stakingFacet)).stakeTest(1000 ether);
    }

    function testWithdraw() public {
        // Stake first
        vm.prank(user1);
        StakingFacetTest(address(stakingFacet)).stakeTest(1000 ether);

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit Withdrawn(user1, 500 ether);

        StakingFacetTest(address(stakingFacet)).withdrawTest(500 ether);
    }

    function testClaimRewards() public {
        vm.prank(user1);
        StakingFacetTest(address(stakingFacet)).stakeTest(1000 ether);

        // Skip time to accumulate rewards
        vm.warp(block.timestamp + 86400 * 7);

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit RewardsClaimed(user1, 10 ether);

        StakingFacetTest(address(stakingFacet)).claimRewardsTest();
    }

    function testEarnedRewards() public {
        vm.prank(user1);
        StakingFacetTest(address(stakingFacet)).stakeTest(1000 ether);

        vm.warp(block.timestamp + 86400 * 7);

        uint256 earned = StakingFacetTest(address(stakingFacet)).earnedTest(user1);

        assertTrue(earned > 0);
    }

    // ======= BridgeFacet Tests =======

    function testCreateUnifiedOrder() public {
        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit UnifiedOrderCreated(bytes32(0), bytes32(0), user1, address(0), address(0), 0, 100, 50 ether);

        bytes32 orderId = BridgeFacetTest(address(bridgeFacet)).createUnifiedOrderTest(
            bytes32(0),
            nodeOperator,
            50 ether,
            100
        );

        assertTrue(orderId != bytes32(0));
    }

    function testBridgeTrade() public {
        bytes32 orderId = BridgeFacetTest(address(bridgeFacet)).createUnifiedOrderTest(
            bytes32(0),
            nodeOperator,
            50 ether,
            100
        );

        bytes32 tradeId = keccak256("trade123");

        vm.prank(user1);
        BridgeFacetTest(address(bridgeFacet)).bridgeTradeToLogisticsTest(
            orderId,
            tradeId,
            bytes32("ausys_order"),
            user2,
            address(0x5678),
            1
        );
    }

    // ======= CLOBFacet Tests =======

    function testCreateMarket() public {
        vm.prank(owner);
        vm.expectEmit(true, true, true, true);
        emit MarketCreated(bytes32(0), "BTC", 0, "USD");

        bytes32 marketId = CLOBFacetTest(address(clobFacet)).createMarketTest(
            "BTC",
            0,
            "USD"
        );

        assertTrue(marketId != bytes32(0));
    }

    function testPlaceOrder() public {
        // Create market first
        bytes32 marketId = CLOBFacetTest(address(clobFacet)).createMarketTest("BTC", 0, "USD");

        vm.prank(user1);
        vm.expectEmit(true, true, true, true);
        emit OrderPlaced(bytes32(0), user1, marketId, 50000 ether, 1 ether, true, 0);

        bytes32 orderId = CLOBFacetTest(address(clobFacet)).placeOrderTest(
            marketId,
            50000 ether,
            1 ether,
            true,
            0
        );

        assertTrue(orderId != bytes32(0));
    }

    // ======= Upgrade Tests =======

    function testDiamondUpgrade() public {
        // Add a new facet
        address newFacet = address(new DummyFacet());

        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = DummyFacet.dummyFunction.selector;

        IDiamondCut.FacetCut[] memory facetCuts = new IDiamondCut.FacetCut[](1);
        facetCuts[0] = IDiamondCut.FacetCut({
            facetAddress: newFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });

        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(facetCuts, address(0), '');

        // Verify the function is accessible
        (bool success, bytes memory result) = diamond.call(abi.encodeWithSelector(DummyFacet.dummyFunction.selector));
        assertTrue(success);
        assertEq(result, abi.encode("dummy"));
    }

    function testFacetReplacement() public {
        // Replace DiamondCutFacet with a new version
        address newDiamondCutFacet = address(new DiamondCutFacetTest());

        bytes4[] memory selectors = getDiamondCutFacetSelectors();

        IDiamondCut.FacetCut[] memory facetCuts = new IDiamondCut.FacetCut[](1);
        facetCuts[0] = IDiamondCut.FacetCut({
            facetAddress: newDiamondCutFacet,
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: selectors
        });

        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(facetCuts, address(0), '');
    }

    function testFacetRemoval() public {
        // Remove a facet
        bytes4[] memory selectors = getDiamondCutFacetSelectors();

        IDiamondCut.FacetCut[] memory facetCuts = new IDiamondCut.FacetCut[](1);
        facetCuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(0),
            action: IDiamondCut.FacetCutAction.Remove,
            functionSelectors: selectors
        });

        vm.prank(owner);
        IDiamondCut(diamond).diamondCut(facetCuts, address(0), '');
    }

    // ======= Events =======

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event UnifiedOrderCreated(bytes32 indexed orderId, bytes32 indexed clobOrderId, address buyer, address seller, address token, uint256 tokenId, uint256 quantity, uint256 price);
    event MarketCreated(bytes32 indexed marketId, string baseToken, uint256 baseTokenId, string quoteToken);
}

// ======= Test Helper Contracts =======

contract DiamondCutFacetTest {
    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) external {
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}

contract DiamondLoupeFacetTest {
    function facets() external view returns (IDiamondLoupe.Facet[] memory facets_) {
        facets_ = new IDiamondLoupe.Facet[](0);
    }

    function facetFunctionSelectors(address _facetAddress) external view returns (bytes4[] memory) {
        return LibDiamond.facetFunctionSelectors(_facetAddress);
    }

    function facetAddresses() external view returns (address[] memory) {
        return LibDiamond.facetAddresses();
    }

    function facetAddress(bytes4 _selector) external view returns (address) {
        return LibDiamond.facetAddress(_selector);
    }

    function selectors() external view returns (bytes4[] memory) {
        return LibDiamond.selectors();
    }
}

contract OwnershipFacetTest {
    function owner() external view returns (address) {
        return LibDiamond.contractOwner();
    }

    function transferOwnership(address _newOwner) external {
        LibDiamond.setContractOwner(_newOwner);
    }

    function acceptOwnership() external {}

    function renounceOwnership() external {
        LibDiamond.setContractOwner(address(0));
    }
}

contract NodesFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function registerNodeTest(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash,
        string memory _addressName,
        string memory _lat,
        string memory _lng
    ) external returns (bytes32 nodeHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        nodeHash = keccak256(abi.encodePacked(msg.sender, block.timestamp, s.totalNodes));

        s.nodes[nodeHash] = DiamondStorage.Node({
            owner: msg.sender,
            nodeType: _nodeType,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true,
            validNode: true,
            assetHash: _assetHash,
            addressName: _addressName,
            lat: _lat,
            lng: _lng
        });

        s.ownerNodes[msg.sender].push(nodeHash);
        s.nodeList.push(address(uint160(uint256(nodeHash))));
        s.totalNodes++;

        return nodeHash;
    }

    function updateNodeTest(bytes32 _nodeHash, string memory _nodeType, uint256 _capacity) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');
        s.nodes[_nodeHash].nodeType = _nodeType;
        s.nodes[_nodeHash].capacity = _capacity;
    }

    function deactivateNodeTest(bytes32 _nodeHash) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');
        s.nodes[_nodeHash].active = false;
    }

    function updateNodeLocationTest(
        bytes32 _node,
        string memory _addressName,
        string memory _lat,
        string memory _lng
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        s.nodes[_node].addressName = _addressName;
        s.nodes[_node].lat = _lat;
        s.nodes[_node].lng = _lng;
    }

    function updateNodeOwnerTest(bytes32 _node, address _owner) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        s.nodes[_node].owner = _owner;
    }

    function updateNodeStatusTest(bytes1 _status, bytes32 _node) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        s.nodes[_node].active = (_status == bytes1(0x01));
        s.nodes[_node].validNode = (_status == bytes1(0x01));
    }

    function updateNodeCapacityTest(bytes32 _node, uint256[] memory _quantities) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        uint256 newCapacity = 0;
        for (uint256 i = 0; i < _quantities.length; i++) {
            newCapacity += _quantities[i];
        }
        s.nodes[_node].capacity = newCapacity;
    }

    function addSupportedAssetTest(
        bytes32 _node,
        address _token,
        uint256 _tokenId,
        uint256 _price,
        uint256 _capacity
    ) external returns (uint256 assetId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        assetId = s.totalNodeAssets[_node];
        s.totalNodeAssets[_node]++;

        s.nodeAssets[_node][assetId] = DiamondStorage.NodeAsset({
            token: _token,
            tokenId: _tokenId,
            price: _price,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true
        });

        s.nodeAssetIds[_node].push(assetId);
        return assetId;
    }

    function updateSupportedAssetsTest(
        bytes32 _node,
        address[] memory _tokens,
        uint256[] memory _tokenIds,
        uint256[] memory _prices,
        uint256[] memory _capacities
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        delete s.nodeAssetIds[_node];
        s.totalNodeAssets[_node] = 0;

        for (uint256 i = 0; i < _tokens.length; i++) {
            s.nodeAssets[_node][i] = DiamondStorage.NodeAsset({
                token: _tokens[i],
                tokenId: _tokenIds[i],
                price: _prices[i],
                capacity: _capacities[i],
                createdAt: block.timestamp,
                active: true
            });
            s.nodeAssetIds[_node].push(i);
        }

        s.totalNodeAssets[_node] = _tokens.length;
    }
}

contract AssetsFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function addAssetClassTest(string memory _class) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.supportedClasses[_class] = true;
        s.classList.push(_class);
    }

    function addAssetTest(
        string memory _name,
        string memory _assetClass,
        string[] memory _attributes
    ) external returns (bytes32 assetHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        assetHash = keccak256(abi.encodePacked(_name, _assetClass, s.totalAssets));

        s.assets[s.totalAssets] = DiamondStorage.Asset({
            name: _name,
            assetClass: _assetClass,
            attributes: _attributes,
            createdAt: block.timestamp,
            active: true
        });

        s.assetByHash[assetHash] = s.totalAssets;
        s.totalAssets++;

        return assetHash;
    }
}

contract OrdersFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function createOrderTest(
        address _buyer,
        address _seller,
        uint256 _price,
        uint256 _amount,
        string memory _status
    ) external returns (bytes32 orderHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        orderHash = keccak256(abi.encodePacked(_buyer, _seller, block.timestamp, s.totalOrders));

        s.orders[orderHash] = DiamondStorage.Order({
            buyer: _buyer,
            seller: _seller,
            orderHash: orderHash,
            price: _price,
            amount: _amount,
            status: _status,
            createdAt: block.timestamp
        });

        s.orderList.push(_buyer);
        s.totalOrders++;

        return orderHash;
    }

    function cancelOrderTest(bytes32 _orderHash) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.orders[_orderHash].buyer == msg.sender, 'Not buyer');
        s.orders[_orderHash].status = "CANCELLED";
    }
}

contract StakingFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function stakeTest(uint256 _amount) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(_amount > 0, 'Cannot stake 0');

        s.stakes[msg.sender].amount += _amount;
        s.stakes[msg.sender].stakedAt = block.timestamp;
        s.totalStaked += _amount;
    }

    function withdrawTest(uint256 _amount) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.stakes[msg.sender].amount >= _amount, 'Insufficient stake');

        s.stakes[msg.sender].amount -= _amount;
        s.totalStaked -= _amount;
    }

    function claimRewardsTest() external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 reward = s.rewards[msg.sender];
        if (reward > 0) {
            s.rewards[msg.sender] = 0;
        }
    }

    function earnedTest(address _user) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.rewards[_user];
    }
}

contract BridgeFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function createUnifiedOrderTest(
        bytes32 _clobOrderId,
        address _sellerNode,
        uint256 _price,
        uint256 _quantity
    ) external returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        orderId = keccak256(abi.encodePacked(_clobOrderId, msg.sender, block.timestamp));

        s.unifiedOrders[orderId] = DiamondStorage.UnifiedOrder({
            clobOrderId: _clobOrderId,
            clobTradeId: bytes32(0),
            ausysOrderId: bytes32(0),
            buyer: msg.sender,
            seller: address(0),
            sellerNode: _sellerNode,
            token: address(0),
            tokenId: 0,
            tokenQuantity: _quantity,
            price: _price,
            bounty: 0,
            status: 0,
            logisticsStatus: 0,
            createdAt: block.timestamp,
            matchedAt: 0,
            deliveredAt: 0,
            settledAt: 0
        });

        s.unifiedOrderIds.push(orderId);
        s.totalUnifiedOrders++;

        return orderId;
    }

    function bridgeTradeToLogisticsTest(
        bytes32 _orderId,
        bytes32 _clobTradeId,
        bytes32 _ausysOrderId,
        address _seller,
        address _token,
        uint256 _tokenId
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.UnifiedOrder storage order = s.unifiedOrders[_orderId];
        order.clobTradeId = _clobTradeId;
        order.ausysOrderId = _ausysOrderId;
        order.seller = _seller;
        order.token = _token;
        order.tokenId = _tokenId;
        order.status = 1;
        order.matchedAt = block.timestamp;
    }
}

contract CLOBFacetTest {
    using DiamondStorage for DiamondStorage.AppStorage;

    function createMarketTest(
        string memory _baseToken,
        uint256 _baseTokenId,
        string memory _quoteToken
    ) external returns (bytes32 marketId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        marketId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken));

        s.markets[marketId] = DiamondStorage.Market({
            baseToken: _baseToken,
            baseTokenId: _baseTokenId,
            quoteToken: _quoteToken,
            active: true,
            createdAt: block.timestamp
        });

        s.marketIds.push(marketId);
        s.totalMarkets++;

        return marketId;
    }

    function placeOrderTest(
        bytes32 _marketId,
        uint256 _price,
        uint256 _amount,
        bool _isBuy,
        uint8 _orderType
    ) external returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        orderId = keccak256(abi.encodePacked(msg.sender, _marketId, _price, _amount, _isBuy, _orderType, block.timestamp));

        s.clobOrders[orderId] = DiamondStorage.CLOBOrder({
            maker: msg.sender,
            marketId: _marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: _isBuy,
            orderType: _orderType,
            status: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.clobOrderIds.push(orderId);
        s.totalCLOBOrders++;

        return orderId;
    }
}

contract DummyFacet {
    function dummyFunction() external pure returns (string memory) {
        return "dummy";
    }
}

