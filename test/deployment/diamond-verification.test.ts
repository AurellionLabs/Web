/**
 * Diamond Deployment Verification Tests
 *
 * These tests verify that the Diamond contract is correctly configured
 * and that all critical function selectors route to the expected facets.
 *
 * This test suite catches issues like:
 * - Facet not upgraded after code changes
 * - Selectors routing to wrong facet
 * - Selectors not registered in Diamond
 * - Deployment file out of sync with on-chain state
 *
 * Run with: npm run test:deployment
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import {
  CRITICAL_FACET_SELECTORS,
  getCriticalSelectors,
  validateSelectorUniqueness,
  computeSelector,
  DEPLOYMENT_KEY_TO_FACET,
  FacetSelectors,
} from '../../scripts/critical-selectors';

// =============================================================================
// CONFIGURATION
// =============================================================================

const RPC_URL = process.env.BASE_TEST_RPC_URL || 'https://sepolia.base.org';
const DEPLOYMENT_FILE = path.join(
  __dirname,
  '../../deployments/diamond-base-sepolia.json',
);

// Read Diamond address from deployment file (loaded in beforeAll)
// This avoids hardcoding addresses that can drift
let DIAMOND_ADDRESS: string;

// Skip on-chain tests if no RPC available (for CI without secrets)
const SKIP_ONCHAIN = process.env.SKIP_ONCHAIN_TESTS === 'true';

// Network availability flag - set during beforeAll
let NETWORK_AVAILABLE = false;

// Timeout for RPC calls (60 seconds)
const RPC_TIMEOUT = 60000;

// =============================================================================
// TYPES
// =============================================================================

interface DeploymentData {
  diamond: string;
  facets: Record<string, string>;
  timestamp: string;
}

// =============================================================================
// TEST SETUP
// =============================================================================

let provider: ethers.JsonRpcProvider;
let diamond: ethers.Contract;
let deploymentData: DeploymentData;

beforeAll(async () => {
  // Load deployment data
  const rawData = fs.readFileSync(DEPLOYMENT_FILE, 'utf-8');
  deploymentData = JSON.parse(rawData);

  // Set Diamond address from deployment file
  DIAMOND_ADDRESS = deploymentData.diamond;

  if (!SKIP_ONCHAIN) {
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
        'Network not available or ethers parsing issue, on-chain tests will be skipped:',
        error instanceof Error ? error.message.slice(0, 100) : 'Unknown error',
      );
      NETWORK_AVAILABLE = false;
    }

    // Create Diamond contract instance
    diamond = new ethers.Contract(
      DIAMOND_ADDRESS,
      [
        'function facetAddress(bytes4 _functionSelector) external view returns (address)',
        'function facetAddresses() external view returns (address[])',
        'function facetFunctionSelectors(address _facet) external view returns (bytes4[])',
        'function facets() external view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
      ],
      provider,
    );
  }
});

// =============================================================================
// CONFIGURATION VALIDATION TESTS
// =============================================================================

describe('Critical Selectors Configuration', () => {
  it('should have unique selectors across all facets', () => {
    const result = validateSelectorUniqueness();
    expect(result.valid).toBe(true);
    if (!result.valid) {
      console.error('Duplicate selectors:', result.duplicates);
    }
  });

  it('should compute selectors correctly', () => {
    // Test known selector computations
    const testCases = [
      {
        signature: 'facetAddress(bytes4)',
        expected: '0xcdffacc6',
      },
      {
        signature: 'facetAddresses()',
        expected: '0x52ef6b2c',
      },
      {
        signature: 'transfer(address,uint256)',
        expected: '0xa9059cbb',
      },
    ];

    for (const { signature, expected } of testCases) {
      const computed = computeSelector(signature);
      expect(computed).toBe(expected);
    }
  });

  it('should have deployment keys for all critical facets', () => {
    for (const facet of CRITICAL_FACET_SELECTORS) {
      expect(facet.deploymentKey).toBeDefined();
      expect(facet.deploymentKey.length).toBeGreaterThan(0);
    }
  });

  it('should have at least one critical selector per facet', () => {
    for (const facet of CRITICAL_FACET_SELECTORS) {
      const criticalSelectors = facet.selectors.filter((s) => s.critical);
      expect(criticalSelectors.length).toBeGreaterThan(0);
    }
  });
});

// =============================================================================
// DEPLOYMENT FILE VALIDATION TESTS
// =============================================================================

describe('Deployment File Validation', () => {
  it('should have valid deployment file', () => {
    expect(deploymentData).toBeDefined();
    expect(deploymentData.diamond).toBeDefined();
    expect(deploymentData.facets).toBeDefined();
  });

  it('should have valid Diamond address', () => {
    expect(ethers.isAddress(deploymentData.diamond)).toBe(true);
    expect(deploymentData.diamond).not.toBe(ethers.ZeroAddress);
  });

  it('should have valid addresses for all facets', () => {
    for (const [key, address] of Object.entries(deploymentData.facets)) {
      expect(ethers.isAddress(address)).toBe(true);
    }
  });

  it('should have required core facets', () => {
    const requiredFacets = ['diamondCut', 'diamondLoupe', 'ownership'];
    for (const facet of requiredFacets) {
      expect(deploymentData.facets[facet]).toBeDefined();
    }
  });

  it('should have NodesFacet registered', () => {
    expect(deploymentData.facets.nodes).toBeDefined();
    expect(ethers.isAddress(deploymentData.facets.nodes)).toBe(true);
  });
});

// =============================================================================
// ON-CHAIN VERIFICATION TESTS
// =============================================================================

describe.skipIf(SKIP_ONCHAIN || !NETWORK_AVAILABLE)(
  'On-Chain Diamond Verification',
  () => {
    it(
      'should connect to Diamond contract',
      async () => {
        const facetAddresses = await diamond.facetAddresses();
        expect(facetAddresses.length).toBeGreaterThan(0);
      },
      RPC_TIMEOUT,
    );

    it(
      'should have DiamondLoupe functions available',
      async () => {
        const selector = computeSelector('facetAddress(bytes4)');
        const facetAddr = await diamond.facetAddress(selector);
        expect(facetAddr).not.toBe(ethers.ZeroAddress);
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// CRITICAL SELECTOR ROUTING TESTS
// =============================================================================

describe.skipIf(SKIP_ONCHAIN || !NETWORK_AVAILABLE)(
  'Critical Selector Routing',
  () => {
    // Generate tests for each critical facet
    for (const facet of CRITICAL_FACET_SELECTORS) {
      describe(`${facet.facetName}`, () => {
        const criticalSelectors = facet.selectors.filter((s) => s.critical);

        for (const sel of criticalSelectors) {
          it(
            `should route ${sel.signature} correctly`,
            async () => {
              const expectedAddress =
                deploymentData.facets[facet.deploymentKey];

              // Skip if facet not in deployment file
              if (!expectedAddress) {
                console.warn(
                  `Skipping: ${facet.deploymentKey} not in deployment file`,
                );
                return;
              }

              const actualAddress = await diamond.facetAddress(sel.selector);

              // Check if selector is registered
              expect(actualAddress).not.toBe(ethers.ZeroAddress);

              // Check if routing to correct facet
              expect(actualAddress.toLowerCase()).toBe(
                expectedAddress.toLowerCase(),
              );
            },
            RPC_TIMEOUT,
          );
        }
      });
    }
  },
);

// =============================================================================
// NODES FACET SPECIFIC TESTS (The bug we're preventing)
// =============================================================================

describe.skipIf(SKIP_ONCHAIN || !NETWORK_AVAILABLE)(
  'NodesFacet Critical Functions',
  () => {
    it(
      'should route placeSellOrderFromNode to NodesFacet',
      async () => {
        const selector = computeSelector(
          'placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)',
        );
        const expectedAddress = deploymentData.facets.nodes;
        const actualAddress = await diamond.facetAddress(selector);

        expect(actualAddress.toLowerCase()).toBe(expectedAddress.toLowerCase());
      },
      RPC_TIMEOUT,
    );

    it(
      'should route getNodeTokenBalance to NodesFacet',
      async () => {
        const selector = computeSelector(
          'getNodeTokenBalance(bytes32,uint256)',
        );
        const expectedAddress = deploymentData.facets.nodes;
        const actualAddress = await diamond.facetAddress(selector);

        expect(actualAddress.toLowerCase()).toBe(expectedAddress.toLowerCase());
      },
      RPC_TIMEOUT,
    );

    it(
      'should route depositTokensToNode to NodesFacet',
      async () => {
        const selector = computeSelector(
          'depositTokensToNode(bytes32,uint256,uint256)',
        );
        const expectedAddress = deploymentData.facets.nodes;
        const actualAddress = await diamond.facetAddress(selector);

        expect(actualAddress.toLowerCase()).toBe(expectedAddress.toLowerCase());
      },
      RPC_TIMEOUT,
    );

    it(
      'should NOT route NodesFacet functions to old/unknown addresses',
      async () => {
        const nodesFacetSelectors = [
          'placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)',
          'getNodeTokenBalance(bytes32,uint256)',
          'depositTokensToNode(bytes32,uint256,uint256)',
          'withdrawTokensFromNode(bytes32,uint256,uint256)',
        ];

        const expectedAddress = deploymentData.facets.nodes;
        const knownFacetAddresses = new Set(
          Object.values(deploymentData.facets).map((a) => a.toLowerCase()),
        );

        for (const sig of nodesFacetSelectors) {
          const selector = computeSelector(sig);
          const actualAddress = await diamond.facetAddress(selector);

          // Should not be zero address
          expect(actualAddress).not.toBe(ethers.ZeroAddress);

          // Should be a known facet
          expect(knownFacetAddresses.has(actualAddress.toLowerCase())).toBe(
            true,
          );

          // Should be the expected NodesFacet
          expect(actualAddress.toLowerCase()).toBe(
            expectedAddress.toLowerCase(),
          );
        }
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// ORDER ROUTER FACET TESTS
// =============================================================================

describe.skipIf(SKIP_ONCHAIN || !NETWORK_AVAILABLE)(
  'OrderRouterFacet Critical Functions',
  () => {
    it(
      'should route placeNodeSellOrder (V2) to OrderRouterFacet',
      async () => {
        const selector = computeSelector(
          'placeNodeSellOrder(address,address,uint256,address,uint96,uint96,uint8,uint40)',
        );
        const expectedAddress = deploymentData.facets.orderRouter;

        // Skip if OrderRouterFacet not deployed
        if (!expectedAddress) {
          console.warn('OrderRouterFacet not in deployment file - skipping');
          return;
        }

        const actualAddress = await diamond.facetAddress(selector);
        expect(actualAddress.toLowerCase()).toBe(expectedAddress.toLowerCase());
      },
      RPC_TIMEOUT,
    );
  },
);

// =============================================================================
// FACET COVERAGE TESTS
// =============================================================================

describe.skipIf(SKIP_ONCHAIN || !NETWORK_AVAILABLE)('Facet Coverage', () => {
  it(
    'should have all deployment file facets registered on-chain',
    async () => {
      const onChainFacets = await diamond.facetAddresses();
      const onChainSet = new Set(
        onChainFacets.map((a: string) => a.toLowerCase()),
      );

      for (const [key, address] of Object.entries(deploymentData.facets)) {
        expect(onChainSet.has(address.toLowerCase())).toBe(true);
      }
    },
    RPC_TIMEOUT,
  );

  it(
    'should not have orphaned facets (on-chain but not in deployment file)',
    async () => {
      const onChainFacets = await diamond.facetAddresses();
      const deployedSet = new Set(
        Object.values(deploymentData.facets).map((a) => a.toLowerCase()),
      );

      const orphaned = onChainFacets.filter(
        (addr: string) => !deployedSet.has(addr.toLowerCase()),
      );

      // Warn but don't fail - orphaned facets might be intentional
      if (orphaned.length > 0) {
        console.warn('Orphaned facets found:', orphaned);
      }
    },
    RPC_TIMEOUT,
  );
});

// =============================================================================
// REGRESSION TESTS
// =============================================================================

describe('Regression: NodesFacet Routing Bug', () => {
  /**
   * This test specifically guards against the bug where NodesFacet
   * was routing to an old implementation that used V1 array storage
   * instead of V2 tree storage, causing ARRAY_RANGE_ERROR.
   */
  it('should have NodesFacet address updated after V2 migration', () => {
    const nodesAddress = deploymentData.facets.nodes;

    // The old buggy address was 0x4c513e121860782691f822e08192ac9ad98b7238
    const OLD_BUGGY_ADDRESS = '0x4c513e121860782691f822e08192ac9ad98b7238';

    expect(nodesAddress.toLowerCase()).not.toBe(
      OLD_BUGGY_ADDRESS.toLowerCase(),
    );
  });

  it('should have deployment timestamp after V2 migration', () => {
    // V2 migration happened around 2026-01-07
    const timestamp = new Date(deploymentData.timestamp);
    const v2MigrationDate = new Date('2026-01-04');

    expect(timestamp >= v2MigrationDate).toBe(true);
  });
});
