// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title OrdersFacet
 * @notice Business logic facet for order management
 * @dev Combines AuSys order functionality
 */
contract OrdersFacet is AppStorage, Initializable {
    event OrderCreated(
        bytes32 indexed orderHash,
        address indexed buyer,
        uint256 price,
        uint256 amount
    );
    event OrderFulfilled(bytes32 indexed orderHash);
    event OrderCancelled(bytes32 indexed orderHash);
    event OrderStatusChanged(
        bytes32 indexed orderHash,
        string oldStatus,
        string newStatus
    );

    string constant STATUS_PENDING = 'pending';
    string constant STATUS_PARTIAL = 'partial';
    string constant STATUS_FILLED = 'filled';
    string constant STATUS_CANCELLED = 'cancelled';

    function initialize() public initializer {
        // Initialization if needed
    }

    function createOrder(
        bytes32 _orderHash,
        address _seller,
        uint256 _price,
        uint256 _amount
    ) external returns (bytes32) {
        // Generate order hash if not provided
        if (_orderHash == bytes32(0)) {
            _orderHash = keccak256(
                abi.encodePacked(msg.sender, _seller, _price, _amount, block.timestamp, s.totalOrders)
            );
        }

        // Create order
        s.orders[_orderHash] = Order({
            buyer: msg.sender,
            seller: _seller,
            orderHash: _orderHash,
            price: _price,
            amount: _amount,
            status: STATUS_PENDING,
            createdAt: block.timestamp
        });

        s.orderList.push(_orderHash);
        s.totalOrders++;

        emit OrderCreated(_orderHash, msg.sender, _price, _amount);

        return _orderHash;
    }

    function fulfillOrder(bytes32 _orderHash) external {
        require(
            s.orders[_orderHash].seller == msg.sender,
            'Not the seller'
        );
        require(
            keccak256(abi.encodePacked(s.orders[_orderHash].status)) ==
                keccak256(abi.encodePacked(STATUS_PENDING)),
            'Order not pending'
        );

        string memory oldStatus = s.orders[_orderHash].status;
        s.orders[_orderHash].status = STATUS_FILLED;

        emit OrderFulfilled(_orderHash);
        emit OrderStatusChanged(_orderHash, oldStatus, STATUS_FILLED);
    }

    function cancelOrder(bytes32 _orderHash) external {
        require(
            s.orders[_orderHash].buyer == msg.sender,
            'Not the buyer'
        );
        require(
            keccak256(abi.encodePacked(s.orders[_orderHash].status)) ==
                keccak256(abi.encodePacked(STATUS_PENDING)),
            'Order not pending'
        );

        string memory oldStatus = s.orders[_orderHash].status;
        s.orders[_orderHash].status = STATUS_CANCELLED;

        emit OrderCancelled(_orderHash);
        emit OrderStatusChanged(_orderHash, oldStatus, STATUS_CANCELLED);
    }

    function getOrder(bytes32 _orderHash)
        external
        view
        returns (
            address buyer,
            address seller,
            uint256 price,
            uint256 amount,
            string memory status,
            uint256 createdAt
        )
    {
        Order storage order = s.orders[_orderHash];
        return (
            order.buyer,
            order.seller,
            order.price,
            order.amount,
            order.status,
            order.createdAt
        );
    }

    function getOrderStatus(bytes32 _orderHash)
        external
        view
        returns (string memory)
    {
        return s.orders[_orderHash].status;
    }

    function getTotalOrders() external view returns (uint256) {
        return s.totalOrders;
    }

    function getOrdersByStatus(string memory _status)
        external
        view
        returns (bytes32[] memory)
    {
        // Simple implementation - in production, maintain a separate mapping
        uint256 count = 0;
        for (uint256 i = 0; i < s.orderList.length; i++) {
            if (
                keccak256(abi.encodePacked(s.orders[s.orderList[i]].status)) ==
                keccak256(abi.encodePacked(_status))
            ) {
                count++;
            }
        }

        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < s.orderList.length; i++) {
            if (
                keccak256(abi.encodePacked(s.orders[s.orderList[i]].status)) ==
                keccak256(abi.encodePacked(_status))
            ) {
                result[index] = s.orderList[i];
                index++;
            }
        }

        return result;
    }
}

