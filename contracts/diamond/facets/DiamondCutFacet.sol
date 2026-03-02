// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondCut } from '../interfaces/IDiamondCut.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';

/**
 * @title DiamondCutFacet
 * @notice Required facet for managing facet additions, replacements, and removals
 * @dev Implements EIP-2535 Diamond Cut interface
 */
contract DiamondCutFacet is IDiamondCut {
    /// @notice Add/replace/remove any number of functions and optionally execute
    ///         an initialization function.
    /// @param _diamondCut Contains the facet addresses and function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and arguments
    function diamondCut(
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) external override {
        LibDiamond.diamondCut(_diamondCut, _init, _calldata);
    }
}
