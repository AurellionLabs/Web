// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondCut } from './interfaces/IDiamondCut.sol';
import { IDiamondLoupe } from './interfaces/IDiamondLoupe.sol';
import { IOwnership } from './interfaces/IOwnership.sol';
import { LibDiamond } from './libraries/LibDiamond.sol';
import { Initializable } from '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

/**
 * @title Diamond
 * @notice EIP-2535 Diamond Proxy Contract
 * @dev The Diamond is a proxy contract that delegates calls to facets
 */
contract Diamond is Initializable {
    constructor(address _contractOwner, address _diamondCutFacet) payable {
        LibDiamond.setContractOwner(_contractOwner);
        LibDiamond.diamondCut(
            IDiamondCut.FacetCut({
                facetAddress: _diamondCutFacet,
                action: IDiamondCut.FacetCutAction.Add,
                functionSelectors: LibDiamond.generateSelectors('_DiamondCutFacet')
            }),
            address(0),
            ''
        );
    }

    // Find facet for function that is called and execute the
    // function if facet is found and returns any value
    fallback() external payable {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();

        // Get facet from function selector
        address facet = ds.selectorToFacetAndPosition[msg.sig].facetAddress;

        require(facet != address(0), 'Diamond: Function does not exist');

        // Execute external function from facet using delegatecall
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), facet, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    receive() external payable {}
}

