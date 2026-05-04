/**
 * Node Inventory Flow Tests
 *
 * End-to-end tests for the Diamond's node token inventory system.
 * Tests internal accounting when Diamond holds ERC1155 tokens for multiple nodes.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { getContext, getChain } from '../../setup/test-setup';
import {
  NodeInventoryFlows,
  createNodeInventoryFlows,
} from '../../flows/node-inventory-flows';
import { FlowContext, TestUser } from '../../flows/flow-context';

describe('Node Token Inventory Flow', () => {
  let context: FlowContext;
  let inventoryFlows: NodeInventoryFlows;
  let nodeOperator1: TestUser;
  let nodeOperator2: TestUser;
  let node1Hash: string;
  let node2Hash: string;

  // Token IDs for testing (matching AuraAsset token IDs)
  const GOAT_TOKEN_ID = 1n;
  const SHEEP_TOKEN_ID = 2n;

  beforeAll(async () => {
    context = getContext();
    inventoryFlows = createNodeInventoryFlows(
      context,
      process.env.VERBOSE === 'true',
    );

    // Get test users
    nodeOperator1 = context.getUser('node1');
    nodeOperator2 = context.getUser('node2');
  });

  describe('Node Registration via Diamond', () => {
    it('should register a node and get a nodeHash', async () => {
      const result = await inventoryFlows.registerNode(nodeOperator1, {
        nodeType: 'warehouse',
        capacity: 1000,
        addressName: 'Test Warehouse 1',
        lat: '40.7128',
        lng: '-74.0060',
      });

      expect(result.success).toBe(true);
      expect(result.nodeHash).toBeDefined();
      expect(result.nodeHash).toMatch(/^0x[a-fA-F0-9]{64}$/);

      node1Hash = result.nodeHash!;
    });

    it('should register a second node for the same operator', async () => {
      const result = await inventoryFlows.registerNode(nodeOperator1, {
        nodeType: 'processing',
        capacity: 500,
        addressName: 'Processing Facility',
      });

      expect(result.success).toBe(true);
      expect(result.nodeHash).toBeDefined();

      node2Hash = result.nodeHash!;
    });

    it('should list nodes owned by operator', async () => {
      const nodes = await inventoryFlows.getOwnerNodes(nodeOperator1);

      expect(nodes.length).toBeGreaterThanOrEqual(2);
      expect(nodes).toContain(node1Hash);
      expect(nodes).toContain(node2Hash);
    });
  });

  describe('Token Deposit and Withdrawal', () => {
    it('should deposit tokens from wallet to node inventory', async () => {
      // Check initial balances
      const initialWalletBalance = await inventoryFlows.getUserTokenBalance(
        nodeOperator1,
        GOAT_TOKEN_ID,
      );
      const initialNodeBalance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );

      expect(initialWalletBalance).toBeGreaterThan(0n);
      expect(initialNodeBalance).toBe(0n);

      // Deposit 100 tokens
      const depositAmount = 100n;
      const result = await inventoryFlows.depositTokensToNode(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
        depositAmount,
      );

      expect(result.success).toBe(true);

      // Verify balances changed correctly
      const finalWalletBalance = await inventoryFlows.getUserTokenBalance(
        nodeOperator1,
        GOAT_TOKEN_ID,
      );
      const finalNodeBalance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );

      expect(finalWalletBalance).toBe(initialWalletBalance - depositAmount);
      expect(finalNodeBalance).toBe(depositAmount);
    });

    it('should withdraw tokens from node inventory to wallet', async () => {
      const initialNodeBalance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );
      const initialWalletBalance = await inventoryFlows.getUserTokenBalance(
        nodeOperator1,
        GOAT_TOKEN_ID,
      );

      // Withdraw 50 tokens
      const withdrawAmount = 50n;
      const result = await inventoryFlows.withdrawTokensFromNode(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
        withdrawAmount,
      );

      expect(result.success).toBe(true);

      // Verify balances
      const finalNodeBalance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );
      const finalWalletBalance = await inventoryFlows.getUserTokenBalance(
        nodeOperator1,
        GOAT_TOKEN_ID,
      );

      expect(finalNodeBalance).toBe(initialNodeBalance - withdrawAmount);
      expect(finalWalletBalance).toBe(initialWalletBalance + withdrawAmount);
    });

    it('should fail to withdraw more than node balance', async () => {
      const nodeBalance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );

      // Try to withdraw more than available
      const result = await inventoryFlows.withdrawTokensFromNode(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
        nodeBalance + 1n,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Insufficient');
    });
  });

  describe('Transfer Between Nodes', () => {
    beforeAll(async () => {
      // Ensure node1 has some tokens
      const balance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );
      if (balance < 50n) {
        await inventoryFlows.depositTokensToNode(
          nodeOperator1,
          node1Hash,
          GOAT_TOKEN_ID,
          100n,
        );
      }
    });

    it('should transfer tokens between nodes owned by same operator', async () => {
      const initialNode1Balance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );
      const initialNode2Balance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node2Hash,
        GOAT_TOKEN_ID,
      );

      // Transfer 30 tokens from node1 to node2
      const transferAmount = 30n;
      const result = await inventoryFlows.transferTokensBetweenNodes(
        nodeOperator1,
        node1Hash,
        node2Hash,
        GOAT_TOKEN_ID,
        transferAmount,
      );

      expect(result.success).toBe(true);

      // Verify balances
      const finalNode1Balance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
      );
      const finalNode2Balance = await inventoryFlows.getNodeTokenBalance(
        nodeOperator1,
        node2Hash,
        GOAT_TOKEN_ID,
      );

      expect(finalNode1Balance).toBe(initialNode1Balance - transferAmount);
      expect(finalNode2Balance).toBe(initialNode2Balance + transferAmount);
    });

    it('should not allow transfer from node not owned by caller', async () => {
      // nodeOperator2 tries to transfer from nodeOperator1's node
      const result = await inventoryFlows.transferTokensBetweenNodes(
        nodeOperator2,
        node1Hash, // Owned by nodeOperator1
        node2Hash,
        GOAT_TOKEN_ID,
        10n,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not');
    });
  });

  describe('Multi-Token Inventory', () => {
    it('should track multiple token types in a node', async () => {
      // Deposit SHEEP tokens
      await inventoryFlows.depositTokensToNode(
        nodeOperator1,
        node1Hash,
        SHEEP_TOKEN_ID,
        75n,
      );

      // Get full inventory
      const inventory = await inventoryFlows.getNodeInventory(
        nodeOperator1,
        node1Hash,
      );

      // Should have at least GOAT and SHEEP
      expect(inventory.tokenIds.length).toBeGreaterThanOrEqual(2);

      // Find GOAT and SHEEP in inventory
      const goatIndex = inventory.tokenIds.findIndex(
        (id) => id === GOAT_TOKEN_ID,
      );
      const sheepIndex = inventory.tokenIds.findIndex(
        (id) => id === SHEEP_TOKEN_ID,
      );

      expect(goatIndex).toBeGreaterThanOrEqual(0);
      expect(sheepIndex).toBeGreaterThanOrEqual(0);
      expect(inventory.balances[sheepIndex]).toBe(75n);
    });

    it('should list all token IDs for a node', async () => {
      const tokenIds = await inventoryFlows.getNodeTokenIds(
        nodeOperator1,
        node1Hash,
      );

      expect(tokenIds.length).toBeGreaterThanOrEqual(2);
      expect(tokenIds.map((id) => Number(id))).toContain(Number(GOAT_TOKEN_ID));
      expect(tokenIds.map((id) => Number(id))).toContain(
        Number(SHEEP_TOKEN_ID),
      );
    });
  });

  describe('Token Accounting Verification', () => {
    it('should verify Diamond balance matches sum of node balances', async () => {
      const result = await inventoryFlows.verifyTokenAccounting(
        nodeOperator1,
        GOAT_TOKEN_ID,
        [node1Hash, node2Hash],
      );

      // Diamond should have at least as many tokens as nodes claim
      expect(result.isBalanced).toBe(true);
      expect(result.diamondBalance).toBeGreaterThanOrEqual(
        result.sumNodeBalances,
      );
    });

    it('should show Diamond holding the actual ERC1155 tokens', async () => {
      const diamondBalance = await inventoryFlows.getDiamondTokenBalance(
        nodeOperator1,
        GOAT_TOKEN_ID,
      );

      // Diamond should hold tokens
      expect(diamondBalance).toBeGreaterThan(0n);
    });
  });

  describe('ERC1155 Receiver Support', () => {
    it('should support IERC1155Receiver interface', async () => {
      const supports =
        await inventoryFlows.supportsERC1155Receiver(nodeOperator1);
      expect(supports).toBe(true);
    });
  });

  describe('Credit Tokens (Minting Record)', () => {
    it('should reject direct external credit calls', async () => {
      const result = await inventoryFlows.creditNodeTokens(
        nodeOperator1,
        node1Hash,
        GOAT_TOKEN_ID,
        200n,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only internal Diamond calls');
    });
  });

  describe('CLOB Approval', () => {
    it('should approve CLOB for token transfers', async () => {
      // Get CLOB address from context
      const clobAddress = context.getContractAddress('CLOB');

      const result = await inventoryFlows.approveClobForTokens(
        nodeOperator1,
        node1Hash,
        clobAddress,
      );

      expect(result.success).toBe(true);

      // Verify approval
      const isApproved = await inventoryFlows.isClobApproved(
        nodeOperator1,
        clobAddress,
      );
      expect(isApproved).toBe(true);
    });
  });
});
