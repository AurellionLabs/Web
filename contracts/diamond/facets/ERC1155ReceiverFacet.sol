// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC1155Receiver } from '@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol';
import { IERC165 } from '@openzeppelin/contracts/utils/introspection/IERC165.sol';

/**
 * @title ERC1155ReceiverFacet
 * @notice Enables the Diamond to receive ERC1155 tokens
 * @dev Implements IERC1155Receiver interface for safeTransferFrom compatibility
 */
contract ERC1155ReceiverFacet is IERC1155Receiver {
    /**
     * @notice Handle the receipt of a single ERC1155 token type
     * @dev Called at the end of safeTransferFrom after the balance has been updated
     * @return bytes4 `IERC1155Receiver.onERC1155Received.selector` if transfer is allowed
     */
    function onERC1155Received(
        address /* operator */,
        address /* from */,
        uint256 /* id */,
        uint256 /* value */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    /**
     * @notice Handle the receipt of multiple ERC1155 token types
     * @dev Called at the end of safeBatchTransferFrom after the balances have been updated
     * @return bytes4 `IERC1155Receiver.onERC1155BatchReceived.selector` if transfer is allowed
     */
    function onERC1155BatchReceived(
        address /* operator */,
        address /* from */,
        uint256[] calldata /* ids */,
        uint256[] calldata /* values */,
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    /**
     * @notice Query if a contract implements an interface
     * @param interfaceId The interface identifier
     * @return bool True if the contract implements interfaceId
     */
    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return 
            interfaceId == type(IERC1155Receiver).interfaceId ||
            interfaceId == type(IERC165).interfaceId;
    }
}

