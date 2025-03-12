// SPDX-License-Identifier: MIT
import "./Aura.sol";
import "./AuSys.sol";
import "./AuraGoat.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
pragma solidity 0.8.28;

//TODO: make an asset name to number finder on smart contract

contract AurumNodeManager {
    struct Location {
        string lat;
        string lng;
    }
    struct NodeLocationData {
        string addressName;
        Location location;

        //add customer?
        //add driver?
        //add box
    }
    struct Node {
        NodeLocationData location;
        //stteal ausys location struct
        bytes1 validNode;
        //TODO: Make a setter for this
        address owner;
        uint256[] supportedAssets;
        bytes1 status;
        uint256[] capacity;
        uint256[] assetPrices;
        //capacity needs to be kept on an asset by asset basis
    }
    struct Asset {
        address tokenAddr;
        uint id;
        // amount == to balance
    }
    struct Item {
        string category;
        string subCategory;
        string Type;
    }
    uint256 public nodeIdCounter = 0;
    mapping(address => address[]) public ownedNodes;
    mapping(address => Node) public AllNodes;

    address[] public nodeList;
    locationContract ausys;
    AuraGoat auraGoat;
    address admin;
    uint256[] public resourceList;
    mapping(uint256 => uint256) public supplyPerResource;

    constructor(locationContract _ausys, address _admin) {
        ausys = _ausys;
        // need to call add goat token for this to work
        admin = _admin;
    }

    modifier adminOnly() {
        require(msg.sender == admin);
        _;
    }
    modifier isOwner(address node) {
        address owner = AllNodes[node].owner;
        require(msg.sender == owner, "Not the owner");
        _;
    }

    //PLEASEESSEEEE CALLL MEEEEEEE
    function addToken(AuraGoat _auraGoat) public {
        require(address(_auraGoat) != address(0), "Invalid token address");
        auraGoat = _auraGoat;
    }

    function setAdmin(address _admin) public adminOnly {
        admin = _admin;
        emit eventUpdateAdmin(_admin);
    }

    mapping(uint256 => bool) public resourceExists;

    function registerNode(Node memory node) public returns (address id) {
        require(node.owner != address(0), "Invalid owner address");
        require(
            node.supportedAssets.length == node.capacity.length && 
            node.supportedAssets.length == node.assetPrices.length, 
            "Arrays length mismatch"
        );
        aurumNode NodeContract = new aurumNode(
            node.owner,
            ausys,
            auraGoat,
            this
        );
        id = address(NodeContract);
        AllNodes[id] = node;
        AllNodes[id].validNode = bytes1(uint8(1));
        updateOwner(node.owner, id);
        nodeList.push(id);
        nodeIdCounter += 1;
        updateSupportedAssets(
            address(NodeContract),
            node.capacity,
            node.supportedAssets,
            node.assetPrices
        );
        for (uint i = 0; i < node.supportedAssets.length; i++) {
            resourceList.push(node.supportedAssets[i]);
        }
        emit NodeRegistered(id, node.owner);
    }

    function getNode(
        address nodeAddress
    ) public view returns (Node memory node) {
        node = AllNodes[nodeAddress];
    }

    //require both parties to sign on item addition
    //create a node package sign function that mints to the node from aura when
    // thhe node succesfully calls hand off
    event eventUpdateOwner(address owner, address node);
    event eventUpdateAdmin(address admin);

    function updateOwner(address owner, address node) public isOwner(node) {
        AllNodes[node].owner = owner;
        ownedNodes[owner].push(node);
        emit eventUpdateOwner(owner, node);
    }

    event eventUpdateLocation(string location, address node);

    function updateLocation(
        NodeLocationData memory newLocation,
        address node
    ) public isOwner(node) {
        AllNodes[node].location = newLocation;
        emit eventUpdateLocation(newLocation.addressName, node);
    }

    event eventUpdateStatus(bytes1 status, address node);

    //TODO: secure dis
    function updateSupportedAssets(
        address node,
        uint256[] memory quantities,
        uint256[] memory assets,
        uint256[] memory prices
    ) public {
        require(
            quantities.length == assets.length && 
            quantities.length == prices.length, 
            "Array lengths must match"
        );
        Node storage targetNode = AllNodes[node];
        require(
            assets.length == targetNode.supportedAssets.length,
            "Invalid assets length"
        );

        for (uint256 i = 0; i < targetNode.supportedAssets.length; i++) {
            if (targetNode.supportedAssets[i] == assets[i]) {
                targetNode.capacity[i] = quantities[i];
                targetNode.assetPrices[i] = prices[i];
                if (targetNode.capacity[i] > quantities[i]) {
                    supplyPerResource[assets[i]] =
                        targetNode.capacity[i] -
                        quantities[i];
                } else {
                    supplyPerResource[assets[i]] =
                        targetNode.capacity[i] +
                        quantities[i];
                }
            }
        }
        for (uint256 i = 0; i < targetNode.supportedAssets.length; i++) {
            uint256 currentAsset = targetNode.supportedAssets[i];
            if (!resourceExists[currentAsset]) {
                resourceList.push(currentAsset);
                resourceExists[currentAsset] = true;
            }
        }
        emit NodeCapacityUpdated(node, quantities);
    }

    function expensiveFuzzyUpdateCapacity(
        address node,
        uint256[] memory quantities,
        uint256[] memory assets
    ) public isOwner(node) {
        Node storage targetNode = AllNodes[node];
        require(assets.length == targetNode.supportedAssets.length);
        for (uint256 k = 0; k < assets.length; k++)
            for (
                uint256 i = 0;
                i < AllNodes[node].supportedAssets.length;
                i++
            ) {
                if (targetNode.supportedAssets[i] == assets[k]) {
                    targetNode.capacity[i] = quantities[i];
                    break;
                }
            }
    }

    function updateStatus(bytes1 status, address node) public isOwner(node) {
        AllNodes[node].status = status;
        emit eventUpdateStatus(status, node);
    }

    event eventUpdateSupportedAssets(string[] supportedAssets, uint[] capacity);

    function nodeHandoff(
        address node,
        address driver,
        address reciever,
        bytes32 id,
        uint256[] memory tokenIds,
        address token,
        uint256[] memory quantities,
        bytes memory data
    ) public {
        address sender = ausys.getjourney(id).sender;
        if (
            msg.sender == sender &&
            AllNodes[node].validNode == bytes1(uint8(1)) &&
            AllNodes[node].owner == msg.sender
        )
            ausys.nodeHandOff(
                msg.sender,
                driver,
                reciever,
                id,
                tokenIds,
                token,
                quantities,
                data
            );
        //implement node tax (so take a cut from the protocol fee and)
        // job creator has to pay this (if job creator is a node he only has to pay the burnt part)
    }
    //WHENEVER A NODE TRIGGERS HAND OFF IT GETS PAID OUT (WHAT ABOUT LOOPS WHERE PEOPLE SEND THE SAME PKG BACK AND FORTH)
    //capacity
    //handshake
    // add new item (tokenise)
    //mint token with added item so onchain rep
    // erc1155 with unique id for goat grae and multiple stuff in  ID
    //delete item

    event NodeRegistered(address indexed nodeAddress, address indexed owner);
    event NodeCapacityUpdated(address indexed node, uint256[] quantities);

    function getAssetPrice(address node, uint256 assetId) public view returns (uint256) {
        Node storage targetNode = AllNodes[node];
        for (uint256 i = 0; i < targetNode.supportedAssets.length; i++) {
            if (targetNode.supportedAssets[i] == assetId) {
                return targetNode.assetPrices[i];
            }
        }
        revert("Asset not found");
    }
}

contract aurumNode is ERC1155Holder {
    address public owner;
    locationContract ausys;
    AuraGoat auraGoat;
    AurumNodeManager manager;

    constructor(
        address _owner,
        locationContract _ausys,
        AuraGoat _auraGoat,
        AurumNodeManager _manager
    ) {
        owner = _owner;
        ausys = _ausys;
        auraGoat = _auraGoat;
        manager = _manager;
    }

    modifier isOwner(address user) {
        require(user == owner);
        _;
    }

    function nodeHandoff(
        address node,
        address driver,
        address reciever,
        bytes32 id,
        uint256[] memory tokenIds,
        address token,
        uint256[] memory quantities,
        bytes memory data
    ) public {
        address sender = ausys.getjourney(id).sender;
        if (
            msg.sender == sender &&
            manager.getNode(node).validNode == bytes1(uint8(1)) &&
            manager.getNode(node).owner == msg.sender
        )
            ausys.nodeHandOff(
                msg.sender,
                driver,
                reciever,
                id,
                tokenIds,
                token,
                quantities,
                data
            );
        //implement node tax (so take a cut from the protocol fee and)

        // job creator has to pay this (if job creator is a node he only has to pay the burnt part)
    }

    function nodeHandOn(address driver, address reciever, bytes32 id) public {
        ausys.handOn(driver, reciever, id);
    }

    function nodeSign(address node, address driver, bytes32 jobid) public {
        ausys.packageSign(driver, node, jobid);
    }

    function addItem(
        address itemOwner,
        bytes32 id,
        uint256 weight,
        uint256 amount,
        address item,
        bytes memory data
    ) public isOwner(msg.sender) {
        auraGoat.nodeMint(itemOwner, weight, amount, data);
        //TODO:
        //add the item to the node
        // data should be a abi.encode of the entire data struct of an asset
        // data should be decoded in the mint function of the desired asset
        //unpack data
        // mint goat tokens to node and have them transferred wherver the package goes
        //(bool success, bytes memory result) = item.call(
        //    abi.encodeWithSignature("mint(adress,bytes)", itemOwner, data)
        //);
        //     AllNodes[id].capacity -= quantity;
        //require(success);
        //(bool success, bytes memory result) = addr.call(abi.encodeWithSignature("myFunction(uint,address)", 10, msg.sender));
    }
}
