// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library NodeVaultStorage {
    bytes32 internal constant NODE_VAULT_STORAGE_POSITION =
        keccak256('diamond.node.vault.storage');

    struct Layout {
        mapping(bytes32 => address) vaultByNode;
        mapping(address => bytes32) nodeByVault;
    }

    function layout() internal pure returns (Layout storage l) {
        bytes32 position = NODE_VAULT_STORAGE_POSITION;
        assembly {
            l.slot := position
        }
    }
}
