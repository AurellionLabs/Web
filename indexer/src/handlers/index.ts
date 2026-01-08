/**
 * Handler Index
 *
 * Imports all domain-specific handlers.
 * Each handler file is responsible for a specific domain:
 * - nodes.ts: Node registration, assets, inventory
 * - clob.ts: Orders, trades, matching
 * - bridge.ts: Unified orders, settlements
 * - staking.ts: Stakes, rewards
 *
 * @author Staff Engineer Implementation
 */

import './nodes';
import './clob';
import './bridge';
import './staking';

// Handler domains loaded
console.log('[indexer] All handlers loaded: nodes, clob, bridge, staking');
