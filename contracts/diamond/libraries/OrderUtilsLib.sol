// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from './DiamondStorage.sol';
import { CLOBLib } from './CLOBLib.sol';

/**
 * @title OrderUtilsLib
 * @notice Library for order utilities - validation, address conversion, etc.
 * @dev Extracted from OrderRouterFacet to reduce contract size and stack depth
 */
library OrderUtilsLib {
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidPrice();
    error InvalidAmount();
    error InvalidTimeInForce();
    error OrderExpired();

    // ============================================================================
    // VALIDATION
    // ============================================================================

    /**
     * @notice Validate order parameters
     */
    function validateOrderParams(
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) internal view {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (timeInForce > CLOBLib.TIF_GTD) revert InvalidTimeInForce();
        if (timeInForce == CLOBLib.TIF_GTD && expiry <= block.timestamp) revert OrderExpired();
    }

    // ============================================================================
    // MARKET MANAGEMENT
    // ============================================================================

    /**
     * @notice Get or create a market for a trading pair
     */
    function getOrCreateMarket(
        DiamondStorage.AppStorage storage s,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (bytes32 marketId) {
        marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
        
        if (!s.markets[marketId].active) {
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: addressToString(baseToken),
                baseTokenId: baseTokenId,
                quoteToken: addressToString(quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
        }
    }

    // ============================================================================
    // ADDRESS CONVERSION
    // ============================================================================

    /**
     * @notice Convert address to hex string
     */
    function addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str = new bytes(42);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(uint160(_addr) >> (8 * (19 - i)) >> 4)];
            str[3 + i * 2] = alphabet[uint8(uint160(_addr) >> (8 * (19 - i))) & 0x0f];
        }
        return string(str);
    }

    /**
     * @notice Convert hex string to address
     */
    function stringToAddress(string memory _str) internal pure returns (address) {
        bytes memory b = bytes(_str);
        require(b.length == 42, "Invalid address length");
        
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            result *= 16;
            uint8 c = uint8(b[i]);
            if (c >= 48 && c <= 57) {
                result += c - 48;
            } else if (c >= 97 && c <= 102) {
                result += c - 87;
            } else if (c >= 65 && c <= 70) {
                result += c - 55;
            }
        }
        return address(result);
    }

    // ============================================================================
    // BITPACKING HELPERS
    // ============================================================================

    /**
     * @notice Unpack price, amount, and filled amount from packed storage
     */
    function unpackPriceAmountFilled(uint256 packed) internal pure returns (uint96 price, uint96 amount, uint64 filled) {
        price = CLOBLib.unpackPrice(packed);
        amount = CLOBLib.unpackAmount(packed);
        filled = CLOBLib.unpackFilledAmount(packed);
    }

    /**
     * @notice Get market order price with slippage
     */
    function getMarketOrderPrice(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        bool isBuy,
        uint16 maxSlippageBps
    ) internal view returns (uint96) {
        uint256 bestPrice;
        
        if (isBuy) {
            // For buy, get best ask (lowest sell price)
            bestPrice = _getBestPriceFromTree(s.askTreeMeta[marketId], s.askTreeNodes[marketId], true);
            if (bestPrice == 0) return 0;
            // Add slippage for buy (willing to pay more)
            return uint96(bestPrice * (10000 + maxSlippageBps) / 10000);
        } else {
            // For sell, get best bid (highest buy price)
            bestPrice = _getBestPriceFromTree(s.bidTreeMeta[marketId], s.bidTreeNodes[marketId], false);
            if (bestPrice == 0) return 0;
            // Subtract slippage for sell (willing to accept less)
            return uint96(bestPrice * (10000 - maxSlippageBps) / 10000);
        }
    }

    function _getBestPriceFromTree(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool getMin
    ) private view returns (uint256) {
        if (meta.root == 0) return 0;
        
        uint256 current = meta.root;
        if (getMin) {
            while (nodes[current].left != 0) {
                current = nodes[current].left;
            }
        } else {
            while (nodes[current].right != 0) {
                current = nodes[current].right;
            }
        }
        return current;
    }
}
