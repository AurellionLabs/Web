// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.28;

import './Aura.sol' as AuraContract;
import './Aurum.sol';
import './AuraGoat.sol';

// TO DO use smart contracct account pf the token for the treasury and create a private fuinctioion that auto mints
contract locationContract {
  enum Status {
    Pending,
    InProgress,
    Completed,
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
    uint requestedTokenQuantity;
    uint price;
    uint txFee;
    address customer;
    bytes32[] journeyIds;
    address[] nodes;
    ParcelData locationData;
    Status currentStatus;
    bytes32 contracatualAgreement;
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

  struct SubJourney {
    ParcelData parcelData;
  }

  // Map a journey to multiple sub journeys

  // Keep count of which sub journey of a journey the parcel is on
  bytes32[] public orderIds;
  mapping(address => bytes32[]) public customerToOrderIds;
  mapping(address => bytes32[]) public nodeToOrderIds;
  mapping(bytes32 => Order) public idToOrder;
  mapping(bytes32 => bytes32) public journeyToOrderId;
  mapping(bytes32 => uint256) public subJourneyCount;
  // Map the drivers address to a Journey/SubJourney, need to add address => uint => bytes32
  // need to map this to a list of bytes
  mapping(address => bytes32[]) public driverToJourneyId;
  // maps a sender to a journey
  mapping(address => bytes32[]) public customerToJourneyId;
  mapping(address => uint256) public numberOfJourneysCreatedForCustomer;
  // driver related mappings
  mapping(address => uint256) public numberOfJourneysAssigned;
  // maps a receiver to a journey
  mapping(address => bytes32[]) public receiverToJourneyId;
  mapping(address => uint256) public numberOfJourneysCreatedForReceiver;
  // Map Journey ID to Journey
  mapping(bytes32 => Journey) public journeyIdToJourney;

  // maps number to JOB id for the purpose of iterating through journeys
  mapping(uint => bytes32) public numberToJourneyID;
  // a bool that checks if the sender has handed off the package (need to change this to address => journey or journey id => bool
  mapping(address => mapping(bytes32 => bool)) public customerHandOff;
  mapping(address => mapping(bytes32 => bool)) public driverHandOn;
  //maps a journey to a corresponding box
  mapping(bytes32 => uint) journeyToBox;
  // maps a sender address to running balance of their token amount
  mapping(address => uint) customerToTokenAmount;
  Journey[] public subJourneys;
  uint public journeyIdCounter = 0;
  AuraContract.Aura auraToken;
  AurumNodeManager nodeManager;

  constructor(AuraContract.Aura _aura) {
    auraToken = _aura;
  }

  // vulnerability somebody
  modifier customerDriverCheck(
    address sender,
    address driver,
    bytes32 id
  ) {
    require(
      (journeyIdToJourney[id].driver == driver &&
        journeyIdToJourney[id].sender == sender) ||
        journeyIdToJourney[id].receiver == sender,
      'Was not correct 1'
    );
    require(msg.sender == sender || msg.sender == driver, 'Was not correct 2');
    _;
  }
  modifier DriversBoxVerify(address driver, uint box) {
    //require(journeyToBox[driverToJourneyId[driver]] == box);
    _;
  }
  modifier isInProgress(bytes32 id) {
    require(
      journeyIdToJourney[id].currentStatus == Status.InProgress,
      'Journey is not in Progress'
    );
    _;
  }
  modifier isPending(bytes32 id) {
    require(
      journeyIdToJourney[id].currentStatus == Status.Pending,
      'Journey is not Pending'
    );
    _;
  }
  modifier isCompleted(bytes32 id) {
    require(
      journeyIdToJourney[id].currentStatus == Status.Completed,
      'Journey is Incomplete'
    );
    _;
  }

  function setNodeManager(AurumNodeManager _nodeManager) public {
    nodeManager = _nodeManager;
  }

  function journeyKeyHashing(
    Journey memory journey
  ) private pure returns (bytes32) {
    return keccak256(abi.encode(journey));
  }

  function getHashedJourneyId() private returns (bytes32) {
    return keccak256(abi.encode(journeyIdCounter += 1));
  }

  event emitSig(address indexed user, bytes32 indexed id);

  function getjourney(bytes32 id) public view returns (Journey memory) {
    return journeyIdToJourney[id];
  }

  //could you exploit this feature by an agent calling from a non aurellion source  assign themseleves to all journeys then not showing up
  function assignDriverToJourneyId(address driver, bytes32 journeyID) public {
    driverToJourneyId[driver].push(journeyID);
    journeyIdToJourney[journeyID].driver = driver;
    numberOfJourneysAssigned[driver] += 1;
  }

  //sender can be both receiver and sender
  function packageSign(
    address driver,
    address sender,
    bytes32 id
  ) public customerDriverCheck(sender, driver, id) {
    if (msg.sender == sender) {
      customerHandOff[sender][id] = true;
      emit emitSig(sender, id);
    }

    if (msg.sender == driver) {
      driverHandOn[driver][id] = true;
      emit emitSig(driver, id);
    }

    if (
      customerHandOff[sender][id] == true && driverHandOn[driver][id] == true
    ) {
      emit emitSig(driver, id);
    }
  }

  function boxActivate(
    address driver,
    uint box
  ) public pure DriversBoxVerify(driver, box) returns (bool) {
    //activation code here
    return true;
  }

  // verify person has enough funds in contract
  // TODO: function wasn't working because the isCompleted modifier was wrong. Corrected it, need to retest.
  function generateReward(bytes32 id, address driver) public isCompleted(id) {
    uint completeJourney = journeyIdToJourney[id].journeyEnd -
      journeyIdToJourney[id].journeyStart;
    emit printUint(completeJourney);
    // to find reward you didvide the ETA by the time it was completed in. this will give you a number less than 1 which you then multiply the reward by to give the driver  a fraction of that reward.
    // if driver completed it quicker it will do the opposite .
    //need to consider whether the treausry gives extra reward for the faster delivery proportional to the excess of the fraction( the amount the sender didnt provide but is entitled to the driver as bonus.
    //may have to * by x**10*y to make sure decimals are taken into account
    uint reward = (journeyIdToJourney[id].ETA *
      journeyIdToJourney[id].bounty *
      10 ** 18) / completeJourney;
    emit printUint(reward);
    // transfer reward here
    auraToken.transfer(driver, reward);
    customerToTokenAmount[journeyIdToJourney[id].sender] -= journeyIdToJourney[
      id
    ].bounty;
  }

  event printUint(uint256 value);

  function assignJourneyToBox(bytes32 journey, uint box) public {
    journeyToBox[journey] = box;
  }

  function handOn(
    address driver,
    address sender,
    bytes32 id
  )
    public
    customerDriverCheck(sender, driver, id)
    isPending(id)
    returns (bool)
  {
    if (
      customerHandOff[sender][id] == true && driverHandOn[driver][id] == true
    ) {
      journeyIdToJourney[id].currentStatus = Status.InProgress;
      journeyIdToJourney[id].journeyStart = block.timestamp;
      driverHandOn[driver][id] == false;
      customerHandOff[sender][id] == false;
      return true;
    } else {
      return false;
    }
  }

  function handOff(
    address driver,
    address receiver,
    bytes32 id,
    //pass 0x0 if addr not requred
    address token
  )
    public
    isInProgress(id)
    customerDriverCheck(receiver, driver, id)
    returns (bool)
  {
    if (
      customerHandOff[receiver][id] == true && driverHandOn[driver][id] == true
    ) {
      journeyIdToJourney[id].currentStatus = Status.Completed;
      journeyIdToJourney[id].journeyEnd = block.timestamp;
      generateReward(id, driver);

      return true;
    } else {
      return false;
    }
  }

  // when specifying please specify quantity for a given tokenID at the same
  // in the token qauntity list
  //can be called by a customer and a node
  function nodeHandOff(
    address sendingNode,
    address driver,
    address receiver,
    bytes32 id,
    uint256[] memory tokenIds,
    address token,
    uint[] memory quantities,
    bytes memory data
  ) public returns (bool) {
    //APPROVE BEFORE CALLING
    //perform the transfer per token
    Order memory order = idToOrder[journeyToOrderId[id]];
    if (
      bytes1(nodeManager.getNode(receiver).validNode) == bytes1(uint8(1)) ||
      receiver == order.customer
    ) {
      handOff(driver, receiver, id, token);
      (bool success, bytes memory result) = token.call(
        abi.encodeWithSignature(
          'safeBatchTransferFrom(adress,address,uint256,uin256,bytes)',
          journeyIdToJourney[id].sender,
          journeyIdToJourney[id].receiver,
          tokenIds,
          quantities,
          data
        )
      );
      require(success);
      //reducing the capacity of the recieving nod if it is a
      if (receiver == order.customer) {
        order.currentStatus = Status.Completed;
        nodeManager.updateSupportedAssets(
          sendingNode,
          quantities,
          tokenIds,
          new uint256[](tokenIds.length)
        );
        uint nodeReward = order.txFee / order.nodes.length;

        for (uint i = 0; i < order.nodes.length; i++)
          auraToken.transfer(order.nodes[i], nodeReward);
      }
      return true;
    } else {
      return false;
    }
  }

  //TO DO make function to send funds to treasury

  //function uploads(ParcelData memory _data) public {
  //Journey memory journey = Journey({parcelData: _data, journeyId: getHashedJourneyId(), currentStatus: Status.Pending, sender: address(0), driver: address(0), receiver: address(0) });
  //journeyIdToJourney[journey.journeyId] = journey;
  //journeyToBox[journey.journeyId] = journeyIdCounter;

  // SubJourney memory subJourney = SubJourney({parcelData: _array[i]});

  // journeys.push(journey);
  // journeys[journey][subJourneyCount[journey] += 1] = subJourney;

  // subJourneyCount[journeyKeyHashing(journey)]+=1;
  // journeys[journeyKeyHashing(journey)][subJourneyCount(journeyKeyHashing(journey))+=1] = subJourney;
  // SubJourney memory xyz = journeys[journeyKeyHashing(journey)][subJourneyCount(journeyKeyHashing(journey))+=1];
  // }
  function journeyCreation(
    address sender,
    address receiver,
    ParcelData memory _data,
    uint bounty,
    uint ETA
  ) public {
    require(sender != address(0), 'Invalid sender');
    require(receiver != address(0), 'Invalid receiver');
    require(bounty > 0, 'Invalid bounty');
    require(ETA > block.timestamp, 'Invalid ETA');

    // TO DO transfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
    auraToken.transferFrom(sender, address(this), bounty);
    customerToTokenAmount[sender] += bounty;
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
    journeyToBox[journey.journeyId] = journeyIdCounter;

    numberOfJourneysCreatedForCustomer[sender] += 1;
    customerToJourneyId[sender].push(journey.journeyId);

    numberOfJourneysCreatedForReceiver[receiver] += 1;
    receiverToJourneyId[receiver].push(journey.journeyId);
    // add journeyId to global mapping of journeys
    numberToJourneyID[journeyIdCounter] = journey.journeyId;

    emit JourneyCreated(journey.journeyId, sender, receiver);
  }

  event JourneyCreated(
    bytes32 indexed journeyId,
    address indexed sender,
    address indexed receiver
  );
  event JourneyStatusUpdated(bytes32 indexed journeyId, Status newStatus);
  event OrderCreated(bytes32 indexed orderId, address indexed customer);

  // Debug event
  event DebugNodeData(
    address indexed nodeAddress,
    uint assetsLength,
    uint capacityLength,
    uint pricesLength
  );

  // TODO: node Acceptance function as this is just forced creation of order by a node, algo runs acceptance and then creation is pushed through
  //made flexible by adding nullish value to any param
  function addReceiver(
    bytes32 orderId,
    address receiver,
    address sender
  ) public {
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
    // TODO: transfer bounty  from sender to contract make mapping of sender => tokens and make a withdraw function later
    //    auraToken.transferFrom(sender, address(this), bounty * 10 ** 18);
    customerToTokenAmount[idToOrder[orderId].customer] += bounty;
    // this is to add to an aggregate tx fee from all the journeys being created
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
    journeyToBox[journey.journeyId] = journeyIdCounter;

    numberOfJourneysCreatedForCustomer[sender] += 1;
    customerToJourneyId[sender].push(journey.journeyId);

    numberOfJourneysCreatedForReceiver[receiver] += 1;
    receiverToJourneyId[receiver].push(journey.journeyId);
    // add journeyId to global mapping of journeys
    numberToJourneyID[journeyIdCounter] = journey.journeyId;
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

  function orderCreation(Order memory order) public returns (bytes32) {
    bytes32 id = getHashedJourneyId();
    idToOrder[id] = order;
    idToOrder[id].currentStatus = Status.Pending;
    idToOrder[id].id = id;
    idToOrder[id].txFee = (order.price * 2) / 100;
    customerToOrderIds[order.customer].push(id);
    orderIds.push(id);
    emit OrderCreated(id, order.customer);
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
