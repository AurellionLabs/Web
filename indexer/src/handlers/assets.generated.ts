// Auto-generated handler for assets domain
// Generated at: 2026-03-06T16:33:32.573Z
//
// Inline aggregate writes: raw event insert + aggregate table upsert in ONE ponder.on() handler.
// This avoids the Ponder 0.16 restriction: only one ponder.on() per event name is allowed.
// Events from: AssetsFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondApprovalForAllEvents,
  diamondAssetAttributeAddedEvents,
  diamondCustodyEstablishedEvents,
  diamondCustodyReleasedEvents,
  diamondMintedAssetEvents,
  diamondSupportedClassAddedEvents,
  diamondSupportedClassRemovedEvents,
  diamondTransferBatchEvents,
  diamondTransferSingleEvents,
  diamondURIEvents,
  assets,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// AssetsFacet Events
// =============================================================================

/**
 * Handle ApprovalForAll event from AssetsFacet
 * Signature: ApprovalForAll(address,address,bool)
 * Hash: 0x17307eab
 */
ponder.on('Diamond:ApprovalForAll', async ({ event, context }) => {
  const { account, operator, approved } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondApprovalForAllEvents).values({
    id: id,
    account: account,
    operator: operator,
    approved: approved,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AssetAttributeAdded event from AssetsFacet
 * Signature: AssetAttributeAdded(bytes32,uint256,string,string[],string)
 * Hash: 0xee7669d5
 */
ponder.on('Diamond:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondAssetAttributeAddedEvents).values({
    id: id,
    hash: hash,
    attribute_index: attributeIndex,
    name: name,
    values: JSON.stringify(Array.from(values), (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
    description: description,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CustodyEstablished event from AssetsFacet
 * Signature: CustodyEstablished(uint256,address,uint256)
 * Hash: 0x75e1dfdc
 */
ponder.on('Diamond:CustodyEstablished', async ({ event, context }) => {
  const { tokenId, custodian, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondCustodyEstablishedEvents).values({
    id: id,
    token_id: tokenId,
    custodian: custodian,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle CustodyReleased event from AssetsFacet
 * Signature: CustodyReleased(uint256,address,uint256,address)
 * Hash: 0x93d2bba3
 */
ponder.on('Diamond:CustodyReleased', async ({ event, context }) => {
  const { tokenId, custodian, amount, redeemer } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondCustodyReleasedEvents).values({
    id: id,
    token_id: tokenId,
    custodian: custodian,
    amount: amount,
    redeemer: redeemer,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle MintedAsset event from AssetsFacet
 * Signature: MintedAsset(address,bytes32,uint256,string,string,string)
 * Hash: 0xda6f2bc5
 */
ponder.on('Diamond:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondMintedAssetEvents).values({
    id: id,
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

  // Inline aggregate writes (inlined to avoid duplicate ponder.on() for same event)
  await context.db
    .insert(assets)
    .values({
      id: hash,
      hash: hash,
      token_id: tokenId,
      name: name,
      asset_class: assetClass,
      class_name: className,
      account: account,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      hash: hash,
      token_id: tokenId,
      name: name,
      asset_class: assetClass,
      class_name: className,
      account: account,
      created_at: BigInt(event.block.timestamp),
      updated_at: BigInt(event.block.timestamp),
      block_number: event.block.number,
      transaction_hash: event.transaction.hash,
    });
});

/**
 * Handle SupportedClassAdded event from AssetsFacet
 * Signature: SupportedClassAdded(bytes32,string)
 * Hash: 0xce16422f
 */
ponder.on('Diamond:SupportedClassAdded', async ({ event, context }) => {
  const { classNameHash, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportedClassAddedEvents).values({
    id: id,
    class_name_hash: classNameHash,
    class_name: className,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SupportedClassRemoved event from AssetsFacet
 * Signature: SupportedClassRemoved(bytes32,string)
 * Hash: 0x986cf46e
 */
ponder.on('Diamond:SupportedClassRemoved', async ({ event, context }) => {
  const { classNameHash, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportedClassRemovedEvents).values({
    id: id,
    class_name_hash: classNameHash,
    class_name: className,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TransferBatch event from AssetsFacet
 * Signature: TransferBatch(address,address,address,uint256[],uint256[])
 * Hash: 0x4a39dc06
 */
ponder.on('Diamond:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids, values } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondTransferBatchEvents).values({
    id: id,
    operator: operator,
    from: from,
    to: to,
    ids: JSON.stringify(Array.from(ids), (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
    values: JSON.stringify(Array.from(values), (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TransferSingle event from AssetsFacet
 * Signature: TransferSingle(address,address,address,uint256,uint256)
 * Hash: 0xc3d58168
 */
ponder.on('Diamond:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id: arg_id, value: arg_value } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondTransferSingleEvents).values({
    id: id,
    operator: operator,
    from: from,
    to: to,
    event_id: arg_id,
    value: arg_value,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle URI event from AssetsFacet
 * Signature: URI(string,uint256)
 * Hash: 0x6bb7ff70
 */
ponder.on('Diamond:URI', async ({ event, context }) => {
  const { value: arg_value, id: arg_id } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondURIEvents).values({
    id: id,
    value: arg_value,
    event_id: arg_id,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
