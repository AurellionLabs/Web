// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { DiamondCutFacet } from 'contracts/diamond/facets/DiamondCutFacet.sol';
import { DiamondLoupeFacet } from 'contracts/diamond/facets/DiamondLoupeFacet.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';

contract DiamondCutFacetTimelockTest is DiamondTestBase {
    DiamondCutFacet internal cutFacet;
    address internal pendingFacet;

    function setUp() public override {
        super.setUp();
        cutFacet = DiamondCutFacet(address(diamond));
    }

    function test_defaultDiamondCutTimelock_isZero() public view {
        assertEq(cutFacet.getDiamondCutTimelock(), 0);
    }

    function test_diamondCut_executesImmediatelyWhenTimelockIsZero() public {
        IDiamondCut.FacetCut[] memory cut = _ordersFacetCut();

        vm.prank(owner);
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');

        bytes4 selector = TimelockTestFacet.ping.selector;
        assertEq(DiamondLoupeFacet(address(diamond)).facetAddress(selector), pendingFacet);
    }

    function test_diamondCut_requiresDelayToElapse_afterTimelockIsEnabled() public {
        vm.prank(owner);
        cutFacet.scheduleDiamondCutTimelockChange(3 days);

        vm.prank(owner);
        cutFacet.executeDiamondCutTimelockChange();

        assertEq(cutFacet.getDiamondCutTimelock(), 3 days);

        IDiamondCut.FacetCut[] memory cut = _ordersFacetCut();

        vm.prank(owner);
        cutFacet.scheduleDiamondCut(cut, address(0), '');

        vm.prank(owner);
        vm.expectRevert();
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');

        vm.warp(block.timestamp + cutFacet.getDiamondCutTimelock());
        vm.prank(owner);
        IDiamondCut(address(diamond)).diamondCut(cut, address(0), '');

        bytes4 selector = TimelockTestFacet.ping.selector;
        assertEq(DiamondLoupeFacet(address(diamond)).facetAddress(selector), pendingFacet);
    }

    function test_timelockChange_executesImmediatelyWhenCurrentDelayIsZero() public {
        vm.prank(owner);
        cutFacet.scheduleDiamondCutTimelockChange(3 days);

        vm.prank(owner);
        cutFacet.executeDiamondCutTimelockChange();

        assertEq(cutFacet.getDiamondCutTimelock(), 3 days);
    }

    function _ordersFacetCut() internal returns (IDiamondCut.FacetCut[] memory cut) {
        TimelockTestFacet facet = new TimelockTestFacet();
        pendingFacet = address(facet);
        bytes4[] memory selectors = new bytes4[](1);
        selectors[0] = TimelockTestFacet.ping.selector;

        cut = new IDiamondCut.FacetCut[](1);
        cut[0] = IDiamondCut.FacetCut({
            facetAddress: address(facet),
            action: IDiamondCut.FacetCutAction.Add,
            functionSelectors: selectors
        });
    }
}

contract TimelockTestFacet {
    function ping() external pure returns (bytes4) {
        return this.ping.selector;
    }
}
