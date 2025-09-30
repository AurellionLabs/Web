// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import './Aura.sol';
import './AuSys.sol';
import './AuraAsset.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
error NotAValidOperator();
error InvalidTokenAddress();
error NotOwnerOrAdmin();
error InvalidOwnerAddress();
error NotAusysCaller();
error NodeDoesNotExist();
error InsufficientCapacity();
error AssetNotSupported();
error AssetNotFound();
error InvalidNewOwner();
contract AurumNodeManager is Ownable {
  struct Location {
    string lat;
    string lng;
  }
  struct NodeLocationData {
    string addressName;
    Location location;
  }
  struct Node {
    NodeLocationData location;
    //stteal ausys location struct
    bytes1 validNode;
    //TODO: Make a setter for this
    address owner;
    Asset[] supportedAssets;
    bytes1 status;
    //capacity needs to be kept on an asset by asset basis
  }
  struct Asset {
    address token;
    uint tokenId;
    uint price;
    uint256 capacity;
  }
  uint256 public nodeIdCounter = 0;
  mapping(address => bool) public isAdmin;
  mapping(address => address[]) public ownedNodes;
  mapping(address => Node) public AllNodes;

  address[] public nodeList;
  Ausys ausys;
  AuraAsset auraAsset;

  constructor(Ausys _ausys) {
    ausys = _ausys;
  }

  modifier onlyNodeOwner(address node) {
    if (msg.sender != AllNodes[node].owner) revert NotAValidOperator();
    _;
  }
  modifier onlyNodeOperator(address node) {
    if (msg.sender != AllNodes[node].owner) revert NotAValidOperator();
    _;
  }

  function addToken(AuraAsset _auraAsset) public onlyOwner {
    if (address(_auraAsset) == address(0)) revert InvalidTokenAddress();
    auraAsset = _auraAsset;
  }

  event eventUpdateAdmin(address admin);
  function setAdmin(address _admin) public onlyOwner {
    isAdmin[_admin] = true;
    emit eventUpdateAdmin(_admin);

  }
  // operator management removed in this refactor (only owner acts as operator)

  function registerNode(Node memory node) public returns (address id) {
    if (!(msg.sender == node.owner || isAdmin[msg.sender])) revert NotOwnerOrAdmin();
    if (node.owner == address(0)) revert InvalidOwnerAddress();
    aurumNode NodeContract = new aurumNode(node.owner, ausys, auraAsset, this);
    id = address(NodeContract);
    AllNodes[id].location = node.location;
    AllNodes[id].validNode = bytes1(uint8(1));
    AllNodes[id].owner = node.owner;
    AllNodes[id].status = node.status;
    for (uint256 i = 0; i < node.supportedAssets.length; i++) {
      AllNodes[id].supportedAssets.push(node.supportedAssets[i]);
    }
    ownedNodes[node.owner].push(id);
    emit eventUpdateOwner(node.owner, id);
    nodeList.push(id);
    nodeIdCounter += 1;
    emit NodeRegistered(id, node.owner);
    // Emit initial location so subgraph can seed NodeLocation
    emit eventUpdateLocation(
      node.location.addressName,
      node.location.location.lat,
      node.location.location.lng,
      id
    );
  }

  function getNode(address nodeAddress) public view returns (Node memory node) {
    node = AllNodes[nodeAddress];
  }

  function getNodeStatus(address node) external view returns (bytes1) {
    return AllNodes[node].status;
  }

  event eventUpdateOwner(address owner, address node);

  function updateOwner(address newOwner, address node) public onlyNodeOwner(node) {
    if (newOwner == address(0)) revert InvalidNewOwner();
    address oldOwner = AllNodes[node].owner;
    if (oldOwner == newOwner) return;

    // remove node from old owner's list (swap-pop)
    address[] storage list = ownedNodes[oldOwner];
    for (uint256 i = 0; i < list.length; i++) {
      if (list[i] == node) {
        list[i] = list[list.length - 1];
        list.pop();
        break;
      }
    }

    AllNodes[node].owner = newOwner;
    ownedNodes[newOwner].push(node);
    emit eventUpdateOwner(newOwner, node);
  }

  event eventUpdateLocation(string addressName, string lat, string lng, address node);

  function updateLocation(
    NodeLocationData memory newLocation,
    address node
  ) public onlyNodeOperator(node) {
    AllNodes[node].location = newLocation;
    emit eventUpdateLocation(
      newLocation.addressName,
      newLocation.location.lat,
      newLocation.location.lng,
      node
    );
  }

  event eventUpdateStatus(bytes1 status, address node);

  event SupportedAssetsUpdated(address indexed node, Asset[] supportedAssets);
  event SupportedAssetAdded(address indexed node, Asset asset);
  function updateSupportedAssets(
    address node,
    Asset[] memory supportedAssets
  ) public onlyNodeOperator(node) {
    Node storage n = AllNodes[node];
    delete n.supportedAssets;
    for (uint256 i = 0; i < supportedAssets.length; i++) {
      n.supportedAssets.push(supportedAssets[i]);
    }
    emit SupportedAssetsUpdated(node, supportedAssets);
  }

  function addSupportedAsset(
    address node,
    Asset memory supportedAsset
  ) public onlyNodeOperator(node) {
    Node storage n = AllNodes[node];
    n.supportedAssets.push(supportedAsset);
    emit SupportedAssetAdded(node, supportedAsset);
  }

  function reduceCapacityForOrder(
    address node,
    Asset memory supportedAsset,
    uint256 quantityToReduce
  ) public {
    if (msg.sender != address(ausys)) revert NotAusysCaller();
    Node storage n = AllNodes[node];
    if (n.owner == address(0)) revert NodeDoesNotExist();

    bool found = false;
    for (uint256 i = 0; i < n.supportedAssets.length; i++) {
      if (
        n.supportedAssets[i].token == supportedAsset.token &&
        n.supportedAssets[i].tokenId == supportedAsset.tokenId
      ) {
        if (n.supportedAssets[i].capacity < quantityToReduce) revert InsufficientCapacity();
        n.supportedAssets[i].capacity -= quantityToReduce;
        // Optionally update supplyPerResource mapping if needed (logic from updateSupportedAssets)
        // supplyPerResource[assetId] = ??? // Need careful calculation based on old/new capacity
        found = true;
        break; // Assume asset ID is unique
      }
    }
    if (!found) revert AssetNotSupported();
    emit SupportedAssetsUpdated(node, n.supportedAssets);
  }

  function updateStatus(bytes1 status, address node) public onlyOwner {
    AllNodes[node].status = status;
    emit eventUpdateStatus(status, node);
  }


  event NodeRegistered(address indexed nodeAddress, address indexed owner);
  event NodeCapacityUpdated(address indexed node, uint256[] quantities);

  function getAsset(
    address node,
    address token,
    uint256 tokenId
  ) public view returns (Asset memory) {
    Node storage n = AllNodes[node];
    for (uint256 i = 0; i < n.supportedAssets.length; i++) {
      if (
        n.supportedAssets[i].token == token &&
        n.supportedAssets[i].tokenId == tokenId
      ) {
        return n.supportedAssets[i];
      }
    }
    revert AssetNotFound();
  }
}

contract aurumNode is ERC1155Holder, Ownable {
  Ausys ausys;
  AuraAsset auraAsset;
  AurumNodeManager manager;

  constructor(
    address _owner,
    Ausys _ausys,
    AuraAsset _auraAsset,
    AurumNodeManager _manager
  ) {
    _transferOwnership(_owner);
    ausys = _ausys;
    auraAsset = _auraAsset;
    manager = _manager;
  }

  function nodeHandoff(bytes32 id) public onlyOwner {
    ausys.handOff(id);
  }

  function nodeHandOn(bytes32 id) public onlyOwner {
    ausys.handOn(id);
  }

  function nodeSign(bytes32 id) public onlyOwner {
    ausys.packageSign(id);
  }

  function addItem(
    address itemOwner,
    uint256 amount,
    AuraAsset.Asset memory asset,
    string memory className,
    bytes memory data
  ) public onlyOwner returns (uint256 tokenId) {
    (, uint256 mintedTokenId) = auraAsset.nodeMint(
      itemOwner,
      asset,
      amount,
      className,
      data
    );
    tokenId = mintedTokenId;
  }
}
