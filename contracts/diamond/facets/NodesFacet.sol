// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title NodesFacet
 * @notice Business logic facet for node registration, management, and node assets
 * @dev Combines AurumNodeManager + NodeAsset functionality
 */
contract NodesFacet is AppStorage, Initializable {
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

    function initialize() public initializer {
        // Initialization if needed
    }

    function registerNode(
        string memory _nodeType,
        uint256 _capacity,
        bytes32 _assetHash
    ) external returns (bytes32 nodeHash) {
        // Generate unique node hash
        nodeHash = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, s.totalNodes)
        );

        // Create node
        s.nodes[nodeHash] = Node({
            owner: msg.sender,
            nodeType: _nodeType,
            capacity: _capacity,
            createdAt: block.timestamp,
            active: true,
            assetHash: _assetHash
        });

        // Update owner mapping
        s.ownerNodes[msg.sender].push(nodeHash);
        s.nodeList.push(nodeHash);
        s.totalNodes++;

        emit NodeRegistered(nodeHash, msg.sender, _nodeType);

        return nodeHash;
    }

    function updateNode(
        bytes32 _nodeHash,
        string memory _nodeType,
        uint256 _capacity
    ) external {
        require(
            s.nodes[_nodeHash].owner == msg.sender,
            'Not node owner'
        );

        s.nodes[_nodeHash].nodeType = _nodeType;
        s.nodes[_nodeHash].capacity = _capacity;

        emit NodeUpdated(_nodeHash, _nodeType, _capacity);
    }

    function deactivateNode(bytes32 _nodeHash) external {
        require(
            s.nodes[_nodeHash].owner == msg.sender,
            'Not node owner'
        );
        s.nodes[_nodeHash].active = false;
        emit NodeDeactivated(_nodeHash);
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
            bytes32 assetHash
        )
    {
        Node storage node = s.nodes[_nodeHash];
        return (
            node.owner,
            node.nodeType,
            node.capacity,
            node.createdAt,
            node.active,
            node.assetHash
        );
    }

    function getOwnerNodes(address _owner)
        external
        view
        returns (bytes32[] memory)
    {
        return s.ownerNodes[_owner];
    }

    function getTotalNodes() external view returns (uint256) {
        return s.totalNodes;
    }
}

