/**
 * Indexer Entry Point
 *
 * Imports all event handlers organized by domain.
 * All handlers use the generated ABIs with deduplicated events.
 *
 * Handlers:
 * - handlers/nodes.ts: Node registration, assets, inventory
 * - handlers/clob.ts: Orders, trades, matching
 * - handlers/bridge.ts: Unified orders, settlements
 * - handlers/staking.ts: Stakes, rewards
 *
 * Legacy handlers moved to src/deprecated/
 * Legacy ABIs moved to abis/deprecated/
 *
 * @author Staff Engineer Implementation
 */

// Diamond handlers only - no legacy contracts
import './handlers/nodes';
import './handlers/clob';
import './handlers/bridge';
import './handlers/staking';

console.log('[indexer] Handlers loaded: nodes, clob, bridge, staking');

export {};
