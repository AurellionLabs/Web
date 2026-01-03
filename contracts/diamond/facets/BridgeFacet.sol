// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title BridgeFacet
 * @notice Business logic facet for order bridging between CLOB and AuSys
 * @dev Combines OrderBridge functionality
 */
contract BridgeFacet is AppStorage, Initializable {
    event UnifiedOrderCreated(
        bytes32 indexed orderId,
        address indexed buyer,
        bytes32 clobOrderId,
        uint256 price,
        uint256 amount
    );
    event OrderBridged(bytes32 indexed orderId, bytes32 clobOrderId);
    event LogisticsPhaseUpdated(
        bytes32 indexed orderId,
        string phase
    );
    event BountyPaid(bytes32 indexed orderId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage);

    enum LogisticsPhase {
        None,
        Pending,
        InTransit,
        Delivered,
        Completed
    }

    enum UnifiedOrderStatus {
        Created,
        Bridged,
        InTransit,
        Delivered,
        Completed,
        Cancelled
    }

    struct UnifiedOrder {
        address buyer;
        bytes32 clobOrderId;
        uint256 price;
        uint256 amount;
        UnifiedOrderStatus status;
        LogisticsPhase logisticsPhase;
        uint256 bountyAmount;
        address feeRecipient;
        uint256 createdAt;
    }

    mapping(bytes32 => UnifiedOrder) public unifiedOrders;
    bytes32[] public unifiedOrderIds;
    uint256 public totalOrders;

    // Fee configuration
    address public feeRecipient;
    uint256 public protocolFeePercentage; // Basis points
    uint256 public bountyPercentage; // Basis points

    // Location tracking
    struct Location {
        int256 lat;
        int256 lng;
    }

    mapping(bytes32 => Location) public startLocations;
    mapping(bytes32 => Location) public endLocations;

    function initialize() public initializer {
        feeRecipient = LibDiamond.contractOwner();
        protocolFeePercentage = 50; // 0.5%
        bountyPercentage = 100; // 1%
        s.clobAddress = address(0);
        s.ausysAddress = address(0);
        s.quoteTokenAddress = address(0);
    }

    function createUnifiedOrder(
        bytes32 _clobOrderId,
        uint256 _price,
        uint256 _amount,
        Location memory _startLocation,
        Location memory _endLocation
    ) external returns (bytes32 orderId) {
        // Generate unique order ID
        orderId = keccak256(
            abi.encodePacked(_clobOrderId, msg.sender, block.timestamp)
        );

        // Calculate fees
        uint256 bounty = (_price * _amount * bountyPercentage) / 10000;

        unifiedOrders[orderId] = UnifiedOrder({
            buyer: msg.sender,
            clobOrderId: _clobOrderId,
            price: _price,
            amount: _amount,
            status: UnifiedOrderStatus.Created,
            logisticsPhase: LogisticsPhase.None,
            bountyAmount: bounty,
            feeRecipient: feeRecipient,
            createdAt: block.timestamp
        });

        startLocations[orderId] = _startLocation;
        endLocations[orderId] = _endLocation;

        unifiedOrderIds.push(orderId);
        totalOrders++;

        emit UnifiedOrderCreated(orderId, msg.sender, _clobOrderId, _price, _amount);

        return orderId;
    }

    function bridgeOrder(bytes32 _orderId) external {
        require(
            unifiedOrders[_orderId].buyer == msg.sender,
            'Not the buyer'
        );
        require(
            unifiedOrders[_orderId].status == UnifiedOrderStatus.Created,
            'Order not in created status'
        );

        unifiedOrders[_orderId].status = UnifiedOrderStatus.Bridged;
        emit OrderBridged(_orderId, unifiedOrders[_orderId].clobOrderId);
    }

    function updateLogisticsPhase(bytes32 _orderId, LogisticsPhase _phase)
        external
    {
        require(
            unifiedOrders[_orderId].buyer == msg.sender ||
                unifiedOrders[_orderId].feeRecipient == msg.sender,
            'Not authorized'
        );

        LogisticsPhase oldPhase = unifiedOrders[_orderId].logisticsPhase;
        unifiedOrders[_orderId].logisticsPhase = _phase;

        emit LogisticsPhaseUpdated(
            _orderId,
            _phase == LogisticsPhase.None
                ? 'None'
                : _phase == LogisticsPhase.Pending
                ? 'Pending'
                : _phase == LogisticsPhase.InTransit
                ? 'InTransit'
                : _phase == LogisticsPhase.Delivered
                ? 'Delivered'
                : 'Completed'
        );
    }

    function completeOrder(bytes32 _orderId) external {
        require(
            unifiedOrders[_orderId].buyer == msg.sender,
            'Not the buyer'
        );
        require(
            unifiedOrders[_orderId].logisticsPhase == LogisticsPhase.Delivered,
            'Order not delivered'
        );

        unifiedOrders[_orderId].status = UnifiedOrderStatus.Completed;
        emit LogisticsPhaseUpdated(_orderId, 'Completed');
    }

    function cancelOrder(bytes32 _orderId) external {
        require(
            unifiedOrders[_orderId].buyer == msg.sender,
            'Not the buyer'
        );
        require(
            unifiedOrders[_orderId].status == UnifiedOrderStatus.Created ||
                unifiedOrders[_orderId].status == UnifiedOrderStatus.Bridged,
            'Cannot cancel in current status'
        );

        unifiedOrders[_orderId].status = UnifiedOrderStatus.Cancelled;
    }

    function getUnifiedOrder(bytes32 _orderId)
        external
        view
        returns (
            address buyer,
            bytes32 clobOrderId,
            uint256 price,
            uint256 amount,
            string memory status,
            string memory logisticsPhase,
            uint256 bountyAmount,
            uint256 createdAt
        )
    {
        UnifiedOrder storage order = unifiedOrders[_orderId];
        return (
            order.buyer,
            order.clobOrderId,
            order.price,
            order.amount,
            order.status == UnifiedOrderStatus.Created
                ? 'Created'
                : order.status == UnifiedOrderStatus.Bridged
                ? 'Bridged'
                : order.status == UnifiedOrderStatus.InTransit
                ? 'InTransit'
                : order.status == UnifiedOrderStatus.Delivered
                ? 'Delivered'
                : order.status == UnifiedOrderStatus.Completed
                ? 'Completed'
                : 'Cancelled',
            order.logisticsPhase == LogisticsPhase.None
                ? 'None'
                : order.logisticsPhase == LogisticsPhase.Pending
                ? 'Pending'
                : order.logisticsPhase == LogisticsPhase.InTransit
                ? 'InTransit'
                : order.logisticsPhase == LogisticsPhase.Delivered
                ? 'Delivered'
                : 'Completed',
            order.bountyAmount,
            order.createdAt
        );
    }

    function getTotalOrders() external view returns (uint256) {
        return totalOrders;
    }

    function setFeeRecipient(address _newRecipient) external {
        LibDiamond.enforceIsContractOwner();
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    function setProtocolFeePercentage(uint256 _newPercentage) external {
        LibDiamond.enforceIsContractOwner();
        uint256 oldPercentage = protocolFeePercentage;
        protocolFeePercentage = _newPercentage;
        emit FeePercentageUpdated(oldPercentage, _newPercentage);
    }

    function setBountyPercentage(uint256 _newPercentage) external {
        LibDiamond.enforceIsContractOwner();
        bountyPercentage = _newPercentage;
    }

    function setAddresses(
        address _clobAddress,
        address _ausysAddress,
        address _quoteTokenAddress
    ) external {
        LibDiamond.enforceIsContractOwner();
        s.clobAddress = _clobAddress;
        s.ausysAddress = _ausysAddress;
        s.quoteTokenAddress = _quoteTokenAddress;
    }
}

