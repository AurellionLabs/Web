// Auto-generated handler for aura-asset domain - Raw event storage only
// Generated at: 2026-01-13T22:55:31.504Z
//
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: AuraAsset

import { ponder } from '@/generated';

// Import event tables (auto-generated from ABI)
import { approvalForAll_1730Events } from '../../generated-schema';
import { assetAttributeAddedEe76Events } from '../../generated-schema';
import { mintedAssetDa6fEvents } from '../../generated-schema';
import { transferBatch_4a39Events } from '../../generated-schema';
import { transferSingleC3d5Events } from '../../generated-schema';
import { uRI_6bb7Events } from '../../generated-schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// AuraAsset Events
// =============================================================================

/**
 * Handle ApprovalForAll event from AuraAsset
 * Signature: ApprovalForAll(address,address,bool)
 * Hash: 0x17307eab
 */
ponder.on('AuraAsset:ApprovalForAll', async ({ event, context }) => {
  const { account, operator, approved } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(approvalForAll_1730Events).values({
    id,
    account: account,
    operator: operator,
    approved: approved,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AssetAttributeAdded event from AuraAsset
 * Signature: AssetAttributeAdded(bytes32,uint256,string,string[],string)
 * Hash: 0xee7669d5
 */
ponder.on('AuraAsset:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(assetAttributeAddedEe76Events).values({
    id,
    hash: hash,
    attribute_index: attributeIndex,
    name: name,
    values: values,
    description: description,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MintedAsset event from AuraAsset
 * Signature: MintedAsset(address,bytes32,uint256,string,string,string)
 * Hash: 0xda6f2bc5
 */
ponder.on('AuraAsset:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(mintedAssetDa6fEvents).values({
    id,
    account: account,
    hash: hash,
    token_id: tokenId,
    name: name,
    asset_class: assetClass,
    class_name: className,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TransferBatch event from AuraAsset
 * Signature: TransferBatch(address,address,address,uint256[],uint256[])
 * Hash: 0x4a39dc06
 */
ponder.on('AuraAsset:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids, values } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(transferBatch_4a39Events).values({
    id,
    operator: operator,
    from: from,
    to: to,
    ids: ids,
    values: values,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TransferSingle event from AuraAsset
 * Signature: TransferSingle(address,address,address,uint256,uint256)
 * Hash: 0xc3d58168
 */
ponder.on('AuraAsset:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id, value } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(transferSingleC3d5Events).values({
    id,
    operator: operator,
    from: from,
    to: to,
    id: id,
    value: value,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle URI event from AuraAsset
 * Signature: URI(string,uint256)
 * Hash: 0x6bb7ff70
 */
ponder.on('AuraAsset:URI', async ({ event, context }) => {
  const { value, id } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert raw event into event table
  await context.db.insert(uRI_6bb7Events).values({
    id,
    value: value,
    id: id,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
