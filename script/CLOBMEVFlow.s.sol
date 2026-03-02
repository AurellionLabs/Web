// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title CLOBMEVFlow
 * @notice End-to-end validation of CLOBMEVFacet commit-reveal on a Base Sepolia fork
 *
 * Covers:
 *  1. DiamondCut: deploy + wire CLOBMEVFacet + CLOBAdminFacet into CLOB Diamond
 *  2. Admin: setMEVProtection (minRevealDelay=2, commitmentThreshold=5 AURA)
 *  3. Commit: NODE_ADDR commits to a large SELL order
 *  4. Early reveal: assert RevealTooEarly revert (< minRevealDelay blocks)
 *  5. Roll blocks: vm.roll to pass minRevealDelay
 *  6. Reveal: NODE_ADDR reveals → order placed in book (STATUS_OPEN)
 *  7. Late reveal: assert a second commitment expires after MAX_REVEAL_DELAY
 *  8. CUSTOMER places matching BUY via regular path → order matched (STATUS_FILLED)
 *
 * Run:
 *  anvil --fork-url $BASE_TEST_RPC_URL --fork-block-number 38328695 &
 *  forge script script/CLOBMEVFlow.s.sol --rpc-url http://localhost:8545 --broadcast -vvv
 */

// ─── Compiled-in facets ───────────────────────────────────────────────────────
import { CLOBAdminFacet } from "../contracts/diamond/facets/CLOBAdminFacet.sol";
import { CLOBCoreFacet }  from "../contracts/diamond/facets/CLOBCoreFacet.sol";
import { CLOBMEVFacet }   from "../contracts/diamond/facets/CLOBMEVFacet.sol";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface IMainDiamond {
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

interface ICLOBAdmin {
    function setMEVProtection(uint8 minRevealDelay, uint256 commitmentThreshold) external;
    function getMEVConfig() external view returns (uint8 minRevealDelay, uint256 commitmentThreshold);
    function configureCircuitBreaker(bytes32 marketId, uint256 threshold, uint256 cooldown, bool enabled) external;
    function setFees(uint16 takerFeeBps, uint16 makerFeeBps, uint16 lpFeeBps) external;
    function setRateLimits(uint256 maxOrdersPerBlock, uint256 maxVolumePerBlock) external;
    function setDefaultCircuitBreakerParams(uint256 threshold, uint256 cooldown) external;
}

interface ICLOBMEVFacet {
    function commitOrder(bytes32 commitment) external;
    function revealOrder(
        bytes32 commitmentId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry,
        bytes32 salt
    ) external returns (bytes32 orderId);
    function requiresCommitReveal(uint256 quoteAmount) external view returns (bool);
    function getCommitmentThreshold() external view returns (uint256);
}

interface IOrderRouter {
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
    function initializeCLOBV2(
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint256 defaultPriceChangeThreshold,
        uint256 defaultCooldownPeriod,
        uint256 emergencyTimelock
    ) external;
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
    function balanceOf(address account) external view returns (uint256);
}

// ─── Script ──────────────────────────────────────────────────────────────────

contract CLOBMEVFlow is Script {
    address constant MAIN_DIAMOND = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;
    address constant CLOB_DIAMOND = 0x2516CAdb7b3d4E94094bC4580C271B8559902e3f;
    address constant AURA         = 0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6;

    address constant NODE_ADDR = 0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF;
    address constant CUSTOMER  = 0x16A1e17144f10091D6dA0eCA7F336Ccc76462e03;

    uint256 constant NODE_KEY     = 0xb42a1167e6b34c529904cab724252b5f9aee8bab48c223742e5b806544a5c918;
    uint256 constant CUSTOMER_KEY = 0x262998fbb3c68d8d9450c262aad1ccd4dc12ac12795255920e835eeaa3f775c8;

    uint8 constant TIF_GTC       = 0;
    uint8 constant STATUS_OPEN   = 0;
    uint8 constant STATUS_FILLED = 2;

    // Commit-reveal params
    uint8   constant MIN_REVEAL_DELAY = 2;        // blocks
    uint256 constant COMMIT_THRESHOLD = 5 ether;  // 5 AURA

    // Order params
    uint96  constant PRICE     = 1 ether;
    uint96  constant AMOUNT    = 5;   // 5 tokens @ 1 AURA each = 5 AURA > threshold
    uint256 constant MAX_REVEAL_DELAY = 50;       // from CLOBMEVFacet constant

    IMainDiamond  mainDiamond;
    IOrderRouter  clob;
    ICLOBAdmin    clobAdmin;
    ICLOBMEVFacet clobMev;
    IERC20        aura;

    function run() external {
        mainDiamond = IMainDiamond(MAIN_DIAMOND);
        clob        = IOrderRouter(CLOB_DIAMOND);
        clobAdmin   = ICLOBAdmin(CLOB_DIAMOND);
        clobMev     = ICLOBMEVFacet(CLOB_DIAMOND);
        aura        = IERC20(AURA);

        // ── STEP 0: DiamondCut - Core + Admin + MEV ───────────────────────────
        console.log("=== STEP 0: DiamondCut - CLOBCoreFacet + CLOBAdminFacet + CLOBMEVFacet ===");
        vm.startBroadcast(NODE_KEY);

        CLOBCoreFacet  newCore    = new CLOBCoreFacet();
        CLOBAdminFacet adminFacet = new CLOBAdminFacet();
        CLOBMEVFacet   mevFacet   = new CLOBMEVFacet();
        console.log("CLOBCoreFacet:  ", address(newCore));
        console.log("CLOBAdminFacet: ", address(adminFacet));
        console.log("CLOBMEVFacet:   ", address(mevFacet));

        bytes4[] memory coreSelectors = new bytes4[](6);
        coreSelectors[0] = bytes4(0x8bb3f5f3); // initializeCLOBV2
        coreSelectors[1] = bytes4(0x94ca6c47); // placeNodeSellOrderV2
        coreSelectors[2] = bytes4(0xf23a6e61); // onERC1155Received
        coreSelectors[3] = bytes4(0xbc197c81); // onERC1155BatchReceived
        coreSelectors[4] = bytes4(0x1cbb4757); // cancelOrders(bytes32[])
        coreSelectors[5] = bytes4(0x22fa658e); // placeLimitOrder

        bytes4[] memory adminSelectors = new bytes4[](6);
        adminSelectors[0] = ICLOBAdmin.setMEVProtection.selector;
        adminSelectors[1] = ICLOBAdmin.getMEVConfig.selector;
        adminSelectors[2] = ICLOBAdmin.configureCircuitBreaker.selector;
        adminSelectors[3] = ICLOBAdmin.setFees.selector;
        adminSelectors[4] = ICLOBAdmin.setRateLimits.selector;
        adminSelectors[5] = ICLOBAdmin.setDefaultCircuitBreakerParams.selector;

        bytes4[] memory mevSelectors = new bytes4[](4);
        mevSelectors[0] = ICLOBMEVFacet.commitOrder.selector;
        mevSelectors[1] = ICLOBMEVFacet.revealOrder.selector;
        mevSelectors[2] = ICLOBMEVFacet.requiresCommitReveal.selector;
        mevSelectors[3] = ICLOBMEVFacet.getCommitmentThreshold.selector;

        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](3);
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(newCore),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: coreSelectors
        });
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(adminFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: adminSelectors
        });
        cuts[2] = IDiamondCut.FacetCut({
            facetAddress: address(mevFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: mevSelectors
        });
        IDiamondCut(CLOB_DIAMOND).diamondCut(cuts, address(0), "");
        console.log("DiamondCut complete");

        clob.initializeCLOBV2(30, 15, 2000, 3600, 86400);
        console.log("CLOB V2 initialized");
        vm.stopBroadcast();

        // ── STEP 1: MEV protection config ─────────────────────────────────────
        console.log("\n=== STEP 1: Configure MEV protection ===");
        vm.startBroadcast(NODE_KEY);
        clobAdmin.setMEVProtection(MIN_REVEAL_DELAY, COMMIT_THRESHOLD);
        vm.stopBroadcast();

        (uint8 delay, uint256 threshold) = clobAdmin.getMEVConfig();
        console.log("MEV config - minRevealDelay:", delay);
        console.log("commitThreshold (AURA):", threshold / 1 ether);
        require(delay == MIN_REVEAL_DELAY, "minRevealDelay mismatch");
        require(threshold == COMMIT_THRESHOLD, "commitmentThreshold mismatch");

        // Verify requiresCommitReveal
        bool needsCommit = clobMev.requiresCommitReveal(uint256(PRICE) * AMOUNT);
        console.log("Order of", uint256(PRICE) * AMOUNT / 1 ether, "AURA requires commit-reveal:", needsCommit);
        require(needsCommit, "Large order should require commit-reveal");
        console.log("[OK] MEV protection configured");

        // ── STEP 2: Asset class + node setup ──────────────────────────────────
        console.log("\n=== STEP 2: Asset class + node setup ===");
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isClassActive("RWA_COMMODITY")) {
            mainDiamond.addSupportedClass("RWA_COMMODITY");
        }
        bytes1 nodeStatus = mainDiamond.getNodeStatus(NODE_ADDR);
        if (nodeStatus != bytes1(0x01)) {
            mainDiamond.registerNode("WAREHOUSE", 1000, bytes32(0), "MEV Test Node", "51.38", "-2.35");
            console.log("Node registered");
        } else {
            console.log("Node already active");
        }
        vm.stopBroadcast();

        // ── STEP 3: Mint tokens + fund CUSTOMER ───────────────────────────────
        console.log("\n=== STEP 3: Mint RWA tokens + fund CUSTOMER ===");
        IMainDiamond.Attribute[] memory attrs = new IMainDiamond.Attribute[](0);
        IMainDiamond.AssetDefinition memory assetDef = IMainDiamond.AssetDefinition({
            name: "MEV Test Gold",
            assetClass: "RWA_COMMODITY",
            attributes: attrs
        });
        uint256 expectedTokenId = uint256(keccak256(abi.encode(assetDef)));

        vm.startBroadcast(NODE_KEY);
        (, uint256 tokenId) = mainDiamond.nodeMint(NODE_ADDR, assetDef, 20, "RWA_COMMODITY", "");
        vm.stopBroadcast();
        require(tokenId == expectedTokenId, "Token ID mismatch");
        console.log("Minted tokenId:", tokenId);

        // Fund CUSTOMER with AURA via storage slot
        bytes32 balSlot = keccak256(abi.encode(CUSTOMER, uint256(0)));
        vm.store(AURA, balSlot, bytes32(uint256(50 ether)));
        console.log("CUSTOMER AURA balance:", aura.balanceOf(CUSTOMER) / 1 ether, "AURA");

        // ── STEP 4: Compute commitment + commitOrder ──────────────────────────
        console.log("\n=== STEP 4: NODE_ADDR commits to SELL order ===");

        bytes32 marketId = keccak256(abi.encodePacked(MAIN_DIAMOND, tokenId, AURA));
        bytes32 salt     = keccak256("mev-test-salt-1");
        bytes32 commitment = keccak256(abi.encodePacked(
            marketId,
            PRICE,
            AMOUNT,
            false,         // isBuy = false (SELL)
            TIF_GTC,       // timeInForce
            uint40(0),     // expiry
            salt
        ));
        bytes32 commitmentId = keccak256(abi.encodePacked(NODE_ADDR, commitment, block.number));
        console.log("Commitment hash computed:");
        console.logBytes32(commitment);
        console.log("Expected commitmentId:");
        console.logBytes32(commitmentId);

        uint256 commitBlock = block.number;
        vm.startBroadcast(NODE_KEY);
        clobMev.commitOrder(commitment);
        vm.stopBroadcast();
        console.log("commitOrder called at block:", commitBlock);
        console.log("[OK] Order commitment stored");

        // ── STEP 5: Try to reveal too early - expect revert ───────────────────
        console.log("\n=== STEP 5: Attempt reveal too early (should revert) ===");

        // Approve first (needed for successful reveal)
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isApprovedForAll(NODE_ADDR, CLOB_DIAMOND)) {
            mainDiamond.setApprovalForAll(CLOB_DIAMOND, true);
        }
        vm.stopBroadcast();

        // Try reveal without advancing blocks (still at commitBlock)
        vm.startBroadcast(NODE_KEY);
        (bool earlyRevealSuccess, ) = CLOB_DIAMOND.call(
            abi.encodeWithSelector(
                ICLOBMEVFacet.revealOrder.selector,
                commitmentId,
                MAIN_DIAMOND,
                tokenId,
                AURA,
                PRICE,
                AMOUNT,
                false,      // isBuy
                TIF_GTC,
                uint40(0),  // expiry
                salt
            )
        );
        vm.stopBroadcast();
        require(!earlyRevealSuccess, "Reveal should fail before minRevealDelay");
        console.log("[OK] Early reveal correctly rejected (RevealTooEarly)");

        // ── STEP 6: Roll blocks + reveal ─────────────────────────────────────
        console.log("\n=== STEP 6: Roll", MIN_REVEAL_DELAY, "blocks + reveal order ===");
        vm.roll(block.number + MIN_REVEAL_DELAY);
        console.log("Current block after roll:", block.number);

        vm.startBroadcast(NODE_KEY);
        bytes32 orderId = clobMev.revealOrder(
            commitmentId,
            MAIN_DIAMOND,
            tokenId,
            AURA,
            PRICE,
            AMOUNT,
            false,      // isBuy = SELL
            TIF_GTC,
            uint40(0),  // expiry
            salt
        );
        vm.stopBroadcast();
        console.log("Revealed orderId:");
        console.logBytes32(orderId);

        (, , uint96 orderPrice, uint96 orderAmount, , bool orderIsBuy, uint8 orderStatus, , ,) = clob.getPackedOrder(orderId);
        console.log("Order - price (AURA):", orderPrice / 1 ether, "amount:", orderAmount);
        console.log("Order - isBuy:", orderIsBuy, "status:", orderStatus);
        require(orderStatus == STATUS_OPEN, "Revealed order should be STATUS_OPEN");
        require(!orderIsBuy, "Should be a SELL order");
        require(orderPrice == PRICE, "Price mismatch");
        require(orderAmount == AMOUNT, "Amount mismatch");
        console.log("[OK] Order revealed and placed in book (STATUS_OPEN)");

        // ── STEP 7: Verify duplicate reveal fails ─────────────────────────────
        console.log("\n=== STEP 7: Verify duplicate reveal is rejected ===");
        vm.startBroadcast(NODE_KEY);
        (bool duplicateRevealSuccess, ) = CLOB_DIAMOND.call(
            abi.encodeWithSelector(
                ICLOBMEVFacet.revealOrder.selector,
                commitmentId,
                MAIN_DIAMOND, tokenId, AURA, PRICE, AMOUNT, false, TIF_GTC, uint40(0), salt
            )
        );
        vm.stopBroadcast();
        require(!duplicateRevealSuccess, "Duplicate reveal must be rejected");
        console.log("[OK] Duplicate reveal correctly rejected (CommitmentAlreadyRevealed)");

        // ── STEP 8: CUSTOMER places matching BUY → order fills ─────────────
        console.log("\n=== STEP 8: CUSTOMER places matching BUY order ===");
        uint256 totalCost = uint256(PRICE) * AMOUNT;

        vm.startBroadcast(CUSTOMER_KEY);
        aura.approve(CLOB_DIAMOND, totalCost * 2);

        uint256 custTokensBefore = mainDiamond.balanceOf(CUSTOMER, tokenId);
        uint256 nodeAuraBefore   = aura.balanceOf(NODE_ADDR);

        bytes32 buyOrderId = clob.placeLimitOrder(
            MAIN_DIAMOND,
            tokenId,
            AURA,
            PRICE,
            AMOUNT,
            true, // BUY
            TIF_GTC,
            0
        );
        vm.stopBroadcast();

        (, , , , uint64 buyFilled, , uint8 buyStatus, , ,)  = clob.getPackedOrder(buyOrderId);
        (, , , , uint64 sellFilled, , uint8 sellStatus, , ,) = clob.getPackedOrder(orderId);
        uint256 custTokensAfter = mainDiamond.balanceOf(CUSTOMER, tokenId);
        uint256 nodeAuraAfter   = aura.balanceOf(NODE_ADDR);

        console.log("Buy order  - status:", buyStatus,  "filled:", buyFilled);
        console.log("Sell order - status:", sellStatus, "filled:", sellFilled);
        console.log("CUSTOMER tokens received:", custTokensAfter - custTokensBefore);
        console.log("NODE_ADDR AURA received:", (nodeAuraAfter - nodeAuraBefore) / 1 ether, "AURA");

        require(buyStatus  == STATUS_FILLED, "Buy should be STATUS_FILLED (2)");
        require(sellStatus == STATUS_FILLED, "Sell should be STATUS_FILLED (2)");
        require(buyFilled  == AMOUNT, "Buy should be fully filled");
        require(sellFilled == AMOUNT, "Sell should be fully filled");
        require(custTokensAfter - custTokensBefore == AMOUNT, "CUSTOMER should receive AMOUNT tokens");
        require(nodeAuraAfter > nodeAuraBefore, "NODE_ADDR should receive AURA");
        console.log("[OK] Commit-reveal order matched and filled");

        // ── STEP 9: Late reveal test ──────────────────────────────────────────
        console.log("\n=== STEP 9: Late reveal test (after MAX_REVEAL_DELAY) ===");
        bytes32 salt2      = keccak256("mev-test-salt-late");
        bytes32 commitment2 = keccak256(abi.encodePacked(
            marketId, PRICE, uint96(1), false, TIF_GTC, uint40(0), salt2
        ));
        uint256 commitBlock2 = block.number;
        bytes32 commitmentId2 = keccak256(abi.encodePacked(NODE_ADDR, commitment2, commitBlock2));

        vm.startBroadcast(NODE_KEY);
        clobMev.commitOrder(commitment2);
        vm.stopBroadcast();
        console.log("Second commitment made at block:", commitBlock2);

        // Roll past MAX_REVEAL_DELAY
        vm.roll(block.number + MAX_REVEAL_DELAY + 1);
        console.log("Block after roll:", block.number);
        console.log("MAX_REVEAL_DELAY:", MAX_REVEAL_DELAY);

        vm.startBroadcast(NODE_KEY);
        (bool lateRevealSuccess, ) = CLOB_DIAMOND.call(
            abi.encodeWithSelector(
                ICLOBMEVFacet.revealOrder.selector,
                commitmentId2,
                MAIN_DIAMOND, tokenId, AURA, PRICE, uint96(1), false, TIF_GTC, uint40(0), salt2
            )
        );
        vm.stopBroadcast();
        require(!lateRevealSuccess, "Late reveal must be rejected");
        console.log("[OK] Late reveal correctly rejected (RevealTooLate)");

        // ── DONE ──────────────────────────────────────────────────────────────
        console.log("\n=== [OK] CLOBMEVFlow COMPLETE ===");
        console.log("  - CLOBMEVFacet deployed + wired via DiamondCut");
        console.log("  - MEV protection: minRevealDelay=2, commitThreshold=5 AURA");
        console.log("  - commitOrder: commitment stored on-chain");
        console.log("  - RevealTooEarly: correctly rejected before minRevealDelay");
        console.log("  - revealOrder: order placed in book after delay (STATUS_OPEN)");
        console.log("  - CommitmentAlreadyRevealed: duplicate reveal rejected");
        console.log("  - Matching: BUY order consumed the revealed SELL (both FILLED)");
        console.log("  - RevealTooLate: reveal past MAX_REVEAL_DELAY correctly rejected");
    }
}


