// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
// Use a lightweight interface to avoid circular import with Aurum.sol
interface IAurumNodeManager {
  function getNodeStatus(address node) external view returns (bytes1);
}
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
// import "@openzeppelin/contracts/security/Pausable.sol";
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol';
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol';

contract AuraAsset is ERC1155, ERC1155Burnable, Ownable, ERC1155Supply {
  //@param _uri NFT metadata URI
  IAurumNodeManager NodeManager;
  struct Asset {
    string name;
    string assetClass;
    // id for per asset metadata so we understand what values each tokenized group of a given asset has
    Attribute[] attributes;
  }

  struct Attribute {
    string name;
    // if there is a single item in this list it will be treated as the actual value of the tokenized asset
    string[] values;
    string description;
  }

  mapping(string => Asset) public nameToSupportedAssets;
  mapping(string => uint256) public nameToSupportedAssetIndex;
  string[] public supportedAssets;

  // Supported classes registry with tombstoning (sparse array where removed entries are set to empty string)
  mapping(string => string) public nameToSupportedClass; // className => className (or empty string when removed)
  mapping(string => uint256) public nameToSupportedClassIndex; // className => index in supportedClasses
  string[] public supportedClasses;

  mapping(bytes32 => string) public hashToClass;
  mapping(bytes32 => bool) public isClassActive;
  mapping(bytes32 => uint256) public hashToTokenID;
  bytes32[] public ipfsID;

  // ============== CUSTODY TRACKING ==============
  // Maps tokenId => custodian node address
  // Set when asset is minted, persists through transfers, cleared on redeem
  mapping(uint256 => address) public tokenCustodian;
  
  // Maps tokenId => total amount currently in custody (minted but not redeemed)
  mapping(uint256 => uint256) public tokenCustodyAmount;
  
  // Event emitted when custody is established (at mint)
  event CustodyEstablished(
    uint256 indexed tokenId,
    address indexed custodian,
    uint256 amount
  );
  
  // Event emitted when custody is released (at redeem)
  event CustodyReleased(
    uint256 indexed tokenId,
    address indexed custodian,
    uint256 amount,
    address indexed redeemer
  );

  // ucall balane wih tokenId to get an amount of tokens
  constructor(
    address /*initialOwner*/,
    string memory _uri,
    IAurumNodeManager _NodeManager
  ) payable ERC1155(_uri) Ownable() {
    NodeManager = _NodeManager;
    // first push is an empty string to reserve the 0th index as rubbish bin
    supportedAssets.push('');
  }

  /**
   * @dev Updates the base URI that will be used to retrieve metadata.
   * @param newuri The base URI to be used.
   */
  function setURI(string memory newuri) external onlyOwner {
    _setURI(newuri);
  }

  /**
   * @dev Updates the NodeManager address. Only callable by owner.
   * @param _NodeManager The new NodeManager contract address.
   */
  function setNodeManager(IAurumNodeManager _NodeManager) external onlyOwner {
    require(address(_NodeManager) != address(0), 'Invalid NodeManager address');
    NodeManager = _NodeManager;
  }

  //* @dev A method for the owner to mint new ERC1155 tokens.
  //* @param account The account for new tokens to be sent to.
  //* @param id The id of token type.
  //* @param amount The number of this token type to be minted.
  //* @param data additional data that will be used within the receiver's onERC1155Received method
  //A1->A5 goat tiers
  //A1W->A5W goat tiers
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
  ) internal virtual override(ERC1155, ERC1155Supply) {
    super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
  }

  // Attributes in Alphabetical Alphabetical Order
  // when calling this please make sure there is one value per Attribute
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
    // require class to be active
    bytes32 classKey = keccak256(abi.encode(className));
    require(isClassActive[classKey], 'Class inactive');

    tokenID = uint256(keccak256(abi.encode(asset)));
    hash = (keccak256(abi.encode(account, asset)));
    hashToClass[hash] = className;
    hashToTokenID[hash] = tokenID;
    ipfsID.push(hash);
    _mint(account, tokenID, amount, data);

    // ============== ESTABLISH CUSTODY ==============
    // The minting node becomes the custodian for this tokenId
    // If this is the first mint for this tokenId, set the custodian
    // If already has a custodian, it must be the same node (can't have multiple custodians)
    if (tokenCustodian[tokenID] == address(0)) {
      tokenCustodian[tokenID] = account;
    } else {
      require(tokenCustodian[tokenID] == account, 'Token already has different custodian');
    }
    tokenCustodyAmount[tokenID] += amount;
    emit CustodyEstablished(tokenID, account, amount);
    // ================================================

    // Get className from contract state
    string memory resolvedClassName = hashToClass[hash];
    if (bytes(resolvedClassName).length == 0) {
      resolvedClassName = className;
    }

    // Emit main asset event with flat structure
    emit MintedAsset(
      account,
      hash,
      tokenID,
      asset.name,
      asset.assetClass,
      resolvedClassName
    );

    // Emit separate events for each attribute
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

  // Attributes in Alphabetical Alphabetical Order
  function lookupHash(Asset memory asset) public pure returns (uint256) {
    uint256 tokenID = uint256(keccak256(abi.encode(asset)));
    return (tokenID);
  }

  // ============== REDEMPTION (RELEASE CUSTODY) ==============
  /**
   * @dev Redeem tokens - burns the tokens and releases them from custody
   * @param tokenId The token ID to redeem
   * @param amount The amount to redeem
   * 
   * This function:
   * 1. Burns the caller's tokens
   * 2. Reduces the custody amount
   * 3. Emits CustodyReleased event (can be used to trigger physical delivery)
   * 
   * The custodian node is responsible for physical delivery after this call.
   */
  function redeem(uint256 tokenId, uint256 amount) external {
    require(balanceOf(msg.sender, tokenId) >= amount, 'Insufficient balance');
    require(tokenCustodyAmount[tokenId] >= amount, 'Exceeds custody amount');
    
    address custodian = tokenCustodian[tokenId];
    require(custodian != address(0), 'No custodian for token');
    
    // Burn the tokens
    _burn(msg.sender, tokenId, amount);
    
    // Release from custody
    tokenCustodyAmount[tokenId] -= amount;
    
    // If all tokens redeemed, clear the custodian
    if (tokenCustodyAmount[tokenId] == 0) {
      delete tokenCustodian[tokenId];
    }
    
    emit CustodyReleased(tokenId, custodian, amount, msg.sender);
  }

  /**
   * @dev Get custody info for a token
   * @param tokenId The token ID to query
   * @return custodian The custodian node address
   * @return amount The amount currently in custody
   */
  function getCustodyInfo(uint256 tokenId) external view returns (address custodian, uint256 amount) {
    return (tokenCustodian[tokenId], tokenCustodyAmount[tokenId]);
  }

  /**
   * @dev Check if a token is in custody
   * @param tokenId The token ID to check
   * @return True if the token has a custodian
   */
  function isInCustody(uint256 tokenId) external view returns (bool) {
    return tokenCustodian[tokenId] != address(0);
  }

  /**
   * @dev A method for the owner to mint a batch of new ERC1155 tokens.
   * @param to The account for new tokens to be sent to.
   * @param ids The ids of the different token types.
   * @param amounts The number of each token type to be minted.
   * @param data additional data that will be used within the receivers' onERC1155Received method
   */
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
    bytes32 hash = (keccak256(abi.encode(asset)));
    hashToClass[hash] = asset.assetClass;
    supportedAssets.push(asset.name);
    ipfsID.push(hash);
  }

  // Tombstone remove for assets: clear mappings and leave empty hole in array
  function removeSupportedAsset(Asset memory asset) external onlyOwner {
    uint i = nameToSupportedAssetIndex[asset.name];
    require(i < supportedAssets.length, 'OOB');
    delete supportedAssets[i]; // single SSTORE → cheap + refund
    delete nameToSupportedAssets[asset.name]; // clear struct mapping
    delete nameToSupportedAssetIndex[asset.name];
  } // clear i mapping}

  // Class management with tombstoning
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
    uint i = nameToSupportedClassIndex[className];
    require(i < supportedClasses.length, 'OOB');
    delete supportedClasses[i];
    delete nameToSupportedClass[className];
    delete nameToSupportedClassIndex[className];
    isClassActive[keccak256(abi.encode(className))] = false;
  }
}
