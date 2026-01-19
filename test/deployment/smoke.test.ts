/**
 * Deployment Smoke Tests
 *
 * These tests actually call the deployed contracts on testnet to verify
 * that critical functions work end-to-end. Unlike unit tests with mocks,
 * these catch real contract-level errors like ARRAY_RANGE_ERROR.
 *
 * Requirements:
 * - RPC_URL environment variable or default Base Sepolia RPC
 * - Test wallet with some testnet ETH (for gas)
 * - Optional: TEST_PRIVATE_KEY for write operations
 *
 * Run with: npm run test:smoke
 *
 * Note: These tests are slower and require network access.
 * They should be run after deployments, not on every commit.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// CONFIGURATION
// =============================================================================

const RPC_URL = process.env.BASE_TEST_RPC_URL || 'https://sepolia.base.org';
const DEPLOYMENT_FILE = path.join(
  __dirname,
  '../../deployments/diamond-base-sepolia.json',
);

// Read Diamond address from deployment file
const deploymentData = JSON.parse(fs.readFileSync(DEPLOYMENT_FILE, 'utf-8'));
const DIAMOND_ADDRESS = deploymentData.diamond;

// Skip smoke tests if explicitly disabled or if network is unavailable
const SKIP_SMOKE = process.env.SKIP_SMOKE_TESTS === 'true';

// Network availability flag - set during beforeAll
let NETWORK_AVAILABLE = false;

// Test wallet for read operations (no private key needed)
const TEST_READ_ADDRESS = '0xFdE9344cabFa9504eEaD8a3E4e2096DA1316BbaF';

// Timeout for RPC calls (60 seconds)
const RPC_TIMEOUT = 60000;

// =============================================================================
// CONTRACT ABIS (minimal for smoke tests)
// =============================================================================

const DIAMOND_ABI = [
  // DiamondLoupe
  'function facetAddress(bytes4 _functionSelector) external view returns (address)',
  'function facetAddresses() external view returns (address[])',

  // NodesFacet
  'function getOwnedNodes(address owner) external view returns (bytes32[])',
  'function getNode(bytes32 nodeHash) external view returns (tuple(address owner, string nodeType, uint256 capacity, bytes1 status, string addressName, string lat, string lng))',
  'function getNodeTokenBalance(bytes32 nodeHash, uint256 tokenId) external view returns (uint256)',
  'function getNodeInventory(bytes32 nodeHash) external view returns (uint256[] tokenIds, uint256[] balances)',

  // CLOBFacet / CLOBViewFacet
  'function getMarketIds() external view returns (bytes32[])',
  'function getMarket(bytes32 marketId) external view returns (tuple(string baseToken, uint256 baseTokenId, string quoteToken, bool active, uint256 createdAt))',
  'function getOrder(bytes32 orderId) external view returns (tuple(address maker, uint256 price, uint256 amount, uint256 filled, bool isBuy, uint8 status, uint256 timestamp))',

  // OrderRouterFacet (for checking it exists)
  'function placeNodeSellOrder(address,address,uint256,address,uint96,uint96,uint8,uint40) external returns (bytes32)',
];

// =============================================================================
// TEST SETUP
// =============================================================================

let provider: ethers.JsonRpcProvider;
let diamond: ethers.Contract;

beforeAll(async () => {
  if (SKIP_SMOKE) return;

  // Disable request batching to avoid ethers v6 parsing issues with some RPC providers
  provider = new ethers.JsonRpcProvider(RPC_URL, undefined, {
    batchMaxCount: 1,
  });

  // Test network connectivity with a simple call
  try {
    const network = await provider.getNetwork();
    if (network.chainId === 84532n) {
      NETWORK_AVAILABLE = true;
    }
  } catch (error) {
    console.warn(
      'Network not available or ethers parsing issue, smoke tests will be skipped:',
      error instanceof Error ? error.message.slice(0, 100) : 'Unknown error',
    );
    NETWORK_AVAILABLE = false;
  }

  diamond = new ethers.Contract(DIAMOND_ADDRESS, DIAMOND_ABI, provider);
});

// =============================================================================
// CONNECTIVITY TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: Network Connectivity',
  () => {
    it(
      'should connect to Base Sepolia',
      async () => {
        const network = await provider.getNetwork();
        expect(network.chainId).toBe(84532n);
      },
      RPC_TIMEOUT,
    );

    it(
      'should have Diamond contract deployed',
      async () => {
        const code = await provider.getCode(DIAMOND_ADDRESS);
        expect(code).not.toBe('0x');
        expect(code.length).toBeGreaterThan(100);
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// DIAMOND LOUPE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: DiamondLoupe Functions',
  () => {
    it(
      'should return facet addresses',
      async () => {
        const facets = await diamond.facetAddresses();
        expect(Array.isArray(facets)).toBe(true);
        expect(facets.length).toBeGreaterThan(0);
      },
      RPC_TIMEOUT,
    );

    it(
      'should return facet address for known selector',
      async () => {
        const selector = '0xcdffacc6'; // facetAddress(bytes4)
        const facetAddr = await diamond.facetAddress(selector);
        expect(facetAddr).not.toBe(ethers.ZeroAddress);
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// NODES FACET SMOKE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: NodesFacet Functions',
  () => {
    it(
      'should call getOwnedNodes without reverting',
      async () => {
        // This should not revert, even if the address has no nodes
        const nodes = await diamond.getOwnedNodes(TEST_READ_ADDRESS);
        expect(Array.isArray(nodes)).toBe(true);
      },
      RPC_TIMEOUT,
    );

    it(
      'should call getNodeTokenBalance without ARRAY_RANGE_ERROR',
      async () => {
        // This was the exact function that was failing with ARRAY_RANGE_ERROR
        // when NodesFacet was routing to the old implementation

        // Use a dummy node hash and token ID
        const dummyNodeHash = ethers.keccak256(ethers.toUtf8Bytes('test-node'));
        const dummyTokenId = 1;

        try {
          // Should return 0 for non-existent node, NOT revert with ARRAY_RANGE_ERROR
          const balance = await diamond.getNodeTokenBalance(
            dummyNodeHash,
            dummyTokenId,
          );
          expect(typeof balance).toBe('bigint');
        } catch (error: any) {
          // If it reverts, it should NOT be ARRAY_RANGE_ERROR
          expect(error.message).not.toContain('ARRAY_RANGE_ERROR');
          expect(error.message).not.toContain('Panic');
          // Acceptable errors: "Node not found", "Not authorized", etc.
        }
      },
      RPC_TIMEOUT,
    );

    it(
      'should call getNodeInventory without reverting',
      async () => {
        const dummyNodeHash = ethers.keccak256(ethers.toUtf8Bytes('test-node'));

        try {
          const inventory = await diamond.getNodeInventory(dummyNodeHash);
          // Should return empty arrays for non-existent node
          expect(Array.isArray(inventory.tokenIds)).toBe(true);
          expect(Array.isArray(inventory.balances)).toBe(true);
        } catch (error: any) {
          // Acceptable to revert with "Node not found" but NOT with storage errors
          expect(error.message).not.toContain('ARRAY_RANGE_ERROR');
          expect(error.message).not.toContain('Panic');
        }
      },
      RPC_TIMEOUT,
    );

    it(
      'should call getNode without reverting',
      async () => {
        const dummyNodeHash = ethers.keccak256(ethers.toUtf8Bytes('test-node'));

        try {
          const node = await diamond.getNode(dummyNodeHash);
          // If node exists, should return valid data
          expect(node).toBeDefined();
        } catch (error: any) {
          // Acceptable to revert with "Node not found"
          expect(error.message).not.toContain('ARRAY_RANGE_ERROR');
        }
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// CLOB FACET SMOKE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: CLOB Functions',
  () => {
    it(
      'should call getMarketIds without reverting',
      async () => {
        const marketIds = await diamond.getMarketIds();
        expect(Array.isArray(marketIds)).toBe(true);
      },
      RPC_TIMEOUT,
    );

    it(
      'should call getOrder without ARRAY_RANGE_ERROR',
      async () => {
        const dummyOrderId = ethers.keccak256(ethers.toUtf8Bytes('test-order'));

        try {
          const order = await diamond.getOrder(dummyOrderId);
          expect(order).toBeDefined();
        } catch (error: any) {
          // Should NOT be array/storage errors
          expect(error.message).not.toContain('ARRAY_RANGE_ERROR');
          expect(error.message).not.toContain('Panic');
        }
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// CRITICAL PATH SMOKE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: Critical Sell Order Path',
  () => {
    /**
     * This test simulates the exact path that was failing:
     * 1. Get owned nodes
     * 2. Get node token balance
     * 3. (Would place sell order if balance sufficient)
     *
     * The ARRAY_RANGE_ERROR was happening in step 3 because
     * placeSellOrderFromNode was routing to old V1 storage code.
     */
    it(
      'should complete sell order preparation path without storage errors',
      async () => {
        // Step 1: Get owned nodes (even if empty)
        const nodes = await diamond.getOwnedNodes(TEST_READ_ADDRESS);
        expect(Array.isArray(nodes)).toBe(true);

        if (nodes.length > 0) {
          const nodeHash = nodes[0];

          // Step 2: Get node token balance
          const dummyTokenId = 1;
          try {
            const balance = await diamond.getNodeTokenBalance(
              nodeHash,
              dummyTokenId,
            );
            expect(typeof balance).toBe('bigint');
          } catch (error: any) {
            // Should not be storage errors
            expect(error.message).not.toContain('ARRAY_RANGE_ERROR');
            expect(error.message).not.toContain('Panic');
          }
        }
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// ERROR MESSAGE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: Error Messages',
  () => {
    it(
      'should return meaningful errors, not Panic codes',
      async () => {
        const invalidNodeHash = ethers.ZeroHash;

        try {
          await diamond.getNodeTokenBalance(invalidNodeHash, 1);
        } catch (error: any) {
          // Panic codes indicate internal errors (like ARRAY_RANGE_ERROR)
          // We should get meaningful revert reasons instead
          const isPanic =
            error.message.includes('Panic') || error.message.includes('0x32');
          if (isPanic) {
            console.error(
              'Received Panic error - this indicates a contract bug:',
              error.message,
            );
          }
          expect(isPanic).toBe(false);
        }
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// PERFORMANCE SMOKE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)('Smoke: Performance', () => {
  it(
    'should respond to view calls within 5 seconds',
    async () => {
      const start = Date.now();
      await diamond.facetAddresses();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
    },
    RPC_TIMEOUT,
  );

  it(
    'should handle multiple concurrent calls',
    async () => {
      const calls = [
        diamond.facetAddresses(),
        diamond.getOwnedNodes(TEST_READ_ADDRESS),
        diamond.getMarketIds(),
      ];

      const results = await Promise.all(calls);
      expect(results.length).toBe(3);
    },
    RPC_TIMEOUT,
  );
});

// =============================================================================
// REGRESSION SMOKE TESTS
// =============================================================================

describe.skipIf(SKIP_SMOKE || !NETWORK_AVAILABLE)(
  'Smoke: Regression Prevention',
  () => {
    /**
     * This test specifically checks that the NodesFacet routing bug
     * has been fixed. The bug caused ARRAY_RANGE_ERROR (Panic 0x32)
     * when calling placeSellOrderFromNode.
     */
    it(
      'REGRESSION: placeSellOrderFromNode selector should route to current NodesFacet',
      async () => {
        // Compute the selector for placeSellOrderFromNode
        const selector = ethers
          .id('placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)')
          .slice(0, 10);

        // Get the facet address
        const facetAddr = await diamond.facetAddress(selector);

        // Should not be zero address
        expect(facetAddr).not.toBe(ethers.ZeroAddress);

        // Load deployment file to verify
        const deploymentData = JSON.parse(
          fs.readFileSync(DEPLOYMENT_FILE, 'utf-8'),
        );
        const expectedAddr = deploymentData.facets.nodes;

        // Should route to the NodesFacet in our deployment file
        expect(facetAddr.toLowerCase()).toBe(expectedAddr.toLowerCase());

        // Should NOT be the old buggy address
        const OLD_BUGGY_ADDRESS = '0x4c513e121860782691f822e08192ac9ad98b7238';
        expect(facetAddr.toLowerCase()).not.toBe(
          OLD_BUGGY_ADDRESS.toLowerCase(),
        );
      },
      RPC_TIMEOUT,
    );
  },
);
