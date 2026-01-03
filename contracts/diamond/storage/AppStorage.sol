// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title AppStorage
 * @notice Storage layout for the Diamond proxy
 * @dev CRITICAL: Never change the order or type of existing state variables
 */
struct AppStorage {
    // ======= OWNERSHIP =======
    address owner;
    address pendingOwner;
    bool initialized;

    // ======= NODES =======
    mapping(bytes32 => Node) nodes;
    mapping(address => bytes32[]) ownerNodes;
    address[] nodeList;
    uint256 totalNodes;

    // ======= ASSETS =======
    mapping(uint256 => Asset) assets;
    mapping(bytes32 => uint256) assetByHash;
    uint256 totalAssets;
    mapping(string => bool) supportedClasses;
    string[] classList;

    // ======= ORDERS =======
    mapping(bytes32 => Order) orders;
    address[] orderList;
    uint256 totalOrders;

    // ======= STAKING =======
    mapping(address => Stake) stakes;
    uint256 totalStaked;

    // ======= BRIDGE =======
    address clobAddress;
    address ausysAddress;
    address quoteTokenAddress;

    // ======= VERSIONING =======
    uint256 version;
    string versionString;

    // ======= PAUSE =======
    bool paused;
    uint256 pauseStartTime;

    // ======= RESERVED =======
    // Reserved space for future upgrades
    uint256[50] __reserved1;
    mapping(bytes32 => uint256) __reserved2;
}

struct Node {
    address owner;
    string nodeType;
    uint256 capacity;
    uint256 createdAt;
    bool active;
    bytes32 assetHash;
}

struct Asset {
    string name;
    string assetClass;
    string[] attributes;
    uint256 createdAt;
    bool active;
}

struct Order {
    address buyer;
    address seller;
    bytes32 orderHash;
    uint256 price;
    uint256 amount;
    string status;
    uint256 createdAt;
}

struct Stake {
    uint256 amount;
    uint256 rewards;
    uint256 stakedAt;
}

AppStorage internal s;

