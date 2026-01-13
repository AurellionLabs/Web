/**
 * AuraAsset Event Handlers
 *
 * Handles events from the AuraAsset ERC1155 contract:
 * - MintedAsset: Asset creation events
 * - TransferSingle: Single token transfers
 * - TransferBatch: Batch token transfers
 * - AssetAttributeAdded: Asset attribute metadata
 */

import { ponder } from '@/generated';

// Import AuraAsset event tables from generated schema
import {
  mintedAssetEvents,
  transferEvents,
  transferBatchEvents,
  assetAttributes,
} from '../../generated-schema';

// Import entity tables from ponder schema
import { assets, tokenStats, userBalances } from '../../ponder.schema';

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

/**
 * Handle MintedAsset event from AuraAsset contract
 * This is the primary event for creating new assets in the system
 */
ponder.on('AuraAsset:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Insert the minted asset event
  await context.db.insert(mintedAssetEvents).values({
    id,
    account,
    hash,
    token_id: BigInt(tokenId),
    asset_name: name,
    asset_class: assetClass,
    class_name: className,
    amount: 1n,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  // Create asset entity
  const assetEntityId = hash;
  const existingAsset = await context.db.find(assets, { id: assetEntityId });

  if (!existingAsset) {
    await context.db.insert(assets).values({
      id: assetEntityId,
      hash,
      tokenId: BigInt(tokenId),
      name,
      assetClass,
      className,
      account,
      amount: 1n,
      createdAt: BigInt(event.block.timestamp),
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    const tokenStatsId = tokenId.toString();
    const existingStats = await context.db.find(tokenStats, {
      id: tokenStatsId,
    });

    if (!existingStats) {
      await context.db.insert(tokenStats).values({
        id: tokenStatsId,
        tokenId: BigInt(tokenId),
        totalSupply: 1n,
        holders: 1n,
        transfers: 0n,
        asset: assetEntityId,
        createdAt: BigInt(event.block.timestamp),
        updatedAt: BigInt(event.block.timestamp),
      });
    }
  }

  // Create user balance
  const balanceId = `${account.toLowerCase()}-${tokenId.toString()}`;
  const existingBalance = await context.db.find(userBalances, {
    id: balanceId,
  });

  if (!existingBalance) {
    await context.db.insert(userBalances).values({
      id: balanceId,
      user: account.toLowerCase(),
      tokenId: BigInt(tokenId),
      balance: 1n,
      asset: assetEntityId,
      firstReceived: BigInt(event.block.timestamp),
      lastUpdated: BigInt(event.block.timestamp),
    });
  }

  console.log(
    `[AuraAsset:MintedAsset] Processed asset: ${name} (${hash}) tokenId: ${tokenId}`,
  );
});

/**
 * Handle TransferSingle event from AuraAsset contract
 */
ponder.on('AuraAsset:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id: tokenId, value } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert(transferEvents).values({
    id,
    operator,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    token_id: BigInt(tokenId),
    amount: BigInt(value),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });

  if (value === 0n) return;

  const normalizedTo = to.toLowerCase();
  const normalizedFrom = from.toLowerCase();

  if (from === '0x0000000000000000000000000000000000000000') {
    // Mint
    const asset = await context.db.find(assets, { tokenId: BigInt(tokenId) });
    if (asset) {
      const balanceId = `${normalizedTo}-${tokenId.toString()}`;
      const existingBalance = await context.db.find(userBalances, {
        id: balanceId,
      });

      if (!existingBalance) {
        await context.db.insert(userBalances).values({
          id: balanceId,
          user: normalizedTo,
          tokenId: BigInt(tokenId),
          balance: BigInt(value),
          asset: asset.id,
          firstReceived: BigInt(event.block.timestamp),
          lastUpdated: BigInt(event.block.timestamp),
        });
      } else {
        await context.db.update(userBalances, { id: balanceId }).set({
          balance: existingBalance.balance + BigInt(value),
          lastUpdated: BigInt(event.block.timestamp),
        });
      }
    }
  } else if (to === '0x0000000000000000000000000000000000000000') {
    // Burn
    const balanceId = `${normalizedFrom}-${tokenId.toString()}`;
    const senderBalance = await context.db.find(userBalances, {
      id: balanceId,
    });

    if (senderBalance) {
      const newBalance = senderBalance.balance - BigInt(value);
      if (newBalance <= 0n) {
        await context.db.delete(userBalances, { id: balanceId });
      } else {
        await context.db.update(userBalances, { id: balanceId }).set({
          balance: newBalance,
          lastUpdated: BigInt(event.block.timestamp),
        });
      }
    }
  } else {
    // Transfer
    const fromBalanceId = `${normalizedFrom}-${tokenId.toString()}`;
    const fromBalance = await context.db.find(userBalances, {
      id: fromBalanceId,
    });

    if (fromBalance) {
      const newFromBalance = fromBalance.balance - BigInt(value);
      if (newFromBalance <= 0n) {
        await context.db.delete(userBalances, { id: fromBalanceId });
      } else {
        await context.db.update(userBalances, { id: fromBalanceId }).set({
          balance: newFromBalance,
          lastUpdated: BigInt(event.block.timestamp),
        });
      }
    }

    const toBalanceId = `${normalizedTo}-${tokenId.toString()}`;
    const toBalance = await context.db.find(userBalances, { id: toBalanceId });

    if (toBalance) {
      await context.db.update(userBalances, { id: toBalanceId }).set({
        balance: toBalance.balance + BigInt(value),
        lastUpdated: BigInt(event.block.timestamp),
      });
    }
  }
});

/**
 * Handle TransferBatch event from AuraAsset contract
 */
ponder.on('AuraAsset:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids, values } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  await context.db.insert(transferBatchEvents).values({
    id,
    operator,
    from: from.toLowerCase(),
    to: to.toLowerCase(),
    token_ids: JSON.stringify(ids.map((id) => id.toString())),
    amounts: JSON.stringify(values.map((v) => v.toString())),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle AssetAttributeAdded event from AuraAsset contract
 */
ponder.on('AuraAsset:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const id = `${hash}-${attributeIndex.toString()}`;

  await context.db.insert(assetAttributes).values({
    id,
    asset_id: hash,
    name,
    values: JSON.stringify(values),
    description,
  });
});
