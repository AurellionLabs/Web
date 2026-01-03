// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IDiamondCut } from '../interfaces/IDiamondCut.sol';

library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256('diamond.standard.diamond.storage');

    struct FacetAndPosition {
        address facetAddr;
        uint16 selectorPos;
    }

    struct DiamondStorage {
        mapping(bytes4 => FacetAndPosition) selectorToFacetAndPosition;
        mapping(address => bytes4[]) facetFunctionSelectors;
        address[] facetAddresses;
        mapping(address => bool) facetsInitialized;
        address contractOwner;
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
        address prevOwner = ds.contractOwner;
        ds.contractOwner = _newOwner;
        emit OwnershipTransferred(prevOwner, _newOwner);
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

        uint16 selPosition = uint16(
            ds.facetFunctionSelectors[_facetCut.facetAddress].length
        );

        ds.facetAddresses.push(_facetCut.facetAddress);

        for (uint256 i; i < _facetCut.functionSelectors.length; i++) {
            bytes4 selector = _facetCut.functionSelectors[i];
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddr;

            require(
                oldFacet == address(0),
                'LibDiamond: Selector already exists'
            );

            ds.selectorToFacetAndPosition[selector] = FacetAndPosition({
                facetAddr: _facetCut.facetAddress,
                selectorPos: selPosition
            });

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
            address oldFacet = ds.selectorToFacetAndPosition[selector].facetAddr;

            require(
                oldFacet != address(0),
                'LibDiamond: Selector not found'
            );

            ds.selectorToFacetAndPosition[selector].facetAddr = _facetCut.facetAddress;
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
            address facetAddr = ds.selectorToFacetAndPosition[selector].facetAddr;

            require(
                facetAddr != address(0),
                'LibDiamond: Selector not found'
            );

            bytes4[] storage facetFuncSelectors = ds.facetFunctionSelectors[facetAddr];
            uint256 selPos = ds.selectorToFacetAndPosition[selector].selectorPos;
            uint256 lastSelPos = facetFuncSelectors.length - 1;

            if (selPos != lastSelPos) {
                bytes4 lastSelector = facetFuncSelectors[lastSelPos];
                facetFuncSelectors[selPos] = lastSelector;
                ds.selectorToFacetAndPosition[lastSelector].selectorPos = uint16(selPos);
            }

            facetFuncSelectors.pop();

            delete ds.selectorToFacetAndPosition[selector];

            if (facetFuncSelectors.length == 0) {
                address[] storage facetAddrs = ds.facetAddresses;
                for (uint256 j; j < facetAddrs.length; j++) {
                    if (facetAddrs[j] == facetAddr) {
                        facetAddrs[j] = facetAddrs[facetAddrs.length - 1];
                        facetAddrs.pop();
                        break;
                    }
                }
                delete ds.facetFunctionSelectors[facetAddr];
            }
        }
    }

    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        IDiamondCut.FacetCutAction action = IDiamondCut.FacetCutAction.Add;
        for (uint256 i; i < _diamondCut.length; i++) {
            action = _diamondCut[i].action;
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFacet(_diamondCut[i]);
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFacet(_diamondCut[i]);
            }
        }

        initializeDiamondCut(_init, _calldata);
    }

    function initializeDiamondCut(address _init, bytes memory _calldata) internal {
        if (_init == address(0)) {
            require(
                _calldata.length == 0,
                'LibDiamond: _calldata has data but _init is address(0)'
            );
        } else {
            require(
                _calldata.length > 0,
                'LibDiamond: _calldata is empty but _init is not address(0)'
            );
            (bool success, ) = _init.delegatecall(_calldata);
            require(
                success,
                'LibDiamond: _init function failed'
            );
        }
    }

    function facetAddress(bytes4 _selector) internal view returns (address facetAddr_) {
        facetAddr_ = diamondStorage().selectorToFacetAndPosition[_selector].facetAddr;
    }

    function facetFunctionSelectors(address _facetAddr) internal view returns (bytes4[] memory funcSelectors_) {
        funcSelectors_ = diamondStorage().facetFunctionSelectors[_facetAddr];
    }

    function facetAddresses() internal view returns (address[] memory facetAddrs_) {
        facetAddrs_ = diamondStorage().facetAddresses;
    }

    function selectorPosition(bytes4 _selector) internal view returns (uint16 selPos_) {
        selPos_ = diamondStorage().selectorToFacetAndPosition[_selector].selectorPos;
    }

    function selectors() internal view returns (bytes4[] memory selrs_) {
        DiamondStorage storage ds = diamondStorage();
        uint256 numFacets = ds.facetAddresses.length;
        uint256 totalSelectors;
        
        for (uint256 i; i < numFacets; i++) {
            totalSelectors += ds.facetFunctionSelectors[ds.facetAddresses[i]].length;
        }
        
        selrs_ = new bytes4[](totalSelectors);
        uint256 index;
        for (uint256 i; i < numFacets; i++) {
            address facetAddr = ds.facetAddresses[i];
            bytes4[] memory funcs = ds.facetFunctionSelectors[facetAddr];
            for (uint256 j; j < funcs.length; j++) {
                selrs_[index] = funcs[j];
                index++;
            }
        }
    }
}
