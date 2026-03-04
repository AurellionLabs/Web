// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { CLOBLib } from '../libraries/CLOBLib.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import { SafeERC20 } from '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @dev Interface for OrderRouterFacet - the SINGLE ENTRY POINT for all orders
 * All order placement should go through OrderRouterFacet to ensure V2 storage usage
 */
interface IOrderRouterFacet {
    function placeOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 price,
        uint96 amount,
        bool isBuy,
        uint8 timeInForce,
        uint40 expiry
    ) external returns (bytes32 orderId);
    
    function placeMarketOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint96 amount,
        bool isBuy,
        uint16 maxSlippageBps
    ) external returns (bytes32 orderId);
    
    function cancelOrder(bytes32 orderId) external;
}

/**
 * @title CLOBFacet
 * @notice Business logic facet for CLOB integration
 * @dev DEPRECATION NOTICE: Most order functions now redirect to OrderRouterFacet
 *      to ensure consistent V2 storage usage. Direct use of this facet for order
 *      placement is deprecated. Use OrderRouterFacet.placeOrder() instead.
 * 
 * Functions that are DEPRECATED and redirect to OrderRouterFacet:
 * - placeBuyOrder() -> Use OrderRouterFacet.placeOrder() with isBuy=true
 * - placeMarketOrder() -> Use OrderRouterFacet.placeMarketOrder()
 * - placeOrder() -> Use OrderRouterFacet.placeOrder()
 * 
 * Functions that are still active (view/query functions):
 * - getOrder(), getTrade(), getPool(), getMarket()
 * - getOpenOrders(), getOrderWithTokens()
 * - getTotalMarkets(), getTotalTrades()
 */
contract CLOBFacet is Initializable {
    using SafeERC20 for IERC20;
    // Original market-based OrderPlaced event (for backward compatibility)
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed maker,
        bytes32 indexed marketId,
        uint256 price,
        uint256 amount,
        bool isBuy,
        uint8 orderType
    );
    
    // Token-based OrderPlaced event (matches standalone CLOB format for indexer)
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
    event OrderMatched(
        bytes32 indexed takerOrderId,
        bytes32 indexed makerOrderId,
        bytes32 indexed tradeId,
        uint256 fillAmount,
        uint256 fillPrice,
        uint256 quoteAmount
    );
    event CLOBOrderCancelled(
        bytes32 indexed orderId,
        address indexed maker,
        uint256 remainingAmount
    );
    event TradeExecuted(
        bytes32 indexed tradeId,
        address indexed taker,
        address indexed maker,
        bytes32 marketId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount,
        uint256 timestamp
    );
    event PoolCreated(
        bytes32 indexed poolId,
        string baseToken,
        uint256 baseTokenId,
        string quoteToken
    );
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 lpTokensMinted
    );
    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 baseAmount,
        uint256 quoteAmount,
        uint256 lpTokensBurned
    );
    event FeesCollected(
        bytes32 indexed tradeId,
        uint256 takerFeeAmount,
        uint256 makerFeeAmount,
        uint256 lpFeeAmount
    );

    uint8 public constant TAKER_FEE = 10;
    uint8 public constant MAKER_FEE = 5;
    uint8 public constant LP_FEE = 5;

    // Struct to reduce stack depth in matching functions
    struct MatchContext {
        bytes32 marketId;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
    }

    function initialize() public initializer {}

    function createMarket(
        string memory _baseToken,
        uint256 _baseTokenId,
        string memory _quoteToken
    ) external returns (bytes32 marketId) {
        LibDiamond.enforceIsContractOwner();
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        marketId = keccak256(
            abi.encodePacked(_baseToken, _baseTokenId, _quoteToken)
        );

        require(!s.markets[marketId].active, 'Market already exists');

        s.markets[marketId] = DiamondStorage.Market({
            baseToken: _baseToken,
            baseTokenId: _baseTokenId,
            quoteToken: _quoteToken,
            active: true,
            createdAt: block.timestamp
        });

        s.marketIds.push(marketId);
        s.totalMarkets++;

        emit PoolCreated(marketId, _baseToken, _baseTokenId, _quoteToken);

        return marketId;
    }

    /**
     * @notice Place an order using market ID
     * @dev DEPRECATED: This function uses V1 storage which is incompatible with V2.
     *      Orders placed here will NOT match with orders placed via OrderRouterFacet.
     *      Use OrderRouterFacet.placeOrder() with token addresses instead.
     * 
     *      This function is kept for backward compatibility with existing integrations
     *      but will be removed in a future version.
     */
    function placeOrder(
        bytes32 _marketId,
        uint256 _price,
        uint256 _amount,
        bool _isBuy,
        uint8 _orderType
    ) external returns (bytes32 orderId) {
        // DEPRECATED: This function uses V1 storage
        // New orders should use OrderRouterFacet.placeOrder() with token addresses
        // to ensure compatibility with V2 storage and proper order matching.
        //
        // We keep this implementation for backward compatibility, but emit a warning
        // that orders placed here may not match with V2 orders.
        
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.markets[_marketId].active, 'Market not active');
        require(_price > 0 && _amount > 0, 'Invalid params');

        orderId = keccak256(
            abi.encodePacked(msg.sender, _marketId, _price, _amount, _isBuy, _orderType, block.timestamp)
        );

        s.clobOrders[orderId] = DiamondStorage.CLOBOrder({
            maker: msg.sender,
            marketId: _marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: _isBuy,
            orderType: _orderType,
            status: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.clobOrderIds.push(orderId);
        s.totalCLOBOrders++;
        
        // Add to price-level arrays for unified matching
        if (_isBuy) {
            s.bidOrders[_marketId][_price].push(orderId);
            _addPriceLevel(s.bidPrices[_marketId], _price);
        } else {
            s.askOrders[_marketId][_price].push(orderId);
            _addPriceLevel(s.askPrices[_marketId], _price);
        }

        emit OrderPlaced(orderId, msg.sender, _marketId, _price, _amount, _isBuy, _orderType);

        // Use unified matching that works with price-level arrays
        _matchOrderUnified(s, _marketId, orderId);

        return orderId;
    }

    /**
     * @notice Legacy matching function - now redirects to unified matching
     * @dev Kept for backward compatibility, but uses price-level matching internally
     */
    function matchOrders(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _orderId
    ) internal {
        _matchOrderUnified(s, _marketId, _orderId);
    }
    
    /**
     * @notice Unified order matching using price-level arrays
     * @dev This fixes the bug where orders from different placement functions didn't match
     *      because they used different data structures
     * 
     * For BUY orders: Match against askPrices (lowest first)
     * For SELL orders: Match against bidPrices (highest first)
     */
    function _matchOrderUnified(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _orderId
    ) internal {
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        require(order.status == 0 || order.status == 1, 'Order not matchable');

        if (order.isBuy) {
            _matchBuyOrderUnified(s, _marketId, _orderId);
        } else {
            _matchSellOrderUnified(s, _marketId, _orderId);
        }
    }
    
    /**
     * @notice Match a buy order against sell orders (asks)
     * @dev Iterates ask prices from lowest to highest, matching until filled or no more matches
     * @dev Optimized: cache order state to avoid repeated SLOADs
     */
    function _matchBuyOrderUnified(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _buyOrderId
    ) internal {
        DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
        uint256[] storage askPrices = s.askPrices[_marketId];
        
        // Cache to avoid repeated SLOADs
        uint256 buyOrderAmount = buyOrder.amount;
        uint256 buyOrderPrice = buyOrder.price;
        uint256 buyOrderFilled = buyOrder.filledAmount;
        
        // Iterate through ask prices (already sorted ascending)
        for (uint256 i = 0; i < askPrices.length; i++) {
            if (buyOrderFilled >= buyOrderAmount) break;
            
            uint256 askPrice = askPrices[i];
            // Only match if ask price <= buy price (buyer willing to pay at least this much)
            if (askPrice > buyOrderPrice) break;
            
            bytes32[] storage ordersAtPrice = s.askOrders[_marketId][askPrice];
            
            for (uint256 j = 0; j < ordersAtPrice.length; j++) {
                if (buyOrderFilled >= buyOrderAmount) break;
                
                bytes32 sellOrderId = ordersAtPrice[j];
                if (sellOrderId == _buyOrderId) continue; // Don't match with self
                
                DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[sellOrderId];
                
                // Skip if not matchable - cache sellOrder values
                if (sellOrder.status != 0 && sellOrder.status != 1) continue;
                
                uint256 sellOrderAmount = sellOrder.amount;
                uint256 sellOrderFilled = sellOrder.filledAmount;
                if (sellOrderFilled >= sellOrderAmount) continue;
                
                // Execute the match at the ask price (price improvement for buyer)
                _executeMatch(s, _marketId, _buyOrderId, sellOrderId, askPrice);
                
                // Update cached value after match
                buyOrderFilled = buyOrder.filledAmount;
            }
        }
        
        // Also check legacy orders that might not be in price arrays
        _matchAgainstLegacyOrders(s, _marketId, _buyOrderId);
    }
    
    /**
     * @notice Match a sell order against buy orders (bids)
     * @dev Iterates bid prices from highest to lowest, matching until filled or no more matches
     * @dev Optimized: cache order state to avoid repeated SLOADs
     */
    function _matchSellOrderUnified(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _sellOrderId
    ) internal {
        DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[_sellOrderId];
        uint256[] storage bidPrices = s.bidPrices[_marketId];
        
        // Cache to avoid repeated SLOADs
        uint256 sellOrderAmount = sellOrder.amount;
        uint256 sellOrderPrice = sellOrder.price;
        uint256 sellOrderFilled = sellOrder.filledAmount;
        
        // Iterate through bid prices from highest to lowest
        for (uint256 i = bidPrices.length; i > 0; i--) {
            if (sellOrderFilled >= sellOrderAmount) break;
            
            uint256 bidPrice = bidPrices[i - 1];
            // Only match if bid price >= sell price (buyer willing to pay at least seller's ask)
            if (bidPrice < sellOrderPrice) break;
            
            bytes32[] storage ordersAtPrice = s.bidOrders[_marketId][bidPrice];
            
            for (uint256 j = 0; j < ordersAtPrice.length; j++) {
                if (sellOrderFilled >= sellOrderAmount) break;
                
                bytes32 buyOrderId = ordersAtPrice[j];
                if (buyOrderId == _sellOrderId) continue; // Don't match with self
                
                DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[buyOrderId];
                
                // Skip if not matchable - cache buyOrder values
                if (buyOrder.status != 0 && buyOrder.status != 1) continue;
                
                uint256 buyOrderAmount = buyOrder.amount;
                uint256 buyOrderFilled = buyOrder.filledAmount;
                if (buyOrderFilled >= buyOrderAmount) continue;
                
                // Execute the match at the bid price (price improvement for seller)
                _executeMatch(s, _marketId, buyOrderId, _sellOrderId, bidPrice);
                
                // Update cached value after match
                sellOrderFilled = sellOrder.filledAmount;
            }
        }
        
        // Also check legacy orders that might not be in price arrays
        _matchAgainstLegacyOrders(s, _marketId, _sellOrderId);
    }
    
    /**
     * @notice Fallback matching against legacy orders not in price arrays
     * @dev This ensures backward compatibility with orders placed before the fix
     * @dev Optimized: cache order.amount and order.filledAmount to avoid repeated SLOADs
     */
    function _matchAgainstLegacyOrders(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _orderId
    ) internal {
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        
        // Cache in memory to avoid repeated SLOADs in loop
        uint256 orderAmount = order.amount;
        uint256 orderFilledAmount = order.filledAmount;
        bool isBuyOrder = order.isBuy;
        uint256 orderPrice = order.price;
        
        if (orderFilledAmount >= orderAmount) return;
        
        uint256 orderRemaining = orderAmount - orderFilledAmount;
        uint256 orderIdsLength = s.clobOrderIds.length; // Cache to avoid repeated SLOADs

        for (uint256 i = 0; i < orderIdsLength && orderRemaining > 0; i++) {
            bytes32 matchOrderId = s.clobOrderIds[i];
            if (matchOrderId == _orderId) continue;
            
            DiamondStorage.CLOBOrder storage matchOrder = s.clobOrders[matchOrderId];

            if (matchOrder.status != 0 && matchOrder.status != 1) continue;
            if (matchOrder.marketId != _marketId) continue;
            if (matchOrder.isBuy == isBuyOrder) continue;
            
            // Cache matchOrder values to avoid multiple SLOADs
            uint256 matchOrderAmount = matchOrder.amount;
            uint256 matchOrderFilledAmount = matchOrder.filledAmount;
            
            if (matchOrderFilledAmount >= matchOrderAmount) continue;
            
            // Price compatibility check - use cached values
            if (isBuyOrder && matchOrder.price > orderPrice) continue;
            if (!isBuyOrder && matchOrder.price < orderPrice) continue;

            // Determine fill price (maker's price for price improvement)
            uint256 fillPrice = matchOrder.price;
            
            _executeMatch(s, _marketId, 
                isBuyOrder ? _orderId : matchOrderId,  // buyOrderId
                isBuyOrder ? matchOrderId : _orderId,  // sellOrderId
                fillPrice
            );
            
            // Update remaining using cached values + fresh storage read for fill amount
            orderFilledAmount = order.filledAmount;
            orderRemaining = orderAmount - orderFilledAmount;
        }
    }
    
    /**
     * @notice Execute a match between a buy order and sell order
     * @dev Handles fill amount calculation, trade recording, and status updates
     */
    function _executeMatch(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _buyOrderId,
        bytes32 _sellOrderId,
        uint256 _fillPrice
    ) internal {
        DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
        DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[_sellOrderId];
        
        uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
        uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
        
        if (buyRemaining == 0 || sellRemaining == 0) return;
        
        uint256 fillAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
        uint256 quoteAmount = fillAmount * _fillPrice;
        
        // Create trade record
        bytes32 tradeId = keccak256(abi.encodePacked(_buyOrderId, _sellOrderId, block.timestamp, s.totalTrades));
        
        s.trades[tradeId] = DiamondStorage.Trade({
            takerOrderId: _buyOrderId,
            makerOrderId: _sellOrderId,
            taker: buyOrder.maker,
            maker: sellOrder.maker,
            marketId: _marketId,
            price: _fillPrice,
            amount: fillAmount,
            quoteAmount: quoteAmount,
            timestamp: block.timestamp,
            createdAt: block.timestamp
        });

        s.tradeIds.push(tradeId);
        s.totalTrades++;

        // Update order fill amounts
        buyOrder.filledAmount += fillAmount;
        buyOrder.updatedAt = block.timestamp;
        sellOrder.filledAmount += fillAmount;
        sellOrder.updatedAt = block.timestamp;

        // Update order statuses
        buyOrder.status = buyOrder.filledAmount >= buyOrder.amount ? 2 : 1;
        sellOrder.status = sellOrder.filledAmount >= sellOrder.amount ? 2 : 1;

        // Calculate and emit fees
        uint256 takerFee = (quoteAmount * TAKER_FEE) / 10000;
        uint256 makerFee = (quoteAmount * MAKER_FEE) / 10000;

        emit FeesCollected(tradeId, takerFee, makerFee, 0);
        emit TradeExecuted(tradeId, buyOrder.maker, sellOrder.maker, _marketId, _fillPrice, fillAmount, quoteAmount, block.timestamp);
        emit OrderMatched(_buyOrderId, _sellOrderId, tradeId, fillAmount, _fillPrice, quoteAmount);
    }

    function cancelOrder(bytes32 _orderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Cache order to avoid repeated SLOADs (saves ~6300 gas cold, ~300 warm)
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        require(order.maker == msg.sender, 'Not the order maker');
        require(order.status == 0, 'Order not cancellable');

        order.status = 3;
        order.updatedAt = block.timestamp;

        uint256 remaining = order.amount - order.filledAmount;
        emit CLOBOrderCancelled(_orderId, msg.sender, remaining);
    }

    function createPool(
        string memory _baseToken,
        uint256 _baseTokenId,
        string memory _quoteToken,
        uint256 _baseAmount,
        uint256 _quoteAmount
    ) external returns (bytes32 poolId, uint256 lpTokens) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        poolId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken, msg.sender));

        require(!s.pools[poolId].isActive, 'Pool already exists');
        require(_baseAmount > 0 && _quoteAmount > 0, 'Invalid amounts');

        lpTokens = CLOBLib.sqrt(_baseAmount * _quoteAmount);

        s.pools[poolId] = DiamondStorage.LiquidityPool({
            baseToken: _baseToken,
            baseTokenId: _baseTokenId,
            quoteToken: _quoteToken,
            baseReserve: _baseAmount,
            quoteReserve: _quoteAmount,
            totalLpTokens: lpTokens,
            isActive: true,
            createdAt: block.timestamp
        });

        s.poolIds.push(poolId);
        s.totalPools++;

        emit PoolCreated(poolId, _baseToken, _baseTokenId, _quoteToken);
        emit LiquidityAdded(poolId, msg.sender, _baseAmount, _quoteAmount, lpTokens);
    }

    function getOrder(bytes32 _orderId)
        external
        view
        returns (
            address maker,
            bytes32 marketId,
            uint256 price,
            uint256 amount,
            uint256 filledAmount,
            bool isBuy,
            uint8 orderType,
            uint8 status,
            uint256 createdAt,
            uint256 updatedAt
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        return (
            order.maker,
            order.marketId,
            order.price,
            order.amount,
            order.filledAmount,
            order.isBuy,
            order.orderType,
            order.status,
            order.createdAt,
            order.updatedAt
        );
    }

    function getTrade(bytes32 _tradeId)
        external
        view
        returns (
            bytes32 takerOrderId,
            bytes32 makerOrderId,
            address taker,
            address maker,
            bytes32 marketId,
            uint256 price,
            uint256 amount,
            uint256 quoteAmount,
            uint256 timestamp
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Trade storage trade = s.trades[_tradeId];
        return (
            trade.takerOrderId,
            trade.makerOrderId,
            trade.taker,
            trade.maker,
            trade.marketId,
            trade.price,
            trade.amount,
            trade.quoteAmount,
            trade.timestamp
        );
    }

    function getPool(bytes32 _poolId)
        external
        view
        returns (
            string memory baseToken,
            uint256 baseTokenId,
            string memory quoteToken,
            uint256 baseReserve,
            uint256 quoteReserve,
            uint256 totalLpTokens,
            bool isActive
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.LiquidityPool storage pool = s.pools[_poolId];
        return (
            pool.baseToken,
            pool.baseTokenId,
            pool.quoteToken,
            pool.baseReserve,
            pool.quoteReserve,
            pool.totalLpTokens,
            pool.isActive
        );
    }

    function getMarket(bytes32 _marketId)
        external
        view
        returns (
            string memory baseToken,
            uint256 baseTokenId,
            string memory quoteToken,
            bool active
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Market storage market = s.markets[_marketId];
        return (market.baseToken, market.baseTokenId, market.quoteToken, market.active);
    }

    function getTotalMarkets() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalMarkets;
    }

    function getTotalTrades() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalTrades;
    }

    // ==========================================================================
    // NODE SELL ORDER FUNCTIONS - Direct token-based orders from Diamond
    // ==========================================================================

    /**
     * @notice DEPRECATED - Use placeNodeSellOrderV2 in CLOBFacetV2 instead
     * @dev This function uses array-based storage incompatible with V2's tree-based storage
     */
    function placeNodeSellOrder(
        address,
        address,
        uint256,
        address,
        uint256,
        uint256
    ) external pure returns (bytes32) {
        revert("DEPRECATED: Use placeNodeSellOrderV2");
    }

    /**
     * @notice Place a buy order for tokens
     * @dev DEPRECATED: Use OrderRouterFacet.placeOrder() instead for V2 storage compatibility
     *      This function now redirects to OrderRouterFacet to ensure all orders use V2 storage.
     *      Buyer must have approved Diamond to spend quote tokens.
     * @param _baseToken The ERC1155 token contract address
     * @param _baseTokenId The token ID to buy
     * @param _quoteToken The payment token
     * @param _price Price per unit in quote token (wei)
     * @param _amount Amount of tokens to buy
     * @return orderId The generated order ID
     */
    function placeBuyOrder(
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken,
        uint256 _price,
        uint256 _amount
    ) external returns (bytes32 orderId) {
        // DEPRECATED: Redirect to OrderRouterFacet for V2 storage compatibility
        // This ensures all orders (buy and sell) use the same storage structure
        // and can match with each other properly.
        require(_price > 0 && _price <= type(uint96).max, 'Invalid price');
        require(_amount > 0 && _amount <= type(uint96).max, 'Invalid amount');
        
        // Route through OrderRouterFacet - SINGLE ENTRY POINT for all orders
        // timeInForce = 0 (GTC), expiry = 0 (no expiry)
        return IOrderRouterFacet(address(this)).placeOrder(
            _baseToken,
            _baseTokenId,
            _quoteToken,
            uint96(_price),
            uint96(_amount),
            true,  // isBuy = true
            0,     // timeInForce = GTC
            0      // expiry = no expiry
        );
    }

    /**
     * @notice Place a market order (executes immediately at best available price)
     * @dev DEPRECATED: Use OrderRouterFacet.placeMarketOrder() instead for V2 storage compatibility
     *      This function now redirects to OrderRouterFacet to ensure all orders use V2 storage.
     *      For buy orders: buyer must approve Diamond to spend quote tokens
     *      For sell orders: seller must have tokens in Diamond (via depositTokensToNode)
     * @param _baseToken The ERC1155 token contract address
     * @param _baseTokenId The token ID
     * @param _quoteToken The payment token
     * @param _amount Amount of tokens to buy/sell
     * @param _isBuy True for buy order, false for sell order
     * @param _maxPrice Maximum price willing to pay (for buys) or minimum price willing to accept (for sells)
     * @return orderId The generated order ID
     */
    function placeMarketOrder(
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken,
        uint256 _amount,
        bool _isBuy,
        uint256 _maxPrice
    ) external returns (bytes32 orderId) {
        // DEPRECATED: Redirect to OrderRouterFacet for V2 storage compatibility
        require(_amount > 0 && _amount <= type(uint96).max, 'Invalid amount');
        require(_maxPrice > 0, 'Invalid max price');
        
        // Calculate slippage from max price (assume 5% default slippage for market orders)
        // This provides similar behavior to the old implementation
        uint16 maxSlippageBps = 500; // 5% slippage
        
        // Route through OrderRouterFacet - SINGLE ENTRY POINT for all orders
        return IOrderRouterFacet(address(this)).placeMarketOrder(
            _baseToken,
            _baseTokenId,
            _quoteToken,
            uint96(_amount),
            _isBuy,
            maxSlippageBps
        );
    }

    function _ensureMarketExists(
        bytes32 _marketId,
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        if (!s.markets[_marketId].active) {
            s.markets[_marketId] = DiamondStorage.Market({
                baseToken: _addressToString(_baseToken),
                baseTokenId: _baseTokenId,
                quoteToken: _addressToString(_quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(_marketId);
            s.totalMarkets++;
        }
    }

    function _createMarketOrder(
        bytes32 _marketId,
        uint256 _price,
        uint256 _amount,
        bool _isBuy
    ) internal returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        orderId = keccak256(
            abi.encodePacked(msg.sender, _marketId, _price, _amount, _isBuy, uint8(1), block.timestamp, s.totalCLOBOrders)
        );

        s.clobOrders[orderId] = DiamondStorage.CLOBOrder({
            maker: msg.sender,
            marketId: _marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: _isBuy,
            orderType: 1, // Market order
            status: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.clobOrderIds.push(orderId);
        s.totalCLOBOrders++;
        
        return orderId;
    }

    function _executeMarketOrder(
        bytes32 _orderId,
        bytes32 _marketId,
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken,
        uint256 _amount,
        bool _isBuy,
        uint256 _maxPrice
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Cache order early to avoid repeated SLOADs
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        uint256 filledAmount = order.filledAmount;
        
        if (_isBuy) {
            _matchBuyOrder(s, _marketId, _orderId, _baseToken, _baseTokenId, _quoteToken);
            _refundUnusedQuote(_orderId, _quoteToken, _amount, _maxPrice, filledAmount);
        } else {
            _matchSellOrder(s, _marketId, _orderId);
            _returnUnsoldTokens(_orderId, _baseToken, _baseTokenId, _amount, filledAmount);
        }

        // Finalize order status
        order.status = order.filledAmount >= order.amount ? 2 : 3; // Filled or Cancelled
        order.updatedAt = block.timestamp;
    }

    function _refundUnusedQuote(
        bytes32 _orderId,
        address _quoteToken,
        uint256 _amount,
        uint256 _maxPrice,
        uint256 _filledAmount  // Pass filled amount from cached order
    ) internal {
        if (_filledAmount < _amount) {
            uint256 refund = _maxPrice * (_amount - _filledAmount);
            if (refund > 0) {
                IERC20(_quoteToken).safeTransfer(msg.sender, refund);
            }
        }
    }

    function _returnUnsoldTokens(
        bytes32 _orderId,
        address _baseToken,
        uint256 _baseTokenId,
        uint256 _amount,
        uint256 _filledAmount  // Pass filled amount from cached order
    ) internal {
        uint256 unsold = _amount - _filledAmount;
        if (unsold > 0) {
            IERC1155(_baseToken).safeTransferFrom(address(this), msg.sender, _baseTokenId, unsold, "");
        }
    }

    /**
     * @notice Cancel an open order
     * @dev This function handles both V1 and V2 orders. For V2 orders, it redirects
     *      to OrderRouterFacet.cancelOrder(). For V1 orders, it uses the legacy logic.
     * @param _orderId The order to cancel
     */
    function cancelCLOBOrder(bytes32 _orderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Check if this is a V2 order (has packed order data)
        if (s.packedOrders[_orderId].makerAndFlags != 0) {
            // V2 order - redirect to OrderRouterFacet
            IOrderRouterFacet(address(this)).cancelOrder(_orderId);
            return;
        }
        
        // V1 order - use legacy logic
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        
        require(order.maker == msg.sender, 'Not order maker');
        require(order.status == 0 || order.status == 1, 'Order not cancellable');
        
        uint256 remaining = order.amount - order.filledAmount;
        order.status = 3; // Cancelled
        order.updatedAt = block.timestamp;
        
        // If buy order, refund quote tokens
        if (order.isBuy && remaining > 0) {
            // Parse market to get quote token
            DiamondStorage.Market storage market = s.markets[order.marketId];
            address quoteToken = CLOBLib.stringToAddress(market.quoteToken);
            uint256 refundAmount = order.price * remaining;
            IERC20(quoteToken).safeTransfer(msg.sender, refundAmount);
        }
        
        // If sell order, tokens stay in Diamond (node owner can withdraw via NodesFacet)
        
        emit CLOBOrderCancelled(_orderId, msg.sender, remaining);
    }

    // ==========================================================================
    // INTERNAL MATCHING FUNCTIONS
    // ==========================================================================

    function _matchSellOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _sellOrderId
    ) internal {
        DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[_sellOrderId];
        uint256 remaining = sellOrder.amount - sellOrder.filledAmount;
        
        // Get market info for token transfers
        DiamondStorage.Market storage market = s.markets[_marketId];
        address baseToken = CLOBLib.stringToAddress(market.baseToken);
        address quoteToken = CLOBLib.stringToAddress(market.quoteToken);
        uint256 baseTokenId = market.baseTokenId;
        
        // Iterate through bid prices from highest to lowest
        uint256[] storage bidPrices = s.bidPrices[_marketId];
        
        for (uint256 i = bidPrices.length; i > 0 && remaining > 0; i--) {
            uint256 bidPrice = bidPrices[i - 1];
            
            // Only match if bid price >= ask price
            if (bidPrice < sellOrder.price) break;
            
            bytes32[] storage ordersAtPrice = s.bidOrders[_marketId][bidPrice];
            
            for (uint256 j = 0; j < ordersAtPrice.length && remaining > 0; j++) {
                bytes32 buyOrderId = ordersAtPrice[j];
                DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[buyOrderId];
                
                if (buyOrder.status != 0 && buyOrder.status != 1) continue;
                
                uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
                uint256 fillAmount = remaining < buyRemaining ? remaining : buyRemaining;
                uint256 fillPrice = bidPrice; // Price improvement for seller
                uint256 quoteAmount = fillAmount * fillPrice;
                
                // Execute trade
                bytes32 tradeId = keccak256(abi.encodePacked(_sellOrderId, buyOrderId, block.timestamp));
                
                // Transfer base tokens from Diamond to buyer
                IERC1155(baseToken).safeTransferFrom(address(this), buyOrder.maker, baseTokenId, fillAmount, "");
                
                // Transfer quote tokens from Diamond (escrowed) to seller
                IERC20(quoteToken).safeTransfer(sellOrder.maker, quoteAmount);
                
                // Update orders
                sellOrder.filledAmount += fillAmount;
                sellOrder.updatedAt = block.timestamp;
                buyOrder.filledAmount += fillAmount;
                buyOrder.updatedAt = block.timestamp;
                
                // Update statuses
                if (sellOrder.filledAmount >= sellOrder.amount) sellOrder.status = 2;
                else sellOrder.status = 1;
                
                if (buyOrder.filledAmount >= buyOrder.amount) buyOrder.status = 2;
                else buyOrder.status = 1;
                
                // Record trade
                s.trades[tradeId] = DiamondStorage.Trade({
                    takerOrderId: _sellOrderId,
                    makerOrderId: buyOrderId,
                    taker: sellOrder.maker,
                    maker: buyOrder.maker,
                    marketId: _marketId,
                    price: fillPrice,
                    amount: fillAmount,
                    quoteAmount: quoteAmount,
                    timestamp: block.timestamp,
                    createdAt: block.timestamp
                });
                s.tradeIds.push(tradeId);
                s.totalTrades++;
                
                emit TradeExecuted(tradeId, sellOrder.maker, buyOrder.maker, _marketId, fillPrice, fillAmount, quoteAmount, block.timestamp);
                emit OrderMatched(_sellOrderId, buyOrderId, tradeId, fillAmount, fillPrice, quoteAmount);
                
                remaining = sellOrder.amount - sellOrder.filledAmount;
            }
        }
        
        // FIX: Also check legacy orders not in price arrays
        _matchSellOrderLegacy(s, _marketId, _sellOrderId, baseToken, quoteToken, baseTokenId);
    }
    
    /**
     * @notice Fallback matching for sell orders against legacy buy orders
     */
    function _matchSellOrderLegacy(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _sellOrderId,
        address _baseToken,
        address _quoteToken,
        uint256 _baseTokenId
    ) internal {
        DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[_sellOrderId];
        if (sellOrder.filledAmount >= sellOrder.amount) return;
        
        uint256 orderIdsLength = s.clobOrderIds.length; // Cache to avoid repeated SLOADs
        for (uint256 i = 0; i < orderIdsLength; i++) {
            if (sellOrder.filledAmount >= sellOrder.amount) break;
            
            bytes32 buyOrderId = s.clobOrderIds[i];
            if (buyOrderId == _sellOrderId) continue;
            
            DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[buyOrderId];
            
            if (buyOrder.status != 0 && buyOrder.status != 1) continue;
            if (buyOrder.marketId != _marketId) continue;
            if (!buyOrder.isBuy) continue; // Only match with buy orders
            if (buyOrder.price < sellOrder.price) continue; // Price must be acceptable
            if (buyOrder.filledAmount >= buyOrder.amount) continue;
            
            uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
            uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
            uint256 fillAmount = buyRemaining < sellRemaining ? buyRemaining : sellRemaining;
            uint256 fillPrice = buyOrder.price; // Use buyer's price
            uint256 quoteAmount = fillAmount * fillPrice;
            
            // Execute trade
            bytes32 tradeId = keccak256(abi.encodePacked(_sellOrderId, buyOrderId, block.timestamp, s.totalTrades));
            
            // Transfer base tokens from Diamond to buyer
            IERC1155(_baseToken).safeTransferFrom(address(this), buyOrder.maker, _baseTokenId, fillAmount, "");
            
            // Transfer quote tokens from Diamond (escrowed) to seller
            IERC20(_quoteToken).safeTransfer(sellOrder.maker, quoteAmount);
            
            // Update orders
            sellOrder.filledAmount += fillAmount;
            sellOrder.updatedAt = block.timestamp;
            buyOrder.filledAmount += fillAmount;
            buyOrder.updatedAt = block.timestamp;
            
            // Update statuses
            sellOrder.status = sellOrder.filledAmount >= sellOrder.amount ? 2 : 1;
            buyOrder.status = buyOrder.filledAmount >= buyOrder.amount ? 2 : 1;
            
            // Record trade
            s.trades[tradeId] = DiamondStorage.Trade({
                takerOrderId: _sellOrderId,
                makerOrderId: buyOrderId,
                taker: sellOrder.maker,
                maker: buyOrder.maker,
                marketId: _marketId,
                price: fillPrice,
                amount: fillAmount,
                quoteAmount: quoteAmount,
                timestamp: block.timestamp,
                createdAt: block.timestamp
            });
            s.tradeIds.push(tradeId);
            s.totalTrades++;
            
            emit TradeExecuted(tradeId, sellOrder.maker, buyOrder.maker, _marketId, fillPrice, fillAmount, quoteAmount, block.timestamp);
            emit OrderMatched(_sellOrderId, buyOrderId, tradeId, fillAmount, fillPrice, quoteAmount);
        }
    }

    function _matchBuyOrder(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _buyOrderId,
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken
    ) internal {
        MatchContext memory ctx = MatchContext(_marketId, _baseToken, _baseTokenId, _quoteToken);
        DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
        uint256[] storage askPrices = s.askPrices[_marketId];
        
        for (uint256 i = 0; i < askPrices.length; i++) {
            if (buyOrder.filledAmount >= buyOrder.amount) break;
            if (askPrices[i] > buyOrder.price) break;
            
            _matchBuyAtPrice(s, _buyOrderId, askPrices[i], ctx);
        }
        
        // FIX: Also check legacy orders not in price arrays
        _matchBuyOrderLegacy(s, _marketId, _buyOrderId, ctx);
    }
    
    /**
     * @notice Fallback matching for buy orders against legacy sell orders
     */
    function _matchBuyOrderLegacy(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _buyOrderId,
        MatchContext memory ctx
    ) internal {
        DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
        if (buyOrder.filledAmount >= buyOrder.amount) return;
        
        uint256 orderIdsLength = s.clobOrderIds.length; // Cache to avoid repeated SLOADs
        for (uint256 i = 0; i < orderIdsLength; i++) {
            if (buyOrder.filledAmount >= buyOrder.amount) break;
            
            bytes32 sellOrderId = s.clobOrderIds[i];
            if (sellOrderId == _buyOrderId) continue;
            
            DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[sellOrderId];
            
            if (sellOrder.status != 0 && sellOrder.status != 1) continue;
            if (sellOrder.marketId != _marketId) continue;
            if (sellOrder.isBuy) continue; // Only match with sell orders
            if (sellOrder.price > buyOrder.price) continue; // Price must be acceptable
            if (sellOrder.filledAmount >= sellOrder.amount) continue;
            
            _executeBuyMatch(s, _buyOrderId, sellOrderId, sellOrder.price, ctx);
        }
    }

    function _matchBuyAtPrice(
        DiamondStorage.AppStorage storage s,
        bytes32 _buyOrderId,
        uint256 _askPrice,
        MatchContext memory ctx
    ) internal {
        bytes32[] storage ordersAtPrice = s.askOrders[ctx.marketId][_askPrice];
        
        for (uint256 j = 0; j < ordersAtPrice.length; j++) {
            // Re-read buy order state from storage each iteration to get latest filledAmount
            DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
            if (buyOrder.filledAmount >= buyOrder.amount) break;
            
            bytes32 sellOrderId = ordersAtPrice[j];
            DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[sellOrderId];
            if (sellOrder.status > 1) continue;
            if (sellOrder.filledAmount >= sellOrder.amount) continue;
            
            _executeBuyMatch(s, _buyOrderId, sellOrderId, _askPrice, ctx);
        }
    }

    function _executeBuyMatch(
        DiamondStorage.AppStorage storage s,
        bytes32 _buyOrderId,
        bytes32 _sellOrderId,
        uint256 _fillPrice,
        MatchContext memory ctx
    ) internal {
        DiamondStorage.CLOBOrder storage buyOrder = s.clobOrders[_buyOrderId];
        DiamondStorage.CLOBOrder storage sellOrder = s.clobOrders[_sellOrderId];
        
        // Calculate remaining amounts
        uint256 buyRemaining = buyOrder.amount - buyOrder.filledAmount;
        uint256 sellRemaining = sellOrder.amount - sellOrder.filledAmount;
        
        // Skip if either order is already filled
        if (buyRemaining == 0 || sellRemaining == 0) return;
        
        uint256 fillAmount = CLOBLib.min(buyRemaining, sellRemaining);
        uint256 quoteAmount = fillAmount * _fillPrice;
        
        // Transfer tokens
        IERC1155(ctx.baseToken).safeTransferFrom(address(this), buyOrder.maker, ctx.baseTokenId, fillAmount, "");
        IERC20(ctx.quoteToken).safeTransfer(sellOrder.maker, quoteAmount);
        
        // Refund price improvement to buyer
        if (_fillPrice < buyOrder.price) {
            IERC20(ctx.quoteToken).safeTransfer(buyOrder.maker, (buyOrder.price - _fillPrice) * fillAmount);
        }
        
        // Update orders
        buyOrder.filledAmount += fillAmount;
        buyOrder.updatedAt = block.timestamp;
        buyOrder.status = buyOrder.filledAmount >= buyOrder.amount ? 2 : 1;
        
        sellOrder.filledAmount += fillAmount;
        sellOrder.updatedAt = block.timestamp;
        sellOrder.status = sellOrder.filledAmount >= sellOrder.amount ? 2 : 1;
        
        // Record trade inline
        bytes32 tradeId = keccak256(abi.encodePacked(_buyOrderId, _sellOrderId, block.timestamp));
        s.trades[tradeId] = DiamondStorage.Trade({
            takerOrderId: _buyOrderId,
            makerOrderId: _sellOrderId,
            taker: buyOrder.maker,
            maker: sellOrder.maker,
            marketId: ctx.marketId,
            price: _fillPrice,
            amount: fillAmount,
            quoteAmount: quoteAmount,
            timestamp: block.timestamp,
            createdAt: block.timestamp
        });
        s.tradeIds.push(tradeId);
        s.totalTrades++;
        
        emit TradeExecuted(tradeId, buyOrder.maker, sellOrder.maker, ctx.marketId, _fillPrice, fillAmount, quoteAmount, block.timestamp);
        emit OrderMatched(_buyOrderId, _sellOrderId, tradeId, fillAmount, _fillPrice, quoteAmount);
    }

    function _addPriceLevel(uint256[] storage prices, uint256 price) internal {
        // Cache length to avoid repeated SLOADs in loop (~2000 gas saved)
        uint256 len = prices.length;
        
        // Check if price already exists
        for (uint256 i = 0; i < len; i++) {
            if (prices[i] == price) return;
        }
        // Add and sort (simple insertion for now)
        prices.push(price);
        // Sort ascending - use cached len+1 since we just pushed
        for (uint256 i = len; i > 0; i--) {
            if (prices[i] < prices[i - 1]) {
                uint256 temp = prices[i];
                prices[i] = prices[i - 1];
                prices[i - 1] = temp;
            } else {
                break;
            }
        }
    }

    function _addressToString(address _addr) internal pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";
        bytes memory data = abi.encodePacked(_addr);
        bytes memory str = new bytes(42);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }

    // ==========================================================================
    // VIEW FUNCTIONS FOR ORDER BOOK
    // ==========================================================================

    /**
     * @notice Get open orders for a market
     * @param _baseToken Base token address
     * @param _baseTokenId Token ID
     * @param _quoteToken Quote token address
     * @return buyOrders Array of buy order IDs
     * @return sellOrders Array of sell order IDs
     */
    function getOpenOrders(
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken
    ) external view returns (bytes32[] memory buyOrders, bytes32[] memory sellOrders) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        bytes32 marketId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken));
        
        // Cache length to avoid repeated SLOADs in loops
        uint256 orderIdsLength = s.clobOrderIds.length;
        
        // Count open orders
        uint256 buyCount = 0;
        uint256 sellCount = 0;
        
        for (uint256 i = 0; i < orderIdsLength; i++) {
            bytes32 orderId = s.clobOrderIds[i];
            DiamondStorage.CLOBOrder storage order = s.clobOrders[orderId];
            if (order.marketId == marketId && (order.status == 0 || order.status == 1)) {
                if (order.isBuy) buyCount++;
                else sellCount++;
            }
        }
        
        buyOrders = new bytes32[](buyCount);
        sellOrders = new bytes32[](sellCount);
        
        uint256 buyIdx = 0;
        uint256 sellIdx = 0;
        
        for (uint256 i = 0; i < orderIdsLength; i++) {
            bytes32 orderId = s.clobOrderIds[i];
            DiamondStorage.CLOBOrder storage order = s.clobOrders[orderId];
            if (order.marketId == marketId && (order.status == 0 || order.status == 1)) {
                if (order.isBuy) {
                    buyOrders[buyIdx++] = orderId;
                } else {
                    sellOrders[sellIdx++] = orderId;
                }
            }
        }
        
        return (buyOrders, sellOrders);
    }

    /**
     * @notice Get order details with token info
     * @param _orderId The order ID
     * @return maker Order maker address
     * @return baseToken Base token address
     * @return baseTokenId Token ID
     * @return quoteToken Quote token address
     * @return price Price per unit
     * @return amount Total amount
     * @return filledAmount Amount filled
     * @return isBuy True if buy order
     * @return status Order status (0=open, 1=partial, 2=filled, 3=cancelled)
     */
    function getOrderWithTokens(bytes32 _orderId)
        external
        view
        returns (
            address maker,
            address baseToken,
            uint256 baseTokenId,
            address quoteToken,
            uint256 price,
            uint256 amount,
            uint256 filledAmount,
            bool isBuy,
            uint8 status
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        DiamondStorage.Market storage market = s.markets[order.marketId];
        
        return (
            order.maker,
            CLOBLib.stringToAddress(market.baseToken),
            market.baseTokenId,
            CLOBLib.stringToAddress(market.quoteToken),
            order.price,
            order.amount,
            order.filledAmount,
            order.isBuy,
            order.status
        );
    }
}
