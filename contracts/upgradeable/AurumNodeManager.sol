// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/utils/ERC1155HolderUpgradeable.sol';

// Minimal interface for Ausys (forward declaration)
interface I AusysUpgradeable {
    function reduceCapacityForOrder(
        address node,
        Asset memory supportedAsset,
        uint256 quantityToReduce
    ) external;
}

// Minimal interface for AuraAsset (forward declaration)
interface IAuraAssetUpgradeable {
    function setApprovalForAll(address operator, bool approved) external;
}

error NotAValidOperatorUpgradeable();
error InvalidTokenAddressUpgradeable();
error NotOwnerOrAdminUpgradeable();
error InvalidOwnerAddressUpgradeable();
error NotAusysCallerUpgradeable();
error NodeDoesNotExistUpgradeable();
error InsufficientCapacityUpgradeable();
error AssetNotSupportedUpgradeable();
error AssetNotFoundUpgradeable();
error InvalidNewOwnerUpgradeable();

contract AurumNodeManagerUpgradeable is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC1155HolderUpgradeable
{
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
        bytes1 validNode;
        address owner;
        Asset[] supportedAssets;
        bytes1 status;
    }

    struct Asset {
        address token;
        uint256 tokenId;
        uint256 price;
        uint256 capacity;
    }

    uint256 public nodeIdCounter;

    mapping(address => bool) public isAdmin;
    mapping(address => address[]) public ownedNodes;
    mapping(address => Node) public AllNodes;
    address[] public nodeList;

    address public ausysAddress;
    address public auraAssetAddress;

    // Storage gap for future upgrades
    uint256[50] private __gap_storage_v1;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _ausys, address _auraAsset) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();
        __ERC1155Holder_init();

        ausysAddress = _ausys;
        auraAssetAddress = _auraAsset;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier onlyNodeOwner(address node) {
        if (msg.sender != AllNodes[node].owner) revert NotAValidOperatorUpgradeable();
        _;
    }

    modifier onlyNodeOperator(address node) {
        if (msg.sender != AllNodes[node].owner) revert NotAValidOperatorUpgradeable();
        _;
    }

    function addToken(address _auraAsset) public onlyOwner {
        if (address(_auraAsset) == address(0)) revert InvalidTokenAddressUpgradeable();
        auraAssetAddress = _auraAsset;
    }

    event eventUpdateAdmin(address admin);

    function setAdmin(address _admin) public onlyOwner {
        isAdmin[_admin] = true;
        emit eventUpdateAdmin(_admin);
    }

    function registerNode(Node memory node) public returns (address id) {
        if (!(msg.sender == node.owner || isAdmin[msg.sender]))
            revert NotOwnerOrAdminUpgradeable();
        if (node.owner == address(0)) revert InvalidOwnerAddressUpgradeable();

        // Create node contract
        // Note: In upgradeable version, we might want to change this pattern
        // For now, we'll keep the same pattern but deploy upgradeable version
        // In production, consider using clone or beacon patterns for node contracts

        id = address(0); // Placeholder - actual implementation depends on node contract pattern
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
        if (newOwner == address(0)) revert InvalidNewOwnerUpgradeable();
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

    function addSupportedAsset(address node, Asset memory supportedAsset) public onlyNodeOperator(node) {
        Node storage n = AllNodes[node];
        n.supportedAssets.push(supportedAsset);
        emit SupportedAssetAdded(node, supportedAsset);
    }

    function reduceCapacityForOrder(
        address node,
        Asset memory supportedAsset,
        uint256 quantityToReduce
    ) public {
        if (msg.sender != ausysAddress) revert NotAusysCallerUpgradeable();
        Node storage n = AllNodes[node];
        if (n.owner == address(0)) revert NodeDoesNotExistUpgradeable();

        bool found = false;
        for (uint256 i = 0; i < n.supportedAssets.length; i++) {
            if (
                n.supportedAssets[i].token == supportedAsset.token &&
                n.supportedAssets[i].tokenId == supportedAsset.tokenId
            ) {
                if (n.supportedAssets[i].capacity < quantityToReduce)
                    revert InsufficientCapacityUpgradeable();
                n.supportedAssets[i].capacity -= quantityToReduce;
                found = true;
                break;
            }
        }
        if (!found) revert AssetNotSupportedUpgradeable();
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
        revert AssetNotFoundUpgradeable();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155HolderUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

