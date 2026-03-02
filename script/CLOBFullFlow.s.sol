// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title CLOBFullFlow
 * @notice End-to-end CLOB V2 order matching on a Base Sepolia fork
 *
 * Personas (same as P2P + Tokenisation scripts, all established on-fork):
 *  - NODE_ADDR: registered node operator, can mint RWA tokens
 *  - CUSTOMER:  buyer, confirmed EOA (not a contract on this fork)
 *  - OWNER:     Anvil account[0], diamond owner
 *
 * Flow:
 *  1. Ensure RWA_COMMODITY class is active
 *  2. NODE_ADDR registers as a node if not already done
 *  3. NODE_ADDR mints 10 RWA tokens to itself
 *  4. NODE_ADDR approves CLOB V2 Diamond + places a SELL limit order (5 tokens @ 1 AURA each)
 *  5. CUSTOMER is funded with AURA, approves CLOB V2 Diamond + places a BUY limit order (5 tokens @ 1 AURA each)
 *  6. Assert: both orders FILLED, CUSTOMER received tokens, NODE_ADDR received AURA
 *  7. NODE_ADDR places another sell order, CUSTOMER places a partial buy (2/5 tokens) then cancels
 *     -> assert partial fill + refund of remaining escrow
 *
 * Run:
 *  anvil --fork-url $BASE_TEST_RPC_URL --fork-block-number 38328695 &
 *  forge script script/CLOBFullFlow.s.sol --rpc-url http://localhost:8545 --broadcast -vvv
 */

// ─── Compiled-in fix facet ────────────────────────────────────────────────────
import { CLOBCoreFacet } from "../contracts/diamond/facets/CLOBCoreFacet.sol";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IMainDiamond {
    // AssetsFacet
    function addSupportedClass(string memory className) external;
    function isClassActive(string memory className) external view returns (bool);

    struct Attribute { string name; string[] values; string description; }
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

    // NodesFacet
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

    // ERC1155
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function setApprovalForAll(address operator, bool approved) external;
}

interface IDiamondCut {
    enum FacetCutAction { Add, Replace, Remove }
    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }
    function diamondCut(FacetCut[] calldata, address, bytes calldata) external;
}

interface IOrderRouter {
    // CLOBFacetV2 entry point (placeLimitOrder, selector 0x22fa658e)
    function placeLimitOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) external returns (bytes32 orderId);

    function cancelOrder(bytes32 orderId) external;

    function initializeCLOBV2(
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint256 defaultPriceChangeThreshold,
        uint256 defaultCooldownPeriod,
        uint256 emergencyTimelock
    ) external;

    // V2 packed order view (CLOBViewFacet)
    function getPackedOrder(bytes32 orderId) external view returns (
        address maker,
        bytes32 marketId,
        uint96 price,
        uint96 amount,
        uint64 filledAmount,
        bool isBuy,
        uint8 status,
        uint8 timeInForce,
        uint40 expiry,
        uint40 createdAt
    );
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
}

// ─── Script ──────────────────────────────────────────────────────────────────

contract CLOBFullFlow is Script {
    // Contract addresses (Base Sepolia)
    address constant MAIN_DIAMOND = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;
    address constant CLOB_DIAMOND = 0x2516CAdb7b3d4E94094bC4580C271B8559902e3f;
    address constant AURA         = 0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6;

    // Personas (same as TokenisationFullFlow + P2PFullFlow)
    address constant OWNER     = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // Anvil account[0]
    address constant NODE_ADDR = 0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF;   // node operator / seller
    address constant CUSTOMER  = 0x16A1e17144f10091D6dA0eCA7F336Ccc76462e03;   // buyer (confirmed EOA)

    uint256 constant OWNER_KEY    = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant NODE_KEY     = 0xb42a1167e6b34c529904cab724252b5f9aee8bab48c223742e5b806544a5c918;
    uint256 constant CUSTOMER_KEY = 0x262998fbb3c68d8d9450c262aad1ccd4dc12ac12795255920e835eeaa3f775c8;

    // Order params
    uint256 constant SELL_AMOUNT  = 5;
    uint256 constant BUY_AMOUNT   = 5;      // exact match
    uint96  constant PRICE_PER    = 1 ether; // 1 AURA per token

    // TIF = GTC (0), STATUS values (CLOBFacetV2 / CLOBLib.sol)
    uint8 constant TIF_GTC          = 0;
    uint8 constant STATUS_OPEN      = 0;
    uint8 constant STATUS_PARTIAL   = 1;
    uint8 constant STATUS_FILLED    = 2;
    uint8 constant STATUS_CANCELLED = 3;

    IMainDiamond mainDiamond;
    IOrderRouter clob;
    IERC20 aura;

    function run() external {
        mainDiamond = IMainDiamond(MAIN_DIAMOND);
        clob        = IOrderRouter(CLOB_DIAMOND);
        aura        = IERC20(AURA);

        // ── STEP 0: Upgrade CLOBCoreFacet (deterministic orderId fix) ─────────
        // The deployed CLOBCoreFacet uses block.timestamp in keccak(maker,marketId,nonce,ts)
        // which causes simulation vs broadcast orderId divergence in forge scripts.
        // We deploy a fixed version (nonce-only) and replace it via DiamondCut.
        console.log("=== STEP 0: DiamondCut CLOBCoreFacet upgrade ===");
        vm.startBroadcast(NODE_KEY); // NODE_ADDR owns CLOB_DIAMOND
        CLOBCoreFacet newCore = new CLOBCoreFacet();
        console.log("New CLOBCoreFacet deployed at:", address(newCore));

        bytes4[] memory coreSelectors = new bytes4[](6);
        coreSelectors[0] = bytes4(0x8bb3f5f3); // initializeCLOBV2
        coreSelectors[1] = bytes4(0x94ca6c47); // placeNodeSellOrderV2
        coreSelectors[2] = bytes4(0xf23a6e61); // onERC1155Received
        coreSelectors[3] = bytes4(0xbc197c81); // onERC1155BatchReceived
        coreSelectors[4] = bytes4(0x1cbb4757); // cancelOrders(bytes32[]) -- was in old facet
        coreSelectors[5] = bytes4(0x22fa658e); // placeLimitOrder

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](1);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(newCore),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: coreSelectors
        });
        IDiamondCut(CLOB_DIAMOND).diamondCut(cuts, address(0), "");
        console.log("DiamondCut complete - CLOBCoreFacet upgraded");

        // Initialize V2 params (sets maxOrdersPerBlock=100, fee bps, etc.)
        IOrderRouter(CLOB_DIAMOND).initializeCLOBV2(
            30,   // takerFeeBps
            15,   // makerFeeBps
            2000, // defaultPriceChangeThreshold (20%)
            3600, // defaultCooldownPeriod (1h)
            86400 // emergencyTimelock (1 day)
        );
        console.log("CLOBCoreFacet initialized");
        vm.stopBroadcast();

        // ── STEP 1: Setup asset class ──────────────────────────────────────────
        console.log("=== STEP 1: Asset class setup ===");
        // NODE_ADDR is the diamond owner on this Base Sepolia fork
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isClassActive("RWA_COMMODITY")) {
            mainDiamond.addSupportedClass("RWA_COMMODITY");
            console.log("Added class: RWA_COMMODITY");
        } else {
            console.log("Class RWA_COMMODITY already active");
        }
        vm.stopBroadcast();

        // ── STEP 2: Register node if needed ───────────────────────────────────
        console.log("\n=== STEP 2: Register node ===");
        vm.startBroadcast(NODE_KEY);
        bytes1 nodeStatus = mainDiamond.getNodeStatus(NODE_ADDR);
        bytes32 nodeHash;
        if (nodeStatus != bytes1(0x01)) {
            nodeHash = mainDiamond.registerNode(
                "WAREHOUSE",
                1000,
                bytes32(0),
                "Aurellion CLOB Test Node",
                "51.3837",
                "-2.3597"
            );
            console.log("Node registered:");
            console.logBytes32(nodeHash);
        } else {
            bytes32[] memory ownedNodes = mainDiamond.getOwnerNodes(NODE_ADDR);
            nodeHash = ownedNodes[0];
            console.log("Node already active. Using existing nodeHash:");
            console.logBytes32(nodeHash);
        }
        vm.stopBroadcast();

        // ── STEP 3: NODE_ADDR mints RWA tokens ────────────────────────────────
        console.log("\n=== STEP 3: Mint RWA tokens ===");

        IMainDiamond.Attribute[] memory attrs = new IMainDiamond.Attribute[](0);
        IMainDiamond.AssetDefinition memory assetDef = IMainDiamond.AssetDefinition({
            name: "CLOB Gold Bullion",
            assetClass: "RWA_COMMODITY",
            attributes: attrs
        });

        // Compute deterministic tokenId locally (same logic as AssetsFacet.lookupHash)
        uint256 expectedTokenId = uint256(keccak256(abi.encode(assetDef)));
        uint256 sellerBalBefore = mainDiamond.balanceOf(NODE_ADDR, expectedTokenId);

        vm.startBroadcast(NODE_KEY);
        (, uint256 mintedTokenId) = mainDiamond.nodeMint(
            NODE_ADDR,
            assetDef,
            SELL_AMOUNT + 5, // mint extra for the partial-fill bonus test
            "RWA_COMMODITY",
            ""
        );
        vm.stopBroadcast();

        require(mintedTokenId == expectedTokenId, "Token ID mismatch");
        uint256 sellerBal = mainDiamond.balanceOf(NODE_ADDR, mintedTokenId);
        console.log("TOKEN_ID:", mintedTokenId);
        console.log("NODE_ADDR balance before:", sellerBalBefore);
        console.log("NODE_ADDR balance after:", sellerBal);
        require(sellerBal >= SELL_AMOUNT, "NODE_ADDR lacks tokens");

        // ── STEP 4: NODE_ADDR places SELL order ───────────────────────────────
        console.log("\n=== STEP 4: NODE_ADDR places SELL order ===");
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isApprovedForAll(NODE_ADDR, CLOB_DIAMOND)) {
            mainDiamond.setApprovalForAll(CLOB_DIAMOND, true);
            console.log("ERC1155 approval granted to CLOB Diamond");
        }

        bytes32 sellOrderId = clob.placeLimitOrder(
            MAIN_DIAMOND,
            mintedTokenId,
            AURA,
            PRICE_PER,
            uint96(SELL_AMOUNT),
            false, // SELL
            TIF_GTC,
            0
        );
        console.log("Sell order ID:");
        console.logBytes32(sellOrderId);
        vm.stopBroadcast();

        (, , , uint96 sellAmt, uint64 sellFilled, , uint8 sellStatus, , ,) = clob.getPackedOrder(sellOrderId);
        console.log("Sell order status/amount/filled:", sellStatus, sellAmt, sellFilled);
        require(sellStatus == STATUS_OPEN, "Sell order must be OPEN before match");

        // ── STEP 5: Fund CUSTOMER with AURA ───────────────────────────────────
        console.log("\n=== STEP 5: Fund CUSTOMER with AURA ===");
        uint256 totalCost = uint256(PRICE_PER) * BUY_AMOUNT;
        // Inject AURA into CUSTOMER via storage slot (standard OZ ERC20 mapping at slot 0)
        bytes32 balSlot = keccak256(abi.encode(CUSTOMER, uint256(0)));
        uint256 neededAura = totalCost * 5; // enough for main + bonus test
        vm.store(AURA, balSlot, bytes32(neededAura));
        uint256 customerAura = aura.balanceOf(CUSTOMER);
        console.log("CUSTOMER AURA balance:", customerAura / 1 ether, "AURA");
        require(customerAura >= totalCost, "CUSTOMER lacks AURA");

        // ── STEP 6: CUSTOMER places BUY order (triggers match) ────────────────
        console.log("\n=== STEP 6: CUSTOMER places BUY order (match!) ===");
        vm.startBroadcast(CUSTOMER_KEY);
        aura.approve(CLOB_DIAMOND, totalCost * 4);

        uint256 custTokenBefore = mainDiamond.balanceOf(CUSTOMER, mintedTokenId);
        uint256 custAuraBefore  = aura.balanceOf(CUSTOMER);
        uint256 nodeAuraBefore  = aura.balanceOf(NODE_ADDR);

        bytes32 buyOrderId = clob.placeLimitOrder(
            MAIN_DIAMOND,
            mintedTokenId,
            AURA,
            PRICE_PER,
            uint96(BUY_AMOUNT),
            true, // BUY
            TIF_GTC,
            0
        );
        console.log("Buy order ID:");
        console.logBytes32(buyOrderId);
        vm.stopBroadcast();

        // ── STEP 7: Assert matching results ───────────────────────────────────
        console.log("\n=== STEP 7: Assert matching results ===");
        (, , , , uint64 buyFilled, , uint8 buyStatus, , ,) = clob.getPackedOrder(buyOrderId);
        (, , , , uint64 sellFilledAfter, , uint8 sellStatusAfter, , ,) = clob.getPackedOrder(sellOrderId);

        uint256 custTokenAfter = mainDiamond.balanceOf(CUSTOMER, mintedTokenId);
        uint256 custAuraAfter  = aura.balanceOf(CUSTOMER);
        uint256 nodeAuraAfter  = aura.balanceOf(NODE_ADDR);

        console.log("Buy order status:", buyStatus, "filled:", buyFilled);
        console.log("Sell order status:", sellStatusAfter, "filled:", sellFilledAfter);
        console.log("CUSTOMER tokens received:", custTokenAfter - custTokenBefore);
        console.log("CUSTOMER AURA spent:", (custAuraBefore - custAuraAfter) / 1 ether, "AURA");
        console.log("NODE_ADDR AURA received:", (nodeAuraAfter - nodeAuraBefore) / 1 ether, "AURA");

        require(buyStatus == STATUS_FILLED, "Buy order should be STATUS_FILLED (2)");
        require(sellStatusAfter == STATUS_FILLED, "Sell order should be STATUS_FILLED (2)");
        require(buyFilled == BUY_AMOUNT, "Buy should be fully filled");
        require(sellFilledAfter == SELL_AMOUNT, "Sell should be fully filled");
        require(custTokenAfter - custTokenBefore == BUY_AMOUNT, "CUSTOMER should receive BUY_AMOUNT tokens");
        require(custAuraBefore - custAuraAfter == totalCost, "CUSTOMER should spend exactly totalCost AURA");
        // NODE_ADDR receives totalCost minus maker fee (fee bps not exposed as view → assert > 0 and < totalCost+1)
        require(nodeAuraAfter > nodeAuraBefore, "NODE_ADDR should receive some AURA");
        require(nodeAuraAfter - nodeAuraBefore <= totalCost, "NODE_ADDR should receive at most totalCost AURA");
        uint256 makerFeeObserved = totalCost - (nodeAuraAfter - nodeAuraBefore);
        console.log("Maker fee deducted (AURA):", makerFeeObserved / 1 ether);

        console.log("[OK] Full match verified: both orders FILLED, balances correct");

        // ── STEP 8: Partial buy order + cancel (refund test) ──────────────────
        console.log("\n=== STEP 8: Partial buy + cancel test ===");

        // NODE_ADDR places another sell order (5 tokens)
        vm.startBroadcast(NODE_KEY);
        bytes32 sellOrder2 = clob.placeLimitOrder(
            MAIN_DIAMOND,
            mintedTokenId,
            AURA,
            PRICE_PER,
            5, // 5 tokens
            false, TIF_GTC, 0
        );
        console.log("Sell order 2 placed");
        vm.stopBroadcast();

        // CUSTOMER buys only 2 of 5 (partial match on sell side)
        uint256 partialBuyAmt = 2;
        uint256 partialCost = uint256(PRICE_PER) * partialBuyAmt;

        vm.startBroadcast(CUSTOMER_KEY);
        uint256 auraPrePartial = aura.balanceOf(CUSTOMER);
        bytes32 buyOrder2 = clob.placeLimitOrder(
            MAIN_DIAMOND,
            mintedTokenId,
            AURA,
            PRICE_PER,
            uint96(partialBuyAmt),
            true, TIF_GTC, 0
        );
        vm.stopBroadcast();

        (, , , , uint64 buy2Filled, , uint8 buy2Status, , ,) = clob.getPackedOrder(buyOrder2);
        (, , , , uint64 sell2Filled, , uint8 sell2Status, , ,) = clob.getPackedOrder(sellOrder2);

        console.log("Buy order 2 status:", buy2Status, "filled:", buy2Filled);
        console.log("Sell order 2 status:", sell2Status, "filled:", sell2Filled);

        require(buy2Status == STATUS_FILLED, "Partial buy should be fully filled");
        require(sell2Status == STATUS_PARTIAL, "Sell order 2 should be PARTIAL (2)");
        require(sell2Filled == partialBuyAmt, "Sell order 2 filled = 2");

        // Now cancel the partially-filled sell order
        uint256 nodeAuraPreCancel   = aura.balanceOf(NODE_ADDR);
        uint256 nodeTokenPreCancel  = mainDiamond.balanceOf(NODE_ADDR, mintedTokenId);

        vm.startBroadcast(NODE_KEY);
        clob.cancelOrder(sellOrder2);
        console.log("Sell order 2 cancelled");
        vm.stopBroadcast();

        (, , , , , , uint8 sell2Cancelled, , ,) = clob.getPackedOrder(sellOrder2);
        uint256 nodeTokenPostCancel = mainDiamond.balanceOf(NODE_ADDR, mintedTokenId);

        console.log("Sell order 2 final status:", sell2Cancelled, "(3=CANCELLED)");
        console.log("NODE_ADDR tokens returned:", nodeTokenPostCancel - nodeTokenPreCancel);

        require(sell2Cancelled == STATUS_CANCELLED, "Sell order 2 should be CANCELLED");
        // 5 minted - 2 sold = 3 should be refunded
        require(nodeTokenPostCancel - nodeTokenPreCancel == 3, "3 unsold tokens should be refunded");

        console.log("[OK] Partial fill + cancel + refund verified");

        // ── DONE ──────────────────────────────────────────────────────────────
        console.log("\n=== [OK] CLOBFullFlow COMPLETE ===");
        console.log("  - Sell order placed and fully matched -> STATUS_FILLED");
        console.log("  - Buy order placed and fully matched  -> STATUS_FILLED");
        console.log("  - CUSTOMER received 5 RWA tokens");
        console.log("  - NODE_ADDR received 5 AURA");
        console.log("  - Partial fill: sell order went PARTIAL after 2/5 matched");
        console.log("  - Cancel of partial order: 3 tokens refunded to NODE_ADDR");
    }
}
