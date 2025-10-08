// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import './Aura.sol' as AuraContract;
import './Aurum.sol';
import './AuraAsset.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

using SafeERC20 for IERC20;

// =====================
// Custom Errors
// =====================
error NotJourneyParticipant();
error JourneyNotInProgress();
error JourneyNotPending();
error JourneyIncomplete();
error AlreadySettled();
error DriverNotSigned();
error SenderNotSigned();
error ReceiverNotSigned();
error InvalidAddress();
error InvalidAmount();
error InvalidETA();
error QuantityExceedsRequested();
error InvalidNode();
error RewardAlreadyPaid();
error DriverMaxAssignment();
error InvalidCaller();

contract Ausys is ReentrancyGuard, ERC1155Holder, Ownable, AccessControl {
  // Journey status - tracks physical delivery progress
  enum JourneyStatus {
    Pending, // Waiting for pickup signatures
    InTransit, // Package picked up, in transit
    Delivered, // Package delivered to receiver
    Canceled // Journey cancelled
  }

  // Order status - tracks overall order and payment status
  enum OrderStatus {
    Created, // Order placed, no journeys started (0)
    Processing, // At least one journey is active (1)
    Settled, // Payments distributed, order complete (2)
    Canceled // Order cancelled (3)
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

    //add sender?
    //add driver?
    //add box
  }
  struct Order {
    bytes32 id;
    address token;
    uint tokenId;
    uint tokenQuantity;
    uint price;
    uint txFee;
    address buyer;
    // to be a seller you must be a node
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
    uint journeyStart;
    uint journeyEnd;
    uint bounty;
    uint ETA;
  }

  IERC20 payToken;
  AurumNodeManager nodeManager;
  bytes32[] public orderIds;
  mapping(bytes32 => Order) public idToOrder;
  mapping(bytes32 => bytes32) public journeyToOrderId;
  mapping(address => bytes32[]) public driverToJourneyId;
  mapping(bytes32 => Journey) public idToJourney;
  mapping(address => mapping(bytes32 => bool)) public customerHandOff;
  mapping(address => mapping(bytes32 => bool)) public driverHandOn;
  mapping(bytes32 => bool) rewardPaid;
  // RBAC roles
  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');
  bytes32 public constant DRIVER_ROLE = keccak256('DRIVER_ROLE');
  bytes32 public constant DISPATCHER_ROLE = keccak256('DISPATCHER_ROLE');
  uint public journeyIdCounter = 0;
  uint public orderIdCounter = 0;

  constructor(IERC20 token) {
    payToken = token;
    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(ADMIN_ROLE, msg.sender);
  }

  // vulnerability somebody
  modifier customerDriverCheck(bytes32 id) {
    Journey storage J = idToJourney[id];
    if (
      !(msg.sender == J.sender ||
        msg.sender == J.driver ||
        msg.sender == J.receiver)
    ) revert NotJourneyParticipant();
    _;
  }
  modifier isInProgress(bytes32 id) {
    if (idToJourney[id].currentStatus != JourneyStatus.InTransit)
      revert JourneyNotInProgress();
    _;
  }
  modifier isPending(bytes32 id) {
    if (idToJourney[id].currentStatus != JourneyStatus.Pending)
      revert JourneyNotPending();
    _;
  }
  modifier isCompleted(bytes32 id) {
    if (idToJourney[id].currentStatus != JourneyStatus.Delivered)
      revert JourneyIncomplete();
    _;
  }

  function setNodeManager(AurumNodeManager _nodeManager) public onlyOwner {
    nodeManager = _nodeManager;
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

  function setDispatcher(
    address dispatcher,
    bool enable
  ) public onlyRole(ADMIN_ROLE) {
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
  event JourneyStatusUpdated(
    bytes32 indexed journeyId,
    JourneyStatus newStatus
  );
  event JourneyCanceled(
    bytes32 indexed journeyId,
    address indexed sender,
    uint refundedAmount
  );
  event FundsEscrowed(address indexed from, uint amount);
  event FundsRefunded(address indexed to, uint amount);
  event DriverAssigned(address indexed driver, bytes32 indexed journeyId);
  event SellerPaid(address indexed seller, uint amount);
  event NodeFeeDistributed(address indexed node, uint amount);

  function getjourney(bytes32 id) public view returns (Journey memory) {
    return idToJourney[id];
  }

  // this could be exploited by an agent calling from a non aurellion source  assign themseleves to all journeys then not showing up
  // this will be mitigated by KYC in the future so leaving open for now
  function assignDriverToJourneyId(address driver, bytes32 journeyID) public {
    // Require the target driver to be registered/approved
    if (!hasRole(DRIVER_ROLE, driver)) revert InvalidCaller();
    // Only the driver themselves, a dispatcher, or the journey sender can assign
    bool callerAuthorized = (msg.sender == driver ||
      hasRole(DISPATCHER_ROLE, msg.sender) ||
      msg.sender == idToJourney[journeyID].sender);
    if (!callerAuthorized) revert InvalidCaller();
    if (driverToJourneyId[driver].length >= 10) revert DriverMaxAssignment();
    driverToJourneyId[driver].push(journeyID);
    idToJourney[journeyID].driver = driver;
    emit DriverAssigned(driver, journeyID);
  }

  //sender can be both receiver and sender
  function packageSign(bytes32 id) public customerDriverCheck(id) {
    Journey storage J = idToJourney[id];
    if (msg.sender == J.sender) {
      customerHandOff[J.sender][id] = true;
      emit emitSig(J.sender, id);
    } else if (msg.sender == J.receiver) {
      customerHandOff[J.receiver][id] = true;
      emit emitSig(J.receiver, id);
    } else if (msg.sender == J.driver) {
      driverHandOn[J.driver][id] = true;
      emit emitSig(J.driver, id);
    }
  }

  function generateReward(bytes32 id) internal isCompleted(id) {
    if (rewardPaid[id]) revert RewardAlreadyPaid();
    rewardPaid[id] = true;
    Journey storage J = idToJourney[id];
    payToken.safeTransfer(J.driver, J.bounty);
  }

  function handOn(
    bytes32 id
  ) public customerDriverCheck(id) isPending(id) nonReentrant returns (bool) {
    Journey storage J = idToJourney[id];
    if (!driverHandOn[J.driver][id]) revert DriverNotSigned();
    if (!customerHandOff[J.sender][id]) revert SenderNotSigned();
    J.journeyStart = block.timestamp;
    driverHandOn[J.driver][id] = false;
    customerHandOff[J.sender][id] = false;
    J.currentStatus = JourneyStatus.InTransit;
    emit JourneyStatusUpdated(id, JourneyStatus.InTransit);

    Order storage O = idToOrder[journeyToOrderId[id]];
    // Update order status to Processing when first journey starts
    if (O.currentStatus == OrderStatus.Created) {
      O.currentStatus = OrderStatus.Processing;
      emit OrderStatusUpdated(journeyToOrderId[id], OrderStatus.Processing);
    }

    if (J.sender == O.seller) {
      IERC1155(O.token).safeTransferFrom(
        //sender should always be a node
        O.seller,
        address(this),
        O.tokenId,
        O.tokenQuantity,
        '0x'
      );
      AurumNodeManager.Asset memory a = AurumNodeManager.Asset({
        token: O.token,
        tokenId: O.tokenId,
        price: 0,
        capacity: 0
      });
      nodeManager.reduceCapacityForOrder(O.seller, a, O.tokenQuantity);
    }
    emit JourneyStatusUpdated(id, J.currentStatus);
    return true;
  }

  function handOff(
    bytes32 id
  )
    public
    isInProgress(id)
    customerDriverCheck(id)
    nonReentrant
    returns (bool)
  {
    Journey storage J = idToJourney[id];
    Order storage O = idToOrder[journeyToOrderId[id]];
    if (O.currentStatus == OrderStatus.Settled) revert AlreadySettled();
    if (!driverHandOn[J.driver][id]) revert DriverNotSigned();
    if (!customerHandOff[J.receiver][id]) revert ReceiverNotSigned();
    J.currentStatus = JourneyStatus.Delivered;
    J.journeyEnd = block.timestamp;
    emit JourneyStatusUpdated(id, JourneyStatus.Delivered);
    generateReward(id);

    if (J.receiver == O.buyer) {
      // Final delivery - settle the order
      O.currentStatus = OrderStatus.Settled;
      emit OrderStatusUpdated(journeyToOrderId[id], OrderStatus.Settled);

      IERC1155(O.token).safeTransferFrom(
        //sender should always be a node
        address(this),
        O.buyer,
        O.tokenId,
        O.tokenQuantity,
        '0x'
      );
      payToken.safeTransfer(O.seller, O.price);
      emit SellerPaid(O.seller, O.price);
      if (O.nodes.length > 0) {
        uint nodeCount = O.nodes.length;
        uint nodeReward = O.txFee / nodeCount;
        uint remainder = O.txFee - (nodeReward * nodeCount);
        for (uint i = 0; i < nodeCount; i++) {
          uint amount = nodeReward + (i == 0 ? remainder : 0);
          payToken.safeTransfer(O.nodes[i], amount);
          emit NodeFeeDistributed(O.nodes[i], amount);
        }
      }
      emit OrderSettled(journeyToOrderId[id]);
    }

    return true;
  }

  function journeyCreation(
    address sender,
    address receiver,
    ParcelData memory _data,
    uint bounty,
    uint ETA
  ) public nonReentrant {
    if (msg.sender != receiver && !hasRole(ADMIN_ROLE, msg.sender))
      revert InvalidCaller();
    if (sender == address(0) || receiver == address(0)) revert InvalidAddress();
    if (bounty == 0) revert InvalidAmount();
    if (ETA <= block.timestamp) revert InvalidETA();

    // TO DO safeTransfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
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

  event JourneyCreated(
    bytes32 indexed journeyId,
    address indexed sender,
    address indexed receiver
  );
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

  function orderJourneyCreation(
    bytes32 orderId,
    address sender,
    address receiver,
    ParcelData memory _data,
    uint bounty,
    uint ETA,
    uint tokenQuantity,
    uint assetId
  ) public {
    // TODO: safeTransfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
    //    payToken.safeTransferFrom(sender, address(this), bounty * 10 ** 18);
    // this is to add to an aggregate tx fee from all the journeys being created
    Order storage O = idToOrder[orderId];

    // Receiver must be either a valid node OR the order's buyer (for final delivery)
    bool isValidNode = bytes1(nodeManager.getNode(receiver).validNode) ==
      bytes1(uint8(1));
    bool isBuyer = receiver == O.buyer;
    if (!isValidNode && !isBuyer) revert InvalidNode();

    if (msg.sender != O.buyer && !hasRole(ADMIN_ROLE, msg.sender))
      revert InvalidCaller();
    if (ETA <= block.timestamp) revert InvalidETA();
    if (tokenQuantity == 0) revert InvalidAmount();
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

    // add journeyId to global mapping of journeys
    idToOrder[orderId].journeyIds.push(journey.journeyId);
    // Keep order as Created if this is first journey, otherwise already Processing
    if (idToOrder[orderId].currentStatus == OrderStatus.Created) {
      idToOrder[orderId].currentStatus = OrderStatus.Created;
    }
    journeyToOrderId[journey.journeyId] = orderId;

    // +++ Call the new function on nodeManager +++
    AurumNodeManager.Asset memory a = AurumNodeManager.Asset({
      token: idToOrder[orderId].token,
      tokenId: assetId,
      price: 0,
      capacity: 0
    });
    // Also update the order's tracked token quantity
    // This assumes the reduceCapacityForOrder call above did not revert
    idToOrder[orderId].tokenQuantity += tokenQuantity;

    emit JourneyCreated(journey.journeyId, sender, receiver);
  }

  function orderCreation(
    Order memory order
  ) public nonReentrant returns (bytes32) {
    if (
      order.buyer == address(0) ||
      order.seller == address(0) ||
      order.token == address(0)
    ) revert InvalidAddress();
    if (order.price == 0) revert InvalidAmount();
    if (order.buyer == order.seller) revert InvalidAddress();
    if (order.tokenQuantity == 0) revert InvalidAmount();
    bytes32 id = getHashedOrderId();
    idToOrder[id] = order;
    idToOrder[id].currentStatus = OrderStatus.Created;
    idToOrder[id].id = id;
    idToOrder[id].txFee = (order.price * 2) / 100;
    orderIds.push(id);
    payToken.safeTransferFrom(
      order.buyer,
      address(this),
      order.price + idToOrder[id].txFee
    );
    emit FundsEscrowed(order.buyer, order.price + idToOrder[id].txFee);
    emit OrderCreated(
      id,
      order.buyer,
      order.seller,
      order.token,
      order.tokenId,
      order.tokenQuantity,
      order.tokenQuantity, // Use tokenQuantity for requestedTokenQuantity since they're the same
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
  ) public view override(AccessControl, ERC1155Receiver) returns (bool) {
    return super.supportsInterface(interfaceId);
  }

  /**
   * @dev Bypasses the implicit public getter which might have issues.
   * @param nodeAddress The address of the node.
   * @param index The index in the node's order ID array.
   * @return The order ID (bytes32) at the specified index, or ZeroHash if out of bounds.
   */
}
