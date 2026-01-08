/**
 * Handler Index
 *
 * Imports all domain-specific handlers.
 * Each handler file is responsible for a specific domain:
 * - nodes.ts: Node registration, assets, inventory
 * - clob.ts: CLOB trading orders and trades
 * - bridge.ts: Unified orders, settlements
 * - staking.ts: Stakes, rewards
 * - aura-asset.ts: AuraAsset ERC1155 events (minting, transfers, attributes)
 * - orders.ts: AuSys-style orders (OrdersFacet)
 * - journeys.ts: Logistics journeys (BridgeFacet)
 *
 * @author Staff Engineer Implementation
 */

// Import validation utilities first
import './validation';

// Import all handlers
import './nodes';
import './clob';
import './bridge';
import './staking';
import './aura-asset';
import './orders';
import './journeys';

// Handler domains loaded
const HANDLERS = [
  'nodes',
  'clob',
  'bridge',
  'staking',
  'aura-asset',
  'orders',
  'journeys',
];

console.log(
  `[indexer] ✅ All ${HANDLERS.length} handlers loaded: ${HANDLERS.join(', ')}`,
);

// Validation check
const EXPECTED_HANDLER_COUNT = 7;
if (HANDLERS.length < EXPECTED_HANDLER_COUNT) {
  console.error(
    `[indexer] ❌ ERROR: Expected ${EXPECTED_HANDLER_COUNT} handlers, but only ${HANDLERS.length} loaded! ` +
      `Missing handlers will cause silent failures in frontend queries.`,
  );
} else {
  console.log(
    `[indexer] ✅ Handler count validation passed: ${HANDLERS.length}/${EXPECTED_HANDLER_COUNT}`,
  );
}
