// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from './DiamondStorage.sol';
import { CLOBLib } from './CLOBLib.sol';

/**
 * @title OrderBookLib
 * @notice Library for order book management - tree operations and price levels
 * @dev Extracted from OrderRouterFacet to reduce contract size and stack depth
 */
library OrderBookLib {
    // ============================================================================
    // ORDER BOOK MANAGEMENT
    // ============================================================================

    /**
     * @notice Add an order to the order book at the specified price level
     */
    function addToOrderBook(
        DiamondStorage.AppStorage storage s,
        bytes32 orderId,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.bidTreeMeta[marketId] : s.askTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        // Insert price level if new
        if (!nodes[price].exists) {
            _insertPriceLevel(meta, nodes, price);
        }
        
        // Add order to FIFO queue at price level
        DiamondStorage.PriceLevel storage level = levels[price];
        DiamondStorage.OrderQueueNode storage node = s.orderQueue[orderId];
        
        node.price = price;
        node.prev = level.tail;
        node.next = bytes32(0);
        
        if (level.tail != bytes32(0)) {
            s.orderQueue[level.tail].next = orderId;
        } else {
            level.head = orderId;
        }
        level.tail = orderId;
        
        // Update aggregates
        level.totalAmount += amount;
        level.orderCount++;
        nodes[price].totalAmount += amount;
        nodes[price].orderCount++;
    }

    /**
     * @notice Remove amount from a price level (when order is cancelled or filled)
     */
    function removeFromPriceLevel(
        DiamondStorage.AppStorage storage s,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        
        if (levels[price].totalAmount >= amount) {
            levels[price].totalAmount -= amount;
            nodes[price].totalAmount -= amount;
        }
        
        if (levels[price].orderCount > 0) {
            levels[price].orderCount--;
            nodes[price].orderCount--;
        }
    }

    // ============================================================================
    // TREE OPERATIONS
    // ============================================================================

    /**
     * @notice Get the best price from a tree (min for asks, max for bids)
     */
    function getBestPrice(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool getMin
    ) internal view returns (uint256) {
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

    /**
     * @notice Get the next higher price in the tree
     */
    function getNextHigher(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal view returns (uint256) {
        if (nodes[price].right != 0) {
            uint256 current = nodes[price].right;
            while (nodes[current].left != 0) {
                current = nodes[current].left;
            }
            return current;
        }
        
        uint256 current = price;
        uint256 parent = nodes[current].parent;
        while (parent != 0 && current == nodes[parent].right) {
            current = parent;
            parent = nodes[current].parent;
        }
        return parent;
    }

    /**
     * @notice Get the next lower price in the tree
     */
    function getNextLower(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal view returns (uint256) {
        if (nodes[price].left != 0) {
            uint256 current = nodes[price].left;
            while (nodes[current].right != 0) {
                current = nodes[current].right;
            }
            return current;
        }
        
        uint256 current = price;
        uint256 parent = nodes[current].parent;
        while (parent != 0 && current == nodes[parent].left) {
            current = parent;
            parent = nodes[current].parent;
        }
        return parent;
    }

    // ============================================================================
    // INTERNAL HELPERS
    // ============================================================================

    function _insertPriceLevel(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) private {
        nodes[price] = DiamondStorage.RBNode({
            parent: 0,
            left: 0,
            right: 0,
            color: 0,
            exists: true,
            totalAmount: 0,
            orderCount: 0
        });
        
        if (meta.root == 0) {
            meta.root = price;
            meta.count = 1;
        } else {
            _insertNode(nodes, meta.root, price);
            meta.count++;
        }
    }

    function _insertNode(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 root,
        uint256 price
    ) private {
        uint256 current = root;
        while (true) {
            if (price < current) {
                if (nodes[current].left == 0) {
                    nodes[current].left = price;
                    nodes[price].parent = current;
                    break;
                }
                current = nodes[current].left;
            } else {
                if (nodes[current].right == 0) {
                    nodes[current].right = price;
                    nodes[price].parent = current;
                    break;
                }
                current = nodes[current].right;
            }
        }
    }
}
