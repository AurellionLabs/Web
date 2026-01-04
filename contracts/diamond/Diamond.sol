// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Based on EIP-2535 Diamonds reference implementation
// https://github.com/mudgen/diamond-1
// https://eips.ethereum.org/EIPS/eip-2535

import { IDiamondCut } from './interfaces/IDiamondCut.sol';
import { LibDiamond } from './libraries/LibDiamond.sol';

/**
 * @title Diamond
 * @notice EIP-2535 Diamond Proxy Contract
 * @dev The Diamond is a proxy contract that delegates calls to facets.
 */
contract Diamond {
    /**
     * @notice Diamond constructor
     * @param _contractOwner The address that will own the Diamond
     * @param _diamondCutFacet The address of the DiamondCutFacet
     */
    constructor(address _contractOwner, address _diamondCutFacet) {
        LibDiamond.setContractOwner(_contractOwner);
        
        // Add DiamondCutFacet
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = IDiamondCut.diamondCut.selector;
        
        IDiamondCut.FacetCut[] memory cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: _diamondCutFacet,
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
        
        LibDiamond.diamondCut(cut, address(0), '');
    }

    /**
     * @notice Fallback function that delegates calls to facets
     */
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddr;
        require(facet != address(0), 'Diamond: Function does not exist');
        
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}
}
