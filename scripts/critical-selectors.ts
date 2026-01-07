/**
 * Critical Selectors Configuration
 *
 * Maps critical function selectors to their expected facets.
 * Used by deployment verification tests to ensure the Diamond
 * routes functions to the correct facet implementations.
 *
 * This file is the source of truth for which facet should handle
 * each critical function. When a facet is upgraded, the deployment
 * verification will catch any routing mismatches.
 */

import { ethers } from 'ethers';

// =============================================================================
// TYPES
// =============================================================================

export interface SelectorMapping {
  /** Function signature (e.g., "placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)") */
  signature: string;
  /** Computed 4-byte selector */
  selector: string;
  /** Human-readable description */
  description: string;
  /** Whether this function is critical for core functionality */
  critical: boolean;
}

export interface FacetSelectors {
  /** Facet name as it appears in deployment files */
  facetName: string;
  /** Key in deployments/diamond-base-sepolia.json */
  deploymentKey: string;
  /** List of function selectors this facet should handle */
  selectors: SelectorMapping[];
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compute the 4-byte function selector from a signature
 */
export function computeSelector(signature: string): string {
  return ethers.id(signature).slice(0, 10);
}

/**
 * Create a selector mapping from a signature
 */
function selector(
  signature: string,
  description: string,
  critical: boolean = true,
): SelectorMapping {
  return {
    signature,
    selector: computeSelector(signature),
    description,
    critical,
  };
}

// =============================================================================
// CRITICAL SELECTORS BY FACET
// =============================================================================

export const CRITICAL_FACET_SELECTORS: FacetSelectors[] = [
  // ---------------------------------------------------------------------------
  // NodesFacet - Node management and inventory
  // ---------------------------------------------------------------------------
  {
    facetName: 'NodesFacet',
    deploymentKey: 'nodes',
    selectors: [
      selector(
        'placeSellOrderFromNode(bytes32,uint256,address,uint256,uint256)',
        'Place sell order from node inventory - routes to OrderRouter',
        true,
      ),
      selector(
        'getNodeTokenBalance(bytes32,uint256)',
        'Get token balance in node inventory',
        true,
      ),
      selector(
        'depositTokensToNode(bytes32,uint256,uint256)',
        'Deposit tokens from wallet to node',
        true,
      ),
      selector(
        'withdrawTokensFromNode(bytes32,uint256,uint256)',
        'Withdraw tokens from node to wallet',
        true,
      ),
      selector(
        'creditNodeTokens(bytes32,uint256,uint256)',
        'Credit tokens to node after minting',
        true,
      ),
      selector(
        'getNodeInventory(bytes32)',
        'Get all token balances for a node',
        true,
      ),
      selector(
        'registerNode(string,string,string,string)',
        'Register a new node',
        true,
      ),
      selector('getOwnedNodes(address)', 'Get nodes owned by an address', true),
      selector('getNode(bytes32)', 'Get node details', false),
      selector(
        'updateNodeLocation(bytes32,string,string,string)',
        'Update node location',
        false,
      ),
    ],
  },

  // ---------------------------------------------------------------------------
  // OrderRouterFacet - Central order routing (V2 storage)
  // ---------------------------------------------------------------------------
  {
    facetName: 'OrderRouterFacet',
    deploymentKey: 'orderRouter',
    selectors: [
      selector(
        'placeNodeSellOrder(address,address,uint256,address,uint96,uint96,uint8,uint40)',
        'Place sell order from node (V2 tree storage)',
        true,
      ),
      selector(
        'placeOrder(address,uint256,address,uint96,uint96,bool,uint8,uint40)',
        'Place buy/sell order (V2 tree storage)',
        true,
      ),
      selector(
        'placeMarketOrder(address,uint256,address,uint96,bool,uint16)',
        'Place market order with slippage',
        true,
      ),
      selector('cancelOrder(bytes32)', 'Cancel an open order', true),
    ],
  },

  // ---------------------------------------------------------------------------
  // CLOBFacet - Order book views and legacy functions
  // ---------------------------------------------------------------------------
  {
    facetName: 'CLOBFacet',
    deploymentKey: 'clob',
    selectors: [
      selector('getOrder(bytes32)', 'Get order details', true),
      selector(
        'getOrderBook(bytes32,uint256)',
        'Get order book for a market',
        true,
      ),
      selector('getMarket(bytes32)', 'Get market details', false),
      selector('getMarketIds()', 'Get all market IDs', false),
    ],
  },

  // ---------------------------------------------------------------------------
  // CLOBCoreFacet - Core CLOB operations (V2)
  // ---------------------------------------------------------------------------
  {
    facetName: 'CLOBCoreFacet',
    deploymentKey: 'clobCore',
    selectors: [
      selector(
        'placeNodeSellOrderV2(address,address,uint256,address,uint96,uint96,uint8,uint40)',
        'Place sell order V2 (direct, not via router)',
        true, // Mark as critical for test coverage
      ),
    ],
  },

  // ---------------------------------------------------------------------------
  // CLOBViewFacet - Read-only order book functions
  // ---------------------------------------------------------------------------
  {
    facetName: 'CLOBViewFacet',
    deploymentKey: 'clobView',
    selectors: [
      selector('getBestBid(bytes32)', 'Get best bid price for market', true),
      selector('getBestAsk(bytes32)', 'Get best ask price for market', true),
      selector(
        'getOrdersAtPrice(bytes32,uint256,bool)',
        'Get orders at a price level',
        false,
      ),
    ],
  },

  // ---------------------------------------------------------------------------
  // StakingFacet - Staking operations
  // ---------------------------------------------------------------------------
  {
    facetName: 'StakingFacet',
    deploymentKey: 'staking',
    selectors: [
      selector('stake(uint256)', 'Stake tokens', true),
      selector('unstake(uint256)', 'Unstake tokens', true),
      selector('getStake(address)', 'Get stake for address', true),
    ],
  },

  // ---------------------------------------------------------------------------
  // BridgeFacet - Cross-chain bridge operations
  // ---------------------------------------------------------------------------
  {
    facetName: 'BridgeFacet',
    deploymentKey: 'bridge',
    selectors: [
      selector(
        'bridgeTokens(address,uint256,uint256,uint256)',
        'Bridge tokens cross-chain',
        true,
      ),
    ],
  },

  // ---------------------------------------------------------------------------
  // DiamondLoupeFacet - Diamond introspection
  // ---------------------------------------------------------------------------
  {
    facetName: 'DiamondLoupeFacet',
    deploymentKey: 'diamondLoupe',
    selectors: [
      selector('facetAddress(bytes4)', 'Get facet address for selector', true),
      selector('facetAddresses()', 'Get all facet addresses', true),
      selector(
        'facetFunctionSelectors(address)',
        'Get selectors for a facet',
        true,
      ),
      selector('facets()', 'Get all facets and their selectors', true),
    ],
  },
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get all critical selectors (for quick verification)
 */
export function getCriticalSelectors(): Array<{
  selector: string;
  signature: string;
  facetName: string;
  deploymentKey: string;
}> {
  const result: Array<{
    selector: string;
    signature: string;
    facetName: string;
    deploymentKey: string;
  }> = [];

  for (const facet of CRITICAL_FACET_SELECTORS) {
    for (const sel of facet.selectors) {
      if (sel.critical) {
        result.push({
          selector: sel.selector,
          signature: sel.signature,
          facetName: facet.facetName,
          deploymentKey: facet.deploymentKey,
        });
      }
    }
  }

  return result;
}

/**
 * Get selectors for a specific facet
 */
export function getSelectorsForFacet(facetName: string): SelectorMapping[] {
  const facet = CRITICAL_FACET_SELECTORS.find((f) => f.facetName === facetName);
  return facet?.selectors || [];
}

/**
 * Find which facet should handle a selector
 */
export function findFacetForSelector(
  selector: string,
): FacetSelectors | undefined {
  return CRITICAL_FACET_SELECTORS.find((facet) =>
    facet.selectors.some((s) => s.selector === selector),
  );
}

/**
 * Validate that all selectors are unique across facets
 */
export function validateSelectorUniqueness(): {
  valid: boolean;
  duplicates: string[];
} {
  const seen = new Map<string, string>();
  const duplicates: string[] = [];

  for (const facet of CRITICAL_FACET_SELECTORS) {
    for (const sel of facet.selectors) {
      if (seen.has(sel.selector)) {
        duplicates.push(
          `${sel.selector} (${sel.signature}) defined in both ${seen.get(sel.selector)} and ${facet.facetName}`,
        );
      } else {
        seen.set(sel.selector, facet.facetName);
      }
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicates,
  };
}

// =============================================================================
// DEPLOYMENT KEY MAPPING
// =============================================================================

/**
 * Map from facet name to deployment JSON key
 */
export const FACET_TO_DEPLOYMENT_KEY: Record<string, string> = {
  NodesFacet: 'nodes',
  OrderRouterFacet: 'orderRouter',
  CLOBFacet: 'clob',
  CLOBCoreFacet: 'clobCore',
  CLOBMatchingFacet: 'clobMatching',
  CLOBAdminFacet: 'clobAdmin',
  CLOBViewFacet: 'clobView',
  StakingFacet: 'staking',
  BridgeFacet: 'bridge',
  AssetsFacet: 'assets',
  OrdersFacet: 'orders',
  DiamondCutFacet: 'diamondCut',
  DiamondLoupeFacet: 'diamondLoupe',
  OwnershipFacet: 'ownership',
};

/**
 * Reverse mapping: deployment key to facet name
 */
export const DEPLOYMENT_KEY_TO_FACET: Record<string, string> =
  Object.fromEntries(
    Object.entries(FACET_TO_DEPLOYMENT_KEY).map(([k, v]) => [v, k]),
  );
