// Auto-generated handler for clob-admin domain - Raw event storage only
// Generated at: 2026-01-13T14:14:28.790Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: CLOBAdminFacet

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { circuitBreakerConfigured_5880Events } from '../../generated-schema';
import { circuitBreakerResetBae5Events } from '../../generated-schema';
import { circuitBreakerTripped_5953Events } from '../../generated-schema';
import { emergencyActionCancelled_248bEvents } from '../../generated-schema';
import { emergencyActionExecuted_4579Events } from '../../generated-schema';
import { emergencyActionInitiatedCa04Events } from '../../generated-schema';
import { emergencyWithdrawalC0f6Events } from '../../generated-schema';
import { feeRecipientUpdatedAaebEvents } from '../../generated-schema';
import { feesUpdatedB3efEvents } from '../../generated-schema';
import { globalPauseA5feEvents } from '../../generated-schema';
import { mEVProtectionUpdated_096cEvents } from '../../generated-schema';
import { marketPaused_6136Events } from '../../generated-schema';
import { marketUnpausedB51dEvents } from '../../generated-schema';
import { rateLimitsUpdated_6675Events } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// CLOBAdminFacet Events
// =============================================================================

/**
 * Handle CircuitBreakerConfigured event from CLOBAdminFacet
 * Signature: CircuitBreakerConfigured(bytes32,uint256,uint256,bool)
 * Hash: 0x58807e46
 */
ponder.on('Diamond:CircuitBreakerConfigured', async ({ event, context }) => {
  const { marketId, priceChangeThreshold, cooldownPeriod, isEnabled } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(circuitBreakerConfigured_5880Events).values({
    id,
    market_id: marketId,
    price_change_threshold: priceChangeThreshold,
    cooldown_period: cooldownPeriod,
    is_enabled: isEnabled,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CircuitBreakerReset event from CLOBAdminFacet
 * Signature: CircuitBreakerReset(bytes32,uint256)
 * Hash: 0xbae506d4
 */
ponder.on('Diamond:CircuitBreakerReset', async ({ event, context }) => {
  const { marketId, resetAt } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(circuitBreakerResetBae5Events).values({
    id,
    market_id: marketId,
    reset_at: resetAt,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CircuitBreakerTripped event from CLOBAdminFacet
 * Signature: CircuitBreakerTripped(bytes32,uint256,uint256,uint256,uint256)
 * Hash: 0x5953204a
 */
ponder.on('Diamond:CircuitBreakerTripped', async ({ event, context }) => {
  const {
    marketId,
    triggerPrice,
    previousPrice,
    changePercent,
    cooldownUntil,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(circuitBreakerTripped_5953Events).values({
    id,
    market_id: marketId,
    trigger_price: triggerPrice,
    previous_price: previousPrice,
    change_percent: changePercent,
    cooldown_until: cooldownUntil,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle EmergencyActionCancelled event from CLOBAdminFacet
 * Signature: EmergencyActionCancelled(bytes32,address)
 * Hash: 0x248b189e
 */
ponder.on('Diamond:EmergencyActionCancelled', async ({ event, context }) => {
  const { actionId, canceller } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(emergencyActionCancelled_248bEvents).values({
    id,
    action_id: actionId,
    canceller: canceller,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle EmergencyActionExecuted event from CLOBAdminFacet
 * Signature: EmergencyActionExecuted(bytes32,address,address,address,uint256)
 * Hash: 0x4579d7c5
 */
ponder.on('Diamond:EmergencyActionExecuted', async ({ event, context }) => {
  const { actionId, executor, token, recipient, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(emergencyActionExecuted_4579Events).values({
    id,
    action_id: actionId,
    executor: executor,
    token: token,
    recipient: recipient,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle EmergencyActionInitiated event from CLOBAdminFacet
 * Signature: EmergencyActionInitiated(bytes32,address,address,address,uint256,uint256)
 * Hash: 0xca04aa1e
 */
ponder.on('Diamond:EmergencyActionInitiated', async ({ event, context }) => {
  const { actionId, initiator, token, recipient, amount, executeAfter } =
    event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(emergencyActionInitiatedCa04Events).values({
    id,
    action_id: actionId,
    initiator: initiator,
    token: token,
    recipient: recipient,
    amount: amount,
    execute_after: executeAfter,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle EmergencyWithdrawal event from CLOBAdminFacet
 * Signature: EmergencyWithdrawal(address,bytes32,address,uint256)
 * Hash: 0xc0f6eecd
 */
ponder.on('Diamond:EmergencyWithdrawal', async ({ event, context }) => {
  const { user, orderId, token, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(emergencyWithdrawalC0f6Events).values({
    id,
    user: user,
    order_id: orderId,
    token: token,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle FeeRecipientUpdated event from CLOBAdminFacet
 * Signature: FeeRecipientUpdated(address,address)
 * Hash: 0xaaebcf1b
 */
ponder.on(
  'Diamond:FeeRecipientUpdated(address,address)',
  async ({ event, context }) => {
    const { oldRecipient, newRecipient } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    // Insert raw event into event table
    await context.db.insert(feeRecipientUpdatedAaebEvents).values({
      id,
      old_recipient: oldRecipient,
      new_recipient: newRecipient,
      block_number: event.block.number,
      block_timestamp: BigInt(event.block.timestamp),
      transaction_hash: event.transaction.hash,
    });
  },
);

/**
 * Handle FeesUpdated event from CLOBAdminFacet
 * Signature: FeesUpdated(uint16,uint16,uint16)
 * Hash: 0xb3ef341b
 */
ponder.on('Diamond:FeesUpdated', async ({ event, context }) => {
  const { takerFeeBps, makerFeeBps, lpFeeBps } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(feesUpdatedB3efEvents).values({
    id,
    taker_fee_bps: takerFeeBps,
    maker_fee_bps: makerFeeBps,
    lp_fee_bps: lpFeeBps,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle GlobalPause event from CLOBAdminFacet
 * Signature: GlobalPause(bool)
 * Hash: 0xa5fea31b
 */
ponder.on('Diamond:GlobalPause', async ({ event, context }) => {
  const { paused } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(globalPauseA5feEvents).values({
    id,
    paused: paused,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MEVProtectionUpdated event from CLOBAdminFacet
 * Signature: MEVProtectionUpdated(uint8,uint256)
 * Hash: 0x096cc317
 */
ponder.on('Diamond:MEVProtectionUpdated', async ({ event, context }) => {
  const { minRevealDelay, commitmentThreshold } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(mEVProtectionUpdated_096cEvents).values({
    id,
    min_reveal_delay: minRevealDelay,
    commitment_threshold: commitmentThreshold,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MarketPaused event from CLOBAdminFacet
 * Signature: MarketPaused(bytes32)
 * Hash: 0x613681e6
 */
ponder.on('Diamond:MarketPaused', async ({ event, context }) => {
  const { marketId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(marketPaused_6136Events).values({
    id,
    market_id: marketId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MarketUnpaused event from CLOBAdminFacet
 * Signature: MarketUnpaused(bytes32)
 * Hash: 0xb51d033f
 */
ponder.on('Diamond:MarketUnpaused', async ({ event, context }) => {
  const { marketId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(marketUnpausedB51dEvents).values({
    id,
    market_id: marketId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle RateLimitsUpdated event from CLOBAdminFacet
 * Signature: RateLimitsUpdated(uint256,uint256)
 * Hash: 0x6675ea6c
 */
ponder.on('Diamond:RateLimitsUpdated', async ({ event, context }) => {
  const { maxOrdersPerBlock, maxVolumePerBlock } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(rateLimitsUpdated_6675Events).values({
    id,
    max_orders_per_block: maxOrdersPerBlock,
    max_volume_per_block: maxVolumePerBlock,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
