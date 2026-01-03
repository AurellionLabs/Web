// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title NodesFacet
 * @notice Business logic facet for node registration, management, and node assets
 * @dev Combines AurumNodeManager + NodeAsset functionality
 */
contract NodesFacet is Initializable {
    // Events matching original AurumNodeManager
    event NodeRegistered(
        bytes32 indexed nodeHash,
        address indexed owner,
        string nodeType
    );
    event NodeUpdated(
        bytes32 indexed nodeHash,
        string nodeType,
        uint256 capacity
    );
    event NodeDeactivated(bytes32 indexed nodeHash);
    event UpdateLocation(
        string indexed addressName,
        string lat,
        string lng,
        bytes32 indexed node
    );
    event UpdateOwner(address indexed owner, bytes32 indexed node);
    event UpdateStatus(bytes1 indexed status, bytes32 indexed node);
    event NodeCapacityUpdated(bytes32 indexed nodeHash, uint256[] quantities);
    event SupportedAssetAdded(
        bytes32 indexed nodeHash,
        address token,
        uint256 tokenId,
        uint256 price,
        uint256 capacity
    );
    event SupportedAssetsUpdated(
        bytes32 indexed nodeHash,
        uint256 count
    );

    function initialize() public initializer {}

    function registerNode(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash,
        string memory _addressName,
        string memory _lat,
        string memory _lng
    ) external returns (bytes32 nodeHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();

        nodeHash = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, s.totalNodes)
        );

        s.nodes[nodeHash] = DiamondStorage.Node({
            owner: msg.sender,
            nodeType: _nodeType,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true,
            validNode: true,
            assetHash: _assetHash,
            addressName: _addressName,
            lat: _lat,
            lng: _lng
        });

        s.ownerNodes[msg.sender].push(nodeHash);
        s.nodeList.push(address(uint160(uint256(nodeHash))));
        s.totalNodes++;

        emit NodeRegistered(nodeHash, msg.sender, _nodeType);

        return nodeHash;
    }

    function updateNode(
        bytes32 _nodeHash,
        string memory _nodeType,
        uint256 _capacity
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');

        s.nodes[_nodeHash].nodeType = _nodeType;
        s.nodes[_nodeHash].capacity = _capacity;

        emit NodeUpdated(_nodeHash, _nodeType, _capacity);
    }

    function deactivateNode(bytes32 _nodeHash) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_nodeHash].owner == msg.sender, 'Not node owner');
        s.nodes[_nodeHash].active = false;
        emit NodeDeactivated(_nodeHash);
    }

    function updateNodeLocation(
        string memory _addressName,
        string memory _lat,
        string memory _lng,
        bytes32 _node
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        s.nodes[_node].addressName = _addressName;
        s.nodes[_node].lat = _lat;
        s.nodes[_node].lng = _lng;

        emit UpdateLocation(_addressName, _lat, _lng, _node);
    }

    function updateNodeOwner(address _owner, bytes32 _node) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        address oldOwner = s.nodes[_node].owner;
        s.nodes[_node].owner = _owner;

        // Update owner nodes mapping
        bytes32[] storage oldOwnerNodes = s.ownerNodes[oldOwner];
        for (uint256 i = 0; i < oldOwnerNodes.length; i++) {
            if (oldOwnerNodes[i] == _node) {
                oldOwnerNodes[i] = oldOwnerNodes[oldOwnerNodes.length - 1];
                oldOwnerNodes.pop();
                break;
            }
        }
        s.ownerNodes[_owner].push(_node);

        emit UpdateOwner(_owner, _node);
    }

    function updateNodeStatus(bytes1 _status, bytes32 _node) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        s.nodes[_node].active = (_status == bytes1(0x01));
        s.nodes[_node].validNode = (_status == bytes1(0x01));

        emit UpdateStatus(_status, _node);
    }

    function updateNodeCapacity(bytes32 _node, uint256[] memory _quantities) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        uint256 newCapacity = 0;
        for (uint256 i = 0; i < _quantities.length; i++) {
            newCapacity += _quantities[i];
        }
        s.nodes[_node].capacity = newCapacity;

        emit NodeCapacityUpdated(_node, _quantities);
    }

    function addSupportedAsset(
        bytes32 _node,
        address _token,
        uint256 _tokenId,
        uint256 _price,
        uint256 _capacity
    ) external returns (uint256 assetId) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');

        assetId = s.totalNodeAssets[_node];
        s.totalNodeAssets[_node]++;

        s.nodeAssets[_node][assetId] = DiamondStorage.NodeAsset({
            token: _token,
            tokenId: _tokenId,
            price: _price,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true
        });

        s.nodeAssetIds[_node].push(assetId);

        emit SupportedAssetAdded(_node, _token, _tokenId, _price, _capacity);

        return assetId;
    }

    function updateSupportedAssets(
        bytes32 _node,
        address[] memory _tokens,
        uint256[] memory _tokenIds,
        uint256[] memory _prices,
        uint256[] memory _capacities
    ) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.nodes[_node].owner == msg.sender, 'Not node owner');
        require(
            _tokens.length == _tokenIds.length &&
            _tokenIds.length == _prices.length &&
            _prices.length == _capacities.length,
            'Array length mismatch'
        );

        delete s.nodeAssetIds[_node];
        s.totalNodeAssets[_node] = 0;

        for (uint256 i = 0; i < _tokens.length; i++) {
            s.nodeAssets[_node][i] = DiamondStorage.NodeAsset({
                token: _tokens[i],
                tokenId: _tokenIds[i],
                price: _prices[i],
                capacity: _capacities[i],
                createdAt: block.timestamp,
                active: true
            });
            s.nodeAssetIds[_node].push(i);
        }

        s.totalNodeAssets[_node] = _tokens.length;

        emit SupportedAssetsUpdated(_node, _tokens.length);
    }

    function getNode(bytes32 _nodeHash)
        external
        view
        returns (
            address owner,
            string memory nodeType,
            uint256 capacity,
            uint256 createdAt,
            bool active,
            bool validNode,
            bytes32 assetHash,
            string memory addressName,
            string memory lat,
            string memory lng
        )
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Node storage node = s.nodes[_nodeHash];
        return (
            node.owner,
            node.nodeType,
            node.capacity,
            node.createdAt,
            node.active,
            node.validNode,
            node.assetHash,
            node.addressName,
            node.lat,
            node.lng
        );
    }

    function getOwnerNodes(address _owner)
        external
        view
        returns (bytes32[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.ownerNodes[_owner];
    }

    function getNodeAssets(bytes32 _node)
        external
        view
        returns (DiamondStorage.NodeAsset[] memory)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        uint256 count = s.nodeAssetIds[_node].length;
        DiamondStorage.NodeAsset[] memory assets = new DiamondStorage.NodeAsset[](count);
        for (uint256 i = 0; i < count; i++) {
            assets[i] = s.nodeAssets[_node][s.nodeAssetIds[_node][i]];
        }
        return assets;
    }

    function getTotalNodes() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalNodes;
    }

    function getTotalNodeAssets(bytes32 _node) external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalNodeAssets[_node];
    }
}
