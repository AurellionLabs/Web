// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.28;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

using SafeERC20 for IERC20;

error NotJourneyParticipantUpgradeable();
error JourneyNotInProgressUpgradeable();
error JourneyNotPendingUpgradeable();
error JourneyIncompleteUpgradeable();
error AlreadySettledUpgradeable();
error DriverNotSignedUpgradeable();
error SenderNotSignedUpgradeable();
error ReceiverNotSignedUpgradeable();
error InvalidAddressUpgradeable();
error InvalidAmountUpgradeable();
error InvalidETAUpgradeable();
error QuantityExceedsRequestedUpgradeable();
error InvalidNodeUpgradeable();
error RewardAlreadyPaidUpgradeable();
error DriverMaxAssignmentUpgradeable();
error InvalidCallerUpgradeable();

contract AuSysUpgradeable is
    Initializable,
    ReentrancyGuardUpgradeable,
    ERC1155HolderUpgradeable,
    OwnableUpgradeable,
    AccessControlUpgradeable
{
    // Journey status
    enum JourneyStatus {
        Pending,
        InTransit,
        Delivered,
        Canceled
    }

    // Order status
    enum OrderStatus {
        Created,
        Processing,
        Settled,
        Canceled
    }

    struct Location {
        string lat;
        string lng;
    }

    struct ParcelData {
        Location startLocation;
        Location endLocation;
        string startName;
        string endName;
    }

    struct Order {
        bytes32 id;
        address token;
        uint256 tokenId;
        uint256 tokenQuantity;
        uint256 price;
        uint256 txFee;
        address buyer;
        address seller;
        bytes32[] journeyIds;
        address[] nodes;
        ParcelData locationData;
        OrderStatus currentStatus;
        bytes32 contractualAgreement;
    }

    struct Journey {
        ParcelData parcelData;
        bytes32 journeyId;
        JourneyStatus currentStatus;
        address sender;
        address receiver;
        address driver;
        uint256 journeyStart;
        uint256 journeyEnd;
        uint256 bounty;
        uint256 ETA;
    }

    IERC20 public payToken;
    address public nodeManagerAddress;

    bytes32[] public orderIds;
    mapping(bytes32 => Order) public idToOrder;
    mapping(bytes32 => bytes32) public journeyToOrderId;
    mapping(address => bytes32[]) public driverToJourneyId;
    mapping(bytes32 => Journey) public idToJourney;
    mapping(address => mapping(bytes32 => bool)) public customerHandOff;
    mapping(address => mapping(bytes32 => bool)) public driverPickupSigned;
    mapping(address => mapping(bytes32 => bool)) public driverDeliverySigned;
    mapping(bytes32 => bool) public rewardPaid;

    bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
    bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
    bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');

    uint256 public journeyIdCounter;
    uint256 public orderIdCounter;

    // Storage gap for future upgrades
    uint256[50] private __gap_storage_v1;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _payToken) public initializer {
        __ReentrancyGuard_init();
        __ERC1155Holder_init();
        __Ownable_init();
        __AccessControl_init();

        payToken = IERC20(_payToken);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier customerDriverCheck(bytes32 id) {
        Journey storage J = idToJourney[id];
        if (
            !(msg.sender == J.sender ||
                msg.sender == J.driver ||
                msg.sender == J.receiver)
        ) revert NotJourneyParticipantUpgradeable();
        _;
    }

    modifier isInProgress(bytes32 id) {
        if (idToJourney[id].currentStatus != JourneyStatus.InTransit)
            revert JourneyNotInProgressUpgradeable();
        _;
    }

    modifier isPending(bytes32 id) {
        if (idToJourney[id].currentStatus != JourneyStatus.Pending)
            revert JourneyNotPendingUpgradeable();
        _;
    }

    modifier isCompleted(bytes32 id) {
        if (idToJourney[id].currentStatus != JourneyStatus.Delivered)
            revert JourneyIncompleteUpgradeable();
        _;
    }

    function setNodeManager(address _nodeManager) public onlyOwner {
        nodeManagerAddress = _nodeManager;
    }

    function setAdmin(address admin) public onlyOwner {
        _grantRole(ADMIN_ROLE, admin);
        emit AdminSet(admin);
    }

    function revokeAdmin(address admin) public onlyOwner {
        _revokeRole(ADMIN_ROLE, admin);
    }

    function setDriver(address driver, bool enable) public onlyRole(ADMIN_ROLE) {
        if (enable) _grantRole(DRIVER_ROLE, driver);
        else _revokeRole(DRIVER_ROLE, driver);
    }

    function setDispatcher(address dispatcher, bool enable) public onlyRole(ADMIN_ROLE) {
        if (enable) _grantRole(DISPATCHER_ROLE, dispatcher);
        else _revokeRole(DISPATCHER_ROLE, dispatcher);
    }

    function getHashedJourneyId() private returns (bytes32) {
        return keccak256(abi.encode(journeyIdCounter += 1));
    }

    function getHashedOrderId() private returns (bytes32) {
        return keccak256(abi.encode(orderIdCounter += 1));
    }

    event AdminSet(address indexed admin);
    event emitSig(address indexed user, bytes32 indexed id);
    event OrderSettled(bytes32 indexed orderId);
    event OrderStatusUpdated(bytes32 indexed orderId, OrderStatus newStatus);
    event JourneyStatusUpdated(bytes32 indexed journeyId, JourneyStatus newStatus);
    event JourneyCanceled(bytes32 indexed journeyId, address indexed sender, uint256 refundedAmount);
    event FundsEscrowed(address indexed from, uint256 amount);
    event FundsRefunded(address indexed to, uint256 amount);
    event DriverAssigned(address indexed driver, bytes32 indexed journeyId);
    event SellerPaid(address indexed seller, uint256 amount);
    event NodeFeeDistributed(address indexed node, uint256 amount);

    function getjourney(bytes32 id) public view returns (Journey memory) {
        return idToJourney[id];
    }

    function assignDriverToJourneyId(address driver, bytes32 journeyID) public {
        if (!hasRole(DRIVER_ROLE, driver)) revert InvalidCallerUpgradeable();
        bool callerAuthorized = (msg.sender == driver ||
            hasRole(DISPATCHER_ROLE, msg.sender) ||
            msg.sender == idToJourney[journeyID].sender);
        if (!callerAuthorized) revert InvalidCallerUpgradeable();
        if (driverToJourneyId[driver].length >= 10) revert DriverMaxAssignmentUpgradeable();
        driverToJourneyId[driver].push(journeyID);
        idToJourney[journeyID].driver = driver;
        emit DriverAssigned(driver, journeyID);
    }

    function packageSign(bytes32 id) public customerDriverCheck(id) {
        Journey storage J = idToJourney[id];
        if (msg.sender == J.sender) {
            customerHandOff[J.sender][id] = true;
            emit emitSig(J.sender, id);
        } else if (msg.sender == J.receiver) {
            customerHandOff[J.receiver][id] = true;
            emit emitSig(J.receiver, id);
        } else if (msg.sender == J.driver) {
            if (J.currentStatus == JourneyStatus.Pending) {
                driverPickupSigned[J.driver][id] = true;
            } else if (J.currentStatus == JourneyStatus.InTransit) {
                driverDeliverySigned[J.driver][id] = true;
            }
            emit emitSig(J.driver, id);
        }
    }

    function generateReward(bytes32 id) internal isCompleted(id) {
        if (rewardPaid[id]) revert RewardAlreadyPaidUpgradeable();
        rewardPaid[id] = true;
        Journey storage J = idToJourney[id];
        payToken.safeTransfer(J.driver, J.bounty);
    }

    function handOn(bytes32 id) public customerDriverCheck(id) isPending(id) nonReentrant returns (bool) {
        Journey storage J = idToJourney[id];
        if (!driverPickupSigned[J.driver][id]) revert DriverNotSignedUpgradeable();
        if (!customerHandOff[J.sender][id]) revert SenderNotSignedUpgradeable();
        J.journeyStart = block.timestamp;
        customerHandOff[J.sender][id] = false;
        J.currentStatus = JourneyStatus.InTransit;
        emit JourneyStatusUpdated(id, JourneyStatus.InTransit);

        Order storage O = idToOrder[journeyToOrderId[id]];
        if (O.currentStatus == OrderStatus.Created) {
            O.currentStatus = OrderStatus.Processing;
            emit OrderStatusUpdated(journeyToOrderId[id], OrderStatus.Processing);
        }

        if (J.sender == O.seller) {
            IERC1155(O.token).safeTransferFrom(O.seller, address(this), O.tokenId, O.tokenQuantity, '0x');
        }
        emit JourneyStatusUpdated(id, J.currentStatus);
        return true;
    }

    function handOff(bytes32 id) public isInProgress(id) customerDriverCheck(id) nonReentrant returns (bool) {
        Journey storage J = idToJourney[id];
        Order storage O = idToOrder[journeyToOrderId[id]];
        if (O.currentStatus == OrderStatus.Settled) revert AlreadySettledUpgradeable();
        if (!driverDeliverySigned[J.driver][id]) revert DriverNotSignedUpgradeable();
        if (!customerHandOff[J.receiver][id]) revert ReceiverNotSignedUpgradeable();
        J.currentStatus = JourneyStatus.Delivered;
        J.journeyEnd = block.timestamp;
        emit JourneyStatusUpdated(id, JourneyStatus.Delivered);
        generateReward(id);

        if (J.receiver == O.buyer) {
            O.currentStatus = OrderStatus.Settled;
            emit OrderStatusUpdated(journeyToOrderId[id], OrderStatus.Settled);

            IERC1155(O.token).safeTransferFrom(address(this), O.buyer, O.tokenId, O.tokenQuantity, '0x');
            payToken.safeTransfer(O.seller, O.price);
            emit SellerPaid(O.seller, O.price);
            if (O.nodes.length > 0) {
                uint256 nodeCount = O.nodes.length;
                uint256 nodeReward = O.txFee / nodeCount;
                uint256 remainder = O.txFee - (nodeReward * nodeCount);
                for (uint256 i = 0; i < nodeCount; i++) {
                    uint256 amount = nodeReward + (i == 0 ? remainder : 0);
                    payToken.safeTransfer(O.nodes[i], amount);
                    emit NodeFeeDistributed(O.nodes[i], amount);
                }
            }
            emit OrderSettled(journeyToOrderId[id]);
        }
        return true;
    }

    event JourneyCreated(bytes32 indexed journeyId, address indexed sender, address indexed receiver);
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed seller,
        address token,
        uint256 tokenId,
        uint256 tokenQuantity,
        uint256 requestedTokenQuantity,
        uint256 price,
        uint256 txFee,
        uint8 currentStatus,
        address[] nodes,
        ParcelData locationData
    );

    function journeyCreation(
        address sender,
        address receiver,
        ParcelData memory _data,
        uint256 bounty,
        uint256 ETA
    ) public nonReentrant {
        if (msg.sender != receiver && !hasRole(ADMIN_ROLE, msg.sender))
            revert InvalidCallerUpgradeable();
        if (sender == address(0) || receiver == address(0)) revert InvalidAddressUpgradeable();
        if (bounty == 0) revert InvalidAmountUpgradeable();
        if (ETA <= block.timestamp) revert InvalidETAUpgradeable();

        Journey memory journey = Journey({
            parcelData: _data,
            journeyId: getHashedJourneyId(),
            currentStatus: JourneyStatus.Pending,
            sender: sender,
            driver: address(0),
            receiver: receiver,
            journeyStart: 0,
            journeyEnd: 0,
            bounty: bounty,
            ETA: ETA
        });
        idToJourney[journey.journeyId] = journey;
        payToken.safeTransferFrom(receiver, address(this), bounty);
        emit FundsEscrowed(receiver, bounty);
        emit JourneyCreated(journey.journeyId, sender, receiver);
    }

    function orderJourneyCreation(
        bytes32 orderId,
        address sender,
        address receiver,
        ParcelData memory _data,
        uint256 bounty,
        uint256 ETA,
        uint256 tokenQuantity,
        uint256 assetId
    ) public {
        Order storage O = idToOrder[orderId];

        bool isValidNode = true; // Simplified for upgradeable version
        bool isBuyer = receiver == O.buyer;
        if (!isValidNode && !isBuyer) revert InvalidNodeUpgradeable();

        if (msg.sender != O.buyer && !hasRole(ADMIN_ROLE, msg.sender))
            revert InvalidCallerUpgradeable();
        if (ETA <= block.timestamp) revert InvalidETAUpgradeable();
        if (tokenQuantity == 0) revert InvalidAmountUpgradeable();

        Journey memory journey = Journey({
            parcelData: _data,
            journeyId: getHashedJourneyId(),
            currentStatus: JourneyStatus.Pending,
            sender: sender,
            driver: address(0),
            receiver: receiver,
            journeyStart: 0,
            journeyEnd: 0,
            bounty: bounty,
            ETA: ETA
        });
        payToken.safeTransferFrom(O.buyer, address(this), bounty);
        emit FundsEscrowed(O.buyer, bounty);
        idToJourney[journey.journeyId] = journey;
        idToOrder[orderId].journeyIds.push(journey.journeyId);
        if (idToOrder[orderId].currentStatus == OrderStatus.Created) {
            idToOrder[orderId].currentStatus = OrderStatus.Created;
        }
        journeyToOrderId[journey.journeyId] = orderId;
        idToOrder[orderId].tokenQuantity += tokenQuantity;
        emit JourneyCreated(journey.journeyId, sender, receiver);
    }

    function orderCreation(Order memory order) public nonReentrant returns (bytes32) {
        if (
            order.buyer == address(0) ||
            order.seller == address(0) ||
            order.token == address(0)
        ) revert InvalidAddressUpgradeable();
        if (order.price == 0) revert InvalidAmountUpgradeable();
        if (order.buyer == order.seller) revert InvalidAddressUpgradeable();
        if (order.tokenQuantity == 0) revert InvalidAmountUpgradeable();

        bytes32 id = getHashedOrderId();
        idToOrder[id] = order;
        idToOrder[id].currentStatus = OrderStatus.Created;
        idToOrder[id].id = id;
        idToOrder[id].txFee = (order.price * 2) / 100;
        orderIds.push(id);
        payToken.safeTransferFrom(order.buyer, address(this), order.price + idToOrder[id].txFee);
        emit FundsEscrowed(order.buyer, order.price + idToOrder[id].txFee);
        emit OrderCreated(
            id,
            order.buyer,
            order.seller,
            order.token,
            order.tokenId,
            order.tokenQuantity,
            order.tokenQuantity,
            order.price,
            idToOrder[id].txFee,
            uint8(order.currentStatus),
            order.nodes,
            order.locationData
        );
        return id;
    }

    function getOrder(bytes32 id) public view returns (Order memory) {
        return idToOrder[id];
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlUpgradeable, ERC1155HolderUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

