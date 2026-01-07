// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import { IERC20 } from '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/**
 * @title CLOBFacet
 * @notice Business logic facet for CLOB integration
 * @dev Combines CLOB interaction logic with full order book, trades, and liquidity pools
 */
contract CLOBFacet is Initializable {
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
    event OrderCancelled(
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

    function placeOrder(
        bytes32 _marketId,
        uint256 _price,
        uint256 _amount,
        bool _isBuy,
        uint8 _orderType
    ) external returns (bytes32 orderId) {
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

        emit OrderPlaced(orderId, msg.sender, _marketId, _price, _amount, _isBuy, _orderType);

        matchOrders(s, _marketId, orderId);

        return orderId;
    }

    function matchOrders(
        DiamondStorage.AppStorage storage s,
        bytes32 _marketId,
        bytes32 _orderId
    ) internal {
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        require(order.status == 0 || order.status == 1, 'Order not matchable');

        uint256 orderRemaining = order.amount - order.filledAmount;

        for (uint256 i = 0; i < s.clobOrderIds.length && orderRemaining > 0; i++) {
            bytes32 matchOrderId = s.clobOrderIds[i];
            DiamondStorage.CLOBOrder storage matchOrder = s.clobOrders[matchOrderId];

            if (matchOrder.status != 0 && matchOrder.status != 1) continue;
            if (matchOrder.marketId != _marketId) continue;
            if (matchOrder.isBuy == order.isBuy) continue;
            if (order.isBuy && matchOrder.price > order.price) continue;
            if (!order.isBuy && matchOrder.price < order.price) continue;

            uint256 matchRemaining = matchOrder.amount - matchOrder.filledAmount;
            uint256 fillAmount = orderRemaining < matchRemaining ? orderRemaining : matchRemaining;

            bytes32 tradeId = keccak256(abi.encodePacked(_orderId, matchOrderId, block.timestamp));
            uint256 quoteAmount = fillAmount * order.price;

            s.trades[tradeId] = DiamondStorage.Trade({
                takerOrderId: _orderId,
                makerOrderId: matchOrderId,
                taker: order.maker,
                maker: matchOrder.maker,
                marketId: _marketId,
                price: order.price,
                amount: fillAmount,
                quoteAmount: quoteAmount,
                timestamp: block.timestamp,
                createdAt: block.timestamp
            });

            s.tradeIds.push(tradeId);
            s.totalTrades++;

            order.filledAmount += fillAmount;
            order.updatedAt = block.timestamp;
            matchOrder.filledAmount += fillAmount;
            matchOrder.updatedAt = block.timestamp;

            uint256 takerFee = (quoteAmount * TAKER_FEE) / 10000;
            uint256 makerFee = (quoteAmount * MAKER_FEE) / 10000;

            emit FeesCollected(tradeId, takerFee, makerFee, 0);
            emit TradeExecuted(tradeId, order.maker, matchOrder.maker, _marketId, order.price, fillAmount, quoteAmount, block.timestamp);
            emit OrderMatched(_orderId, matchOrderId, tradeId, fillAmount, order.price, quoteAmount);

            if (order.filledAmount >= order.amount) {
                order.status = 2;
            } else {
                order.status = 1;
            }

            if (matchOrder.filledAmount >= matchOrder.amount) {
                matchOrder.status = 2;
            } else {
                matchOrder.status = 1;
            }

            orderRemaining = order.amount - order.filledAmount;
        }
    }

    function cancelOrder(bytes32 _orderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.clobOrders[_orderId].maker == msg.sender, 'Not the order maker');
        require(s.clobOrders[_orderId].status == 0, 'Order not cancellable');

        s.clobOrders[_orderId].status = 3;
        s.clobOrders[_orderId].updatedAt = block.timestamp;

        uint256 remaining = s.clobOrders[_orderId].amount - s.clobOrders[_orderId].filledAmount;
        emit OrderCancelled(_orderId, msg.sender, remaining);
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

        lpTokens = sqrt(_baseAmount * _quoteAmount);

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

    function sqrt(uint256 x) internal pure returns (uint256) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        uint256 y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        return y;
    }

    // ==========================================================================
    // NODE SELL ORDER FUNCTIONS - Direct token-based orders from Diamond
    // ==========================================================================

    /**
     * @notice Place a sell order from node inventory (called by NodesFacet)
     * @dev Tokens should already be held by Diamond. This creates the order internally.
     * @param _nodeOwner The node owner who will receive proceeds
     * @param _baseToken The ERC1155 token contract address
     * @param _baseTokenId The token ID being sold
     * @param _quoteToken The payment token (USDC, AURA, etc.)
     * @param _price Price per unit in quote token (wei)
     * @param _amount Amount of tokens to sell
     * @return orderId The generated order ID
     */
    function placeNodeSellOrder(
        address _nodeOwner,
        address _baseToken,
        uint256 _baseTokenId,
        address _quoteToken,
        uint256 _price,
        uint256 _amount
    ) external returns (bytes32 orderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(_price > 0, 'Invalid price');
        require(_amount > 0, 'Invalid amount');
        
        // Generate market ID from token params
        bytes32 marketId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken));
        
        // Create or verify market exists
        if (!s.markets[marketId].active) {
            // Auto-create market for this token pair
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: _addressToString(_baseToken),
                baseTokenId: _baseTokenId,
                quoteToken: _addressToString(_quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
        }

        // Generate unique order ID
        orderId = keccak256(
            abi.encodePacked(_nodeOwner, marketId, _price, _amount, false, uint8(0), block.timestamp, s.totalCLOBOrders)
        );

        // Store order
        s.clobOrders[orderId] = DiamondStorage.CLOBOrder({
            maker: _nodeOwner,
            marketId: marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: false, // Sell order
            orderType: 0, // Limit
            status: 0, // Open
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.clobOrderIds.push(orderId);
        s.totalCLOBOrders++;
        
        // Add to ask orders at this price level
        s.askOrders[marketId][_price].push(orderId);
        _addPriceLevel(s.askPrices[marketId], _price);

        // Emit both events for indexer compatibility
        emit OrderPlaced(orderId, _nodeOwner, marketId, _price, _amount, false, 0);
        emit OrderPlacedWithTokens(orderId, _nodeOwner, _baseToken, _baseTokenId, _quoteToken, _price, _amount, false, 0);

        // Try to match with existing buy orders
        _matchSellOrder(s, marketId, orderId);

        return orderId;
    }

    /**
     * @notice Place a buy order for tokens
     * @dev Buyer must have approved Diamond to spend quote tokens
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
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(_price > 0, 'Invalid price');
        require(_amount > 0, 'Invalid amount');
        
        // Calculate total quote amount needed
        uint256 totalQuote = _price * _amount;
        
        // Transfer quote tokens from buyer to Diamond (escrow)
        IERC20(_quoteToken).transferFrom(msg.sender, address(this), totalQuote);
        
        // Generate market ID
        bytes32 marketId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken));
        
        // Create or verify market exists
        if (!s.markets[marketId].active) {
            s.markets[marketId] = DiamondStorage.Market({
                baseToken: _addressToString(_baseToken),
                baseTokenId: _baseTokenId,
                quoteToken: _addressToString(_quoteToken),
                active: true,
                createdAt: block.timestamp
            });
            s.marketIds.push(marketId);
            s.totalMarkets++;
        }

        // Generate unique order ID
        orderId = keccak256(
            abi.encodePacked(msg.sender, marketId, _price, _amount, true, uint8(0), block.timestamp, s.totalCLOBOrders)
        );

        // Store order
        s.clobOrders[orderId] = DiamondStorage.CLOBOrder({
            maker: msg.sender,
            marketId: marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: true,
            orderType: 0, // Limit
            status: 0, // Open
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.clobOrderIds.push(orderId);
        s.totalCLOBOrders++;
        
        // Add to bid orders at this price level
        s.bidOrders[marketId][_price].push(orderId);
        _addPriceLevel(s.bidPrices[marketId], _price);

        // Emit both events
        emit OrderPlaced(orderId, msg.sender, marketId, _price, _amount, true, 0);
        emit OrderPlacedWithTokens(orderId, msg.sender, _baseToken, _baseTokenId, _quoteToken, _price, _amount, true, 0);

        // Try to match with existing sell orders
        _matchBuyOrder(s, marketId, orderId, _baseToken, _baseTokenId, _quoteToken);

        return orderId;
    }

    /**
     * @notice Place a market order (executes immediately at best available price)
     * @dev For buy orders: buyer must approve Diamond to spend quote tokens
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
        require(_amount > 0, 'Invalid amount');
        require(_maxPrice > 0, 'Invalid max price');
        
        // Generate market ID
        bytes32 marketId = keccak256(abi.encodePacked(_baseToken, _baseTokenId, _quoteToken));
        
        // Ensure market exists
        _ensureMarketExists(marketId, _baseToken, _baseTokenId, _quoteToken);

        // Handle token transfers
        if (_isBuy) {
            uint256 maxCost = _maxPrice * _amount;
            IERC20(_quoteToken).transferFrom(msg.sender, address(this), maxCost);
        } else {
            IERC1155(_baseToken).safeTransferFrom(msg.sender, address(this), _baseTokenId, _amount, "");
        }

        // Create and store the order
        orderId = _createMarketOrder(marketId, _maxPrice, _amount, _isBuy);

        // Emit events
        emit OrderPlaced(orderId, msg.sender, marketId, _maxPrice, _amount, _isBuy, 1);
        emit OrderPlacedWithTokens(orderId, msg.sender, _baseToken, _baseTokenId, _quoteToken, _maxPrice, _amount, _isBuy, 1);

        // Execute and finalize
        _executeMarketOrder(orderId, marketId, _baseToken, _baseTokenId, _quoteToken, _amount, _isBuy, _maxPrice);

        return orderId;
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
        
        if (_isBuy) {
            _matchBuyOrder(s, _marketId, _orderId, _baseToken, _baseTokenId, _quoteToken);
            _refundUnusedQuote(_orderId, _quoteToken, _amount, _maxPrice);
        } else {
            _matchSellOrder(s, _marketId, _orderId);
            _returnUnsoldTokens(_orderId, _baseToken, _baseTokenId, _amount);
        }

        // Finalize order status
        DiamondStorage.CLOBOrder storage order = s.clobOrders[_orderId];
        order.status = order.filledAmount >= order.amount ? 2 : 3; // Filled or Cancelled
        order.updatedAt = block.timestamp;
    }

    function _refundUnusedQuote(
        bytes32 _orderId,
        address _quoteToken,
        uint256 _amount,
        uint256 _maxPrice
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 filled = s.clobOrders[_orderId].filledAmount;
        if (filled < _amount) {
            uint256 refund = _maxPrice * (_amount - filled);
            if (refund > 0) {
                IERC20(_quoteToken).transfer(msg.sender, refund);
            }
        }
    }

    function _returnUnsoldTokens(
        bytes32 _orderId,
        address _baseToken,
        uint256 _baseTokenId,
        uint256 _amount
    ) internal {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 unsold = _amount - s.clobOrders[_orderId].filledAmount;
        if (unsold > 0) {
            IERC1155(_baseToken).safeTransferFrom(address(this), msg.sender, _baseTokenId, unsold, "");
        }
    }

    /**
     * @notice Cancel an open order
     * @param _orderId The order to cancel
     */
    function cancelCLOBOrder(bytes32 _orderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
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
            address quoteToken = _stringToAddress(market.quoteToken);
            uint256 refundAmount = order.price * remaining;
            IERC20(quoteToken).transfer(msg.sender, refundAmount);
        }
        
        // If sell order, tokens stay in Diamond (node owner can withdraw via NodesFacet)
        
        emit OrderCancelled(_orderId, msg.sender, remaining);
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
        address baseToken = _stringToAddress(market.baseToken);
        address quoteToken = _stringToAddress(market.quoteToken);
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
                IERC20(quoteToken).transfer(sellOrder.maker, quoteAmount);
                
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
        
        uint256 fillAmount = _min(buyRemaining, sellRemaining);
        uint256 quoteAmount = fillAmount * _fillPrice;
        
        // Transfer tokens
        IERC1155(ctx.baseToken).safeTransferFrom(address(this), buyOrder.maker, ctx.baseTokenId, fillAmount, "");
        IERC20(ctx.quoteToken).transfer(sellOrder.maker, quoteAmount);
        
        // Refund price improvement to buyer
        if (_fillPrice < buyOrder.price) {
            IERC20(ctx.quoteToken).transfer(buyOrder.maker, (buyOrder.price - _fillPrice) * fillAmount);
        }
        
        // Update orders
        _updateOrderAfterFill(buyOrder, fillAmount);
        _updateOrderAfterFill(sellOrder, fillAmount);
        
        // Record and emit trade
        _recordTrade(s, _buyOrderId, _sellOrderId, _fillPrice, fillAmount, quoteAmount, ctx.marketId, buyOrder.maker, sellOrder.maker);
    }

    function _updateOrderAfterFill(DiamondStorage.CLOBOrder storage order, uint256 fillAmount) internal {
        order.filledAmount += fillAmount;
        order.updatedAt = block.timestamp;
        order.status = order.filledAmount >= order.amount ? 2 : 1;
    }

    function _recordTrade(
        DiamondStorage.AppStorage storage s,
        bytes32 _takerOrderId,
        bytes32 _makerOrderId,
        uint256 _price,
        uint256 _amount,
        uint256 _quoteAmount,
        bytes32 _marketId,
        address _taker,
        address _maker
    ) internal {
        bytes32 tradeId = keccak256(abi.encodePacked(_takerOrderId, _makerOrderId, block.timestamp));
        s.trades[tradeId] = DiamondStorage.Trade({
            takerOrderId: _takerOrderId,
            makerOrderId: _makerOrderId,
            taker: _taker,
            maker: _maker,
            marketId: _marketId,
            price: _price,
            amount: _amount,
            quoteAmount: _quoteAmount,
            timestamp: block.timestamp,
            createdAt: block.timestamp
        });
        s.tradeIds.push(tradeId);
        s.totalTrades++;
        
        emit TradeExecuted(tradeId, _taker, _maker, _marketId, _price, _amount, _quoteAmount, block.timestamp);
        emit OrderMatched(_takerOrderId, _makerOrderId, tradeId, _amount, _price, _quoteAmount);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function _addPriceLevel(uint256[] storage prices, uint256 price) internal {
        // Check if price already exists
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i] == price) return;
        }
        // Add and sort (simple insertion for now)
        prices.push(price);
        // Sort ascending
        for (uint256 i = prices.length - 1; i > 0; i--) {
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

    function _stringToAddress(string memory _str) internal pure returns (address) {
        bytes memory b = bytes(_str);
        require(b.length == 42, "Invalid address string");
        
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
        
        // Count open orders
        uint256 buyCount = 0;
        uint256 sellCount = 0;
        
        for (uint256 i = 0; i < s.clobOrderIds.length; i++) {
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
        
        for (uint256 i = 0; i < s.clobOrderIds.length; i++) {
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
            _stringToAddress(market.baseToken),
            market.baseTokenId,
            _stringToAddress(market.quoteToken),
            order.price,
            order.amount,
            order.filledAmount,
            order.isBuy,
            order.status
        );
    }
}
