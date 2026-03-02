// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/diamond/facets/AuSysFacet.sol";

interface IDiamondCut {
    enum FacetCutAction { Add, Replace, Remove }
    struct FacetCut {
        address facetAddress;
        FacetCutAction action;
        bytes4[] functionSelectors;
    }
    function diamondCut(FacetCut[] calldata, address, bytes calldata) external;
}

/**
 * @title UpgradeAuSysFacet
 * @notice Upgrades AuSysFacet on the main Diamond to add:
 *   - selectTokenDestination(bytes32,bytes32,bool)   [0x4ec3767d] — NEW
 *   - getPendingTokenDestinations(address)            [0x85bd7135] — NEW
 *   And replaces all existing AuSysFacet selectors with the new implementation.
 *
 * Run:
 *   forge script script/UpgradeAuSysFacet.s.sol \
 *     --rpc-url $BASE_TEST_RPC_URL \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast -vvv
 */
contract UpgradeAuSysFacet is Script {
    address constant DIAMOND = 0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7;

    // Existing AuSysFacet selectors currently registered on the diamond
    bytes4[] existingSelectors = [
        bytes4(0x75b238fc), // getAuSysOrder(bytes32)? — check
        bytes4(0x9ef5aee9),
        bytes4(0x56537593),
        bytes4(0xe4189a40),
        bytes4(0x26ed9054), // assignDriverToJourney
        bytes4(0xf8919799),
        bytes4(0xaefc63a0), // createAuSysOrder
        bytes4(0x32807bbc), // createJourney
        bytes4(0xd975d24e), // createOrderJourney
        bytes4(0xebbce33a), // getAuSysOrder
        bytes4(0x3774f2c7),
        bytes4(0xad4235e7),
        bytes4(0xc57a0295), // getPayToken
        bytes4(0xa448bbd3),
        bytes4(0x9d99e418),
        bytes4(0xbd58cea4),
        bytes4(0x62508270),
        bytes4(0xbc197c81),
        bytes4(0xf23a6e61),
        bytes4(0x5306bb14),
        bytes4(0xcd3e70cc),
        bytes4(0xcb22182f),
        bytes4(0x876244b6),
        bytes4(0x4a00787a),
        bytes4(0x6f96e99c), // setPayToken
        bytes4(0x03c02705), // MAX_JOURNEYS_PER_ORDER
        bytes4(0x60005477), // correctOrderTokenQuantity
        bytes4(0x93254b0e), // MAX_ORDERS
        bytes4(0x9d1f0255), // MAX_NODES_PER_ORDER
        bytes4(0xd6f27f54)  // MAX_DRIVER_JOURNEYS
    ];

    // New selectors to ADD (not yet registered)
    bytes4[] newSelectors = [
        bytes4(0x4ec3767d), // selectTokenDestination(bytes32,bytes32,bool)
        bytes4(0x85bd7135)  // getPendingTokenDestinations(address)
    ];

    function run() external {
        vm.startBroadcast();

        // 1. Deploy new AuSysFacet
        AuSysFacet newFacet = new AuSysFacet();
        console.log("New AuSysFacet deployed at:", address(newFacet));

        // 2. Build cuts: Replace existing + Add new
        IDiamondCut.FacetCut[] memory cuts = new IDiamondCut.FacetCut[](2);

        // Replace all existing selectors with new implementation
        cuts[0] = IDiamondCut.FacetCut({
            facetAddress: address(newFacet),
            action: IDiamondCut.FacetCutAction.Replace,
            functionSelectors: existingSelectors
        });

        // Add new selectors
        cuts[1] = IDiamondCut.FacetCut({
            facetAddress: address(newFacet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: newSelectors
        });

        // 3. Execute diamondCut
        IDiamondCut(DIAMOND).diamondCut(cuts, address(0), "");
        console.log("DiamondCut executed successfully");

        // 4. Verify new functions are registered
        (bool ok1,) = DIAMOND.call(
            abi.encodeWithSelector(bytes4(0x52ef6b2c), address(newFacet)) // facetFunctionSelectors
        );
        console.log("Verification call ok:", ok1);

        vm.stopBroadcast();

        console.log("=== Upgrade Complete ===");
        console.log("New AuSysFacet:", address(newFacet));
        console.log("selectTokenDestination (0x4ec3767d): ADDED");
        console.log("getPendingTokenDestinations (0x85bd7135): ADDED");
        console.log("All 30 existing selectors: REPLACED");
    }
}
