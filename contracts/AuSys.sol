// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import './Aura.sol' as AuraContract;
import './Aurum.sol';
import './AuraGoat.sol';
import '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/security/ReentrancyGuard.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

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
error InvalidParam();

contract locationContract is ReentrancyGuard, ERC1155Holder, Ownable {
  enum Status {
    Pending,
    InProgress,
    Completed,
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
    Status currentStatus;
    bytes32 contractualAgreement;
  }
  struct Journey {
    ParcelData parcelData;
    bytes32 journeyId;
    Status currentStatus;
    address sender;
    address receiver;
    address driver;
    uint journeyStart;
    uint journeyEnd;
    uint bounty;
    uint ETA;
  }

  // Map a journey to multiple sub journeys

  // Keep count of which sub journey of a journey the parcel is on
  bytes32[] public orderIds;
  mapping(address => bytes32[]) public customerToOrderIds;
  mapping(address => bytes32[]) public nodeToOrderIds;
  mapping(bytes32 => Order) public idToOrder;
  mapping(bytes32 => bytes32) public journeyToOrderId;
  // Map the drivers address to a Journey/SubJourney, need to add address => uint => bytes32
  // need to map this to a list of bytes
  mapping(address => bytes32[]) public driverToJourneyId;
  // maps a sender to a journey
  mapping(address => bytes32[]) public customerToJourneyId;
  // driver related mappings
  mapping(address => uint256) public numberOfJourneysAssigned;
  // maps a receiver to a journey
  // Map Journey ID to Journey
  mapping(bytes32 => Journey) public journeyIdToJourney;

  // maps number to JOB id for the purpose of iterating through journeys
  // a bool that checks if the sender has handed off the package (need to change this to address => journey or journey id => bool
  mapping(address => mapping(bytes32 => bool)) public customerHandOff;
  mapping(address => mapping(bytes32 => bool)) public driverHandOn;
  // maps a sender address to running balance of their token amount
  mapping(address => uint) customerToTokenAmount;
  mapping(bytes32 => bool) rewardPaid;
  uint public journeyIdCounter = 0;
  uint public orderIdCounter = 0;
  IERC20 payToken;
  AurumNodeManager nodeManager;
  event emitSig(address indexed user, bytes32 indexed id);
  event OrderSettled(bytes32 indexed orderId);
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

  constructor(IERC20 token) {
    payToken = token;
  }

  // vulnerability somebody
  modifier customerDriverCheck(bytes32 id) {
    Journey storage J = journeyIdToJourney[id];
    if (
      !(msg.sender == J.sender ||
        msg.sender == J.driver ||
        msg.sender == J.receiver)
    ) revert NotJourneyParticipant();
    _;
  }
  modifier isInProgress(bytes32 id) {
    if (journeyIdToJourney[id].currentStatus != Status.InProgress)
      revert JourneyNotInProgress();
    _;
  }
  modifier isPending(bytes32 id) {
    if (journeyIdToJourney[id].currentStatus != Status.Pending)
      revert JourneyNotPending();
    _;
  }
  modifier isCompleted(bytes32 id) {
    if (journeyIdToJourney[id].currentStatus != Status.Completed)
      revert JourneyIncomplete();
    _;
  }

  function setNodeManager(AurumNodeManager _nodeManager) public onlyOwner {
    nodeManager = _nodeManager;
  }

  function getHashedJourneyId() private returns (bytes32) {
    return keccak256(abi.encode(journeyIdCounter += 1));
  }

  function getHashedOrderId() private returns (bytes32) {
    return keccak256(abi.encode(orderIdCounter += 1));
  }

  function getjourney(bytes32 id) public view returns (Journey memory) {
    return journeyIdToJourney[id];
  }

  // this could be exploited by an agent calling from a non aurellion source  assign themseleves to all journeys then not showing up
  // this will be mitigated by KYC in the future so leaving open for now
  function assignDriverToJourneyId(address driver, bytes32 journeyID) public {
    if (driverToJourneyId[driver].length >= 10) revert DriverMaxAssignment();
    driverToJourneyId[driver].push(journeyID);
    journeyIdToJourney[journeyID].driver = driver;
    numberOfJourneysAssigned[driver] += 1;
    emit DriverAssigned(driver, journeyID);
  }

  //sender can be both receiver and sender
  function packageSign(bytes32 id) public customerDriverCheck(id) {
    Journey storage J = journeyIdToJourney[id];
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
    if (journeyToOrderId[id]) revert InvalidParam();
    rewardPaid[id] = true;
    Journey storage J = journeyIdToJourney[id];
    uint completeJourney = J.journeyEnd - J.journeyStart;
    payToken.safeTransfer(J.driver, J.bounty);
    address payer = idToOrder[journeyToOrderId[id]].buyer;
    customerToTokenAmount[payer] -= J.bounty;
  }

  function handOn(
    bytes32 id
  ) public customerDriverCheck(id) isPending(id) nonReentrant returns (bool) {
    Journey storage J = journeyIdToJourney[id];
    if (!driverHandOn[J.driver][id]) revert DriverNotSigned();
    if (!customerHandOff[J.sender][id]) revert SenderNotSigned();
    J.journeyStart = block.timestamp;
    driverHandOn[J.driver][id] = false;
    customerHandOff[J.sender][id] = false;
    J.currentStatus = Status.InProgress;

    Order storage O = idToOrder[journeyToOrderId[id]];
    if (J.sender == O.seller) {
      IERC1155(O.token).safeTransferFrom(
        //sender should always be a node
        O.seller,
        address(this),
        O.tokenId,
        O.tokenQuantity,
        '0x'
      );
      nodeManager.reduceCapacityForOrder(O.seller, O.tokenId, O.tokenQuantity);
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
    Journey storage J = journeyIdToJourney[id];
    Order storage O = idToOrder[journeyToOrderId[id]];
    if (O.currentStatus == Status.Settled) revert AlreadySettled();
    if (!driverHandOn[J.driver][id]) revert DriverNotSigned();
    if (!customerHandOff[J.receiver][id]) revert ReceiverNotSigned();
    J.currentStatus = Status.Completed;
    J.journeyEnd = block.timestamp;
    generateReward(id);

    if (J.receiver == O.buyer) {
      O.currentStatus = Status.Settled;
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

  //can be called by a buyer and a node

  function journeyCreation(
    address sender,
    address receiver,
    ParcelData memory _data,
    uint bounty,
    uint ETA
  ) public nonReentrant {
    if (sender == address(0) || receiver == address(0)) revert InvalidAddress();
    if (bounty == 0) revert InvalidAmount();
    if (ETA <= block.timestamp) revert InvalidETA();

    // TO DO safeTransfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
    payToken.safeTransferFrom(sender, address(this), bounty);
    customerToTokenAmount[sender] += bounty;
    emit FundsEscrowed(sender, bounty);
    Journey memory journey = Journey({
      parcelData: _data,
      journeyId: getHashedJourneyId(),
      currentStatus: Status.Pending,
      sender: sender,
      driver: address(0),
      receiver: receiver,
      journeyStart: 0,
      journeyEnd: 0,
      bounty: bounty,
      ETA: ETA
    });
    journeyIdToJourney[journey.journeyId] = journey;

    customerToJourneyId[sender].push(journey.journeyId);

    // add journeyId to global mapping of journeys

    emit JourneyCreated(journey.journeyId, sender, receiver);
  }

  event JourneyCreated(
    bytes32 indexed journeyId,
    address indexed sender,
    address indexed receiver
  );
  event JourneyStatusUpdated(bytes32 indexed journeyId, Status newStatus);
  event OrderCreated(bytes32 indexed orderId, address indexed buyer);

  function addReceiver(
    bytes32 orderId,
    address receiver,
    address sender
  ) public onlyOwner {
    bytes32[] memory _journeyIds = idToOrder[orderId].journeyIds;
    for (uint i; i < _journeyIds.length; i++) {
      if (journeyIdToJourney[_journeyIds[i]].sender == sender) {
        journeyIdToJourney[idToOrder[orderId].journeyIds[i]]
          .receiver = receiver;
      }
    }
  }

  //only called with a node as the sender
  //TODO: restrict so only node can call
  function orderJourneyCreation(
    bytes32 orderId,
    address sender,
    address receiver,
    // not neccessarily a receiver
    ParcelData memory _data,
    uint bounty,
    uint ETA,
    uint tokenQuantity,
    uint assetId
  ) public {
    // TODO: safeTransfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
    //    payToken.safeTransferFrom(sender, address(this), bounty * 10 ** 18);
    customerToTokenAmount[idToOrder[orderId].buyer] += bounty;
    // this is to add to an aggregate tx fee from all the journeys being created

    if (bytes1(nodeManager.getNode(receiver).validNode) != bytes1(uint8(1)))
      revert InvalidNode();
    if (ETA <= block.timestamp) revert InvalidETA();
    if (tokenQuantity == 0) revert InvalidAmount();
    Order storage O1 = idToOrder[orderId];
    Journey memory journey = Journey({
      parcelData: _data,
      journeyId: getHashedJourneyId(),
      currentStatus: Status.Pending,
      sender: sender,
      driver: address(0),
      receiver: receiver,
      journeyStart: 0,
      journeyEnd: 0,
      bounty: bounty,
      ETA: ETA
    });
    journeyIdToJourney[journey.journeyId] = journey;
    customerToJourneyId[sender].push(journey.journeyId);
    // add journeyId to global mapping of journeys
    idToOrder[orderId].journeyIds.push(journey.journeyId);
    idToOrder[orderId].currentStatus = Status.Pending;
    journeyToOrderId[journey.journeyId] = orderId;
    nodeToOrderIds[sender].push(orderId);

    // +++ Call the new function on nodeManager +++
    nodeManager.reduceCapacityForOrder(
      sender, // The node address
      assetId, // +++ New way: Using the passed simple assetId +++
      tokenQuantity // The quantity requested for this journey leg
    );
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
    if (order.tokenQuantity != 0) revert InvalidAmount();
    bytes32 id = getHashedOrderId();
    idToOrder[id] = order;
    idToOrder[id].currentStatus = Status.Pending;
    idToOrder[id].id = id;
    idToOrder[id].txFee = (order.price * 2) / 100;
    customerToOrderIds[order.buyer].push(id);
    orderIds.push(id);
    payToken.safeTransferFrom(
      order.buyer,
      address(this),
      order.price + idToOrder[id].txFee
    );
    emit FundsEscrowed(order.buyer, order.price + idToOrder[id].txFee);
    emit OrderCreated(id, order.buyer);
    return id;
  }

  function getOrder(bytes32 id) public view returns (Order memory) {
    return idToOrder[id];
  }

  /**
   * @notice Explicit getter function for nodeToOrderIds mapping.
   * @dev Bypasses the implicit public getter which might have issues.
   * @param nodeAddress The address of the node.
   * @param index The index in the node's order ID array.
   * @return The order ID (bytes32) at the specified index, or ZeroHash if out of bounds.
   */
  function getNodeOrderIdByIndex(
    address nodeAddress,
    uint index
  ) public view returns (bytes32) {
    // Check bounds to prevent revert on out-of-bounds access
    if (index >= nodeToOrderIds[nodeAddress].length) {
      return bytes32(0); // Return ZeroHash if index is out of bounds
    }
    return nodeToOrderIds[nodeAddress][index];
  }
}
