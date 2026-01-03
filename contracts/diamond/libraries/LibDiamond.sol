// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondCut } from '../interfaces/IDiamondCut.sol';

library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256('diamond.standard.diamond.storage');

    struct DiamondStorage {
        // Maps function selectors to the facet addresses and selector position
        mapping(bytes4 => bytes32) selectorToFacetAndPosition;
        // Maps facet addresses to function selectors
        mapping(address => bytes4[]) facetFunctionSelectors;
        // Facet addresses
        address[] facetAddresses;
        // Used to check if facets are initialized
        mapping(address => bool) facetsInitialized;
        // Contract owner
        address contractOwner;
        // Mapping from address to ERC173 owned contract
        mapping(address => address) ownership;
    }

    function diamondStorage() internal pure returns (DiamondStorage storage ds) {
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            ds.slot := position
        }
    }

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    function setContractOwner(address _newOwner) internal {
        DiamondStorage storage ds = diamondStorage();
        address previousOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    function enforceIsContractOwner() internal view {
        require(
            msg.sender == diamondStorage().contractOwner,
            'LibDiamond: Must be contract owner'
        );
    }

    function addFacet(IDiamondCut.FacetCut memory _facetCut) internal {
        require(
            _facetCut.action == IDiamondCut.FacetCutAction.Add,
            'LibDiamond: Invalid action'
        );
        DiamondStorage storage ds = diamondStorage();

        require(
            _facetCut.facetAddress != address(0),
            'LibDiamond: Add facet address is zero'
        );
        require(
            _facetCut.functionSelectors.length > 0,
            'LibDiamond: No selectors provided'
        );

        uint16 selectorPosition = uint16(
            ds.facetFunctionSelectors[_facetCut.facetAddress].length
        );

        // Add facet address
        ds.facetAddresses.push(_facetCut.facetAddress);

        // Add function selectors
        for (uint256 i; i < _facetCut.functionSelectors.length; i++) {
            bytes4 selector = _facetCut.functionSelectors[i];
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddress;

            require(
                oldFacet == address(0),
                'LibDiamond: Selector already exists'
            );

            ds.selectorToFacetAndPosition[selector] = bytes32(
                uint256(uint160(_facetCut.facetAddress)) | selectorPosition
            );

            ds.facetFunctionSelectors[_facetCut.facetAddress].push(selector);
        }
    }

    function replaceFacet(IDiamondCut.FacetCut memory _facetCut) internal {
        require(
            _facetCut.action == IDiamondCut.FacetCutAction.Replace,
            'LibDiamond: Invalid action'
        );
        DiamondStorage storage ds = diamondStorage();

        require(
            _facetCut.facetAddress != address(0),
            'LibDiamond: Replace facet address is zero'
        );
        require(
            _facetCut.functionSelectors.length > 0,
            'LibDiamond: No selectors provided'
        );

        for (uint256 i; i < _facetCut.functionSelectors.length; i++) {
            bytes4 selector = _facetCut.functionSelectors[i];
            uint16 oldSelectorPosition = uint16(
                ds.selectorToFacetAndPosition[selector] & 0xFFFF
            );
            address oldFacetAddress = address(
                uint160(uint256(ds.selectorToFacetAndPosition[selector] >> 16))
            );

            // Only replace if different facet
            if (oldFacetAddress != _facetCut.facetAddress) {
                ds.selectorToFacetAndPosition[selector] = bytes32(
                    uint256(uint160(_facetCut.facetAddress)) | oldSelectorPosition
                );
            }
        }
    }

    function removeFacet(IDiamondCut.FacetCut memory _facetCut) internal {
        require(
            _facetCut.action == IDiamondCut.FacetCutAction.Remove,
            'LibDiamond: Invalid action'
        );
        DiamondStorage storage ds = diamondStorage();

        require(
            _facetCut.facetAddress == address(0),
            'LibDiamond: Remove facet address must be zero'
        );
        require(
            _facetCut.functionSelectors.length > 0,
            'LibDiamond: No selectors provided'
        );

        for (uint256 i; i < _facetCut.functionSelectors.length; i++) {
            bytes4 selector = _facetCut.functionSelectors[i];
            uint16 selectorPosition = uint16(
                ds.selectorToFacetAndPosition[selector] & 0xFFFF
            );
            address facetAddress = address(
                uint160(uint256(ds.selectorToFacetAndPosition[selector] >> 16))
            );

            // Remove selector
            uint256 lastSelectorIndex = ds
                .facetFunctionSelectors[facetAddress].length - 1;
            bytes4 lastSelector = ds.facetFunctionSelectors[facetAddress][
                lastSelectorIndex
            ];

            ds.facetFunctionSelectors[facetAddress][selectorPosition] = lastSelector;
            ds.facetFunctionSelectors[facetAddress].pop();

            ds.selectorToFacetAndPosition[lastSelector] = bytes32(
                uint256(uint160(facetAddress)) | selectorPosition
            );

            ds.selectorToFacetAndPosition[selector] = 0;
        }
    }

    function diamondCut(
        IDiamondCut.FacetCut[] calldata _diamondCut,
        address _init,
        bytes calldata _calldata
    ) internal {
        for (uint256 i; i < _diamondCut.length; i++) {
            IDiamondCut.FacetCutAction action = _diamondCut[i].action;

            if (action == IDiamondCut.FacetCutAction.Add) {
                addFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFacet(_diamondCut[i]);
            }
        }

        emit IDiamondCut.DiamondCut(_diamondCut, _init, _calldata);

        if (_init != address(0)) {
            require(
                _init.code.length > 0,
                'LibDiamond: _init address has no code'
            );
            (bool success, ) = _init.delegatecall(_calldata);
            require(success, 'LibDiamond: _init function reverted');
        }
    }

    function generateSelectors(string memory _facetName)
        internal
        pure
        returns (bytes4[] memory selectors)
    {
        // This would typically use a build script or external library
        // For now, return empty array
        selectors = new bytes4[](0);
    }
}

