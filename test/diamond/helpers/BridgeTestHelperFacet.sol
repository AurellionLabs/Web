// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';

contract BridgeTestHelperFacet {
    function seedClobOrder(bytes32 orderId, address maker) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        s.clobOrders[orderId].maker = maker;
    }
}
