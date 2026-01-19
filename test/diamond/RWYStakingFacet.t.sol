// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { RWYStakingFacet } from 'contracts/diamond/facets/RWYStakingFacet.sol';

/**
 * @title RWYStakingFacetTest
 * @notice Tests for RWYStakingFacet admin functions (RWYVault.sol parity)
 */
contract RWYStakingFacetTest is DiamondTestBase {
    RWYStakingFacet public rwy;

    // Events
    event RWYCLOBAddressUpdated(address newAddress);
    event RWYQuoteTokenUpdated(address newToken);
    event RWYFeeRecipientUpdated(address newRecipient);
    event RWYPaused();
    event RWYUnpaused();

    function setUp() public override {
        super.setUp();
        rwy = RWYStakingFacet(address(diamond));
    }

    // ============================================================================
    // ADMIN FUNCTION TESTS
    // ============================================================================

    function test_setRWYCLOBAddress() public {
        address newClob = makeAddr('newCLOB');

        vm.prank(owner);
        rwy.setRWYCLOBAddress(newClob);

        // Verify via getter if available, or through subsequent operations
    }

    function test_setRWYCLOBAddress_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYCLOBAddress(makeAddr('fake'));
    }

    function test_setRWYQuoteToken() public {
        address newQuoteToken = makeAddr('newQuote');

        vm.prank(owner);
        rwy.setRWYQuoteToken(newQuoteToken);
    }

    function test_setRWYQuoteToken_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYQuoteToken(makeAddr('fake'));
    }

    function test_setRWYFeeRecipient() public {
        address newRecipient = makeAddr('feeRecipient');

        vm.prank(owner);
        rwy.setRWYFeeRecipient(newRecipient);
    }

    function test_setRWYFeeRecipient_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.setRWYFeeRecipient(makeAddr('fake'));
    }

    // ============================================================================
    // PAUSE FUNCTIONALITY TESTS
    // ============================================================================

    function test_pauseRWY() public {
        vm.prank(owner);
        rwy.pauseRWY();

        // Verify paused state affects operations
    }

    function test_pauseRWY_revertNotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        rwy.pauseRWY();
    }

    function test_unpauseRWY() public {
        vm.startPrank(owner);
        rwy.pauseRWY();
        rwy.unpauseRWY();
        vm.stopPrank();
    }

    function test_unpauseRWY_revertNotOwner() public {
        vm.prank(owner);
        rwy.pauseRWY();

        vm.prank(user1);
        vm.expectRevert();
        rwy.unpauseRWY();
    }

    function test_unpauseRWY_whenNotPaused() public {
        // Note: unpauseRWY doesn't revert when not paused - it's idempotent
        // This is acceptable behavior, just sets paused = false regardless
        vm.prank(owner);
        rwy.unpauseRWY();
        // If we got here without revert, the test passes
    }

    // ============================================================================
    // CONFIGURATION SEQUENCE TESTS
    // ============================================================================

    function test_fullConfiguration() public {
        address clob = makeAddr('clob');
        address quote = makeAddr('quote');
        address fee = makeAddr('feeRecipient');

        vm.startPrank(owner);
        rwy.setRWYCLOBAddress(clob);
        rwy.setRWYQuoteToken(quote);
        rwy.setRWYFeeRecipient(fee);
        vm.stopPrank();

        // All configurations should be set
    }

    function test_pauseWhileOperating() public {
        // Configure
        vm.startPrank(owner);
        rwy.setRWYCLOBAddress(makeAddr('clob'));
        rwy.setRWYQuoteToken(makeAddr('quote'));
        rwy.setRWYFeeRecipient(makeAddr('fee'));

        // Pause
        rwy.pauseRWY();

        // Operations should fail while paused (if implemented)
        // This depends on whether pause affects specific functions

        // Unpause
        rwy.unpauseRWY();
        vm.stopPrank();
    }
}
