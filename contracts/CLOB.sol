// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

using SafeERC20 for IERC20;

/**
 * @title CLOB - Central Limit Order Book
 * @notice On-chain order book for trading tokenized assets with price-time priority matching
 * @dev Supports limit orders, market orders, partial fills, and liquidity pool integration
 */
contract CLOB is ReentrancyGuard, ERC1155Holder, Ownable, Pausable {
    // =============================================================================
    // TYPES & CONSTANTS
    // =============================================================================

    enum OrderStatus {
        Open,       // Active, waiting for match
        PartialFill, // Partially filled, still active
        Filled,     // Completely filled
        Cancelled   // Cancelled by user
    }

    enum OrderType {
        Limit,      // Execute at specified price or better
        Market      // Execute immediately at best available price
    }

    struct Order {
        bytes32 id;
        address maker;
        address baseToken;      // Token being traded (ERC1155 address)
        uint256 baseTokenId;    // Token ID for ERC1155
        address quoteToken;     // Payment token (ERC20, e.g., USDT)
        uint256 price;          // Price per unit in quote token (wei)
        uint256 amount;         // Original order amount
        uint256 filledAmount;   // Amount already filled
        bool isBuy;             // true = buy order, false = sell order
        OrderType orderType;
        OrderStatus status;
        uint256 createdAt;
        uint256 updatedAt;
    }

    struct Trade {
        bytes32 id;
        bytes32 takerOrderId;
        bytes32 makerOrderId;
        address taker;
        address maker;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
        uint256 price;
        uint256 amount;
        uint256 quoteAmount;    // price * amount
        uint256 timestamp;
    }

    struct LiquidityPool {
        bytes32 id;
        address baseToken;
        uint256 baseTokenId;
        address quoteToken;
        uint256 baseReserve;
        uint256 quoteReserve;
        uint256 totalLpTokens;
        bool isActive;
    }

    struct LiquidityPosition {
        address provider;
        bytes32 poolId;
        uint256 lpTokens;
        uint256 depositedAt;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    // Order tracking
    mapping(bytes32 => Order) public orders;
    bytes32[] public orderIds;
    uint256 public orderIdCounter;

    // Trade tracking
    mapping(bytes32 => Trade) public trades;
    bytes32[] public tradeIds;
    uint256 public tradeIdCounter;

    // Order book: baseToken -> baseTokenId -> quoteToken -> isBuy -> price -> orderIds[]
    // Simplified: we track active orders by market pair
    mapping(bytes32 => bytes32[]) public buyOrders;  // marketId -> orderIds (sorted by price desc)
    mapping(bytes32 => bytes32[]) public sellOrders; // marketId -> orderIds (sorted by price asc)

    // Liquidity pools
    mapping(bytes32 => LiquidityPool) public pools;
    mapping(bytes32 => LiquidityPosition) public liquidityPositions; // poolId-provider -> position
    bytes32[] public poolIds;

    // Fee configuration (basis points, 100 = 1%)
    uint256 public takerFee = 30;  // 0.3%
    uint256 public makerFee = 10;  // 0.1%
    uint256 public lpFee = 25;     // 0.25% to LPs
    address public feeRecipient;

    // =============================================================================
    // EVENTS
    // =============================================================================

    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed maker,
        address indexed baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bool isBuy,
        OrderType orderType
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

    event OrderUpdated(
        bytes32 indexed orderId,
        OrderStatus newStatus,
        uint256 filledAmount,
        uint256 remainingAmount
    );

    event TradeExecuted(
        bytes32 indexed tradeId,
        address indexed taker,
        address indexed maker,
        address baseToken,
        uint256 baseTokenId,
        uint256 price,
        uint256 amount,
        uint256 quoteAmount,
        uint256 timestamp
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

    event PoolCreated(
        bytes32 indexed poolId,
        address indexed baseToken,
        uint256 baseTokenId,
        address indexed quoteToken
    );

    event FeesCollected(
        bytes32 indexed tradeId,
        uint256 takerFeeAmount,
        uint256 makerFeeAmount,
        uint256 lpFeeAmount
    );

    // =============================================================================
    // ERRORS
    // =============================================================================

    error InvalidAmount();
    error InvalidPrice();
    error InsufficientBalance();
    error OrderNotFound();
    error OrderNotOpen();
    error NotOrderOwner();
    error PoolNotFound();
    error PoolNotActive();
    error InsufficientLiquidity();
    error InvalidFeeConfiguration();

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }

    // =============================================================================
    // ORDER MANAGEMENT
    // =============================================================================

    /**
     * @notice Place a limit order on the order book
     * @param baseToken ERC1155 token address
     * @param baseTokenId Token ID for ERC1155
     * @param quoteToken ERC20 payment token address
     * @param price Price per unit in quote token
     * @param amount Amount of base tokens to trade
     * @param isBuy true for buy order, false for sell order
     */
    function placeLimitOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bool isBuy
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (amount == 0) revert InvalidAmount();
        if (price == 0) revert InvalidPrice();

        // Transfer tokens to escrow
        if (isBuy) {
            // Buyer deposits quote tokens (price * amount)
            uint256 totalCost = price * amount;
            IERC20(quoteToken).safeTransferFrom(msg.sender, address(this), totalCost);
        } else {
            // Seller deposits base tokens
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }

        bytes32 orderId = _createOrder(
            msg.sender,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            isBuy,
            OrderType.Limit
        );

        // Try to match immediately
        _matchOrder(orderId);

        return orderId;
    }

    /**
     * @notice Place a sell order on behalf of a node (tokens transferred from Diamond)
     * @dev Called by Diamond contract to place sell orders for node inventory.
     *      Diamond must have deposited tokens first via depositTokensToNode().
     *      The Diamond transfers actual ERC1155 tokens to CLOB escrow.
     * @param nodeOwner The node owner who initiated the sell (receives quote token proceeds)
     * @param baseToken ERC1155 token address
     * @param baseTokenId Token ID for ERC1155
     * @param quoteToken ERC20 payment token address
     * @param price Price per unit in quote token
     * @param amount Amount of base tokens to sell
     * @return orderId The created order ID
     */
    function placeNodeSellOrder(
        address nodeOwner,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (amount == 0) revert InvalidAmount();
        if (price == 0) revert InvalidPrice();

        // Transfer tokens from msg.sender (Diamond) to escrow
        // Diamond must have approved this contract and hold the tokens
        IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");

        // Create order with nodeOwner as the maker (so they receive proceeds)
        bytes32 orderId = _createOrder(
            nodeOwner,
            baseToken,
            baseTokenId,
            quoteToken,
            price,
            amount,
            false, // isBuy = false (sell order)
            OrderType.Limit
        );

        // Try to match immediately
        _matchOrder(orderId);

        return orderId;
    }

    /**
     * @notice Place a market order (execute immediately at best price)
     * @param baseToken ERC1155 token address
     * @param baseTokenId Token ID for ERC1155
     * @param quoteToken ERC20 payment token address
     * @param amount Amount of base tokens to trade
     * @param isBuy true for buy order, false for sell order
     * @param maxPrice Maximum price willing to pay (for buys) or minimum price (for sells)
     */
    function placeMarketOrder(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 amount,
        bool isBuy,
        uint256 maxPrice
    ) external nonReentrant whenNotPaused returns (bytes32) {
        if (amount == 0) revert InvalidAmount();

        // For market orders, we use maxPrice as the limit
        if (isBuy) {
            uint256 totalCost = maxPrice * amount;
            IERC20(quoteToken).safeTransferFrom(msg.sender, address(this), totalCost);
        } else {
            IERC1155(baseToken).safeTransferFrom(msg.sender, address(this), baseTokenId, amount, "");
        }

        bytes32 orderId = _createOrder(
            msg.sender,
            baseToken,
            baseTokenId,
            quoteToken,
            maxPrice,
            amount,
            isBuy,
            OrderType.Market
        );

        // Execute immediately
        _matchOrder(orderId);

        // Cancel any unfilled portion of market order
        Order storage order = orders[orderId];
        if (order.status == OrderStatus.Open || order.status == OrderStatus.PartialFill) {
            _cancelOrder(orderId);
        }

        return orderId;
    }

    /**
     * @notice Cancel an open order
     * @param orderId Order to cancel
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        Order storage order = orders[orderId];
        if (order.id == bytes32(0)) revert OrderNotFound();
        if (order.maker != msg.sender) revert NotOrderOwner();
        if (order.status != OrderStatus.Open && order.status != OrderStatus.PartialFill) {
            revert OrderNotOpen();
        }

        _cancelOrder(orderId);
    }

    // =============================================================================
    // LIQUIDITY POOL MANAGEMENT
    // =============================================================================

    /**
     * @notice Create a new liquidity pool for a trading pair
     */
    function createPool(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) external onlyOwner returns (bytes32) {
        bytes32 poolId = _getPoolId(baseToken, baseTokenId, quoteToken);

        if (pools[poolId].id != bytes32(0)) {
            return poolId; // Pool already exists
        }

        pools[poolId] = LiquidityPool({
            id: poolId,
            baseToken: baseToken,
            baseTokenId: baseTokenId,
            quoteToken: quoteToken,
            baseReserve: 0,
            quoteReserve: 0,
            totalLpTokens: 0,
            isActive: true
        });

        poolIds.push(poolId);

        emit PoolCreated(poolId, baseToken, baseTokenId, quoteToken);

        return poolId;
    }

    /**
     * @notice Add liquidity to a pool
     */
    function addLiquidity(
        bytes32 poolId,
        uint256 baseAmount,
        uint256 quoteAmount
    ) external nonReentrant whenNotPaused {
        LiquidityPool storage pool = pools[poolId];
        if (pool.id == bytes32(0)) revert PoolNotFound();
        if (!pool.isActive) revert PoolNotActive();
        if (baseAmount == 0 || quoteAmount == 0) revert InvalidAmount();

        // Transfer tokens
        IERC1155(pool.baseToken).safeTransferFrom(
            msg.sender,
            address(this),
            pool.baseTokenId,
            baseAmount,
            ""
        );
        IERC20(pool.quoteToken).safeTransferFrom(msg.sender, address(this), quoteAmount);

        // Calculate LP tokens to mint
        uint256 lpTokens;
        if (pool.totalLpTokens == 0) {
            lpTokens = _sqrt(baseAmount * quoteAmount);
        } else {
            uint256 lpFromBase = (baseAmount * pool.totalLpTokens) / pool.baseReserve;
            uint256 lpFromQuote = (quoteAmount * pool.totalLpTokens) / pool.quoteReserve;
            lpTokens = lpFromBase < lpFromQuote ? lpFromBase : lpFromQuote;
        }

        // Update pool reserves
        pool.baseReserve += baseAmount;
        pool.quoteReserve += quoteAmount;
        pool.totalLpTokens += lpTokens;

        // Update liquidity position
        bytes32 positionId = keccak256(abi.encodePacked(poolId, msg.sender));
        LiquidityPosition storage position = liquidityPositions[positionId];
        if (position.provider == address(0)) {
            position.provider = msg.sender;
            position.poolId = poolId;
            position.depositedAt = block.timestamp;
        }
        position.lpTokens += lpTokens;

        emit LiquidityAdded(poolId, msg.sender, baseAmount, quoteAmount, lpTokens);
    }

    /**
     * @notice Remove liquidity from a pool
     */
    function removeLiquidity(
        bytes32 poolId,
        uint256 lpTokens
    ) external nonReentrant {
        LiquidityPool storage pool = pools[poolId];
        if (pool.id == bytes32(0)) revert PoolNotFound();

        bytes32 positionId = keccak256(abi.encodePacked(poolId, msg.sender));
        LiquidityPosition storage position = liquidityPositions[positionId];
        if (position.lpTokens < lpTokens) revert InsufficientBalance();

        // Calculate tokens to return
        uint256 baseAmount = (lpTokens * pool.baseReserve) / pool.totalLpTokens;
        uint256 quoteAmount = (lpTokens * pool.quoteReserve) / pool.totalLpTokens;

        // Update pool reserves
        pool.baseReserve -= baseAmount;
        pool.quoteReserve -= quoteAmount;
        pool.totalLpTokens -= lpTokens;

        // Update position
        position.lpTokens -= lpTokens;

        // Transfer tokens back
        IERC1155(pool.baseToken).safeTransferFrom(
            address(this),
            msg.sender,
            pool.baseTokenId,
            baseAmount,
            ""
        );
        IERC20(pool.quoteToken).safeTransfer(msg.sender, quoteAmount);

        emit LiquidityRemoved(poolId, msg.sender, baseAmount, quoteAmount, lpTokens);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getOrder(bytes32 orderId) external view returns (Order memory) {
        return orders[orderId];
    }

    function getTrade(bytes32 tradeId) external view returns (Trade memory) {
        return trades[tradeId];
    }

    function getPool(bytes32 poolId) external view returns (LiquidityPool memory) {
        return pools[poolId];
    }

    function getLiquidityPosition(
        bytes32 poolId,
        address provider
    ) external view returns (LiquidityPosition memory) {
        bytes32 positionId = keccak256(abi.encodePacked(poolId, provider));
        return liquidityPositions[positionId];
    }

    function getMarketId(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(baseToken, baseTokenId, quoteToken));
    }

    function getBestBid(bytes32 marketId) external view returns (uint256 price, uint256 amount) {
        bytes32[] storage bids = buyOrders[marketId];
        for (uint256 i = 0; i < bids.length; i++) {
            Order storage order = orders[bids[i]];
            if (order.status == OrderStatus.Open || order.status == OrderStatus.PartialFill) {
                return (order.price, order.amount - order.filledAmount);
            }
        }
        return (0, 0);
    }

    function getBestAsk(bytes32 marketId) external view returns (uint256 price, uint256 amount) {
        bytes32[] storage asks = sellOrders[marketId];
        for (uint256 i = 0; i < asks.length; i++) {
            Order storage order = orders[asks[i]];
            if (order.status == OrderStatus.Open || order.status == OrderStatus.PartialFill) {
                return (order.price, order.amount - order.filledAmount);
            }
        }
        return (0, 0);
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    function setFees(
        uint256 _takerFee,
        uint256 _makerFee,
        uint256 _lpFee
    ) external onlyOwner {
        if (_takerFee + _makerFee > 1000) revert InvalidFeeConfiguration(); // Max 10%
        takerFee = _takerFee;
        makerFee = _makerFee;
        lpFee = _lpFee;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // =============================================================================
    // INTERNAL FUNCTIONS
    // =============================================================================

    function _createOrder(
        address maker,
        address baseToken,
        uint256 baseTokenId,
        address quoteToken,
        uint256 price,
        uint256 amount,
        bool isBuy,
        OrderType orderType
    ) internal returns (bytes32) {
        bytes32 orderId = keccak256(abi.encodePacked(orderIdCounter++, maker, block.timestamp));

        orders[orderId] = Order({
            id: orderId,
            maker: maker,
            baseToken: baseToken,
            baseTokenId: baseTokenId,
            quoteToken: quoteToken,
            price: price,
            amount: amount,
            filledAmount: 0,
            isBuy: isBuy,
            orderType: orderType,
            status: OrderStatus.Open,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        orderIds.push(orderId);

        // Add to order book
        bytes32 marketId = getMarketId(baseToken, baseTokenId, quoteToken);
        if (isBuy) {
            _insertSorted(buyOrders[marketId], orderId, true);
        } else {
            _insertSorted(sellOrders[marketId], orderId, false);
        }

        emit OrderPlaced(
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

        return orderId;
    }

    function _matchOrder(bytes32 orderId) internal {
        Order storage takerOrder = orders[orderId];
        bytes32 marketId = getMarketId(
            takerOrder.baseToken,
            takerOrder.baseTokenId,
            takerOrder.quoteToken
        );

        bytes32[] storage oppositeOrders = takerOrder.isBuy ? sellOrders[marketId] : buyOrders[marketId];

        uint256 remainingAmount = takerOrder.amount - takerOrder.filledAmount;

        for (uint256 i = 0; i < oppositeOrders.length && remainingAmount > 0; i++) {
            Order storage makerOrder = orders[oppositeOrders[i]];

            if (makerOrder.status != OrderStatus.Open && makerOrder.status != OrderStatus.PartialFill) {
                continue;
            }

            // Check price compatibility
            if (takerOrder.isBuy) {
                if (makerOrder.price > takerOrder.price) break; // No more matches
            } else {
                if (makerOrder.price < takerOrder.price) break; // No more matches
            }

            uint256 makerRemaining = makerOrder.amount - makerOrder.filledAmount;
            uint256 fillAmount = remainingAmount < makerRemaining ? remainingAmount : makerRemaining;

            if (fillAmount > 0) {
                _executeTrade(orderId, oppositeOrders[i], fillAmount, makerOrder.price);
                remainingAmount -= fillAmount;
            }
        }
    }

    function _executeTrade(
        bytes32 takerOrderId,
        bytes32 makerOrderId,
        uint256 fillAmount,
        uint256 price
    ) internal {
        Order storage takerOrder = orders[takerOrderId];
        Order storage makerOrder = orders[makerOrderId];

        bytes32 tradeId = keccak256(abi.encodePacked(tradeIdCounter++, block.timestamp));
        uint256 quoteAmount = price * fillAmount;

        // Update orders
        takerOrder.filledAmount += fillAmount;
        makerOrder.filledAmount += fillAmount;
        takerOrder.updatedAt = block.timestamp;
        makerOrder.updatedAt = block.timestamp;

        // Update statuses
        if (takerOrder.filledAmount >= takerOrder.amount) {
            takerOrder.status = OrderStatus.Filled;
        } else {
            takerOrder.status = OrderStatus.PartialFill;
        }

        if (makerOrder.filledAmount >= makerOrder.amount) {
            makerOrder.status = OrderStatus.Filled;
        } else {
            makerOrder.status = OrderStatus.PartialFill;
        }

        // Calculate fees
        uint256 takerFeeAmount = (quoteAmount * takerFee) / 10000;
        uint256 makerFeeAmount = (quoteAmount * makerFee) / 10000;

        // Transfer tokens
        if (takerOrder.isBuy) {
            // Taker is buying: send base tokens to taker, quote tokens to maker
            IERC1155(takerOrder.baseToken).safeTransferFrom(
                address(this),
                takerOrder.maker,
                takerOrder.baseTokenId,
                fillAmount,
                ""
            );
            IERC20(takerOrder.quoteToken).safeTransfer(makerOrder.maker, quoteAmount - makerFeeAmount);
        } else {
            // Taker is selling: send base tokens to maker, quote tokens to taker
            IERC1155(takerOrder.baseToken).safeTransferFrom(
                address(this),
                makerOrder.maker,
                takerOrder.baseTokenId,
                fillAmount,
                ""
            );
            IERC20(takerOrder.quoteToken).safeTransfer(takerOrder.maker, quoteAmount - takerFeeAmount);
        }

        // Collect fees
        if (takerFeeAmount + makerFeeAmount > 0) {
            IERC20(takerOrder.quoteToken).safeTransfer(
                feeRecipient,
                takerFeeAmount + makerFeeAmount
            );
        }

        // Create trade record
        trades[tradeId] = Trade({
            id: tradeId,
            takerOrderId: takerOrderId,
            makerOrderId: makerOrderId,
            taker: takerOrder.maker,
            maker: makerOrder.maker,
            baseToken: takerOrder.baseToken,
            baseTokenId: takerOrder.baseTokenId,
            quoteToken: takerOrder.quoteToken,
            price: price,
            amount: fillAmount,
            quoteAmount: quoteAmount,
            timestamp: block.timestamp
        });
        tradeIds.push(tradeId);

        emit OrderMatched(takerOrderId, makerOrderId, tradeId, fillAmount, price, quoteAmount);
        emit TradeExecuted(
            tradeId,
            takerOrder.maker,
            makerOrder.maker,
            takerOrder.baseToken,
            takerOrder.baseTokenId,
            price,
            fillAmount,
            quoteAmount,
            block.timestamp
        );
        emit FeesCollected(tradeId, takerFeeAmount, makerFeeAmount, 0);
        emit OrderUpdated(takerOrderId, takerOrder.status, takerOrder.filledAmount, takerOrder.amount - takerOrder.filledAmount);
        emit OrderUpdated(makerOrderId, makerOrder.status, makerOrder.filledAmount, makerOrder.amount - makerOrder.filledAmount);
    }

    function _cancelOrder(bytes32 orderId) internal {
        Order storage order = orders[orderId];
        uint256 remainingAmount = order.amount - order.filledAmount;

        order.status = OrderStatus.Cancelled;
        order.updatedAt = block.timestamp;

        // Return escrowed tokens
        if (remainingAmount > 0) {
            if (order.isBuy) {
                uint256 refundAmount = order.price * remainingAmount;
                IERC20(order.quoteToken).safeTransfer(order.maker, refundAmount);
            } else {
                IERC1155(order.baseToken).safeTransferFrom(
                    address(this),
                    order.maker,
                    order.baseTokenId,
                    remainingAmount,
                    ""
                );
            }
        }

        emit CLOBOrderCancelled(orderId, order.maker, remainingAmount);
        emit OrderUpdated(orderId, OrderStatus.Cancelled, order.filledAmount, 0);
    }

    function _getPoolId(
        address baseToken,
        uint256 baseTokenId,
        address quoteToken
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("pool", baseToken, baseTokenId, quoteToken));
    }

    function _insertSorted(bytes32[] storage arr, bytes32 orderId, bool descending) internal {
        Order storage newOrder = orders[orderId];
        uint256 i = 0;

        for (; i < arr.length; i++) {
            Order storage existingOrder = orders[arr[i]];
            if (descending) {
                if (newOrder.price > existingOrder.price) break;
            } else {
                if (newOrder.price < existingOrder.price) break;
            }
        }

        arr.push(orderId);
        for (uint256 j = arr.length - 1; j > i; j--) {
            arr[j] = arr[j - 1];
        }
        arr[i] = orderId;
    }

    function _sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}
