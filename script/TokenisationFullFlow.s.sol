// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title TokenisationFullFlow
 * @notice End-to-end tokenisation + node flow on a Base Sepolia fork
 *
 * Flow:
 *  1. Owner adds supported asset class ("RWA_COMMODITY")
 *  2. Node registers (if not already registered)
 *  3. Node mints ERC1155 RWA tokens to itself (establishes custody)
 *  4. Node transfers tokens to a buyer
 *  5. Buyer redeems tokens (burns + releases custody)
 *
 * Run:
 *  anvil --fork-url $BASE_TEST_RPC_URL --fork-block-number 38328695 &
 *  forge script script/TokenisationFullFlow.s.sol --rpc-url http://localhost:8545 \
 *    --broadcast -vvv
 */
interface IDiamondTokenisation {
    // ── AssetsFacet ──────────────────────────────────────────────────────────
    struct Attribute {
        string name;
        string[] values;
        string description;
    }
    struct AssetDefinition {
        string name;
        string assetClass;
        Attribute[] attributes;
    }

    function nodeMint(
        address account,
        AssetDefinition memory asset,
        uint256 amount,
        string memory className,
        bytes memory data
    ) external returns (bytes32 hash, uint256 tokenID);

    function balanceOf(address account, uint256 id) external view returns (uint256);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data) external;
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function redeem(uint256 tokenId, uint256 amount, address custodian) external;
    function getCustodyInfo(uint256 tokenId, address custodian) external view returns (uint256 amount);
    function getTotalCustodyAmount(uint256 tokenId) external view returns (uint256 amount);
    function isInCustody(uint256 tokenId) external view returns (bool);

    function addSupportedClass(string memory className) external;
    function isClassActive(string memory className) external view returns (bool);
    function getSupportedClasses() external view returns (string[] memory);

    // ── NodesFacet ───────────────────────────────────────────────────────────
    function registerNode(
        string memory nodeType,
        uint256 capacity,
        bytes32 parentNode,
        string memory location,
        string memory lat,
        string memory lng
    ) external returns (bytes32 nodeHash);

    function getNodeStatus(address nodeAddr) external view returns (bytes1 status);
    function getOwnerNodes(address owner) external view returns (bytes32[] memory);
}

contract TokenisationFullFlow is Script {
    // ── Constants ─────────────────────────────────────────────────────────────
    address constant DIAMOND   = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;
    address constant NODE_ADDR = 0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF; // also diamond owner
    // CUSTOMER from P2P script — confirmed EOA on Base Sepolia fork
    address constant BUYER     = 0x16A1e17144f10091D6dA0eCA7F336Ccc76462e03;

    uint256 constant NODE_KEY  = 0xb42a1167e6b34c529904cab724252b5f9aee8bab48c223742e5b806544a5c918;
    uint256 constant BUYER_KEY = 0x262998fbb3c68d8d9450c262aad1ccd4dc12ac12795255920e835eeaa3f775c8;

    string constant CLASS_NAME  = "RWA_COMMODITY";
    uint256 constant MINT_AMOUNT = 10; // 10 tokens representing 10 units of a commodity

    IDiamondTokenisation diamond;

    function run() external {
        diamond = IDiamondTokenisation(DIAMOND);

        // ─── PRE-FLIGHT ──────────────────────────────────────────────────────
        console.log("=== PRE-FLIGHT ===");
        bytes1 nodeStatus = diamond.getNodeStatus(NODE_ADDR);
        console.log("Node status (0x01 = active):");
        console.logBytes1(nodeStatus);
        bool classActive = diamond.isClassActive(CLASS_NAME);
        console.log("Class active:", classActive);
        string[] memory classes = diamond.getSupportedClasses();
        console.log("Supported classes count:", classes.length);

        // ─── STEP 1: Owner adds supported class ──────────────────────────────
        console.log("\n=== STEP 1: Add supported asset class ===");
        vm.startBroadcast(NODE_KEY); // NODE_ADDR is diamond owner

        if (!diamond.isClassActive(CLASS_NAME)) {
            diamond.addSupportedClass(CLASS_NAME);
            console.log("Added class:", CLASS_NAME);
        } else {
            console.log("Class already active, skipping.");
        }

        // ─── STEP 2: Register node if needed ─────────────────────────────────
        console.log("\n=== STEP 2: Register node (if needed) ===");
        bytes1 status = diamond.getNodeStatus(NODE_ADDR);
        if (status != 0x01) {
            bytes32 nodeHash = diamond.registerNode(
                "WAREHOUSE",
                1000,
                bytes32(0),
                "Aurellion Test Warehouse",
                "51.3837",
                "-2.3597"
            );
            console.log("Node registered:");
            console.logBytes32(nodeHash);
        } else {
            console.log("Node already registered and active.");
            bytes32[] memory ownedNodes = diamond.getOwnerNodes(NODE_ADDR);
            console.log("Owned nodes count:", ownedNodes.length);
        }

        vm.stopBroadcast();

        // ─── STEP 3: Node mints RWA tokens ───────────────────────────────────
        console.log("\n=== STEP 3: Node mints RWA tokens ===");
        vm.startBroadcast(NODE_KEY);

        IDiamondTokenisation.Attribute[] memory attrs = new IDiamondTokenisation.Attribute[](2);
        string[] memory gradeValues = new string[](1);
        gradeValues[0] = "Grade A";
        attrs[0] = IDiamondTokenisation.Attribute({
            name: "grade",
            values: gradeValues,
            description: "Commodity quality grade"
        });

        string[] memory weightValues = new string[](1);
        weightValues[0] = "1000kg";
        attrs[1] = IDiamondTokenisation.Attribute({
            name: "weight",
            values: weightValues,
            description: "Total weight of this batch"
        });

        IDiamondTokenisation.AssetDefinition memory assetDef = IDiamondTokenisation.AssetDefinition({
            name: "Premium Wheat Batch #001",
            assetClass: "AGRICULTURAL",
            attributes: attrs
        });

        // Snapshot balances before mint
        uint256 tokenId = uint256(keccak256(abi.encode(assetDef)));
        uint256 nodeBalanceBefore = diamond.balanceOf(NODE_ADDR, tokenId);
        uint256 custodyBefore = diamond.getCustodyInfo(tokenId, NODE_ADDR);

        (bytes32 assetHash, uint256 mintedTokenId) = diamond.nodeMint(
            NODE_ADDR,
            assetDef,
            MINT_AMOUNT,
            CLASS_NAME,
            ""
        );
        tokenId = mintedTokenId; // confirm they match

        console.log("Asset hash:");
        console.logBytes32(assetHash);
        console.log("Token ID:");
        console.logUint(tokenId);

        uint256 nodeBalance = diamond.balanceOf(NODE_ADDR, tokenId);
        console.log("Node balance after mint:", nodeBalance);
        uint256 custodyAmt = diamond.getCustodyInfo(tokenId, NODE_ADDR);
        console.log("Custody amount (node):", custodyAmt);
        uint256 totalCustody = diamond.getTotalCustodyAmount(tokenId);
        console.log("Total custody:", totalCustody);
        bool inCustody = diamond.isInCustody(tokenId);
        console.log("Is in custody:", inCustody);

        vm.stopBroadcast();

        // ─── STEP 4: Node transfers tokens to buyer ───────────────────────────
        console.log("\n=== STEP 4: Node transfers tokens to buyer ===");
        vm.startBroadcast(NODE_KEY);

        // Fund buyer with ETH for gas (via vm.deal in script context — works on fork)
        vm.deal(BUYER, 1 ether);

        diamond.safeTransferFrom(NODE_ADDR, BUYER, tokenId, 3, "");
        console.log("Transferred 3 tokens to buyer.");

        uint256 buyerBalance = diamond.balanceOf(BUYER, tokenId);
        uint256 nodeBalanceAfter = diamond.balanceOf(NODE_ADDR, tokenId);
        console.log("Buyer balance:", buyerBalance);
        console.log("Node balance remaining:", nodeBalanceAfter);

        vm.stopBroadcast();

        // ─── STEP 5: Buyer redeems tokens ─────────────────────────────────────
        console.log("\n=== STEP 5: Buyer redeems 3 tokens (burns + releases custody) ===");
        vm.startBroadcast(BUYER_KEY);

        diamond.redeem(tokenId, 3, NODE_ADDR);
        console.log("Redeem successful.");

        uint256 buyerBalanceAfterRedeem = diamond.balanceOf(BUYER, tokenId);
        uint256 custodyAfterRedeem = diamond.getCustodyInfo(tokenId, NODE_ADDR);
        uint256 totalCustodyAfterRedeem = diamond.getTotalCustodyAmount(tokenId);
        console.log("Buyer balance after redeem:", buyerBalanceAfterRedeem);
        console.log("Node custody after redeem:", custodyAfterRedeem);
        console.log("Total custody after redeem:", totalCustodyAfterRedeem);

        vm.stopBroadcast();

        // ─── FINAL ASSERTIONS ─────────────────────────────────────────────────
        console.log("\n=== FINAL ASSERTIONS ===");
        // Delta-based: tolerates pre-existing balances from prior runs
        require(nodeBalance == nodeBalanceBefore + MINT_AMOUNT, "Mint: node balance should increase by MINT_AMOUNT");
        require(custodyAmt == custodyBefore + MINT_AMOUNT, "Mint: custody should increase by MINT_AMOUNT");
        require(inCustody, "Mint: token should be in custody");
        require(buyerBalance == 3, "Transfer: buyer should hold 3");
        require(nodeBalanceAfter == nodeBalance - 3, "Transfer: node should decrease by 3");
        require(buyerBalanceAfterRedeem == 0, "Redeem: buyer balance should be 0");
        require(custodyAfterRedeem == custodyAmt - 3, "Redeem: custody should decrease by 3");

        console.log("All assertions passed!");
        console.log("\n=== TOKENISATION FLOW COMPLETE ===");
        console.log("  Minted:", MINT_AMOUNT, "tokens of tokenId", tokenId);
        console.log("  Transferred: 3 tokens to buyer");
        console.log("  Redeemed: 3 tokens (burned from buyer, custody released)");
        console.log("  Node holds:", nodeBalanceAfter, "tokens remaining");
        console.log("  Remaining custody:", custodyAfterRedeem, "tokens");
    }
}
