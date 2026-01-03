// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

using SafeERC20 for IERC20;

contract OrderBridgeUpgradeable is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    enum UnifiedOrderStatus {
        None,
        PendingTrade,
        TradeMatched,
        LogisticsCreated,
        InTransit,
        Delivered,
        Settled,
        Cancelled
    }

    enum LogisticsPhase {
        None,
        Pending,
        InTransit,
        Delivered
    }

    struct Location {
        int256 lat;
        int256 lng;
    }

    struct ParcelData {
        Location startLocation;
        Location endLocation;
        string startName;
        string endName;
    }

    struct UnifiedOrder {
        bytes32 id;
        bytes32 clobOrderId;
        bytes32 clobTradeId;
        bytes32 ausysOrderId;
        bytes32[] journeyIds;
        address buyer;
        address seller;
        address sellerNode;
        address token;
        uint256 tokenId;
        uint256 tokenQuantity;
        uint256 price;
        uint256 bounty;
        ParcelData deliveryData;
        UnifiedOrderStatus status;
        LogisticsPhase logisticsStatus;
        uint256 createdAt;
        uint256 matchedAt;
        uint256 deliveredAt;
        uint256 settledAt;
    }

    address public clobAddress;
    address public ausysAddress;
    IERC20 public quoteToken;

    mapping(bytes32 => UnifiedOrder) public unifiedOrders;
    bytes32[] public unifiedOrderIds;
    uint256 public unifiedOrderCounter;

    mapping(bytes32 => bytes32) public clobTradeToUnifiedOrder;
    mapping(bytes32 => bytes32) public clobOrderToUnifiedOrder;

    mapping(address => bytes32[]) public buyerOrders;
    mapping(address => bytes32[]) public sellerOrders;

    uint256 public bountyPercentage = 200;
    uint256 public protocolFeePercentage = 25;
    address public feeRecipient;

    // Storage gap for future upgrades
    uint256[50] private __gap_storage_v1;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _clob,
        address _ausys,
        address _quoteToken,
        address _feeRecipient
    ) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();

        clobAddress = _clob;
        ausysAddress = _ausys;
        quoteToken = IERC20(_quoteToken);
        feeRecipient = _feeRecipient;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    error InvalidAddressUpgradeable();
    error InvalidAmountUpgradeable();
    error InvalidPriceUpgradeable();
    error InvalidFeeConfigurationUpgradeable();
    error OrderNotFoundUpgradeable();
    error NotOrderOwnerUpgradeable();
    error OrderNotOpenUpgradeable();
    error NotAuthorizedUpgradeable();

    event UnifiedOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed clobOrderId,
        address indexed buyer,
        address seller,
        address token,
        uint256 tokenId,
        uint256 quantity,
        uint256 price
    );

    event TradeMatched(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed clobTradeId,
        bytes32 clobOrderId,
        address maker,
        uint256 price,
        uint256 amount
    );

    event LogisticsOrderCreated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed ausysOrderId,
        bytes32[] journeyIds,
        uint256 bounty,
        address node
    );

    event JourneyStatusUpdated(
        bytes32 indexed unifiedOrderId,
        bytes32 indexed journeyId,
        uint8 phase
    );

    event OrderStatusUpdated(bytes32 indexed unifiedOrderId, uint8 status);

    event OrderSettled(
        bytes32 indexed unifiedOrderId,
        address indexed seller,
        uint256 sellerAmount,
        address indexed driver,
        uint256 driverAmount
    );

    event OrderCancelled(
        bytes32 indexed unifiedOrderId,
        uint8 previousStatus,
        uint256 refundedAmount
    );

    function createUnifiedOrder(
        bytes32 clobOrderId,
        address sellerNode,
        ParcelData calldata deliveryData
    ) external nonReentrant returns (bytes32 unifiedOrderId) {
        if (sellerNode == address(0)) revert InvalidAddressUpgradeable();

        unifiedOrderId = _generateUnifiedOrderId();
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];

        order.id = unifiedOrderId;
        order.clobOrderId = clobOrderId;
        order.buyer = msg.sender;
        order.sellerNode = sellerNode;
        order.deliveryData = deliveryData;
        order.status = UnifiedOrderStatus.PendingTrade;
        order.logisticsStatus = LogisticsPhase.None;
        order.createdAt = block.timestamp;

        unifiedOrderIds.push(unifiedOrderId);
        clobOrderToUnifiedOrder[clobOrderId] = unifiedOrderId;
        buyerOrders[msg.sender].push(unifiedOrderId);

        emit UnifiedOrderCreated(
            unifiedOrderId,
            clobOrderId,
            msg.sender,
            address(0),
            address(0),
            0,
            0,
            0
        );

        return unifiedOrderId;
    }

    function bridgeTradeToLogistics(bytes32 unifiedOrderId) external nonReentrant {
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];
        if (order.id == bytes32(0)) revert OrderNotFoundUpgradeable();
        if (order.status != UnifiedOrderStatus.PendingTrade) revert OrderNotOpenUpgradeable();
        if (msg.sender != order.buyer && msg.sender != owner()) revert NotAuthorizedUpgradeable();

        order.status = UnifiedOrderStatus.TradeMatched;
        order.matchedAt = block.timestamp;

        _createAusysLogisticsOrder(order);

        emit TradeMatched(
            unifiedOrderId,
            bytes32(0),
            order.clobOrderId,
            address(0),
            0,
            0
        );
    }

    function cancelUnifiedOrder(bytes32 unifiedOrderId) external nonReentrant {
        UnifiedOrder storage order = unifiedOrders[unifiedOrderId];
        if (order.id == bytes32(0)) revert OrderNotFoundUpgradeable();
        if (msg.sender != order.buyer && msg.sender != owner()) revert NotAuthorizedUpgradeable();

        UnifiedOrderStatus previousStatus = order.status;

        if (previousStatus == UnifiedOrderStatus.PendingTrade) {
            order.status = UnifiedOrderStatus.Cancelled;
            emit OrderCancelled(unifiedOrderId, uint8(previousStatus), 0);
        } else {
            revert OrderNotOpenUpgradeable();
        }
    }

    function getUnifiedOrder(bytes32 unifiedOrderId) external view returns (UnifiedOrder memory) {
        return unifiedOrders[unifiedOrderId];
    }

    function getBuyerOrders(address buyer) external view returns (bytes32[] memory) {
        return buyerOrders[buyer];
    }

    function getSellerOrders(address seller) external view returns (bytes32[] memory) {
        return sellerOrders[seller];
    }

    function setBountyPercentage(uint256 _percentage) external onlyOwner {
        if (_percentage > 1000) revert InvalidFeeConfigurationUpgradeable();
        bountyPercentage = _percentage;
    }

    function setProtocolFeePercentage(uint256 _percentage) external onlyOwner {
        if (_percentage > 1000) revert InvalidFeeConfigurationUpgradeable();
        protocolFeePercentage = _percentage;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddressUpgradeable();
        feeRecipient = _recipient;
    }

    function updateClobAddress(address _clob) external onlyOwner {
        clobAddress = _clob;
    }

    function updateAusysAddress(address _ausys) external onlyOwner {
        ausysAddress = _ausys;
    }

    function _generateUnifiedOrderId() internal returns (bytes32) {
        return keccak256(abi.encode(++unifiedOrderCounter, block.timestamp, msg.sender));
    }

    function _createAusysLogisticsOrder(UnifiedOrder storage order) internal {
        order.ausysOrderId = keccak256(abi.encode(order.id, block.timestamp));
        order.status = UnifiedOrderStatus.LogisticsCreated;
        order.logisticsStatus = LogisticsPhase.Pending;

        sellerOrders[order.sellerNode].push(order.id);

        emit LogisticsOrderCreated(
            order.id,
            order.ausysOrderId,
            order.journeyIds,
            order.bounty,
            order.sellerNode
        );
    }
}

