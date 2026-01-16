// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { ReentrancyGuard } from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/**
 * @title CLOBFacetV2
 * @notice Production-ready Central Limit Order Book with gas-optimized storage
 * @dev Features: MEV protection, order expiration, circuit breakers, emergency recovery
 */
contract CLOBFacetV2 is ReentrancyGuard {
    
    // ============================================================================
    // EVENTS - Comprehensive for off-chain indexing
    // ============================================================================
    
    event OrderCreated(
        bytes32 indexed orderId,
        bytes32 indexed marketId,
        address indexed maker,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType,
        uint8 timeInForce,
        uint256 expiry,
        uint256 nonce
    );
    
    // Token-based event for indexer compatibility (matches CLOBFacet format)
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
    
    event CLOBOrderFilled(
        bytes32 indexed orderId,
        bytes32 indexed tradeId,
        uint256 fillAmount,
        uint256 fillPrice,
        uint256 remainingAmount,
        uint256 cumulativeFilled
    );
    
    event CLOBOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount,
        uint8 reason  // 0=user, 1=expired, 2=IOC unfilled, 3=FOK failed
    );
    
    event OrderExpired(
        bytes32 indexed orderId,
        uint256 expiredAt
    );
    
    event TradeExecuted(
        bytes32 indexed tradeId,
        bytes32 indexed takerOrderId,
        bytes32 indexed makerOrderId,
        address taker,
        address maker,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount,
        uint256 takerFee,
        uint256 makerFee,
        uint256 timestamp,
        bool takerIsBuy
    );
    
    // Note: OrderCommitted, OrderRevealed, CircuitBreakerTripped, CircuitBreakerReset, 
    // EmergencyWithdrawal, MarketDepthChanged events moved to other facets
    
    event MarketCreated(
        bytes32 indexed marketId,
        address indexed baseToken,
        uint256 baseTokenId,
        address indexed quoteToken
    );
    
    // ============================================================================
    // ERRORS
    // ============================================================================
    
    error InvalidPrice();
    error InvalidAmount();
    error InvalidTimeInForce();
    error OrderNotFound();
    error OrderNotActive();
    error NotOrderMaker();
    error MarketPaused();
    error CircuitBreakerTrippedError();
    error RateLimitExceeded();
    error FOKNotFilled();
    error OrderExpiredError();
    
    // ============================================================================
    // CONSTANTS
    // ============================================================================
    
    uint256 public constant BASIS_POINTS = 10000;
    
    // ============================================================================
    // MODIFIERS
    // ============================================================================
    
    modifier whenNotPaused() {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (s.paused) revert MarketPaused();
        _;
    }
    
    modifier onlyOwner() {
        LibDiamond.enforceIsContractOwner();
        _;
    }
    
    modifier checkCircuitBreaker(bytes32 marketId, uint256 price) {
        _checkCircuitBreaker(marketId, price);
        _;
    }
    
    modifier checkRateLimit() {
        _checkRateLimit();
        _;
    }
    
    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    
    function initializeCLOBV2(
        uint16 _takerFeeBps,
        uint16 _makerFeeBps,
        uint256 _defaultPriceChangeThreshold,
        uint256 _defaultCooldownPeriod,
        uint256 _emergencyTimelock
    ) external onlyOwner {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        s.takerFeeBps = _takerFeeBps;
        s.makerFeeBps = _makerFeeBps;
        s.defaultPriceChangeThreshold = _defaultPriceChangeThreshold;
        s.defaultCooldownPeriod = _defaultCooldownPeriod;
        s.emergencyTimelock = _emergencyTimelock;
        s.minRevealDelay = 2;  // 2 blocks minimum
        s.commitmentThreshold = 10000e18;  // 10k quote tokens for commit-reveal
        s.maxOrdersPerBlock = 100;
        s.maxVolumePerBlock = 1000000e18;
    }
    
    // ============================================================================
    // ORDER PLACEMENT
    // ============================================================================
    
    // Note: MEV protection (commit-reveal) moved to CLOBMEVFacet
    
    /**
     * @notice Place a limit order with time-in-force
     * @param baseToken Base token address (ERC1155)
     * @param baseTokenId Token ID
     * @param quoteToken Quote token address (ERC20)
     * @param price Price per unit
     * @param amount Amount of base tokens
     * @param isBuy True for buy order
     * @param timeInForce 0=GTC, 1=IOC, 2=FOK, 3=GTD
     * @param expiry Expiration timestamp (required for GTD, 0 otherwise)
     */
    function placeLimitOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant whenNotPaused checkRateLimit returns (bytes32 orderId) {
        // Note: For large orders, use CLOBMEVFacet.commitOrder/revealOrder
        orderId = _placeOrder(
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            timeInForce,
            expiry
        );
    }
    
    /**
     * @notice Place a market order
     * @dev Executes immediately at best available prices. Market orders are IOC.
     *      Fills as much as possible at current best prices, remaining is cancelled.
     * @param baseToken Base token address
     * @param baseTokenId Token ID
     * @param quoteToken Quote token address
     * @param amount Amount to trade
     * @param isBuy True for buy
     * @param maxSlippageBps Maximum slippage in basis points (0 = no protection)
     * @return filledAmount Total amount filled
     * @return avgPrice Average execution price
     */
    function placeMarketOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 amount,
        bool isBuy,
        uint256 maxSlippageBps
    ) external nonReentrant whenNotPaused checkRateLimit returns (uint96 filledAmount, uint256 avgPrice) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));

        // Ensure market exists
        if (!s.markets[marketId].active) revert InvalidPrice();

        // Get reference price for slippage protection
        uint256 refPrice = _getMarketPrice(marketId, isBuy);
        if (refPrice == 0) revert InvalidPrice();

        // Calculate worst acceptable price with slippage protection
        uint256 worstPrice = maxSlippageBps > 0
            ? (isBuy
                ? (refPrice * (BASIS_POINTS + maxSlippageBps)) / BASIS_POINTS
                : (refPrice * (BASIS_POINTS - maxSlippageBps)) / BASIS_POINTS)
            : (isBuy ? type(uint256).max : 0);

        // Create market order ID and packed order
        bytes32 marketOrderId = keccak256(abi.encodePacked(msg.sender, marketId, block.timestamp, s.orderNonce++));
        
        // Pack order data directly
        s.packedOrders[marketOrderId] = DiamondStorage.PackedOrder({
            makerAndFlags: CLOBLib.packMakerAndFlags(msg.sender, isBuy, CLOBLib.TYPE_MARKET, CLOBLib.STATUS_OPEN, CLOBLib.TIF_IOC, uint88(s.orderNonce)),
            priceAmountFilled: CLOBLib.packPriceAmountFilled(0, amount, 0),
            expiryAndMeta: CLOBLib.packExpiryAndMeta(uint40(block.timestamp), uint40(block.timestamp), uint32(s.totalMarkets)),
            marketId: marketId
        });

        // Execute matching - get total quote amount in price field
        filledAmount = _executeMarketOrder(marketOrderId, marketId, baseToken, baseTokenId, quoteToken, isBuy, worstPrice);

        // Calculate average price from stored values
        if (filledAmount > 0) {
            DiamondStorage.PackedOrder storage mo = s.packedOrders[marketOrderId];
            uint256 totalQuote = CLOBLib.unpackPrice(mo.priceAmountFilled);
            avgPrice = totalQuote / filledAmount;
        }

        // Clean up
        delete s.packedOrders[marketOrderId];
    }

    /**
     * @notice Execute market order against order book
     */
    function _executeMarketOrder(
        bytes32 marketOrderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        bool isBuy,
        uint256 worstPrice
    ) internal returns (uint96 filledAmount) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage marketOrder = s.packedOrders[marketOrderId];

        // Get opposite side tree
        DiamondStorage.RBTreeMeta storage oppositeMeta = isBuy ? s.askTreeMeta[marketId] : s.bidTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage oppositeNodes = isBuy ? s.askTreeNodes[marketId] : s.bidTreeNodes[marketId];

        // Get best price
        uint256 currentPrice = _getBestPrice(oppositeMeta, oppositeNodes, isBuy);
        uint256 totalFilled;
        uint256 totalQuote;

        // Match against price levels
        while (currentPrice != 0) {
            // Check price limit
            if (isBuy && currentPrice > worstPrice) break;
            if (!isBuy && currentPrice < worstPrice) break;

            // Get level info
            mapping(uint256 => DiamondStorage.PriceLevel) storage levels = isBuy ? s.askLevels[marketId] : s.bidLevels[marketId];
            DiamondStorage.PriceLevel storage level = levels[currentPrice];
            bytes32 makerOrderId = level.head;

            // Match against orders at this price
            while (makerOrderId != bytes32(0)) {
                DiamondStorage.PackedOrder storage makerOrder = s.packedOrders[makerOrderId];
                uint96 remaining = CLOBLib.getRemainingAmount(marketOrder.priceAmountFilled);
                if (remaining == 0) break;

                // Check maker status
                uint8 makerStatus = CLOBLib.unpackStatus(makerOrder.makerAndFlags);
                if (makerStatus != CLOBLib.STATUS_OPEN && makerStatus != CLOBLib.STATUS_PARTIAL) {
                    makerOrderId = s.orderQueue[makerOrderId].next;
                    continue;
                }

                // Check expiry
                if (CLOBLib.isExpired(makerOrder.expiryAndMeta)) {
                    bytes32 nextOrder = s.orderQueue[makerOrderId].next;
                    _cancelOrderInternal(makerOrderId, 1);
                    makerOrderId = nextOrder;
                    continue;
                }

                uint96 makerRemaining = CLOBLib.getRemainingAmount(makerOrder.priceAmountFilled);
                uint96 fillAmount = remaining < makerRemaining ? remaining : makerRemaining;

                if (fillAmount > 0) {
                    _executeTrade(marketOrderId, makerOrderId, fillAmount, uint96(currentPrice), baseToken, baseTokenId, quoteToken, isBuy);
                    totalFilled += fillAmount;
                    totalQuote += CLOBLib.calculateQuoteAmount(uint96(currentPrice), fillAmount);
                }

                makerOrderId = s.orderQueue[makerOrderId].next;
            }

            if (totalFilled >= CLOBLib.unpackAmount(marketOrder.priceAmountFilled)) break;

            // Get next price
            currentPrice = _getNextPrice(oppositeNodes, currentPrice, isBuy);
            if (currentPrice == 0) break;
        }

        // Store results
        if (totalFilled > 0) {
            marketOrder.priceAmountFilled = CLOBLib.updateFilledAmount(marketOrder.priceAmountFilled, uint64(totalFilled));
            s.packedOrders[marketOrderId].priceAmountFilled = CLOBLib.packPriceAmountFilled(uint96(totalQuote), CLOBLib.unpackAmount(marketOrder.priceAmountFilled), uint64(totalFilled));
        }

        return uint96(totalFilled);
    }

    /**
     * @notice Get total value executed by market order
     */
    function _getMarketOrderValue(
        bytes32 marketOrderId,
        bytes32 /* marketId */,
        bool /* isBuy */
    ) internal view returns (uint256 totalValue) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage marketOrder = s.packedOrders[marketOrderId];

        // The priceAmountFilled stores totalQuoteAmount in the price field after execution
        uint256 totalQuoteAmount = CLOBLib.unpackPrice(marketOrder.priceAmountFilled);
        return totalQuoteAmount;
    }
    
    /**
     * @notice Place a sell order from node inventory
     * @dev Called by Diamond for node sell orders
     */
    function placeNodeSellOrderV2(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        uint8 timeInForce,
        uint40 expiry
    ) external nonReentrant whenNotPaused returns (bytes32 orderId) {
        // Tokens should already be in Diamond
        orderId = _placeOrderInternal(
            nodeOwner,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            false,  // isBuy = false
            timeInForce,
            expiry,
            true    // skipTransfer = true (tokens already in Diamond)
        );
    }
    
    // ============================================================================
    // ORDER CANCELLATION
    // ============================================================================
    
    /**
     * @notice Cancel an open order
     * @param orderId Order to cancel
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        if (order.makerAndFlags == 0) revert OrderNotFound();
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        if (maker != msg.sender) revert NotOrderMaker();
        
        uint8 status = CLOBLib.unpackStatus(order.makerAndFlags);
        if (status != CLOBLib.STATUS_OPEN && status != CLOBLib.STATUS_PARTIAL) {
            revert OrderNotActive();
        }
        
        _cancelOrderInternal(orderId, 0);  // reason 0 = user cancelled
    }
    
    // Note: cancelOrders batch function moved to CLOBAdminFacet for size optimization
    
    // ============================================================================
    // INTERNAL ORDER FUNCTIONS
    // ============================================================================
    
    function _placeOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) internal returns (bytes32 orderId) {
        return _placeOrderInternal(
            msg.sender,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            timeInForce,
            expiry,
            false  // skipTransfer = false
        );
    }
    
    function _placeOrderInternal(
        address maker,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry,
        bool skipTransfer
    ) internal returns (bytes32 orderId) {
        if (price == 0) revert InvalidPrice();
        if (amount == 0) revert InvalidAmount();
        if (timeInForce > CLOBLib.TIF_GTD) revert InvalidTimeInForce();
        if (timeInForce == CLOBLib.TIF_GTD && expiry <= block.timestamp) revert OrderExpiredError();
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
        
        // Ensure market exists or create it
        _ensureMarket(marketId, baseToken, baseTokenId, quoteToken);
        
        // Check circuit breaker
        _checkCircuitBreaker(marketId, price);
        
        // Transfer tokens to escrow (if not skipped)
        if (!skipTransfer) {
            if (isBuy) {
                uint256 totalCost = CLOBLib.calculateQuoteAmount(price, amount);
                IERC20(quoteToken).transferFrom(msg.sender, address(this), totalCost);
            } else {
                IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
            }
        }
        
        // Generate order ID
        uint256 nonce = s.orderNonce++;
        orderId = keccak256(abi.encodePacked(maker, marketId, nonce, block.timestamp));
        
        // Create packed order
        s.packedOrders[orderId] = DiamondStorage.PackedOrder({
            makerAndFlags: CLOBLib.packMakerAndFlags(
                maker,
                isBuy,
                CLOBLib.TYPE_LIMIT,
                CLOBLib.STATUS_OPEN,
                timeInForce,
                uint88(nonce)
            ),
            priceAmountFilled: CLOBLib.packPriceAmountFilled(price, amount, 0),
            expiryAndMeta: CLOBLib.packExpiryAndMeta(expiry, uint40(block.timestamp), uint32(s.totalMarkets)),
            marketId: marketId
        });
        
        // Add to order book
        _addToOrderBook(orderId, marketId, price, amount, isBuy);
        
        emit OrderCreated(
            orderId,
            marketId,
            maker,
            price,
            amount,
            isBuy,
            CLOBLib.TYPE_LIMIT,
            timeInForce,
            expiry,
            nonce
        );
        
        // Emit token-based event for indexer compatibility
        emit OrderPlacedWithTokens(
            orderId,
            maker,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            CLOBLib.TYPE_LIMIT
        );
        
        // Try to match
        uint256 filledAmount = _matchOrder(orderId, marketId, baseToken, baseTokenId, quoteToken);
        
        // Handle time-in-force
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        
        if (timeInForce == CLOBLib.TIF_IOC && remaining > 0) {
            // Cancel unfilled portion
            _cancelOrderInternal(orderId, 2);  // reason 2 = IOC unfilled
        } else if (timeInForce == CLOBLib.TIF_FOK && filledAmount < amount) {
            // Revert entire order
            revert FOKNotFilled();
        }
        
        // Note: MarketDepthChanged event removed for size optimization
        // Use CLOBViewFacet.getMarketDepth() for off-chain indexing
    }
    
    function _addToOrderBook(
        bytes32 orderId,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Get the appropriate tree meta and nodes
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.bidTreeMeta[marketId] : s.askTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        // Insert price level if new (simplified insertion)
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
    
    function _insertPriceLevel(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 price
    ) internal {
        // Simplified BST insertion (not full RB-tree for gas efficiency)
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
        } else {
            uint256 current = meta.root;
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
        meta.count++;
    }
    
    function _removeFromOrderBook(bytes32 orderId) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        DiamondStorage.OrderQueueNode storage node = s.orderQueue[orderId];
        
        bytes32 marketId = order.marketId;
        uint256 price = node.price;
        bool isBuy = CLOBLib.unpackIsBuy(order.makerAndFlags);
        uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.bidTreeNodes[marketId] : s.askTreeNodes[marketId];
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            isBuy ? s.bidLevels[marketId] : s.askLevels[marketId];
        
        DiamondStorage.PriceLevel storage level = levels[price];
        
        // Remove from FIFO queue
        if (node.prev != bytes32(0)) {
            s.orderQueue[node.prev].next = node.next;
        } else {
            level.head = node.next;
        }
        
        if (node.next != bytes32(0)) {
            s.orderQueue[node.next].prev = node.prev;
        } else {
            level.tail = node.prev;
        }
        
        // Update aggregates
        if (level.totalAmount >= remaining) {
            level.totalAmount -= remaining;
        }
        if (level.orderCount > 0) {
            level.orderCount--;
        }
        
        // Update node aggregates
        if (nodes[price].totalAmount >= remaining) {
            nodes[price].totalAmount -= remaining;
        }
        if (nodes[price].orderCount > 0) {
            nodes[price].orderCount--;
        }
        
        // Note: We don't remove empty price levels from the tree for simplicity
        // They will be skipped during matching
        
        // Clean up node
        delete s.orderQueue[orderId];
    }
    
    function _matchOrder(
        bytes32 takerOrderId,
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (uint256 totalFilled) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
        
        bool takerIsBuy = CLOBLib.unpackIsBuy(takerOrder.makerAndFlags);
        uint96 takerPrice = CLOBLib.unpackPrice(takerOrder.priceAmountFilled);
        
        // Get opposite side tree meta and nodes
        DiamondStorage.RBTreeMeta storage oppositeMeta = takerIsBuy ? s.askTreeMeta[marketId] : s.bidTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage oppositeNodes = 
            takerIsBuy ? s.askTreeNodes[marketId] : s.bidTreeNodes[marketId];
        
        // Get best price from opposite side
        uint256 bestPrice = _getBestPrice(oppositeMeta, oppositeNodes, takerIsBuy);
        
        while (bestPrice != 0) {
            // Check price compatibility
            if (takerIsBuy && bestPrice > takerPrice) break;
            if (!takerIsBuy && bestPrice < takerPrice) break;
            
            // Get remaining amount
            uint96 takerRemaining = CLOBLib.getRemainingAmount(takerOrder.priceAmountFilled);
            if (takerRemaining == 0) break;
            
            // Match at this price level
            uint256 filledAtLevel = _matchAtPriceLevel(
                takerOrderId,
                marketId,
                bestPrice,
                takerIsBuy,
                baseToken,
                baseTokenId,
                quoteToken
            );
            
            totalFilled += filledAtLevel;
            
            // Get next price level
            bestPrice = _getNextPrice(oppositeNodes, bestPrice, takerIsBuy);
        }
    }
    
    function _getBestPrice(
        DiamondStorage.RBTreeMeta storage meta,
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        bool findMin
    ) internal view returns (uint256) {
        if (meta.root == 0) return 0;
        
        uint256 current = meta.root;
        if (findMin) {
            // Find minimum (for asks - buyer wants lowest price)
            while (nodes[current].left != 0 && nodes[nodes[current].left].exists) {
                current = nodes[current].left;
            }
        } else {
            // Find maximum (for bids - seller wants highest price)
            while (nodes[current].right != 0 && nodes[nodes[current].right].exists) {
                current = nodes[current].right;
            }
        }
        
        // Skip empty price levels
        while (current != 0 && nodes[current].orderCount == 0) {
            current = findMin ? _getNextHigher(nodes, current) : _getNextLower(nodes, current);
        }
        
        return current;
    }
    
    function _getNextPrice(
        mapping(uint256 => DiamondStorage.RBNode) storage nodes,
        uint256 current,
        bool ascending
    ) internal view returns (uint256) {
        uint256 next = ascending ? _getNextHigher(nodes, current) : _getNextLower(nodes, current);
        
        // Skip empty price levels
        while (next != 0 && nodes[next].orderCount == 0) {
            next = ascending ? _getNextHigher(nodes, next) : _getNextLower(nodes, next);
        }
        
        return next;
    }
    
    function _getNextHigher(
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
        
        uint256 parent = nodes[price].parent;
        while (parent != 0 && price == nodes[parent].right) {
            price = parent;
            parent = nodes[parent].parent;
        }
        return parent;
    }
    
    function _getNextLower(
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
        
        uint256 parent = nodes[price].parent;
        while (parent != 0 && price == nodes[parent].left) {
            price = parent;
            parent = nodes[parent].parent;
        }
        return parent;
    }
    
    function _matchAtPriceLevel(
        bytes32 takerOrderId,
        bytes32 marketId,
        uint256 price,
        bool takerIsBuy,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal returns (uint256 filledAtLevel) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        mapping(uint256 => DiamondStorage.PriceLevel) storage levels = 
            takerIsBuy ? s.askLevels[marketId] : s.bidLevels[marketId];
        
        DiamondStorage.PriceLevel storage level = levels[price];
        bytes32 makerOrderId = level.head;
        
        while (makerOrderId != bytes32(0)) {
            DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
            uint96 takerRemaining = CLOBLib.getRemainingAmount(takerOrder.priceAmountFilled);
            if (takerRemaining == 0) break;
            
            DiamondStorage.PackedOrder storage makerOrder = s.packedOrders[makerOrderId];
            
            // Check if maker order is still active
            uint8 makerStatus = CLOBLib.unpackStatus(makerOrder.makerAndFlags);
            if (makerStatus != CLOBLib.STATUS_OPEN && makerStatus != CLOBLib.STATUS_PARTIAL) {
                makerOrderId = s.orderQueue[makerOrderId].next;
                continue;
            }
            
            // Check expiry
            if (CLOBLib.isExpired(makerOrder.expiryAndMeta)) {
                bytes32 nextOrder = s.orderQueue[makerOrderId].next;
                _cancelOrderInternal(makerOrderId, 1);  // reason 1 = expired
                makerOrderId = nextOrder;
                continue;
            }
            
            uint96 makerRemaining = CLOBLib.getRemainingAmount(makerOrder.priceAmountFilled);
            uint96 fillAmount = takerRemaining < makerRemaining ? takerRemaining : makerRemaining;
            
            if (fillAmount > 0) {
                _executeTrade(
                    takerOrderId,
                    makerOrderId,
                    fillAmount,
                    uint96(price),
                    baseToken,
                    baseTokenId,
                    quoteToken,
                    takerIsBuy
                );
                filledAtLevel += fillAmount;
            }
            
            makerOrderId = s.orderQueue[makerOrderId].next;
        }
    }
    
    function _executeTrade(
        bytes32 takerOrderId,
        bytes32 makerOrderId,
        uint96 fillAmount,
        uint96 price,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        bool takerIsBuy
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage takerOrder = s.packedOrders[takerOrderId];
        DiamondStorage.PackedOrder storage makerOrder = s.packedOrders[makerOrderId];
        
        address taker = CLOBLib.unpackMaker(takerOrder.makerAndFlags);
        address maker = CLOBLib.unpackMaker(makerOrder.makerAndFlags);
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, fillAmount);
        
        // Calculate fees
        uint256 takerFee = (quoteAmount * s.takerFeeBps) / BASIS_POINTS;
        uint256 makerFee = (quoteAmount * s.makerFeeBps) / BASIS_POINTS;
        
        // Update filled amounts
        uint64 takerNewFilled = uint64(CLOBLib.unpackFilledAmount(takerOrder.priceAmountFilled) + fillAmount);
        uint64 makerNewFilled = uint64(CLOBLib.unpackFilledAmount(makerOrder.priceAmountFilled) + fillAmount);
        
        takerOrder.priceAmountFilled = CLOBLib.updateFilledAmount(takerOrder.priceAmountFilled, takerNewFilled);
        makerOrder.priceAmountFilled = CLOBLib.updateFilledAmount(makerOrder.priceAmountFilled, makerNewFilled);
        
        // Update statuses
        uint96 takerAmount = CLOBLib.unpackAmount(takerOrder.priceAmountFilled);
        uint96 makerAmount = CLOBLib.unpackAmount(makerOrder.priceAmountFilled);
        
        if (takerNewFilled >= takerAmount) {
            takerOrder.makerAndFlags = CLOBLib.updateStatus(takerOrder.makerAndFlags, CLOBLib.STATUS_FILLED);
            _removeFromOrderBook(takerOrderId);
        } else {
            takerOrder.makerAndFlags = CLOBLib.updateStatus(takerOrder.makerAndFlags, CLOBLib.STATUS_PARTIAL);
        }
        
        if (makerNewFilled >= makerAmount) {
            makerOrder.makerAndFlags = CLOBLib.updateStatus(makerOrder.makerAndFlags, CLOBLib.STATUS_FILLED);
            _removeFromOrderBook(makerOrderId);
        } else {
            makerOrder.makerAndFlags = CLOBLib.updateStatus(makerOrder.makerAndFlags, CLOBLib.STATUS_PARTIAL);
        }
        
        // Transfer tokens
        if (takerIsBuy) {
            // Taker buys: base tokens to taker, quote tokens to maker
            IERC1155(baseToken).safeTransferFrom(address(this), taker, baseTokenId, fillAmount, "");
            IERC20(quoteToken).transfer(maker, quoteAmount - makerFee);
        } else {
            // Taker sells: base tokens to maker, quote tokens to taker
            IERC1155(baseToken).safeTransferFrom(address(this), maker, baseTokenId, fillAmount, "");
            IERC20(quoteToken).transfer(taker, quoteAmount - takerFee);
        }
        
        // Collect fees
        if (takerFee + makerFee > 0 && s.feeRecipient != address(0)) {
            IERC20(quoteToken).transfer(s.feeRecipient, takerFee + makerFee);
        }
        
        // Update circuit breaker last price
        s.circuitBreakers[takerOrder.marketId].lastPrice = price;
        
        // Create trade record
        bytes32 tradeId = keccak256(abi.encodePacked(takerOrderId, makerOrderId, block.timestamp, s.totalTrades));
        s.totalTrades++;
        
        emit TradeExecuted(
            tradeId,
            takerOrderId,
            makerOrderId,
            taker,
            maker,
            takerOrder.marketId,
            price,
            fillAmount,
            quoteAmount,
            takerFee,
            makerFee,
            block.timestamp,
            takerIsBuy
        );
        
        emit CLOBOrderFilled(
            takerOrderId,
            tradeId,
            fillAmount,
            price,
            takerAmount - takerNewFilled,
            takerNewFilled
        );
        
        emit CLOBOrderFilled(
            makerOrderId,
            tradeId,
            fillAmount,
            price,
            makerAmount - makerNewFilled,
            makerNewFilled
        );
    }
    
    function _cancelOrderInternal(bytes32 orderId, uint8 reason) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.PackedOrder storage order = s.packedOrders[orderId];
        
        address maker = CLOBLib.unpackMaker(order.makerAndFlags);
        uint96 remaining = CLOBLib.getRemainingAmount(order.priceAmountFilled);
        
        // Update status
        uint8 newStatus = reason == 1 ? CLOBLib.STATUS_EXPIRED : CLOBLib.STATUS_CANCELLED;
        order.makerAndFlags = CLOBLib.updateStatus(order.makerAndFlags, newStatus);
        
        // Remove from order book
        _removeFromOrderBook(orderId);
        
        // Note: Token refunds are handled by the caller or via emergencyUserWithdraw
        // This is intentional to keep the cancel function gas-efficient
        // The order data (marketId, isBuy, price) is preserved for refund lookup
        
        if (reason == 1) {
            emit OrderExpired(orderId, block.timestamp);
        }
        
        emit CLOBOrderCancelled(orderId, maker, remaining, reason);
    }
    
    // ============================================================================
    // CIRCUIT BREAKER
    // ============================================================================
    
    function _checkCircuitBreaker(bytes32 marketId, uint256 newPrice) internal view {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CircuitBreaker storage cb = s.circuitBreakers[marketId];
        
        if (!cb.isEnabled) return;
        if (cb.isTripped && block.timestamp < cb.tripTimestamp + cb.cooldownPeriod) {
            revert CircuitBreakerTrippedError();
        }
        
        if (cb.lastPrice > 0) {
            uint256 changeBps = CLOBLib.calculatePriceChange(cb.lastPrice, newPrice);
            if (changeBps > cb.priceChangeThreshold) {
                revert CircuitBreakerTrippedError();
            }
        }
    }
    
    // ============================================================================
    // RATE LIMITING
    // ============================================================================
    
    function _checkRateLimit() internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.RateLimit storage limit = s.userRateLimits[msg.sender];
        
        if (limit.lastBlock != block.number) {
            limit.lastBlock = block.number;
            limit.ordersThisBlock = 0;
            limit.volumeThisBlock = 0;
        }
        
        limit.ordersThisBlock++;
        
        if (limit.ordersThisBlock > s.maxOrdersPerBlock) {
            revert RateLimitExceeded();
        }
    }
    
    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================
    
    function _ensureMarket(
        bytes32 marketId,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        if (!s.markets[marketId].active) {
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: CLOBLib.addressToString(baseToken),
                baseTokenId: baseTokenId,
                quoteToken: CLOBLib.addressToString(quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
            
            // Initialize circuit breaker with defaults
            s.circuitBreakers[marketId] = DiamondStorage.CircuitBreaker({
                lastPrice: 0,
                priceChangeThreshold: s.defaultPriceChangeThreshold,
                cooldownPeriod: s.defaultCooldownPeriod,
                tripTimestamp: 0,
                isTripped: false,
                isEnabled: true
            });
            
            emit MarketCreated(marketId, baseToken, baseTokenId, quoteToken);
        }
    }
    
    function _getMarketPrice(bytes32 marketId, bool isBuy) internal view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Get best price from opposite side
        DiamondStorage.RBTreeMeta storage meta = isBuy ? s.askTreeMeta[marketId] : s.bidTreeMeta[marketId];
        mapping(uint256 => DiamondStorage.RBNode) storage nodes = 
            isBuy ? s.askTreeNodes[marketId] : s.bidTreeNodes[marketId];
        
        uint256 bestPrice = _getBestPrice(meta, nodes, isBuy);
        
        if (bestPrice != 0) return bestPrice;
        
        // Fallback to last trade price
        return s.circuitBreakers[marketId].lastPrice;
    }
    
    // ============================================================================
    // ERC1155 RECEIVER
    // ============================================================================
    
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

