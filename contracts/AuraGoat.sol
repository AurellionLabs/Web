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
  uint a5 = 5;
  uint a4 = 4;
  uint a3 = 3;
  uint a2 = 2;
  uint a1 = 1;
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

  function nodeMint(
    address account,
    uint weight,
    uint256 amount,
    bytes memory data
  ) external validNode(account) onlyOwner {
    uint tokenID;
    if (weight > a5) {
      tokenID = 50;
      _mint(account, tokenID, amount, data);
    }

    if (weight > a4) {
      tokenID = 40;
      _mint(account, tokenID, amount, data);
    }

    if (weight > a3) {
      tokenID = 30;
      _mint(account, tokenID, amount, data);
    }

    if (weight > a2) {
      tokenID = 20;
      _mint(account, tokenID, amount, data);
    }

    if (weight > a1) {
      tokenID = 10;
      _mint(account, tokenID, amount, data);
    }
  }

  function updateGradeReq(uint tier, uint weight) public onlyOwner {
    string memory A5 = 'A5';
    if (tier == 5) {
      a5 = weight;
    }
    if (tier == 4) {
      a4 = weight;
    }
    if (tier == 3) {
      a3 = weight;
    }
    if (tier == 2) {
      a2 = weight;
    }
    if (tier == 1) {
      a1 = weight;
    }
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

