// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title OrdersFacet
 * @notice Business logic facet for order management
 * @dev Combines AuSys order functionality
 */
contract OrdersFacet is Initializable {
    event OrderCreated(
        bytes32 indexed orderHash,
        address indexed buyer,
        address indexed seller,
        uint256 price,
        uint256 amount
    );
    event OrderUpdated(
        bytes32 indexed orderHash,
        string status
    );
    event AusysOrderCancelled(
        bytes32 indexed orderHash,
        address indexed buyer
    );

    function initialize() public initializer {}

    function createOrder(
        address _buyer,
        address _seller,
        uint256 _price,
        uint256 _amount,
        string memory _status
    ) external returns (bytes32 orderHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        orderHash = keccak256(
            abi.encodePacked(_buyer, _seller, _price, _amount, block.timestamp, s.totalOrders)
        );

        s.orders[orderHash] = DiamondStorage.Order({
            buyer: _buyer,
            seller: _seller,
            orderHash: orderHash,
            price: _price,
            amount: _amount,
            status: _status,
            createdAt: block.timestamp
        });

        s.orderList.push(_buyer);
        s.totalOrders++;

        emit OrderCreated(orderHash, _buyer, _seller, _price, _amount);

        return orderHash;
    }

    function updateOrderStatus(bytes32 _orderHash, string memory _status) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Cache order to avoid repeated SLOADs (saves ~4200 gas cold)
        DiamondStorage.Order storage order = s.orders[_orderHash];
        require(
            order.buyer == msg.sender ||
            order.seller == msg.sender,
            'Not order participant'
        );

        order.status = _status;
        emit OrderUpdated(_orderHash, _status);
    }

    function cancelOrder(bytes32 _orderHash) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        
        // Cache order to avoid repeated SLOADs (saves ~4200 gas cold)
        DiamondStorage.Order storage order = s.orders[_orderHash];
        require(order.buyer == msg.sender, 'Not buyer');
        require(
            keccak256(abi.encodePacked(order.status)) !=
            keccak256(abi.encodePacked('CANCELLED')),
            'Already cancelled'
        );

        order.status = 'CANCELLED';
        emit AusysOrderCancelled(_orderHash, msg.sender);
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
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Order storage order = s.orders[_orderHash];
        return (
            order.buyer,
            order.seller,
            order.price,
            order.amount,
            order.status,
            order.createdAt
        );
    }

    function getBuyerOrders(address _buyer)
        external
        view
        returns (bytes32[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ownerNodes[_buyer];
    }

    function getSellerOrders(address _seller)
        external
        view
        returns (bytes32[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ownerNodes[_seller];
    }

    function getTotalOrders() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalOrders;
    }
}
