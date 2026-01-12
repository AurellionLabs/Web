/**
 * AuraAsset Handler
 *
 * Handles all AuraAsset contract events:
 * - MintedAsset: Creates assets, supported classes, and related entities
 * - AssetAttributeAdded: Creates asset attributes
 * - TransferSingle/TransferBatch: Updates balances and transfer events
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 */

import { ponder } from '@/generated';
import {
  assets,
  assetAttributes,
  supportedAssets,
  supportedClasses,
  mintedAssetEvents,
  transferEvents,
  transferBatchEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// ============================================================================
// MINTED ASSET HANDLER - Store only raw event
// ============================================================================

ponder.on('AuraAsset:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const hashString = hash.toLowerCase();

  console.log(
    `[aura-asset] MintedAsset: ${name} (${className}) - tokenId: ${tokenId}`,
  );

  // Get amount from ERC1155 balance
  let amount = 1n;
  try {
    const balance = await context.client.readContract({
      abi: context.contracts.AuraAsset.abi,
      address: context.contracts.AuraAsset.address,
      functionName: 'balanceOf',
      args: [account, tokenId],
      blockNumber: event.block.number,
    });
    amount = balance as bigint;
  } catch (e) {
    console.warn(`[aura-asset] Could not read balance, using default:`, e);
  }

  // Create MintedAsset event record
  await context.db
    .insert(mintedAssetEvents)
    .values({
      id,
      account,
      hash,
      tokenId,
      assetName: name,
      assetClass,
      className,
      amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Create or update Asset entity (this is a business entity, not a derived stat)
  await context.db
    .insert(assets)
    .values({
      id: hashString,
      hash,
      tokenId,
      name,
      assetClass,
      className,
      account,
      amount,
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        amount,
        account,
      },
    });

  // Create or update SupportedAsset
  const existingSupportedAsset = await context.db.find(supportedAssets, {
    id: name,
  });

  if (!existingSupportedAsset) {
    let index = 0n;
    try {
      index = (await context.client.readContract({
        abi: context.contracts.AuraAsset.abi,
        address: context.contracts.AuraAsset.address,
        functionName: 'nameToSupportedAssetIndex',
        args: [name],
        blockNumber: event.block.number,
      })) as bigint;
    } catch (e) {
      console.warn(`[aura-asset] Could not read asset index:`, e);
    }

    await context.db.insert(supportedAssets).values({
      id: name,
      name,
      index,
      asset: hashString,
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db.update(supportedAssets, { id: name }).set({
      asset: hashString,
      updatedAt: event.block.timestamp,
    });
  }

  // Create or update SupportedClass
  const existingSupportedClass = await context.db.find(supportedClasses, {
    id: className,
  });

  if (!existingSupportedClass) {
    let index = 0n;
    try {
      index = (await context.client.readContract({
        abi: context.contracts.AuraAsset.abi,
        address: context.contracts.AuraAsset.address,
        functionName: 'nameToSupportedClassIndex',
        args: [className],
        blockNumber: event.block.number,
      })) as bigint;
    } catch (e) {
      console.warn(`[aura-asset] Could not read class index:`, e);
    }

    await context.db.insert(supportedClasses).values({
      id: className,
      name: className,
      index,
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
    console.log(`[aura-asset] Created supported class: ${className}`);
  } else {
    await context.db.update(supportedClasses, { id: className }).set({
      updatedAt: event.block.timestamp,
    });
  }
});

// ============================================================================
// ASSET ATTRIBUTE ADDED HANDLER - Store only raw event
// ============================================================================

ponder.on('AuraAsset:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const hashString = hash.toLowerCase();
  const attributeId = `${hashString}-${attributeIndex.toString()}`;

  console.log(
    `[aura-asset] AssetAttributeAdded: ${name} for asset ${hashString}`,
  );

  await context.db
    .insert(assetAttributes)
    .values({
      id: attributeId,
      assetId: hashString,
      name,
      values: JSON.stringify(values),
      description,
    })
    .onConflictDoUpdate({
      set: {
        name,
        values: JSON.stringify(values),
        description,
      },
    });
});

// ============================================================================
// TRANSFER HANDLERS - Store only raw events
// ============================================================================

ponder.on('AuraAsset:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id: tokenId, value: amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(
    `[aura-asset] TransferSingle: ${tokenId} from ${from} to ${to}, amount: ${amount}`,
  );

  // Create transfer event
  await context.db
    .insert(transferEvents)
    .values({
      id,
      operator,
      from,
      to,
      tokenId,
      amount,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('AuraAsset:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids: tokenIds, values: amounts } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(
    `[aura-asset] TransferBatch: ${tokenIds.length} tokens from ${from} to ${to}`,
  );

  // Create transfer batch event
  await context.db
    .insert(transferBatchEvents)
    .values({
      id,
      operator,
      from,
      to,
      tokenIds: JSON.stringify(tokenIds),
      amounts: JSON.stringify(amounts),
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
