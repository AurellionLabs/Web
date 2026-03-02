// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { OrderRouterFacet } from 'contracts/diamond/facets/OrderRouterFacet.sol';
import { IDiamondCut } from 'contracts/diamond/interfaces/IDiamondCut.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { ERC1155Mock } from './helpers/ERC1155Mock.sol';

contract OrderRouterFacetSecurityTest is DiamondTestBase {
    
    OrderRouterFacet public orderRouterFacet;
    ERC1155Mock public mockERC1155;
    
    function setUp() public override {
        super.setUp();
        
        // Deploy OrderRouterFacet and register it with the diamond
        vm.startPrank(owner);
        orderRouterFacet = new OrderRouterFacet();
        _addFacet(address(orderRouterFacet), _getOrderRouterSelectors());
        vm.stopPrank();

        // Deploy additional mock
        mockERC1155 = new ERC1155Mock();
    }

    function _getOrderRouterSelectors() internal pure returns (bytes4[] memory) {
        bytes4[] memory selectors = new bytes4[](9);
        selectors[0] = OrderRouterFacet.placeOrder.selector;
        selectors[1] = OrderRouterFacet.placeNodeSellOrder.selector;
        selectors[2] = OrderRouterFacet.placeMarketOrder.selector;
        selectors[3] = OrderRouterFacet.placeBuyOrder.selector;
        selectors[4] = OrderRouterFacet.placeSellOrder.selector;
        selectors[5] = OrderRouterFacet.cancelOrder.selector;
        selectors[6] = OrderRouterFacet.cancelOrders.selector;
        selectors[7] = OrderRouterFacet.getOrder.selector;
        selectors[8] = OrderRouterFacet.getBestPrices.selector;
        return selectors;
    }
    
    /// @notice Test that placeNodeSellOrder reverts when caller is not node owner or approved
    function testPlaceNodeSellOrder_AccessControl() public {
        // Arrange: Setup a mock node with inventory
        address nodeOwner = makeAddr("nodeOwner");
        address attacker = makeAddr("attacker");
        
        // Give the attacker some tokens they might try to use
        mockERC1155.mint(attacker, 1, 100);
        
        // Act & Assert: Attacker should not be able to place node sell order for someone else
        vm.prank(attacker);
        vm.expectRevert(OrderRouterFacet.NotNodeOwnerOrApproved.selector);
        OrderRouterFacet(address(diamond)).placeNodeSellOrder(
            nodeOwner,
            address(mockERC1155),
            1,
            address(quoteToken),
            1000,
            10,
            0,
            0
        );
    }
    
    /// @notice Test that placeNodeSellOrder works when caller is node owner (passes access control)
    function testPlaceNodeSellOrder_OwnerCanPlace() public {
        // Arrange
        address nodeOwner = makeAddr("nodeOwner");
        
        // Give node owner some tokens 
        mockERC1155.mint(nodeOwner, 1, 100);
        
        // Act: Node owner calling for themselves should pass access control.
        // It will revert on market-not-existing or another business rule, but NOT
        // with NotNodeOwnerOrApproved.
        vm.prank(nodeOwner);
        // We expect a revert, but NOT the access-control one — any other revert is fine.
        // The simplest way: call and catch, then verify the revert is not the access control error.
        bool reverted = false;
        bytes memory revertData;
        try OrderRouterFacet(address(diamond)).placeNodeSellOrder(
            nodeOwner,
            address(mockERC1155),
            1,
            address(quoteToken),
            1000,
            10,
            0,
            0
        ) {
            // No revert — access control definitely passed
        } catch (bytes memory data) {
            reverted = true;
            revertData = data;
        }

        if (reverted) {
            // Must NOT be the NotNodeOwnerOrApproved selector
            bytes4 gotSelector;
            if (revertData.length >= 4) {
                assembly {
                    gotSelector := mload(add(revertData, 32))
                }
            }
            assertFalse(
                gotSelector == OrderRouterFacet.NotNodeOwnerOrApproved.selector,
                "Owner should not get NotNodeOwnerOrApproved error"
            );
        }
    }
}
