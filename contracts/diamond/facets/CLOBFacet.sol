// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title CLOBFacet
 * @notice Business logic facet for CLOB integration
 * @dev Combines CLOB interaction logic with full order book, trades, and liquidity pools
 */
contract CLOBFacet is Initializable {
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed maker,
        bytes32 indexed marketId,
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
}
