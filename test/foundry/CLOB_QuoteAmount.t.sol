// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { CLOBLib } from 'contracts/diamond/libraries/CLOBLib.sol';

/**
 * @title CLOB_QuoteAmount_Test
 * @notice Comprehensive unit tests for CLOB quote amount calculations
 * @dev Tests CLOBLib.calculateQuoteAmount and related math operations
 * 
 * Key invariants tested:
 * 1. quoteAmount = price * amount (no precision loss)
 * 2. No overflow for reasonable values
 * 3. Edge cases handled correctly
 * 
 * Price format: wei (1e18 = 1 token)
 * Amount format: units (raw count, not in wei)
 */
contract CLOB_QuoteAmount_Test is Test {
    
    // =========================================================================
    // BASIC CALCULATION TESTS
    // =========================================================================
    
    /**
     * @notice Test standard quote amount calculation
     * @dev price = 30 AURA (30e18), amount = 1 unit => quoteAmount = 30e18
     */
    function test_CalculateQuoteAmount_StandardValues() public pure {
        uint96 price = 30e18; // 30 AURA per unit
        uint96 amount = 1;    // 1 unit
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 30e18, "Quote amount should be 30e18 (30 AURA)");
    }
    
    /**
     * @notice Test quote amount with multiple units
     * @dev price = 30 AURA, amount = 10 units => quoteAmount = 300 AURA
     */
    function test_CalculateQuoteAmount_MultipleUnits() public pure {
        uint96 price = 30e18; // 30 AURA per unit
        uint96 amount = 10;   // 10 units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 300e18, "Quote amount should be 300e18 (300 AURA)");
    }
    
    /**
     * @notice Test quote amount with fractional price
     * @dev price = 30.5 AURA (30.5e18), amount = 2 units => quoteAmount = 61 AURA
     */
    function test_CalculateQuoteAmount_FractionalPrice() public pure {
        uint96 price = 30.5e18; // 30.5 AURA per unit
        uint96 amount = 2;      // 2 units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 61e18, "Quote amount should be 61e18 (61 AURA)");
    }
    
    /**
     * @notice Test quote amount with very small price
     * @dev price = 0.001 AURA (1e15), amount = 1000 units => quoteAmount = 1 AURA
     */
    function test_CalculateQuoteAmount_SmallPrice() public pure {
        uint96 price = 1e15;  // 0.001 AURA per unit
        uint96 amount = 1000; // 1000 units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 1e18, "Quote amount should be 1e18 (1 AURA)");
    }
    
    /**
     * @notice Test quote amount with minimum values
     * @dev price = 1 wei, amount = 1 unit => quoteAmount = 1 wei
     */
    function test_CalculateQuoteAmount_MinimumValues() public pure {
        uint96 price = 1;  // 1 wei per unit
        uint96 amount = 1; // 1 unit
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 1, "Quote amount should be 1 wei");
    }
    
    /**
     * @notice Test quote amount with zero price
     * @dev price = 0, amount = 100 units => quoteAmount = 0
     */
    function test_CalculateQuoteAmount_ZeroPrice() public pure {
        uint96 price = 0;
        uint96 amount = 100;
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 0, "Quote amount should be 0 for zero price");
    }
    
    /**
     * @notice Test quote amount with zero amount
     * @dev price = 100e18, amount = 0 => quoteAmount = 0
     */
    function test_CalculateQuoteAmount_ZeroAmount() public pure {
        uint96 price = 100e18;
        uint96 amount = 0;
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 0, "Quote amount should be 0 for zero amount");
    }
    
    // =========================================================================
    // OVERFLOW PROTECTION TESTS
    // =========================================================================
    
    /**
     * @notice Test that max uint96 values don't overflow
     * @dev uint96.max * 1 should fit in uint256
     */
    function test_CalculateQuoteAmount_MaxPriceSingleUnit() public pure {
        uint96 price = type(uint96).max; // ~79 billion * 1e18
        uint96 amount = 1;
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, uint256(type(uint96).max), "Should handle max price");
    }
    
    /**
     * @notice Test that moderate values don't overflow
     * @dev 1e18 * 1e9 = 1e27, well within uint256
     */
    function test_CalculateQuoteAmount_LargeButSafeValues() public pure {
        uint96 price = 1e18;         // 1 AURA per unit
        uint96 amount = 1_000_000_000; // 1 billion units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 1e27, "Quote amount should be 1e27");
    }
    
    /**
     * @notice Test with realistic large order
     * @dev price = 1000 AURA, amount = 1 million => 1 billion AURA
     */
    function test_CalculateQuoteAmount_RealisticLargeOrder() public pure {
        uint96 price = 1000e18;    // 1000 AURA per unit
        uint96 amount = 1_000_000; // 1 million units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        assertEq(quoteAmount, 1_000_000_000e18, "Quote amount should be 1 billion AURA");
    }
    
    // =========================================================================
    // FUZZ TESTS
    // =========================================================================
    
    /**
     * @notice Fuzz test for quote amount calculation
     * @dev Verify quoteAmount = price * amount for all inputs
     */
    function testFuzz_CalculateQuoteAmount(uint96 price, uint96 amount) public pure {
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        // Verify the multiplication is correct
        assertEq(quoteAmount, uint256(price) * uint256(amount), "Quote amount should equal price * amount");
    }
    
    /**
     * @notice Fuzz test for bounded realistic values
     * @dev Test with prices 0.01-10000 AURA and amounts 1-1M
     */
    function testFuzz_CalculateQuoteAmount_Bounded(uint96 price, uint96 amount) public pure {
        // Bound to realistic ranges
        price = uint96(bound(price, 0.01e18, 10000e18)); // 0.01 to 10000 AURA
        amount = uint96(bound(amount, 1, 1_000_000));    // 1 to 1M units
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        
        // Sanity checks
        assertGe(quoteAmount, price, "Quote should be >= price for amount >= 1");
        assertEq(quoteAmount, uint256(price) * uint256(amount), "Math should be exact");
    }
    
    // =========================================================================
    // PRECISION TESTS
    // =========================================================================
    
    /**
     * @notice Verify no precision loss in calculation
     * @dev Important: price is in wei, amount is in units
     */
    function test_CalculateQuoteAmount_NoPrecisionLoss() public pure {
        // Test with values that could cause precision issues in floating point
        uint96 price = 33333333333333333333; // ~33.33 AURA (repeating decimal)
        uint96 amount = 3;
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, amount);
        uint256 expected = uint256(price) * uint256(amount);
        
        assertEq(quoteAmount, expected, "Should have no precision loss");
        assertEq(quoteAmount, 99999999999999999999, "Exact value check");
    }
    
    /**
     * @notice Test that calculation is commutative (conceptually, not in API)
     * @dev 10 * 30 should equal 30 * 10 when swapped
     */
    function test_CalculateQuoteAmount_Commutative() public pure {
        uint96 a = 10e18;
        uint96 b = 30;
        
        uint256 quoteAmount1 = CLOBLib.calculateQuoteAmount(a, b);
        uint256 quoteAmount2 = CLOBLib.calculateQuoteAmount(b, a);
        
        assertEq(quoteAmount1, quoteAmount2, "Multiplication should be commutative");
    }
    
    // =========================================================================
    // TRADE SCENARIO TESTS
    // =========================================================================
    
    /**
     * @notice Simulate a buy order matching a sell order
     * @dev Buyer pays quoteAmount to receive amount of base tokens
     */
    function test_TradeScenario_BuyerPaysCorrectAmount() public pure {
        // Sell order: 30 tokens @ 30 AURA each
        uint96 sellPrice = 30e18;
        uint96 sellAmount = 30;
        
        // Buy order: wants 1 token @ 30 AURA
        uint96 buyPrice = 30e18;
        uint96 buyAmount = 1;
        
        // Buyer should pay exactly 30 AURA for 1 token
        uint256 buyerPays = CLOBLib.calculateQuoteAmount(buyPrice, buyAmount);
        
        assertEq(buyerPays, 30e18, "Buyer should pay 30 AURA for 1 token at 30 AURA/token");
    }
    
    /**
     * @notice Simulate partial fill scenario
     * @dev Seller has 100 tokens, buyer wants 30
     */
    function test_TradeScenario_PartialFill() public pure {
        uint96 price = 25e18;     // 25 AURA per token
        uint96 fillAmount = 30;   // Partial fill of 30 tokens
        
        uint256 quoteAmount = CLOBLib.calculateQuoteAmount(price, fillAmount);
        
        assertEq(quoteAmount, 750e18, "Partial fill should cost 750 AURA (30 * 25)");
    }
    
    /**
     * @notice Simulate price improvement scenario
     * @dev Buyer bids 35, seller asks 30, trade at 30 (seller's price)
     */
    function test_TradeScenario_PriceImprovement() public pure {
        uint96 sellPrice = 30e18; // Seller's ask
        uint96 buyPrice = 35e18;  // Buyer's bid (higher)
        uint96 amount = 10;
        
        // Trade executes at maker (seller) price
        uint256 tradeQuoteAmount = CLOBLib.calculateQuoteAmount(sellPrice, amount);
        
        // Buyer would have paid this at their bid
        uint256 buyerMaxQuoteAmount = CLOBLib.calculateQuoteAmount(buyPrice, amount);
        
        // Buyer saves the difference
        uint256 savings = buyerMaxQuoteAmount - tradeQuoteAmount;
        
        assertEq(tradeQuoteAmount, 300e18, "Trade should cost 300 AURA at seller's price");
        assertEq(savings, 50e18, "Buyer should save 50 AURA from price improvement");
    }
    
    // =========================================================================
    // GAS OPTIMIZATION TESTS
    // =========================================================================
    
    /**
     * @notice Ensure calculation is gas efficient
     * @dev Simple multiplication should be cheap
     */
    function test_CalculateQuoteAmount_GasEfficient() public {
        uint96 price = 30e18;
        uint96 amount = 100;
        
        uint256 gasBefore = gasleft();
        CLOBLib.calculateQuoteAmount(price, amount);
        uint256 gasUsed = gasBefore - gasleft();
        
        // Should use less than 100 gas (just a multiplication)
        assertLt(gasUsed, 100, "Calculation should be gas efficient");
        
        console2.log("Gas used for calculateQuoteAmount:", gasUsed);
    }
}
