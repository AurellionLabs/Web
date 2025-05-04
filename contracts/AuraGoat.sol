//SPDX-LICENSE: MIT
pragma solidity ^0.8.28;
import './Aurum.sol';
import '@openzeppelin/contracts/token/ERC1155/ERC1155.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
// import "@openzeppelin/contracts/security/Pausable.sol";
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol';
import '@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol';

contract AuraGoat is ERC1155, ERC1155Burnable, Ownable, ERC1155Supply {
  //@param _uri NFT metadata URI
  AurumNodeManager NodeManager;

  constructor(
    address initialOwner,
    string memory _uri,
    AurumNodeManager _NodeManager
  ) payable ERC1155(_uri) Ownable() {
    NodeManager = _NodeManager;
  }

  /**
   * @dev Updates the base URI that will be used to retrieve metadata.
   * @param newuri The base URI to be used.
   */
  function setURI(string memory newuri) external onlyOwner {
    _setURI(newuri);
  }

  //* @dev A method for the owner to mint new ERC1155 tokens.
  //* @param account The account for new tokens to be sent to.
  //* @param id The id of token type.
  //* @param amount The number of this token type to be minted.
  //* @param data additional data that will be used within the receiver's onERC1155Received method
  //A1->A5 goat tiers
  //A1W->A5W goat tiers
  modifier validNode(address node) {
    require(bytes1(NodeManager.getNode(node).status) == bytes1(uint8(1)));
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
  function nodeMint(
    address account,
    string memory assetName,
    string[] memory attributes,
    uint256 amount,
    bytes memory data
  ) external validNode(account) {
    uint256 tokenID = uint256(
      keccak256(abi.encode(assetName, attributes))
    );
    _mint(account, tokenID, amount, data);
  }

  // Attributes in Alphabetical Alphabetical Order
  function lookupHash(
    string memory assetName,
    string[] memory attributes
  ) public pure  returns(uint256) {
    uint256 tokenID = uint256(
      keccak256(abi.encode(assetName, attributes))
    );
    return (tokenID);
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
}
