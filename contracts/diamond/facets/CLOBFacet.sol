// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title CLOBFacet
 * @notice Business logic facet for CLOB integration
 * @dev Combines CLOB interaction logic
 */
contract CLOBFacet is AppStorage, Initializable {
    event OrderPlaced(
        bytes32 indexed orderId,
        address indexed trader,
        bytes32 indexed marketId,
        uint256 price,
        uint256 amount,
        bool isBuy
    );
    event OrderFilled(
        bytes32 indexed orderId,
        bytes32 indexed matchOrderId,
        uint256 fillAmount
    );
    event OrderCancelled(bytes32 indexed orderId);
    event MarketCreated(bytes32 indexed marketId, string baseToken, string quoteToken);

    struct Market {
        string baseToken;
        string quoteToken;
        bool active;
    }

    struct CLOBOrder {
        address trader;
        bytes32 marketId;
        uint256 price;
        uint256 amount;
        uint256 filledAmount;
        bool isBuy;
        bool active;
        uint256 createdAt;
    }

    mapping(bytes32 => Market) public markets;
    bytes32[] public marketIds;
    uint256 public totalMarkets;

    mapping(bytes32 => CLOBOrder) public clobOrders;
    bytes32[] public clobOrderIds;
    uint256 public totalCLOBOrders;

    // Order book storage
    mapping(bytes32 => mapping(uint256 => bytes32[])) public bidOrders; // marketId => price => orderIds
    mapping(bytes32 => mapping(uint256 => bytes32[])) public askOrders; // marketId => price => orderIds
    mapping(bytes32 => uint256[]) public bidPrices; // marketId => sorted bid prices
    mapping(bytes32 => uint256[]) public askPrices; // marketId => sorted ask prices

    function initialize() public initializer {
        // Initialization if needed
    }

    function createMarket(
        bytes32 _marketId,
        string memory _baseToken,
        string memory _quoteToken
    ) external {
        LibDiamond.enforceIsContractOwner();
        require(
            !markets[_marketId].active,
            'Market already exists'
        );

        markets[_marketId] = Market({
            baseToken: _baseToken,
            quoteToken: _quoteToken,
            active: true
        });

        marketIds.push(_marketId);
        totalMarkets++;

        emit MarketCreated(_marketId, _baseToken, _quoteToken);
    }

    function placeOrder(
        bytes32 _marketId,
        uint256 _price,
        uint256 _amount,
        bool _isBuy
    ) external returns (bytes32 orderId) {
        require(markets[_marketId].active, 'Market not active');

        // Generate order ID
        orderId = keccak256(
            abi.encodePacked(
                msg.sender,
                _marketId,
                _price,
                _amount,
                _isBuy,
                block.timestamp
            )
        );

        // Create order
        clobOrders[orderId] = CLOBOrder({
            trader: msg.sender,
            marketId: _marketId,
            price: _price,
            amount: _amount,
            filledAmount: 0,
            isBuy: _isBuy,
            active: true,
            createdAt: block.timestamp
        });

        clobOrderIds.push(orderId);
        totalCLOBOrders++;

        // Add to order book
        if (_isBuy) {
            if (bidOrders[_marketId][_price].length == 0) {
                bidPrices[_marketId].push(_price);
            }
            bidOrders[_marketId][_price].push(orderId);
        } else {
            if (askOrders[_marketId][_price].length == 0) {
                askPrices[_marketId].push(_price);
            }
            askOrders[_marketId][_price].push(orderId);
        }

        emit OrderPlaced(orderId, msg.sender, _marketId, _price, _amount, _isBuy);

        // Try to match with opposite side
        matchOrders(_marketId, orderId);

        return orderId;
    }

    function matchOrders(bytes32 _marketId, bytes32 _orderId) internal {
        CLOBOrder storage order = clobOrders[_orderId];
        require(order.active, 'Order not active');

        bytes32[] storage oppositeOrders = order.isBuy
            ? askOrders[_marketId][order.price]
            : bidOrders[_marketId][order.price];

        for (uint256 i = 0; i < oppositeOrders.length && order.active; i++) {
            bytes32 matchOrderId = oppositeOrders[i];
            CLOBOrder storage matchOrder = clobOrders[matchOrderId];

            if (!matchOrder.active || matchOrder.filledAmount >= matchOrder.amount) {
                continue;
            }

            // Calculate fill amount
            uint256 orderRemaining = order.amount - order.filledAmount;
            uint256 matchRemaining = matchOrder.amount - matchOrder.filledAmount;
            uint256 fillAmount = orderRemaining < matchRemaining
                ? orderRemaining
                : matchRemaining;

            // Update orders
            order.filledAmount += fillAmount;
            matchOrder.filledAmount += fillAmount;

            emit OrderFilled(_orderId, matchOrderId, fillAmount);

            // Check if orders are fully filled
            if (order.filledAmount >= order.amount) {
                order.active = false;
                emit OrderCancelled(_orderId);
            }
            if (matchOrder.filledAmount >= matchOrder.amount) {
                matchOrder.active = false;
                emit OrderCancelled(matchOrderId);
            }
        }
    }

    function cancelOrder(bytes32 _orderId) external {
        require(
            clobOrders[_orderId].trader == msg.sender,
            'Not the order trader'
        );
        require(clobOrders[_orderId].active, 'Order not active');

        clobOrders[_orderId].active = false;
        emit OrderCancelled(_orderId);
    }

    function getOrder(bytes32 _orderId)
        external
        view
        returns (
            address trader,
            bytes32 marketId,
            uint256 price,
            uint256 amount,
            uint256 filledAmount,
            bool isBuy,
            bool active,
            uint256 createdAt
        )
    {
        CLOBOrder storage order = clobOrders[_orderId];
        return (
            order.trader,
            order.marketId,
            order.price,
            order.amount,
            order.filledAmount,
            order.isBuy,
            order.active,
            order.createdAt
        );
    }

    function getMarket(bytes32 _marketId)
        external
        view
        returns (
            string memory baseToken,
            string memory quoteToken,
            bool active
        )
    {
        Market storage market = markets[_marketId];
        return (market.baseToken, market.quoteToken, market.active);
    }

    function getBestBid(bytes32 _marketId) external view returns (uint256 price, uint256 amount) {
        uint256[] storage prices = bidPrices[_marketId];
        if (prices.length == 0) return (0, 0);

        // Get highest bid price
        uint256 bestPrice = 0;
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i] > bestPrice) {
                bestPrice = prices[i];
            }
        }

        if (bestPrice == 0) return (0, 0);

        // Calculate total amount at best price
        bytes32[] storage ordersAtPrice = bidOrders[_marketId][bestPrice];
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < ordersAtPrice.length; i++) {
            CLOBOrder storage order = clobOrders[ordersAtPrice[i]];
            if (order.active) {
                totalAmount += (order.amount - order.filledAmount);
            }
        }

        return (bestPrice, totalAmount);
    }

    function getBestAsk(bytes32 _marketId) external view returns (uint256 price, uint256 amount) {
        uint256[] storage prices = askPrices[_marketId];
        if (prices.length == 0) return (0, 0);

        // Get lowest ask price
        uint256 bestPrice = type(uint256).max;
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i] < bestPrice) {
                bestPrice = prices[i];
            }
        }

        if (bestPrice == type(uint256).max) return (0, 0);

        // Calculate total amount at best price
        bytes32[] storage ordersAtPrice = askOrders[_marketId][bestPrice];
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < ordersAtPrice.length; i++) {
            CLOBOrder storage order = clobOrders[ordersAtPrice[i]];
            if (order.active) {
                totalAmount += (order.amount - order.filledAmount);
            }
        }

        return (bestPrice, totalAmount);
    }

    function getTotalMarkets() external view returns (uint256) {
        return totalMarkets;
    }

    function getTotalCLOBOrders() external view returns (uint256) {
        return totalCLOBOrders;
    }
}

