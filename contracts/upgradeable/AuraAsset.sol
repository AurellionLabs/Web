// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol';

interface IAurumNodeManagerUpgradeable {
    function getNodeStatus(address node) external view returns (bytes1);
}

contract AuraAssetUpgradeable is
    Initializable,
    ERC1155Upgradeable,
    ERC1155BurnableUpgradeable,
    OwnableUpgradeable,
    ERC1155SupplyUpgradeable
{
    IAurumNodeManagerUpgradeable public NodeManager;

    struct Asset {
        string name;
        string assetClass;
        Attribute[] attributes;
    }

    struct Attribute {
        string name;
        string[] values;
        string description;
    }

    mapping(string => Asset) public nameToSupportedAssets;
    mapping(string => uint256) public nameToSupportedAssetIndex;
    string[] public supportedAssets;

    // Supported classes registry with tombstoning
    mapping(string => string) public nameToSupportedClass;
    mapping(string => uint256) public nameToSupportedClassIndex;
    string[] public supportedClasses;

    mapping(bytes32 => string) public hashToClass;
    mapping(bytes32 => bool) public isClassActive;
    mapping(bytes32 => uint256) public hashToTokenID;
    bytes32[] public ipfsID;

    // Storage gap for future upgrades
    uint256[50] private __gap_storage_v1;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _uri,
        address _nodeManager
    ) public initializer {
        __ERC1155_init(_uri);
        __ERC1155Burnable_init();
        __ERC1155Supply_init();
        __Ownable_init();
        NodeManager = IAurumNodeManagerUpgradeable(_nodeManager);
        supportedAssets.push(''); // Reserve 0th index
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    modifier validNode(address node) {
        require(bytes1(NodeManager.getNodeStatus(node)) == bytes1(uint8(1)));
        _;
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }

    event MintedAsset(
        address indexed account,
        bytes32 indexed hash,
        uint256 indexed tokenId,
        string name,
        string assetClass,
        string className
    );

    event AssetAttributeAdded(
        bytes32 indexed hash,
        uint256 indexed attributeIndex,
        string name,
        string[] values,
        string description
    );

    function nodeMint(
        address account,
        Asset memory asset,
        uint256 amount,
        string memory className,
        bytes memory data
    ) external validNode(account) returns (bytes32 hash, uint256 tokenID) {
        bytes32 classKey = keccak256(abi.encode(className));
        require(isClassActive[classKey], 'Class inactive');

        tokenID = uint256(keccak256(abi.encode(asset)));
        hash = keccak256(abi.encode(account, asset));
        hashToClass[hash] = className;
        hashToTokenID[hash] = tokenID;
        ipfsID.push(hash);
        _mint(account, tokenID, amount, data);

        string memory resolvedClassName = hashToClass[hash];
        if (bytes(resolvedClassName).length == 0) {
            resolvedClassName = className;
        }

        emit MintedAsset(
            account,
            hash,
            tokenID,
            asset.name,
            asset.assetClass,
            resolvedClassName
        );

        for (uint256 i = 0; i < asset.attributes.length; i++) {
            emit AssetAttributeAdded(
                hash,
                i,
                asset.attributes[i].name,
                asset.attributes[i].values,
                asset.attributes[i].description
            );
        }
    }

    function lookupHash(Asset memory asset) public pure returns (uint256) {
        return uint256(keccak256(abi.encode(asset)));
    }

    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }

    function addSupportedAsset(Asset memory asset) external onlyOwner {
        nameToSupportedAssetIndex[asset.name] = supportedAssets.length;
        nameToSupportedAssets[asset.name] = asset;
        bytes32 hash = keccak256(abi.encode(asset));
        hashToClass[hash] = asset.assetClass;
        supportedAssets.push(asset.name);
        ipfsID.push(hash);
    }

    function removeSupportedAsset(Asset memory asset) external onlyOwner {
        uint256 i = nameToSupportedAssetIndex[asset.name];
        require(i < supportedAssets.length, 'OOB');
        delete supportedAssets[i];
        delete nameToSupportedAssets[asset.name];
        delete nameToSupportedAssetIndex[asset.name];
    }

    function addSupportedClass(string memory className) external onlyOwner {
        require(bytes(className).length != 0, 'Empty class name');
        require(
            bytes(nameToSupportedClass[className]).length == 0,
            'Already added'
        );
        nameToSupportedClassIndex[className] = supportedClasses.length;
        nameToSupportedClass[className] = className;
        supportedClasses.push(className);
        isClassActive[keccak256(abi.encode(className))] = true;
    }

    function removeSupportedClass(string memory className) external onlyOwner {
        uint256 i = nameToSupportedClassIndex[className];
        require(i < supportedClasses.length, 'OOB');
        delete supportedClasses[i];
        delete nameToSupportedClass[className];
        delete nameToSupportedClassIndex[className];
        isClassActive[keccak256(abi.encode(className))] = false;
    }
}

