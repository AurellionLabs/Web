// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondStorage } from '../libraries/DiamondStorage.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title AssetsFacet
 * @notice Business logic facet for ERC1155 asset management
 * @dev Combines AuraAsset functionality
 */
contract AssetsFacet is Initializable {
    function initialize() public initializer {
        // Initialization if needed
    }

    function addAssetClass(string memory _class) external {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(!s.supportedClasses[_class], 'Class already exists');
        s.supportedClasses[_class] = true;
        s.classList.push(_class);
    }

    function addAsset(
        string memory _name,
        string memory _assetClass,
        string[] memory _attributes
    ) external returns (bytes32 assetHash) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        require(s.supportedClasses[_assetClass], 'Class not supported');

        assetHash = keccak256(abi.encodePacked(_name, _assetClass, s.totalAssets));

        s.assets[s.totalAssets] = DiamondStorage.Asset({
            name: _name,
            assetClass: _assetClass,
            attributes: _attributes,
            createdAt: block.timestamp,
            active: true
        });

        s.assetByHash[assetHash] = s.totalAssets;
        s.totalAssets++;

        return assetHash;
    }

    function getAsset(uint256 _id)
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
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        DiamondStorage.Asset storage asset = s.assets[_id];
        return (asset.name, asset.assetClass, asset.attributes, asset.createdAt, asset.active);
    }

    function getAssetByHash(bytes32 _assetHash)
        external
        view
        returns (uint256 id)
    {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.assetByHash[_assetHash];
    }

    function getTotalAssets() external view returns (uint256) {
        DiamondStorage.AppStorage storage s = DiamondStorage.appStorage();
        return s.totalAssets;
    }
}
