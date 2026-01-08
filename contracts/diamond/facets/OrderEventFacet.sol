// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';

/**
 * @title OrderEventFacet
 * @notice Emits OrderPlacedWithTokens events for existing orders
 * @dev This is a helper facet to backfill events for orders that were created
 *      before the event was added to OrderRouterFacet
 */
contract OrderEventFacet {
    
    // Token-based event for indexer compatibility
    event OrderPlacedWithTokens(
        bytes32 indexed orderId,
        address indexed maker,
        address indexed baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType
    );
    
    /**
     * @notice Emit OrderPlacedWithTokens event for an existing order
     * @dev Anyone can call this to help index orders
     * @param orderId The order ID to emit event for
     * @param baseToken The base token address
     * @param baseTokenId The token ID
     * @param quoteToken The quote token address
     */
    function emitOrderPlacedWithTokens(
        bytes32 orderId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        // Verify order exists
        address maker = _unpackMaker(order.makerAndFlags);
        require(maker != address(0), "Order does not exist");
        
        // Unpack order data
        bool isBuy = _unpackIsBuy(order.makerAndFlags);
        uint8 orderType = _unpackOrderType(order.makerAndFlags);
        (uint96 price, uint96 amount, ) = _unpackPriceAmountFilled(order.priceAmountFilled);
        
        emit OrderPlacedWithTokens(
            orderId,
            maker,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            orderType
        );
    }
    
    // Helper functions to unpack order data
    function _unpackMaker(uint256 packed) internal pure returns (address) {
        return address(uint160(packed >> 96));
    }
    
    function _unpackIsBuy(uint256 packed) internal pure returns (bool) {
        return ((packed >> 95) & 1) == 1;
    }
    
    function _unpackOrderType(uint256 packed) internal pure returns (uint8) {
        return uint8((packed >> 93) & 0x3);
    }
    
    function _unpackPriceAmountFilled(uint256 packed) internal pure returns (uint96 price, uint96 amount, uint64 filled) {
        price = uint96(packed >> 160);
        amount = uint96((packed >> 64) & type(uint96).max);
        filled = uint64(packed & type(uint64).max);
    }
}
