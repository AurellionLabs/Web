// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondLoupe } from '../interfaces/IDiamondLoupe.sol';
import { LibDiamond } from '../libraries/LibDiamond.sol';
import { AppStorage } from '../storage/AppStorage.sol';

/**
 * @title DiamondLoupeFacet
 * @notice Recommended facet for inspecting diamond state
 * @dev Implements EIP-2535 Diamond Loupe interface
 */
contract DiamondLoupeFacet is IDiamondLoupe, AppStorage {
    /// @notice Gets all facets and their selectors.
    function facets()
        external
        view
        override
        returns (Facet[] memory facets_)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        facets_ = new Facet[](numFacets);

        for (uint256 i; i < numFacets; i++) {
            address facetAddress_ = ds.facetAddresses[i];
            facets_[i].facetAddress = facetAddress_;
            facets_[i].functionSelectors = ds.facetFunctionSelectors[facetAddress_];
        }
    }

    /// @notice Gets all the function selectors provided by a facet.
    function facetFunctionSelectors(address _facet)
        external
        view
        override
        returns (bytes4[] memory selectors_)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        selectors_ = ds.facetFunctionSelectors[_facet];
    }

    /// @notice Gets all the facet addresses used by a diamond.
    function facetAddresses()
        external
        view
        override
        returns (address[] memory facetAddresses_)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddresses_ = ds.facetAddresses;
    }

    /// @notice Gets the facet that supports the given selector.
    /// @dev If no facet is found, returns address(0)
    function facetAddress(bytes4 _functionSelector)
        external
        view
        override
        returns (address facetAddress_)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_functionSelector]
            .facetAddress;
    }

    /// @notice Gets selector, facet address, and selector's position in selector array
    function selectorToFacetAndPosition(bytes4 _selector)
        external
        view
        override
        returns (address facetAddress_, uint16 selectorPosition_)
    {
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        facetAddress_ = ds.selectorToFacetAndPosition[_selector].facetAddress;
        selectorPosition_ = ds.selectorToFacetAndPosition[_selector]
            .selectorPosition;
    }
}

