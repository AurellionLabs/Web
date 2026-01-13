// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title BridgeFacet
 * @notice Business logic facet for order bridging between CLOB and AuSys
 * @dev Combines OrderBridge functionality with full logistics and settlement
 */
contract BridgeFacet is Initializable {
    event UnifiedOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed clobOrderId,
        address buyer,
        address seller,
        address token,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );
    event TradeMatched(
        bytes32 indexed unifiedOrderId,
        bytes32 clobTradeId,
        bytes32 clobOrderId,
        address maker,
        uint256 price,
        uint256 amount
    );
    event LogisticsOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 ausysOrderId,
        bytes32[] journeyIds,
        uint256 bounty,
        address node
    );
    event JourneyStatusUpdated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed journeyId,
        uint8 phase
    );
    event OrderSettled(
        bytes32 indexed unifiedOrderId,
        address seller,
        uint256 sellerAmount,
        address driver,
        uint256 driverAmount
    );
    event BridgeOrderCancelled(
        bytes32 indexed unifiedOrderId,
        uint8 previousStatus
    );
    event BountyPaid(bytes32 indexed unifiedOrderId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    uint256 public constant BOUNTY_PERCENTAGE = 100; // 1%
    uint256 public constant PROTOCOL_FEE_PERCENTAGE = 50; // 0.5%

    address public feeRecipient;

    function initialize() public initializer {
        feeRecipient = LibDiamond.contractOwner();
    }

    function createUnifiedOrder(
        bytes32 _clobOrderId,
        address _sellerNode,
        uint256 _price,
        uint256 _quantity
    ) external returns (bytes32 unifiedOrderId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        unifiedOrderId = keccak256(
            abi.encodePacked(_clobOrderId, msg.sender, block.timestamp)
        );

        uint256 bounty = (_price * _quantity * BOUNTY_PERCENTAGE) / 10000;

        s.unifiedOrders[unifiedOrderId] = DiamondStorage.UnifiedOrder({
            clobOrderId: _clobOrderId,
            clobTradeId: bytes32(0),
            ausysOrderId: bytes32(0),
            buyer: msg.sender,
            seller: address(0),
            sellerNode: _sellerNode,
            token: address(0),
            tokenId: 0,
            tokenQuantity: _quantity,
            price: _price,
            bounty: bounty,
            status: 0,
            logisticsStatus: 0,
            createdAt: block.timestamp,
            matchedAt: 0,
            deliveredAt: 0,
            settledAt: 0
        });

        s.unifiedOrderIds.push(unifiedOrderId);
        s.totalUnifiedOrders++;

        emit UnifiedOrderCreated(
            unifiedOrderId,
            _clobOrderId,
            msg.sender,
            address(0),
            address(0),
            0,
            _quantity,
            _price
        );

        return unifiedOrderId;
    }

    function bridgeTradeToLogistics(
        bytes32 _unifiedOrderId,
        bytes32 _clobTradeId,
        bytes32 _ausysOrderId,
        address _seller,
        address _token,
        uint256 _tokenId
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(
            s.unifiedOrders[_unifiedOrderId].buyer == msg.sender ||
            LibDiamond.contractOwner() == msg.sender,
            'Not authorized'
        );
        require(s.unifiedOrders[_unifiedOrderId].status == 0, 'Order not in created status');

        DiamondStorage.UnifiedOrder storage order = s.unifiedOrders[_unifiedOrderId];
        order.clobTradeId = _clobTradeId;
        order.ausysOrderId = _ausysOrderId;
        order.seller = _seller;
        order.token = _token;
        order.tokenId = _tokenId;
        order.status = 1;
        order.matchedAt = block.timestamp;

        emit TradeMatched(
            _unifiedOrderId,
            _clobTradeId,
            order.clobOrderId,
            _seller,
            order.price,
            order.tokenQuantity
        );
    }

    function createLogisticsOrder(bytes32 _unifiedOrderId) external returns (bytes32 journeyId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(
            s.unifiedOrders[_unifiedOrderId].seller == msg.sender ||
            s.unifiedOrders[_unifiedOrderId].sellerNode == msg.sender,
            'Not seller or node'
        );
        require(s.unifiedOrders[_unifiedOrderId].status == 1, 'Order not bridged');

        journeyId = keccak256(
            abi.encodePacked(_unifiedOrderId, block.timestamp)
        );

        s.journeys[journeyId] = DiamondStorage.Journey({
            unifiedOrderId: _unifiedOrderId,
            driver: address(0),
            phase: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        s.orderJourneys[_unifiedOrderId].push(journeyId);
        s.totalJourneys[_unifiedOrderId]++;

        emit LogisticsOrderCreated(
            _unifiedOrderId,
            s.unifiedOrders[_unifiedOrderId].ausysOrderId,
            s.orderJourneys[_unifiedOrderId],
            s.unifiedOrders[_unifiedOrderId].bounty,
            s.unifiedOrders[_unifiedOrderId].sellerNode
        );
    }

    function updateJourneyStatus(bytes32 _journeyId, uint8 _phase) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(_phase <= 3, 'Invalid phase');
        require(
            s.journeys[_journeyId].driver == msg.sender ||
            LibDiamond.contractOwner() == msg.sender,
            'Not driver or owner'
        );

        DiamondStorage.Journey storage journey = s.journeys[_journeyId];
        bytes32 unifiedOrderId = journey.unifiedOrderId;

        journey.phase = _phase;
        journey.updatedAt = block.timestamp;

        emit JourneyStatusUpdated(unifiedOrderId, _journeyId, _phase);

        s.unifiedOrders[unifiedOrderId].logisticsStatus = _phase;

        if (_phase == 3) {
            s.unifiedOrders[unifiedOrderId].deliveredAt = block.timestamp;
        }
    }

    function settleOrder(bytes32 _unifiedOrderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.unifiedOrders[_unifiedOrderId].buyer == msg.sender, 'Not buyer');
        require(s.unifiedOrders[_unifiedOrderId].logisticsStatus == 3, 'Order not delivered');
        require(s.unifiedOrders[_unifiedOrderId].status == 1, 'Order not bridged');

        DiamondStorage.UnifiedOrder storage order = s.unifiedOrders[_unifiedOrderId];

        uint256 orderValue = order.price * order.tokenQuantity;
        uint256 protocolFee = (orderValue * PROTOCOL_FEE_PERCENTAGE) / 10000;
        uint256 bounty = order.bounty;
        uint256 sellerAmount = orderValue - protocolFee - bounty;

        order.status = 4;
        order.settledAt = block.timestamp;

        emit OrderSettled(_unifiedOrderId, order.seller, sellerAmount, address(0), bounty);
        emit BountyPaid(_unifiedOrderId, bounty);
    }

    function cancelUnifiedOrder(bytes32 _unifiedOrderId) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(
            s.unifiedOrders[_unifiedOrderId].buyer == msg.sender ||
            LibDiamond.contractOwner() == msg.sender,
            'Not authorized'
        );
        require(s.unifiedOrders[_unifiedOrderId].status == 0, 'Can only cancel created orders');

        uint8 previousStatus = s.unifiedOrders[_unifiedOrderId].status;
        s.unifiedOrders[_unifiedOrderId].status = 5;

        emit BridgeOrderCancelled(_unifiedOrderId, previousStatus);
    }

    function getUnifiedOrder(bytes32 _orderId)
        external
        view
        returns (
            bytes32 clobOrderId,
            bytes32 clobTradeId,
            bytes32 ausysOrderId,
            address buyer,
            address seller,
            address sellerNode,
            address token,
            uint256 tokenId,
            uint256 tokenQuantity,
            uint256 price,
            uint256 bounty,
            string memory status,
            uint8 logisticsStatus,
            uint256 createdAt,
            uint256 matchedAt,
            uint256 deliveredAt,
            uint256 settledAt
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.UnifiedOrder storage order = s.unifiedOrders[_orderId];
        return (
            order.clobOrderId,
            order.clobTradeId,
            order.ausysOrderId,
            order.buyer,
            order.seller,
            order.sellerNode,
            order.token,
            order.tokenId,
            order.tokenQuantity,
            order.price,
            order.bounty,
            order.status == 0
                ? 'Created'
                : order.status == 1
                ? 'Bridged'
                : order.status == 4
                ? 'Completed'
                : 'Cancelled',
            order.logisticsStatus,
            order.createdAt,
            order.matchedAt,
            order.deliveredAt,
            order.settledAt
        );
    }

    function getTotalUnifiedOrders() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalUnifiedOrders;
    }

    function setFeeRecipient(address _newRecipient) external {
        LibDiamond.enforceIsContractOwner();
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }
}
