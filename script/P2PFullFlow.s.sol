// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

interface IDiamond {
    struct Location { string lat; string lng; }
    struct ParcelData {
        Location startLocation;
        Location endLocation;
        string startName;
        string endName;
    }
    struct AuSysOrder {
        bytes32 id;
        address token;
        uint256 tokenId;
        uint256 tokenQuantity;
        uint256 price;
        uint256 txFee;
        address buyer;
        address seller;
        bytes32[] journeyIds;
        address[] nodes;
        ParcelData locationData;
        uint8 currentStatus;
        bytes32 contractualAgreement;
        bool isSellerInitiated;
        address targetCounterparty;
        uint256 expiresAt;
    }
    struct AuSysJourney {
        ParcelData parcelData;
        bytes32 journeyId;
        uint8 currentStatus;
        address sender;
        address receiver;
        address driver;
        uint256 journeyStart;
        uint256 journeyEnd;
        uint256 bounty;
        uint256 ETA;
    }

    function createAuSysOrder(AuSysOrder memory order) external returns (bytes32);
    function acceptP2POffer(bytes32 orderId) external;
    function createOrderJourney(
        bytes32 orderId, address sender, address receiver,
        ParcelData memory _data, uint256 bounty, uint256 ETA,
        uint256 tokenQuantity, uint256 assetId
    ) external;
    function assignDriverToJourney(address driver, bytes32 journeyId) external;
    function packageSign(bytes32 id) external;
    function handOn(bytes32 id) external returns (bool);
    function handOff(bytes32 id) external returns (bool);

    function getAuSysOrder(bytes32 orderId) external view returns (AuSysOrder memory);
    function getJourney(bytes32 id) external view returns (AuSysJourney memory);
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function setApprovalForAll(address operator, bool approved) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

contract P2PFullFlow is Script {
    address constant DIAMOND   = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;
    address constant AURA      = 0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6;
    address constant CUSTOMER  = 0x16A1e17144f10091D6dA0eCA7F336Ccc76462e03;
    address constant NODE_ADDR = 0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF;
    // Use Anvil account[0] as a dedicated driver (distinct from buyer/seller)
    // NOTE: DRIVER must NOT be the same address as sender or receiver — packageSign's
    //       if-else checks sender/receiver BEFORE driver, so same-address tricks fail.
    address constant DRIVER    = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;

    uint256 constant CUSTOMER_KEY = 0x262998fbb3c68d8d9450c262aad1ccd4dc12ac12795255920e835eeaa3f775c8;
    uint256 constant NODE_KEY     = 0xb42a1167e6b34c529904cab724252b5f9aee8bab48c223742e5b806544a5c918;
    uint256 constant DRIVER_KEY   = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // Anvil account[0]

    uint256 constant TOKEN_ID = 1;
    uint256 constant QTY      = 1;
    uint256 constant PRICE    = 1 ether; // 1 AURA
    uint256 constant BOUNTY   = 0;

    IDiamond diamond;
    IERC20   aura;

    function run() external {
        diamond = IDiamond(DIAMOND);
        aura = IERC20(AURA);

        // PRE-FLIGHT
        console.log("=== PRE-FLIGHT ===");
        console.log("Node tokenId=1 balance:", diamond.balanceOf(NODE_ADDR, TOKEN_ID));
        console.log("Customer AURA (AURA):", aura.balanceOf(CUSTOMER) / 1 ether);
        console.log("Node ERC1155 approved:", diamond.isApprovedForAll(NODE_ADDR, DIAMOND));

        // STEP 1 — Node creates SELL offer
        console.log("\n=== STEP 1: Node creates SELL offer ===");
        vm.startBroadcast(NODE_KEY);

        if (!diamond.isApprovedForAll(NODE_ADDR, DIAMOND)) {
            diamond.setApprovalForAll(DIAMOND, true);
            console.log("ERC1155 approval granted");
        }

        IDiamond.AuSysOrder memory order = IDiamond.AuSysOrder({
            id: bytes32(0),
            token: DIAMOND,
            tokenId: TOKEN_ID,
            tokenQuantity: QTY,
            price: PRICE,
            txFee: 0,
            buyer: address(0),
            seller: NODE_ADDR,
            journeyIds: new bytes32[](0),
            nodes: new address[](0),
            locationData: IDiamond.ParcelData({
                startLocation: IDiamond.Location({ lat: "51.3837", lng: "-2.3597" }),
                endLocation:   IDiamond.Location({ lat: "51.3837", lng: "-2.3597" }),
                startName: "Test Farm",
                endName:   "Test Buyer"
            }),
            currentStatus: 0,
            contractualAgreement: bytes32(0),
            isSellerInitiated: true,
            targetCounterparty: address(0),
            expiresAt: 0
        });

        bytes32 orderId = diamond.createAuSysOrder(order);
        console.log("OrderId:"); console.logBytes32(orderId);
        vm.stopBroadcast();

        // STEP 2 — Customer accepts offer
        console.log("\n=== STEP 2: Customer accepts offer ===");
        vm.startBroadcast(CUSTOMER_KEY);
        uint256 totalCost = PRICE + (PRICE * 2) / 100;
        if (aura.allowance(CUSTOMER, DIAMOND) < totalCost) {
            aura.approve(DIAMOND, type(uint256).max);
        }
        diamond.acceptP2POffer(orderId);
        console.log("Offer accepted.");
        vm.stopBroadcast();

        // STEP 3 — Node creates journey
        console.log("\n=== STEP 3: Node creates journey ===");
        vm.startBroadcast(NODE_KEY);

        vm.recordLogs();
        diamond.createOrderJourney(
            orderId, NODE_ADDR, CUSTOMER,
            IDiamond.ParcelData({
                startLocation: IDiamond.Location({ lat: "51.3837", lng: "-2.3597" }),
                endLocation:   IDiamond.Location({ lat: "51.5074", lng: "-0.1278" }),
                startName: "Test Farm, Bath",
                endName:   "Test Buyer, London"
            }),
            BOUNTY,
            block.timestamp + 2 hours,
            QTY,
            TOKEN_ID
        );
        VmSafe.Log[] memory logs = vm.getRecordedLogs();
        bytes32 journeyId = _extractJourneyId(logs);
        console.log("JourneyId:"); console.logBytes32(journeyId);
        vm.stopBroadcast();

        // STEP 4 — Node registers + assigns driver
        console.log("\n=== STEP 4: Register + assign driver ===");
        vm.startBroadcast(NODE_KEY);
        // Node is diamond owner, can call setDriver
        (bool ok,) = DIAMOND.call(abi.encodeWithSignature("setDriver(address,bool)", DRIVER, true));
        require(ok, "setDriver failed");
        console.log("Driver registered.");
        diamond.assignDriverToJourney(DRIVER, journeyId);
        console.log("Driver assigned.");
        vm.stopBroadcast();

        // STEP 5 — Node (sender) signs package
        console.log("\n=== STEP 5: Node signs (sender handoff) ===");
        vm.startBroadcast(NODE_KEY);
        diamond.packageSign(journeyId);
        console.log("Node signed.");
        vm.stopBroadcast();

        // STEP 6 — Driver signs for pickup
        console.log("\n=== STEP 6: Driver signs for pickup ===");
        vm.startBroadcast(DRIVER_KEY);
        diamond.packageSign(journeyId);
        console.log("Driver pickup signed.");
        vm.stopBroadcast();

        // STEP 7 — handOn
        console.log("\n=== STEP 7: handOn (IN TRANSIT) ===");
        vm.startBroadcast(DRIVER_KEY);
        diamond.handOn(journeyId);
        console.log("Journey IN TRANSIT.");
        vm.stopBroadcast();

        // STEP 8 — Driver signs for delivery
        console.log("\n=== STEP 8: Driver signs for delivery ===");
        vm.startBroadcast(DRIVER_KEY);
        diamond.packageSign(journeyId);
        console.log("Driver delivery signed.");
        vm.stopBroadcast();

        // STEP 9 — Customer signs for receipt
        console.log("\n=== STEP 9: Customer (receiver) signs ===");
        vm.startBroadcast(CUSTOMER_KEY);
        diamond.packageSign(journeyId);
        console.log("Customer signed.");
        vm.stopBroadcast();

        // STEP 10 — handOff
        console.log("\n=== STEP 10: handOff (DELIVERED + SETTLED) ===");
        vm.startBroadcast(DRIVER_KEY);
        diamond.handOff(journeyId);
        console.log("Journey DELIVERED. Order SETTLED.");
        vm.stopBroadcast();

        // FINAL STATE
        console.log("\n=== FINAL STATE ===");
        IDiamond.AuSysOrder memory o = diamond.getAuSysOrder(orderId);
        IDiamond.AuSysJourney memory j = diamond.getJourney(journeyId);
        // uint8 must be explicitly cast to uint256 for console.log(string, uint256)
        console.log("Order status:  ", uint256(o.currentStatus));
        console.log("Journey status:", uint256(j.currentStatus));
        console.log("Customer ERC1155 balance:", diamond.balanceOf(CUSTOMER, TOKEN_ID));
        console.log("Node ERC1155 balance:    ", diamond.balanceOf(NODE_ADDR, TOKEN_ID));
        console.log("Customer AURA (raw):", aura.balanceOf(CUSTOMER));
        console.log("Node AURA (raw):    ", aura.balanceOf(NODE_ADDR));
        console.log("Driver AURA (raw):  ", aura.balanceOf(DRIVER));
        console.log("=== COMPLETE ===");
    }

    function _extractJourneyId(VmSafe.Log[] memory logs) internal pure returns (bytes32) {
        bytes32 sig = keccak256(
            "JourneyCreated(bytes32,address,address,address,uint256,uint256,bytes32,string,string,string,string,string,string)"
        );
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 1 && logs[i].topics[0] == sig) {
                return logs[i].topics[1];
            }
        }
        revert("JourneyCreated not found");
    }
}
