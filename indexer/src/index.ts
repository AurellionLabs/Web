/**
 * Indexer Entry Point
 *
 * Imports all event handlers organized by domain.
 * All handlers use the generated ABIs with deduplicated events.
 *
 * Handlers:
 * - handlers/nodes.generated.ts: Node registration, assets, inventory
 * - handlers/clob.generated.ts: Orders, trades, matching
 * - handlers/bridge.generated.ts: Unified orders, settlements
 * - handlers/staking.generated.ts: Stakes, rewards
 * - handlers/clob-admin.generated.ts: CLOB admin functions
 * - handlers/diamond.generated.ts: Diamond cut events
 *
 * @author Staff Engineer Implementation
 */

import './handlers';

console.log(
  '[indexer] Handlers loaded: nodes, clob, bridge, staking, aura-asset, journeys',
);

export {};
