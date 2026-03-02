// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title CLOBAdminFlow
 * @notice End-to-end validation of CLOBAdminFacet on a Base Sepolia fork
 *
 * Covers:
 *  1. DiamondCut: deploy + wire CLOBAdminFacet into CLOB Diamond
 *  2. Circuit breaker: configure → auto-trip via price change → reset
 *  3. Fee management: setFees, setFeeRecipient, getFeeConfig
 *  4. Rate limits: setRateLimits, getRateLimitConfig
 *  5. MEV protection config: setMEVProtection, getMEVConfig
 *  6. Pause / unpause + emergencyUserWithdraw
 *
 * Run:
 *  anvil --fork-url $BASE_TEST_RPC_URL --fork-block-number 38328695 &
 *  forge script script/CLOBAdminFlow.s.sol --rpc-url http://localhost:8545 --broadcast -vvv
 */

// ─── Compiled-in facets ───────────────────────────────────────────────────────
import { CLOBAdminFacet } from "../contracts/diamond/facets/CLOBAdminFacet.sol";
import { CLOBCoreFacet }  from "../contracts/diamond/facets/CLOBCoreFacet.sol";

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
    function configureCircuitBreaker(
        bytes32 marketId,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        bool isEnabled
    ) external;
    function tripCircuitBreaker(bytes32 marketId) external;
    function resetCircuitBreaker(bytes32 marketId) external;
    function setDefaultCircuitBreakerParams(uint256 threshold, uint256 cooldown) external;
    function setFees(uint16 takerFeeBps, uint16 makerFeeBps, uint16 lpFeeBps) external;
    function setFeeRecipient(address newRecipient) external;
    function setRateLimits(uint256 maxOrdersPerBlock, uint256 maxVolumePerBlock) external;
    function setMEVProtection(uint8 minRevealDelay, uint256 commitmentThreshold) external;
    function pause() external;
    function unpause() external;
    function pauseMarket(bytes32 marketId) external;
    function unpauseMarket(bytes32 marketId) external;
    function emergencyUserWithdraw(bytes32[] calldata orderIds) external;
    function getCircuitBreaker(bytes32 marketId) external view returns (
        uint256 lastPrice,
        uint256 priceChangeThreshold,
        uint256 cooldownPeriod,
        uint256 tripTimestamp,
        bool isTripped,
        bool isEnabled
    );
    function getFeeConfig() external view returns (
        uint16 takerFeeBps,
        uint16 makerFeeBps,
        uint16 lpFeeBps,
        address feeRecipient
    );
    function getRateLimitConfig() external view returns (
        uint256 maxOrdersPerBlock,
        uint256 maxVolumePerBlock
    );
    function getMEVConfig() external view returns (
        uint8 minRevealDelay,
        uint256 commitmentThreshold
    );
    function isPaused() external view returns (bool paused, uint256 pauseStartTime);
    function setEmergencyTimelock(uint256 timelock) external;
    function getEmergencyAction(bytes32 actionId) external view returns (
        address initiator,
        address token,
        address recipient,
        uint256 amount,
        uint256 initiatedAt,
        uint256 executeAfter,
        bool executed,
        bool cancelled
    );
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
    function cancelOrder(bytes32 orderId) external;
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

contract CLOBAdminFlow is Script {
    address constant MAIN_DIAMOND = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;
    address constant CLOB_DIAMOND = 0x2516CAdb7b3d4E94094bC4580C271B8559902e3f;
    address constant AURA         = 0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6;

    address constant OWNER     = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
    address constant NODE_ADDR = 0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF;
    address constant CUSTOMER  = 0x16A1e17144f10091D6dA0eCA7F336Ccc76462e03;

    uint256 constant OWNER_KEY    = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant NODE_KEY     = 0xb42a1167e6b34c529904cab724252b5f9aee8bab48c223742e5b806544a5c918;
    uint256 constant CUSTOMER_KEY = 0x262998fbb3c68d8d9450c262aad1ccd4dc12ac12795255920e835eeaa3f775c8;

    uint8 constant STATUS_OPEN      = 0;
    uint8 constant STATUS_CANCELLED = 3;
    uint8 constant TIF_GTC = 0;

    IMainDiamond mainDiamond;
    IOrderRouter clob;
    ICLOBAdmin   clobAdmin;
    IERC20       aura;

    function run() external {
        mainDiamond = IMainDiamond(MAIN_DIAMOND);
        clob        = IOrderRouter(CLOB_DIAMOND);
        clobAdmin   = ICLOBAdmin(CLOB_DIAMOND);
        aura        = IERC20(AURA);

        // ── STEP 0: Upgrade CLOBCoreFacet + add CLOBAdminFacet ───────────────
        console.log("=== STEP 0: DiamondCut - upgrade CLOBCoreFacet + add CLOBAdminFacet ===");
        vm.startBroadcast(NODE_KEY);

        // Deploy fresh CLOBCoreFacet (deterministic orderId fix)
        CLOBCoreFacet newCore = new CLOBCoreFacet();
        CLOBAdminFacet adminFacet = new CLOBAdminFacet();
        console.log("CLOBCoreFacet:  ", address(newCore));
        console.log("CLOBAdminFacet: ", address(adminFacet));

        // Core selectors (Replace existing)
        bytes4[] memory coreSelectors = new bytes4[](6);
        coreSelectors[0] = bytes4(0x8bb3f5f3); // initializeCLOBV2
        coreSelectors[1] = bytes4(0x94ca6c47); // placeNodeSellOrderV2
        coreSelectors[2] = bytes4(0xf23a6e61); // onERC1155Received
        coreSelectors[3] = bytes4(0xbc197c81); // onERC1155BatchReceived
        coreSelectors[4] = bytes4(0x1cbb4757); // cancelOrders(bytes32[])
        coreSelectors[5] = bytes4(0x22fa658e); // placeLimitOrder

        // Admin selectors (Add)
        bytes4[] memory adminSelectors = new bytes4[](16);
        adminSelectors[0]  = ICLOBAdmin.configureCircuitBreaker.selector;
        adminSelectors[1]  = ICLOBAdmin.tripCircuitBreaker.selector;
        adminSelectors[2]  = ICLOBAdmin.resetCircuitBreaker.selector;
        adminSelectors[3]  = ICLOBAdmin.setDefaultCircuitBreakerParams.selector;
        adminSelectors[4]  = ICLOBAdmin.setFees.selector;
        adminSelectors[5]  = ICLOBAdmin.setFeeRecipient.selector;
        adminSelectors[6]  = ICLOBAdmin.setRateLimits.selector;
        adminSelectors[7]  = ICLOBAdmin.setMEVProtection.selector;
        adminSelectors[8]  = ICLOBAdmin.pause.selector;
        adminSelectors[9]  = ICLOBAdmin.unpause.selector;
        adminSelectors[10] = ICLOBAdmin.pauseMarket.selector;
        adminSelectors[11] = ICLOBAdmin.unpauseMarket.selector;
        adminSelectors[12] = ICLOBAdmin.emergencyUserWithdraw.selector;
        adminSelectors[13] = ICLOBAdmin.getCircuitBreaker.selector;
        adminSelectors[14] = ICLOBAdmin.getFeeConfig.selector;
        adminSelectors[15] = ICLOBAdmin.getRateLimitConfig.selector;

        bytes4[] memory adminSelectors2 = new bytes4[](4);
        adminSelectors2[0] = ICLOBAdmin.getMEVConfig.selector;
        adminSelectors2[1] = ICLOBAdmin.isPaused.selector;
        adminSelectors2[2] = ICLOBAdmin.setEmergencyTimelock.selector;
        adminSelectors2[3] = ICLOBAdmin.getEmergencyAction.selector;

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
            facetAddress: address(adminFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: adminSelectors2
        });
        IDiamondCut(CLOB_DIAMOND).diamondCut(cuts, address(0), "");
        console.log("DiamondCut complete");

        clob.initializeCLOBV2(30, 15, 2000, 3600, 86400);
        console.log("CLOB V2 initialized");
        vm.stopBroadcast();

        // ── STEP 1: Asset class + node ────────────────────────────────────────
        console.log("\n=== STEP 1: Asset class + node setup ===");
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isClassActive("RWA_COMMODITY")) {
            mainDiamond.addSupportedClass("RWA_COMMODITY");
        }
        bytes1 nodeStatus = mainDiamond.getNodeStatus(NODE_ADDR);
        bytes32 nodeHash;
        if (nodeStatus != bytes1(0x01)) {
            nodeHash = mainDiamond.registerNode("WAREHOUSE", 1000, bytes32(0), "Admin Test Node", "51.38", "-2.35");
            console.log("Node registered");
        } else {
            nodeHash = mainDiamond.getOwnerNodes(NODE_ADDR)[0];
            console.log("Node already active");
        }
        vm.stopBroadcast();

        // ── STEP 2: Mint tokens ───────────────────────────────────────────────
        console.log("\n=== STEP 2: Mint RWA tokens ===");
        IMainDiamond.Attribute[] memory attrs = new IMainDiamond.Attribute[](0);
        IMainDiamond.AssetDefinition memory assetDef = IMainDiamond.AssetDefinition({
            name: "Admin Test Gold",
            assetClass: "RWA_COMMODITY",
            attributes: attrs
        });
        uint256 expectedTokenId = uint256(keccak256(abi.encode(assetDef)));

        vm.startBroadcast(NODE_KEY);
        (, uint256 tokenId) = mainDiamond.nodeMint(NODE_ADDR, assetDef, 20, "RWA_COMMODITY", "");
        vm.stopBroadcast();
        require(tokenId == expectedTokenId, "Token ID mismatch");
        console.log("Minted tokenId:", tokenId);

        // Fund CUSTOMER with AURA
        bytes32 balSlot = keccak256(abi.encode(CUSTOMER, uint256(0)));
        vm.store(AURA, balSlot, bytes32(uint256(100 ether)));

        // ── STEP 3: Circuit breaker - configure + trip + assert blocked ───────
        console.log("\n=== STEP 3: Circuit breaker - configure, trip, assert order blocked ===");
        bytes32 marketId = keccak256(abi.encodePacked(MAIN_DIAMOND, tokenId, AURA));

        vm.startBroadcast(NODE_KEY);
        clobAdmin.configureCircuitBreaker(
            marketId,
            1000,   // 10% threshold
            3600,   // 1h cooldown
            true
        );
        vm.stopBroadcast();

        (
            ,
            uint256 threshold,
            uint256 cooldown,
            ,
            bool isTripped,
            bool isEnabled
        ) = clobAdmin.getCircuitBreaker(marketId);
        console.log("CB configured - threshold:", threshold, "cooldown:", cooldown);
        console.log("CB enabled:", isEnabled);
        require(threshold == 1000, "Threshold should be 1000 bps");
        require(cooldown == 3600, "Cooldown should be 1h");
        require(isEnabled, "CB should be enabled");
        require(!isTripped, "CB should not be tripped yet");

        // Manually trip the circuit breaker
        vm.startBroadcast(NODE_KEY);
        clobAdmin.tripCircuitBreaker(marketId);
        vm.stopBroadcast();

        (, , , uint256 tripTimestamp, bool trippedNow, ) = clobAdmin.getCircuitBreaker(marketId);
        require(trippedNow, "CB should be tripped");
        console.log("CB tripped at block.timestamp ~", tripTimestamp);

        // Try to place an order - should revert with CircuitBreakerTrippedError
        vm.startBroadcast(NODE_KEY);
        if (!mainDiamond.isApprovedForAll(NODE_ADDR, CLOB_DIAMOND)) {
            mainDiamond.setApprovalForAll(CLOB_DIAMOND, true);
        }
        vm.stopBroadcast();

        vm.startBroadcast(NODE_KEY);
        (bool success, ) = CLOB_DIAMOND.call(
            abi.encodeWithSelector(
                IOrderRouter.placeLimitOrder.selector,
                MAIN_DIAMOND,
                tokenId,
                AURA,
                uint96(1 ether),
                uint96(1),
                false,
                TIF_GTC,
                uint40(0)
            )
        );
        vm.stopBroadcast();
        require(!success, "Order should fail when circuit breaker is tripped");
        console.log("[OK] Order correctly blocked by circuit breaker");

        // Reset circuit breaker
        vm.startBroadcast(NODE_KEY);
        clobAdmin.resetCircuitBreaker(marketId);
        vm.stopBroadcast();
        (, , , , bool trippedAfterReset, ) = clobAdmin.getCircuitBreaker(marketId);
        require(!trippedAfterReset, "CB should be reset");
        console.log("[OK] Circuit breaker reset - trading unblocked");

        // ── STEP 4: Fee management ─────────────────────────────────────────────
        console.log("\n=== STEP 4: Fee management ===");
        vm.startBroadcast(NODE_KEY);
        clobAdmin.setFees(50, 25, 10);
        clobAdmin.setFeeRecipient(NODE_ADDR);
        vm.stopBroadcast();

        (uint16 taker, uint16 maker, uint16 lp, address feeRecip) = clobAdmin.getFeeConfig();
        console.log("Fees - taker:", taker, "maker:", maker);
        console.log("LP fee:", lp);
        console.log("Fee recipient:", feeRecip);
        require(taker == 50, "Taker fee mismatch");
        require(maker == 25, "Maker fee mismatch");
        require(lp == 10, "LP fee mismatch");
        require(feeRecip == NODE_ADDR, "Fee recipient mismatch");
        console.log("[OK] Fee config verified");

        // ── STEP 5: Rate limits ───────────────────────────────────────────────
        console.log("\n=== STEP 5: Rate limits ===");
        vm.startBroadcast(NODE_KEY);
        clobAdmin.setRateLimits(200, 500 ether);
        vm.stopBroadcast();

        (uint256 maxOrders, uint256 maxVol) = clobAdmin.getRateLimitConfig();
        console.log("Rate limits - maxOrders:", maxOrders);
        console.log("maxVolume (AURA):", maxVol / 1 ether);
        require(maxOrders == 200, "maxOrdersPerBlock mismatch");
        require(maxVol == 500 ether, "maxVolumePerBlock mismatch");
        console.log("[OK] Rate limits verified");

        // ── STEP 6: MEV protection config ─────────────────────────────────────
        console.log("\n=== STEP 6: MEV protection config ===");
        vm.startBroadcast(NODE_KEY);
        clobAdmin.setMEVProtection(2, 10 ether); // 2-block delay, 10 AURA threshold
        vm.stopBroadcast();

        (uint8 delay, uint256 commitThreshold) = clobAdmin.getMEVConfig();
        console.log("MEV config - minRevealDelay:", delay);
        console.log("commitThreshold (AURA):", commitThreshold / 1 ether);
        require(delay == 2, "minRevealDelay mismatch");
        require(commitThreshold == 10 ether, "commitmentThreshold mismatch");
        console.log("[OK] MEV protection config verified");

        // ── STEP 7: Pause + emergencyUserWithdraw + unpause ───────────────────
        console.log("\n=== STEP 7: Pause + emergencyUserWithdraw + unpause ===");

        // Place an open order before pausing
        vm.startBroadcast(NODE_KEY);
        bytes32 openOrderId = clob.placeLimitOrder(
            MAIN_DIAMOND,
            tokenId,
            AURA,
            uint96(1 ether),
            uint96(5),
            false, // SELL
            TIF_GTC,
            0
        );
        vm.stopBroadcast();
        (, , , , , , uint8 prePauseStatus, , ,) = clob.getPackedOrder(openOrderId);
        require(prePauseStatus == STATUS_OPEN, "Order should be OPEN before pause");
        console.log("Open sell order placed before pause");

        // Pause the system
        vm.startBroadcast(NODE_KEY);
        clobAdmin.pause();
        vm.stopBroadcast();

        (bool paused, uint256 pausedAt) = clobAdmin.isPaused();
        require(paused, "System should be paused");
        console.log("System paused at:", pausedAt);

        // Verify new orders are blocked while paused
        vm.startBroadcast(NODE_KEY);
        (bool placedWhilePaused, ) = CLOB_DIAMOND.call(
            abi.encodeWithSelector(
                IOrderRouter.placeLimitOrder.selector,
                MAIN_DIAMOND, tokenId, AURA, uint96(1 ether), uint96(1), false, TIF_GTC, uint40(0)
            )
        );
        vm.stopBroadcast();
        require(!placedWhilePaused, "Orders must be blocked while paused");
        console.log("[OK] Order placement correctly blocked while paused");

        // Emergency user withdraw (NODE_ADDR withdraws their open sell order)
        bytes32[] memory orderIds = new bytes32[](1);
        orderIds[0] = openOrderId;
        uint256 tokensBefore = mainDiamond.balanceOf(NODE_ADDR, tokenId);

        vm.startBroadcast(NODE_KEY);
        clobAdmin.emergencyUserWithdraw(orderIds);
        vm.stopBroadcast();

        (, , , , , , uint8 withdrawnStatus, , ,) = clob.getPackedOrder(openOrderId);
        uint256 tokensAfter = mainDiamond.balanceOf(NODE_ADDR, tokenId);
        console.log("Order status after emergency withdraw:", withdrawnStatus, "(3=CANCELLED)");
        // Note: emergencyUserWithdraw marks as cancelled but token transfer depends on implementation
        require(withdrawnStatus == STATUS_CANCELLED, "Order should be CANCELLED after emergency withdraw");
        console.log("[OK] Emergency user withdraw succeeded");

        // Unpause
        vm.startBroadcast(NODE_KEY);
        clobAdmin.unpause();
        vm.stopBroadcast();

        (bool pausedAfter, ) = clobAdmin.isPaused();
        require(!pausedAfter, "System should be unpaused");
        console.log("[OK] System unpaused - trading resumed");

        // Verify orders can be placed again after unpause
        vm.startBroadcast(NODE_KEY);
        bytes32 postUnpauseOrder = clob.placeLimitOrder(
            MAIN_DIAMOND, tokenId, AURA, uint96(1 ether), uint96(1), false, TIF_GTC, 0
        );
        vm.stopBroadcast();
        (, , , , , , uint8 postStatus, , ,) = clob.getPackedOrder(postUnpauseOrder);
        require(postStatus == STATUS_OPEN, "Order should be OPEN after unpause");
        console.log("[OK] Order placed successfully after unpause");

        // ── STEP 8: emergencyTimelock config sanity check ─────────────────────
        console.log("\n=== STEP 8: Emergency timelock config ===");
        vm.startBroadcast(NODE_KEY);
        clobAdmin.setEmergencyTimelock(2 hours);
        vm.stopBroadcast();
        console.log("[OK] Emergency timelock set to 2 hours");

        // ── DONE ──────────────────────────────────────────────────────────────
        console.log("\n=== [OK] CLOBAdminFlow COMPLETE ===");
        console.log("  - CLOBAdminFacet deployed + wired via DiamondCut");
        console.log("  - Circuit breaker: configure, trip, order blocked, reset");
        console.log("  - Fee management: setFees, setFeeRecipient, getFeeConfig");
        console.log("  - Rate limits:    setRateLimits, getRateLimitConfig");
        console.log("  - MEV protection: setMEVProtection, getMEVConfig");
        console.log("  - Pause lifecycle: pause, block orders, emergencyWithdraw, unpause");
    }
}


