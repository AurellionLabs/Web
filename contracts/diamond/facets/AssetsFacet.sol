// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { AppStorage } from '../storage/AppStorage.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title AssetsFacet
 * @notice Business logic facet for ERC1155 asset management
 * @dev Combines AuraAsset functionality
 */
contract AssetsFacet is AppStorage, Initializable {
    event AssetClassAdded(string indexed assetClass);
    event AssetAdded(
        bytes32 indexed assetHash,
        string name,
        string assetClass
    );
    event AssetUpdated(bytes32 indexed assetHash, bool active);

    struct AssetAttribute {
        string name;
        string[] values;
        string description;
    }

    function initialize() public initializer {
        // Initialization if needed
    }

    function addSupportedClass(string memory _class) external {
        // Only owner or authorized address should be able to add classes
        // For now, allow anyone (should be restricted in production)
        require(
            !s.supportedClasses[_class],
            'Class already supported'
        );
        s.supportedClasses[_class] = true;
        s.classList.push(_class);
        emit AssetClassAdded(_class);
    }

    function addSupportedAsset(
        string memory _name,
        string memory _assetClass,
        AssetAttribute[] memory _attributes
    ) external returns (bytes32 assetHash) {
        require(
            s.supportedClasses[_assetClass],
            'Class not supported'
        );

        // Generate asset hash
        assetHash = keccak256(
            abi.encodePacked(_name, _assetClass, s.totalAssets)
        );

        // Build attributes string
        string[] memory attrs = new string[](_attributes.length);
        for (uint256 i = 0; i < _attributes.length; i++) {
            attrs[i] = _attributes[i].name;
        }

        // Create asset
        s.assets[s.totalAssets] = Asset({
            name: _name,
            assetClass: _assetClass,
            attributes: attrs,
            createdAt: block.timestamp,
            active: true
        });

        s.assetByHash[assetHash] = s.totalAssets;
        s.totalAssets++;

        emit AssetAdded(assetHash, _name, _assetClass);

        return assetHash;
    }

    function getAsset(bytes32 _assetHash)
        external
        view
        returns (
            string memory name,
            string memory assetClass,
            string[] memory attributes,
            uint256 createdAt,
            bool active
        )
    {
        uint256 id = s.assetByHash[_assetHash];
        Asset storage asset = s.assets[id];
        return (
            asset.name,
            asset.assetClass,
            asset.attributes,
            asset.createdAt,
            asset.active
        );
    }

    function getAssetById(uint256 _assetId)
        external
        view
        returns (
            string memory name,
            string memory assetClass,
            string[] memory attributes,
            uint256 createdAt,
            bool active
        )
    {
        Asset storage asset = s.assets[_assetId];
        return (
            asset.name,
            asset.assetClass,
            asset.attributes,
            asset.createdAt,
            asset.active
        );
    }

    function isClassSupported(string memory _class)
        external
        view
        returns (bool)
    {
        return s.supportedClasses[_class];
    }

    function getSupportedClasses()
        external
        view
        returns (string[] memory)
    {
        return s.classList;
    }

    function getTotalAssets() external view returns (uint256) {
        return s.totalAssets;
    }
}

