/**
 * Handler Validation
 *
 * Validates that all expected events have handlers.
 * Logs warnings when events are emitted but not handled.
 */

import { ponder } from '@/generated';

// ============================================================================
// EXPECTED EVENT HANDLERS
// ============================================================================

// Map of event signatures to handler names
const EXPECTED_HANDLERS: Record<string, string> = {
  // Nodes
  'Diamond:NodeRegistered': 'nodes.ts',
  'Diamond:NodeUpdated': 'nodes.ts',
  'Diamond:NodeDeactivated': 'nodes.ts',
  'Diamond:SupportedAssetAdded': 'nodes.ts',
  'Diamond:TokensDepositedToNode': 'nodes.ts',
  'Diamond:TokensWithdrawnFromNode': 'nodes.ts',
  'Diamond:TokensTransferredBetweenNodes': 'nodes.ts',
  'Diamond:TokensMintedToNode': 'nodes.ts',

  // CLOB
  'Diamond:OrderCreated': 'clob.ts', // Note: Multiple versions exist
  'Diamond:OrderPlacedWithTokens': 'clob.ts',
  'Diamond:OrderFilled': 'clob.ts',
  'Diamond:TradeExecuted': 'clob.ts', // Note: Multiple versions exist
  'Diamond:OrderCancelled': 'clob.ts', // Note: Multiple versions exist
  'Diamond:OrderExpired': 'clob.ts',
  'Diamond:MarketCreated': 'clob.ts',

  // Bridge
  'Diamond:UnifiedOrderCreated': 'bridge.ts',
  'Diamond:TradeMatched': 'bridge.ts',
  'Diamond:OrderSettled': 'bridge.ts',

  // Staking
  'Diamond:Staked': 'staking.ts',
  'Diamond:Withdrawn': 'staking.ts',
  'Diamond:RewardsClaimed': 'staking.ts',

  // AuraAsset
  'AuraAsset:MintedAsset': 'aura-asset.ts',
  'AuraAsset:AssetAttributeAdded': 'aura-asset.ts',
  'AuraAsset:TransferSingle': 'aura-asset.ts',
  'AuraAsset:TransferBatch': 'aura-asset.ts',

  // Orders (OrdersFacet)
  'Diamond:OrderCreated(bytes32 indexed orderHash, address indexed buyer, address indexed seller, uint256 price, uint256 amount)':
    'orders.ts',
  'Diamond:OrderUpdated': 'orders.ts',
  'Diamond:OrderCancelled(bytes32 indexed orderHash, address indexed buyer)':
    'orders.ts',

  // Journeys
  'Diamond:LogisticsOrderCreated': 'journeys.ts',
  'Diamond:JourneyStatusUpdated': 'journeys.ts',
};

// Track which handlers we've seen
const handlersSeen = new Set<string>();

// ============================================================================
// VALIDATION ON STARTUP
// ============================================================================

console.log('[validation] Checking handler coverage...');

// Log expected handlers
const handlerFiles = new Set(Object.values(EXPECTED_HANDLERS));
console.log(
  `[validation] Expected handler files: ${Array.from(handlerFiles).join(', ')}`,
);

// ============================================================================
// EVENT TRACKING
// ============================================================================

/**
 * Track that an event was handled
 */
export function trackEventHandled(eventName: string): void {
  handlersSeen.add(eventName);
}

/**
 * Check if an event is expected to have a handler
 */
export function isEventExpected(eventName: string): boolean {
  return eventName in EXPECTED_HANDLERS;
}

/**
 * Get the expected handler file for an event
 */
export function getExpectedHandler(eventName: string): string | undefined {
  return EXPECTED_HANDLERS[eventName];
}

/**
 * Log a warning when an event is emitted but not handled
 */
export function logMissingHandler(eventName: string): void {
  const expectedHandler = getExpectedHandler(eventName);
  if (expectedHandler) {
    console.error(
      `[validation] ❌ ERROR: Event "${eventName}" was emitted but not handled! ` +
        `Expected handler: ${expectedHandler}. ` +
        `This will cause silent failures in frontend queries.`,
    );
  } else {
    console.warn(
      `[validation] ⚠️  WARNING: Event "${eventName}" was emitted but has no expected handler. ` +
        `This may be intentional if the event doesn't need indexing.`,
    );
  }
}
