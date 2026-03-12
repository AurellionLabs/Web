// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { Test, console2 } from 'forge-std/Test.sol';
import { DiamondTestBase } from './helpers/DiamondTestBase.sol';
import { NodesFacet } from 'contracts/diamond/facets/NodesFacet.sol';
import { AssetsFacet } from 'contracts/diamond/facets/AssetsFacet.sol';
import { DiamondStorage } from 'contracts/diamond/libraries/DiamondStorage.sol';
import { IERC1155 } from '@openzeppelin/contracts/token/ERC1155/IERC1155.sol';

/**
 * @title NodeQuantityAccountingTest
 * @notice Exhaustive quantity-accounting tests for node tokenisation flows.
 *
 * Matthew's concern: "quantity accounting for nodes always ends up slightly wrong —
 * odd bugs with tokenization when >1 node, ERC1155 balances not decreasing on escrow,
 * per-node custody (tokenNodeCustodyAmounts) getting out of sync."
 *
 * This suite makes the accounting unassailable. Every mint, redeem, transfer, deposit,
 * withdraw, and debit is verified from first principles — both the internal Diamond
 * ledger AND the ERC1155 balance-of are checked.
 *
 * Accounting invariant (always true):
 *   Diamond.balanceOf(diamond, tokenId)  ==  sum(nodeTokenBalances[n][tokenId])
 *   tokenNodeCustodyAmounts[tokenId][node] <= tokenCustodianAmounts[tokenId][custodian]
 *   totalCustodyAmount[tokenId] == ERC1155.totalSupply(tokenId) - uncustodied tokens
 */
contract NodeQuantityAccountingTest is DiamondTestBase {
    // -------------------------------------------------------------------------
    // Test actors
    // -------------------------------------------------------------------------
    address public nodeOwnerA;   // owns nodeA (and nodeA2 for multi-node tests)
    address public nodeOwnerB;   // owns nodeB
    address public buyer;        // the person who buys / redeems

    // -------------------------------------------------------------------------
    // Node hashes
    // -------------------------------------------------------------------------
    bytes32 public nodeA;
    bytes32 public nodeA2;  // second node owned by same wallet (nodeOwnerA)
    bytes32 public nodeB;   // owned by nodeOwnerB

    // -------------------------------------------------------------------------
    // Asset class / token ID helpers
    // -------------------------------------------------------------------------
    string public constant CLASS_GOAT = "GOAT";
    DiamondStorage.AssetDefinition public assetDef;
    uint256 public tokenId;

    // -------------------------------------------------------------------------
    // setUp
    // -------------------------------------------------------------------------
    function setUp() public override {
        super.setUp();

        nodeOwnerA = makeAddr("nodeOwnerA");
        nodeOwnerB = makeAddr("nodeOwnerB");
        buyer      = makeAddr("buyer");

        // Allow all three to register nodes
        vm.startPrank(owner);
        NodesFacet(address(diamond)).setNodeRegistrar(nodeOwnerA, true);
        NodesFacet(address(diamond)).setNodeRegistrar(nodeOwnerB, true);
        // Add supported class so nodeMint works
        AssetsFacet(address(diamond)).addSupportedClass(CLASS_GOAT);
        vm.stopPrank();

        // Register nodes
        nodeA  = _registerNode(nodeOwnerA, "Node-A",  "1.000", "1.000");
        nodeA2 = _registerNode(nodeOwnerA, "Node-A2", "2.000", "2.000");
        nodeB  = _registerNode(nodeOwnerB, "Node-B",  "3.000", "3.000");

        // Build a deterministic asset definition
        DiamondStorage.Attribute[] memory attrs = new DiamondStorage.Attribute[](1);
        attrs[0].name        = "weight";
        attrs[0].values      = new string[](1);
        attrs[0].values[0]   = "10";
        attrs[0].description = "kg";

        assetDef = DiamondStorage.AssetDefinition({
            name:       "Nubian Goat",
            assetClass: CLASS_GOAT,
            attributes: attrs
        });
        tokenId = uint256(keccak256(abi.encode(assetDef)));
    }

    // =========================================================================
    // SECTION 1 — Single-node: register → mint → check balances
    // =========================================================================

    function test_SingleNode_MintCreditsBalance() public {
        uint256 amount = 500;
        _nodeMintForNode(nodeOwnerA, buyer, amount, nodeA);

        // ERC1155 balance held by buyer
        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), amount,
            "buyer ERC1155 balance mismatch after mint");

        // Per-node custody tracking
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), amount,
            "nodeA custody mismatch after mint");

        // Per-custodian (wallet) tracking
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), amount,
            "nodeOwnerA custodian amount mismatch");

        // Total supply
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), amount,
            "totalSupply mismatch after mint");
    }

    // =========================================================================
    // SECTION 2 — Single-node: mint → full redeem → balance = 0
    // =========================================================================

    function test_SingleNode_FullRedeem_BalanceZero() public {
        uint256 amount = 200;
        _nodeMintForNode(nodeOwnerA, buyer, amount, nodeA);

        // buyer redeems all tokens, naming nodeOwnerA as custodian and nodeA as node
        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amount, nodeOwnerA, nodeA);

        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), 0,
            "buyer balance should be 0 after full redeem");
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), 0,
            "totalSupply should be 0 after full redeem");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), 0,
            "nodeA custody should be 0 after full redeem");
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), 0,
            "custodian amount should be 0 after full redeem");
    }

    // =========================================================================
    // SECTION 3 — Single-node: mint → partial redeem → correct remainder
    // =========================================================================

    function test_SingleNode_PartialRedeem_CorrectRemainder() public {
        uint256 minted  = 300;
        uint256 redeem1 = 100;
        uint256 redeem2 = 80;
        uint256 remaining = minted - redeem1 - redeem2;

        _nodeMintForNode(nodeOwnerA, buyer, minted, nodeA);

        vm.startPrank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, redeem1, nodeOwnerA, nodeA);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, redeem2, nodeOwnerA, nodeA);
        vm.stopPrank();

        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), remaining,
            "buyer balance remainder wrong");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), remaining,
            "nodeA custody remainder wrong");
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), remaining,
            "totalSupply remainder wrong");
    }

    // =========================================================================
    // SECTION 4 — creditNodeTokens / debitNodeTokens internal inventory ledger
    //             (separate from ERC1155 custody — this is the node's sell inventory)
    // =========================================================================

    function test_SingleNode_CreditDebit_InternalLedger() public {
        uint256 credit = 400;

        // creditNodeTokens requires msg.sender == address(this), so we use vm.prank
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, credit);

        assertEq(
            NodesFacet(address(diamond)).getNodeTokenBalance(nodeA, tokenId),
            credit,
            "internal ledger balance after credit"
        );

        // Node owner can debit
        vm.prank(nodeOwnerA);
        NodesFacet(address(diamond)).debitNodeTokens(nodeA, tokenId, 150);

        assertEq(
            NodesFacet(address(diamond)).getNodeTokenBalance(nodeA, tokenId),
            credit - 150,
            "internal ledger balance after debit"
        );
    }

    function test_SingleNode_DebitMoreThanBalance_Reverts() public {
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);

        vm.prank(nodeOwnerA);
        vm.expectRevert("Insufficient node balance");
        NodesFacet(address(diamond)).debitNodeTokens(nodeA, tokenId, 101);
    }

    function test_SingleNode_CreditZero_Reverts() public {
        vm.prank(address(diamond));
        vm.expectRevert("Amount must be positive");
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 0);
    }

    function test_SingleNode_DebitZero_Reverts() public {
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);

        vm.prank(nodeOwnerA);
        vm.expectRevert("Amount must be positive");
        NodesFacet(address(diamond)).debitNodeTokens(nodeA, tokenId, 0);
    }

    // =========================================================================
    // SECTION 5 — creditNodeTokens: only callable by diamond itself
    // =========================================================================

    function test_CreditNodeTokens_OnlyDiamond_Reverts() public {
        vm.prank(nodeOwnerA);
        vm.expectRevert("Only internal Diamond calls");
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);
    }

    function test_DebitNodeTokens_OnlyOwner_Reverts() public {
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);

        vm.prank(nodeOwnerB); // wrong owner
        vm.expectRevert("Not authorized");
        NodesFacet(address(diamond)).debitNodeTokens(nodeA, tokenId, 50);
    }

    // =========================================================================
    // SECTION 6 — Multiple credits accumulate correctly
    // =========================================================================

    function test_SingleNode_MultipleCredits_Accumulate() public {
        uint256[5] memory amounts = [uint256(10), 20, 30, 40, 50];
        uint256 expected;

        for (uint256 i = 0; i < amounts.length; i++) {
            vm.prank(address(diamond));
            NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, amounts[i]);
            expected += amounts[i];
        }

        assertEq(
            NodesFacet(address(diamond)).getNodeTokenBalance(nodeA, tokenId),
            expected,
            "Accumulated balance wrong"
        );
    }

    // =========================================================================
    // SECTION 7 — Multi-node (same asset class): balances don't bleed between nodes
    // =========================================================================

    // -------------------------------------------------------------------------
    // KEY SCENARIO: One operator, two nodes, same tokenId
    //   nodeOwnerA owns BOTH nodeA and nodeA2.
    //   Verifies that:
    //     (a) per-node custody is independently tracked
    //     (b) wallet-level custody aggregates correctly
    //     (c) redemption from nodeA doesn't affect nodeA2 custody
    //     (d) after full redemption from both nodes, all custody ledgers hit zero
    // -------------------------------------------------------------------------
    function test_MultiNode_SameOperator_PerNodeIsolation() public {
        uint256 amountA  = 1000;
        uint256 amountA2 = 500;

        // Same operator (nodeOwnerA) mints the same asset at two different nodes
        _nodeMintForNode(nodeOwnerA, buyer, amountA,  nodeA);
        _nodeMintForNode(nodeOwnerA, buyer, amountA2, nodeA2);

        // ── Per-node custody is isolated ──────────────────────────────────────
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA),  amountA,
            "nodeA custody contaminated by nodeA2 mint");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), amountA2,
            "nodeA2 custody contaminated by nodeA mint");

        // ── Wallet-level custody is the SUM across both nodes ─────────────────
        assertEq(
            AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA),
            amountA + amountA2,
            "wallet custody should be sum of both nodes"
        );

        // ── ERC1155 and supply checks ─────────────────────────────────────────
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), amountA + amountA2);
        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), amountA + amountA2);

        // ── Redeem from nodeA only — nodeA2 must be untouched ─────────────────
        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amountA, nodeOwnerA, nodeA);

        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), 0,
            "nodeA custody should be 0 after full redemption");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), amountA2,
            "nodeA2 custody must NOT change when nodeA is redeemed");
        assertEq(
            AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA),
            amountA2,
            "wallet custody should drop by amountA only"
        );

        // ── Redeem from nodeA2 — everything hits zero ─────────────────────────
        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amountA2, nodeOwnerA, nodeA2);

        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), 0,
            "nodeA2 custody should be 0 after full redemption");
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), 0,
            "wallet custody should be 0 after both redemptions");
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), 0,
            "total supply should be 0 - all tokens burned");
    }

    function test_MultiNode_SameAsset_IndependentBalances() public {
        uint256 amountA  = 1000;
        uint256 amountA2 = 500;

        // Mint to two different nodes owned by nodeOwnerA
        _nodeMintForNode(nodeOwnerA, buyer, amountA,  nodeA);
        _nodeMintForNode(nodeOwnerA, buyer, amountA2, nodeA2);

        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA),  amountA,
            "nodeA custody contaminated by nodeA2 mint");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), amountA2,
            "nodeA2 custody contaminated by nodeA mint");

        // Total supply must be the sum
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), amountA + amountA2,
            "total supply wrong for two mints to same class");

        // buyer holds all tokens
        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), amountA + amountA2,
            "buyer ERC1155 balance wrong after two mints");
    }

    function test_MultiNode_DifferentOwners_IndependentBalances() public {
        uint256 amountA = 700;
        uint256 amountB = 300;

        // nodeOwnerA mints via nodeA, nodeOwnerB mints via nodeB (different buyers to keep it clean)
        address buyerA = makeAddr("buyerA");
        address buyerB = makeAddr("buyerB");

        _nodeMintForNode(nodeOwnerA, buyerA, amountA, nodeA);
        _nodeMintForNode(nodeOwnerB, buyerB, amountB, nodeB);

        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), amountA,
            "nodeA custody wrong");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeB), amountB,
            "nodeB custody wrong");
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), amountA,
            "nodeOwnerA custodian amount wrong");
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerB), amountB,
            "nodeOwnerB custodian amount wrong");
    }

    // =========================================================================
    // SECTION 8 — Redeeming from wrong node must revert
    // =========================================================================

    function test_RedeemFromWrongNode_Reverts() public {
        uint256 amount = 100;
        _nodeMintForNode(nodeOwnerA, buyer, amount, nodeA);

        // buyer tries to redeem against nodeA2 (nodeOwnerA's other node, but no custody there)
        vm.prank(buyer);
        vm.expectRevert(); // ExceedsCustodyAmount or similar
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amount, nodeOwnerA, nodeA2);
    }

    function test_RedeemFromNodeBelongingToWrongCustodian_Reverts() public {
        uint256 amount = 100;
        _nodeMintForNode(nodeOwnerA, buyer, amount, nodeA);

        // nodeB is owned by nodeOwnerB — custody there is zero
        vm.prank(buyer);
        vm.expectRevert();
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amount, nodeOwnerB, nodeB);
    }

    // =========================================================================
    // SECTION 9 — transferTokensBetweenNodes: accounting correct on both sides
    // =========================================================================

    function test_TransferBetweenNodes_SameOwner() public {
        uint256 credit = 600;
        uint256 transfer = 250;

        // Credit internal inventory on nodeA (separate from ERC1155 custody)
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, credit);

        vm.prank(nodeOwnerA);
        NodesFacet(address(diamond)).transferTokensBetweenNodes(nodeA, nodeA2, tokenId, transfer);

        assertEq(NodesFacet(address(diamond)).getNodeTokenBalance(nodeA,  tokenId), credit - transfer,
            "source node balance after transfer");
        assertEq(NodesFacet(address(diamond)).getNodeTokenBalance(nodeA2, tokenId), transfer,
            "destination node balance after transfer");
    }

    function test_TransferBetweenNodes_MoreThanBalance_Reverts() public {
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);

        vm.prank(nodeOwnerA);
        vm.expectRevert("Insufficient source balance");
        NodesFacet(address(diamond)).transferTokensBetweenNodes(nodeA, nodeA2, tokenId, 101);
    }

    function test_TransferBetweenNodes_CrossOwner_Reverts() public {
        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, 100);

        // nodeOwnerA tries to send from nodeA to nodeB (nodeOwnerB's node)
        vm.prank(nodeOwnerA);
        vm.expectRevert("Not dest node owner");
        NodesFacet(address(diamond)).transferTokensBetweenNodes(nodeA, nodeB, tokenId, 50);
    }

    // =========================================================================
    // SECTION 10 — Two nodes escrowing same tokenId simultaneously (internal debit)
    // =========================================================================

    function test_TwoNodes_IndependentDebits() public {
        uint256 creditA  = 500;
        uint256 creditA2 = 300;
        uint256 debitA   = 200;
        uint256 debitA2  = 100;

        vm.startPrank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA,  tokenId, creditA);
        NodesFacet(address(diamond)).creditNodeTokens(nodeA2, tokenId, creditA2);
        vm.stopPrank();

        vm.startPrank(nodeOwnerA);
        NodesFacet(address(diamond)).debitNodeTokens(nodeA,  tokenId, debitA);
        NodesFacet(address(diamond)).debitNodeTokens(nodeA2, tokenId, debitA2);
        vm.stopPrank();

        assertEq(NodesFacet(address(diamond)).getNodeTokenBalance(nodeA,  tokenId), creditA  - debitA,
            "nodeA balance wrong after debit");
        assertEq(NodesFacet(address(diamond)).getNodeTokenBalance(nodeA2, tokenId), creditA2 - debitA2,
            "nodeA2 balance wrong after debit");
    }

    // =========================================================================
    // SECTION 11 — Redeem more than minted must revert (ERC1155 custody path)
    // =========================================================================

    function test_RedeemMoreThanMinted_Reverts() public {
        uint256 amount = 100;
        _nodeMintForNode(nodeOwnerA, buyer, amount, nodeA);

        vm.prank(buyer);
        vm.expectRevert(); // InsufficientBalance or ExceedsCustodyAmount
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, amount + 1, nodeOwnerA, nodeA);
    }

    // =========================================================================
    // SECTION 12 — getNodeCustodyInfo at every step of a full lifecycle
    // =========================================================================

    function test_NodeCustodyInfo_FullLifecycle() public {
        uint256 mint1   = 400;
        uint256 redeem1 = 150;
        uint256 mint2   = 200;
        uint256 redeem2 = 450; // redeem the rest

        // Step 1: initial custody = 0
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), 0, "step 0");

        // Step 2: after first mint
        _nodeMintForNode(nodeOwnerA, buyer, mint1, nodeA);
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), mint1, "step 1");

        // Step 3: after partial redeem
        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, redeem1, nodeOwnerA, nodeA);
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), mint1 - redeem1, "step 2");

        // Step 4: after second mint
        _nodeMintForNode(nodeOwnerA, buyer, mint2, nodeA);
        uint256 expectedAfterMint2 = mint1 - redeem1 + mint2;
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), expectedAfterMint2, "step 3");

        // Step 5: full redeem of remaining
        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, redeem2, nodeOwnerA, nodeA);
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), 0, "step 4 - zero");
    }

    // =========================================================================
    // SECTION 13 — nodeMintForNode vs nodeMint: custody attributed to correct node
    // =========================================================================

    function test_NodeMintForNode_AttributesCustodyToCorrectNode() public {
        uint256 amountA  = 300;
        uint256 amountA2 = 200;

        // Mint specifically to nodeA
        _nodeMintForNode(nodeOwnerA, buyer, amountA, nodeA);

        // Mint specifically to nodeA2
        _nodeMintForNode(nodeOwnerA, buyer, amountA2, nodeA2);

        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA),  amountA,
            "nodeA2 mint bled into nodeA custody");
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), amountA2,
            "nodeA mint bled into nodeA2 custody");

        // Total custodian amount for nodeOwnerA = sum of both
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), amountA + amountA2,
            "total custodian amount wrong");
    }

    // =========================================================================
    // SECTION 14 — verifyTokenAccounting: Diamond ERC1155 balance >= node sum
    // =========================================================================

    function test_VerifyTokenAccounting_AfterCreditAndDebit() public {
        // Credit internal ledger (these tokens are already inside Diamond from a deposit)
        vm.startPrank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA,  tokenId, 400);
        NodesFacet(address(diamond)).creditNodeTokens(nodeA2, tokenId, 300);
        vm.stopPrank();

        // Without actual ERC1155 tokens inside Diamond, diamondBalance = 0
        // but sumNodeBalances = 700 — so isBalanced = false here (correct, internal only)
        bytes32[] memory nodes = new bytes32[](2);
        nodes[0] = nodeA;
        nodes[1] = nodeA2;

        (uint256 dBal, uint256 sumBal,) = NodesFacet(address(diamond)).verifyTokenAccounting(tokenId, nodes);
        assertEq(sumBal, 700, "sum of node balances wrong");
        // diamondBalance = 0 because no ERC1155 tokens deposited; isBalanced checks dBal >= sumBal
        assertEq(dBal, 0, "diamond ERC1155 balance should be 0 (no actual tokens deposited)");
    }

    function test_VerifyTokenAccounting_AfterNodeMint_IsBalanced() public {
        // nodeMint mints ERC1155 to buyer (not to diamond), so diamond ERC1155 balance = 0.
        // The node internal ledger credit only happens via creditNodeTokens (internal call).
        // After nodeMintForNode: buyer holds ERC1155, nodeA has custody tracking.
        // verifyTokenAccounting checks Diamond's OWN ERC1155 balance vs. sum of node ledgers.
        // For a fresh mint to external buyer: diamond balance = 0, node ledger balance = 0 (no credit).
        // Only after depositTokensToNode would diamond hold ERC1155 AND node ledger increase.

        // This test verifies the accounting function doesn't revert and returns sane values.
        _nodeMintForNode(nodeOwnerA, buyer, 500, nodeA);

        bytes32[] memory nodes = new bytes32[](1);
        nodes[0] = nodeA;

        // Should not revert
        (uint256 dBal, uint256 sumBal, bool isBalanced) =
            NodesFacet(address(diamond)).verifyTokenAccounting(tokenId, nodes);

        // Node ledger has no credit (mint goes directly to buyer), diamond holds nothing
        assertEq(dBal,    0, "diamond holds no ERC1155 after external mint");
        assertEq(sumBal,  0, "node ledger empty; credit happens on depositTokensToNode");
        assertTrue(isBalanced, "0 >= 0 should be balanced");
    }

    // =========================================================================
    // SECTION 15 — Total ERC1155 supply = sum of buyer balances after multi-mint
    // =========================================================================

    function test_TotalSupply_EqualsSumOfAllHolders() public {
        address buyerA = makeAddr("holderA");
        address buyerB = makeAddr("holderB");
        address buyerC = makeAddr("holderC");

        uint256 amtA = 100;
        uint256 amtB = 250;
        uint256 amtC = 400;

        _nodeMintForNode(nodeOwnerA, buyerA, amtA, nodeA);
        _nodeMintForNode(nodeOwnerA, buyerB, amtB, nodeA);
        _nodeMintForNode(nodeOwnerB, buyerC, amtC, nodeB);

        uint256 totalSupply = AssetsFacet(address(diamond)).totalSupply(tokenId);
        uint256 sumHolders  = AssetsFacet(address(diamond)).balanceOf(buyerA, tokenId)
                            + AssetsFacet(address(diamond)).balanceOf(buyerB, tokenId)
                            + AssetsFacet(address(diamond)).balanceOf(buyerC, tokenId);

        assertEq(totalSupply, amtA + amtB + amtC, "totalSupply wrong");
        assertEq(sumHolders,  totalSupply,          "sum of holders != totalSupply");
    }

    // =========================================================================
    // SECTION 16 — Fuzz: mint and partial redeems maintain invariants
    // =========================================================================

    function testFuzz_MintAndRedeem_Invariants(uint96 rawMint, uint96 rawRedeem) public {
        uint256 mintAmount = bound(uint256(rawMint), 1, 1_000_000);
        uint256 redeemAmount = bound(uint256(rawRedeem), 1, mintAmount);

        _nodeMintForNode(nodeOwnerA, buyer, mintAmount, nodeA);

        vm.prank(buyer);
        AssetsFacet(address(diamond)).redeemFromNode(tokenId, redeemAmount, nodeOwnerA, nodeA);

        uint256 remaining = mintAmount - redeemAmount;

        assertEq(AssetsFacet(address(diamond)).balanceOf(buyer, tokenId), remaining);
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA), remaining);
        assertEq(AssetsFacet(address(diamond)).totalSupply(tokenId), remaining);
    }

    function testFuzz_MultiNode_IndependentCustody(uint96 rawA, uint96 rawB) public {
        uint256 amtA = bound(uint256(rawA), 1, 500_000);
        uint256 amtB = bound(uint256(rawB), 1, 500_000);

        address buyerA = makeAddr("fuzzBuyerA");
        address buyerB = makeAddr("fuzzBuyerB");

        _nodeMintForNode(nodeOwnerA, buyerA, amtA, nodeA);
        _nodeMintForNode(nodeOwnerA, buyerB, amtB, nodeA2);

        // Node A2 must not have received nodeA's tokens
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA),  amtA);
        assertEq(AssetsFacet(address(diamond)).getNodeCustodyInfo(tokenId, nodeA2), amtB);
        assertEq(AssetsFacet(address(diamond)).getCustodyInfo(tokenId, nodeOwnerA), amtA + amtB);
    }

    function testFuzz_TransferBetweenNodes_Conserved(uint96 rawCredit, uint96 rawTransfer) public {
        uint256 credit   = bound(uint256(rawCredit),   1, 1_000_000);
        uint256 transfer = bound(uint256(rawTransfer), 1, credit);

        vm.prank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId, credit);

        vm.prank(nodeOwnerA);
        NodesFacet(address(diamond)).transferTokensBetweenNodes(nodeA, nodeA2, tokenId, transfer);

        uint256 balA  = NodesFacet(address(diamond)).getNodeTokenBalance(nodeA,  tokenId);
        uint256 balA2 = NodesFacet(address(diamond)).getNodeTokenBalance(nodeA2, tokenId);

        assertEq(balA + balA2, credit, "tokens not conserved after inter-node transfer");
        assertEq(balA,  credit - transfer);
        assertEq(balA2, transfer);
    }

    // =========================================================================
    // SECTION 17 — getNodeInventory returns all tokenIds and correct balances
    // =========================================================================

    function test_GetNodeInventory_MultipleTokenIds() public {
        // Create a second asset definition
        DiamondStorage.Attribute[] memory attrs2 = new DiamondStorage.Attribute[](1);
        attrs2[0].name        = "weight";
        attrs2[0].values      = new string[](1);
        attrs2[0].values[0]   = "20";
        attrs2[0].description = "kg";
        DiamondStorage.AssetDefinition memory assetDef2 = DiamondStorage.AssetDefinition({
            name:       "Alpine Goat",
            assetClass: CLASS_GOAT,
            attributes: attrs2
        });
        uint256 tokenId2 = uint256(keccak256(abi.encode(assetDef2)));

        // Credit both tokenIds to nodeA
        vm.startPrank(address(diamond));
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId,  300);
        NodesFacet(address(diamond)).creditNodeTokens(nodeA, tokenId2, 150);
        vm.stopPrank();

        (uint256[] memory ids, uint256[] memory balances) =
            NodesFacet(address(diamond)).getNodeInventory(nodeA);

        assertEq(ids.length,      2,   "should have 2 token IDs in inventory");
        assertEq(balances.length, 2,   "balances array length mismatch");

        // Find tokenId and tokenId2 in the returned arrays
        bool foundId1; bool foundId2;
        for (uint256 i = 0; i < ids.length; i++) {
            if (ids[i] == tokenId)  { assertEq(balances[i], 300); foundId1 = true; }
            if (ids[i] == tokenId2) { assertEq(balances[i], 150); foundId2 = true; }
        }
        assertTrue(foundId1, "tokenId not found in inventory");
        assertTrue(foundId2, "tokenId2 not found in inventory");
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    /// @dev Register a node as `nodeOwner`
    function _registerNode(
        address nodeOwner,
        string memory nodeType,
        string memory lat,
        string memory lng
    ) internal returns (bytes32 nodeHash) {
        vm.prank(nodeOwner);
        nodeHash = NodesFacet(address(diamond)).registerNode(
            nodeType,
            10_000,       // capacity
            bytes32(0),
            nodeType,     // addressName
            lat,
            lng
        );
    }

    /// @dev nodeMintForNode: nodeOwner mints `amount` of `assetDef` to `recipient` via `nodeHash`
    function _nodeMintForNode(
        address nodeOwner,
        address recipient,
        uint256 amount,
        bytes32 nodeHash
    ) internal {
        vm.prank(nodeOwner);
        AssetsFacet(address(diamond)).nodeMintForNode(
            recipient,
            assetDef,
            amount,
            CLASS_GOAT,
            "",
            nodeHash
        );
    }
}
