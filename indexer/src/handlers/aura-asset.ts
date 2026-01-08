/**
 * AuraAsset Handler
 *
 * Handles all AuraAsset contract events:
 * - MintedAsset: Creates assets, supported classes, and related entities
 * - AssetAttributeAdded: Creates asset attributes
 * - TransferSingle/TransferBatch: Updates balances and transfer events
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
  tokenStats,
  userBalances,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;
const balanceId = (user: string, tokenId: bigint) =>
  `${user.toLowerCase()}-${tokenId.toString()}`;

// Helper to get amount from TransferSingle event in the same transaction
// For now, we'll use a default of 1n and update when TransferSingle is processed
const getAmountFromTransfer = async (
  context: any,
  tokenId: bigint,
  account: string,
  blockNumber: bigint,
): Promise<bigint> => {
  // Try to find a TransferSingle event for this tokenId in the same block
  // This is a simplified approach - in production you might want to track this differently
  return 1n; // Default amount, will be updated by TransferSingle handler
};

// ============================================================================
// MINTED ASSET HANDLER
// ============================================================================

ponder.on('AuraAsset:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const hashString = hash.toLowerCase();

  console.log(
    `[aura-asset] MintedAsset: ${name} (${className}) - tokenId: ${tokenId}`,
  );

  // Get amount from ERC1155 balance or TransferSingle event
  // For now, we'll need to read it from the contract or track it separately
  // The amount is minted in the same transaction, so we can try to get it from TransferSingle
  let amount = 1n;
  try {
    // Try to read the balance from the contract at this block
    // Note: This might not work if the block hasn't been processed yet
    // A better approach would be to track TransferSingle events
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
    // Will be updated when TransferSingle is processed
  }

  // 1. Create MintedAsset event record
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

  // 2. Create or update Asset entity
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

  // 3. Create or update SupportedAsset
  const existingSupportedAsset = await context.db.find(supportedAssets, {
    id: name,
  });

  if (!existingSupportedAsset) {
    // Try to get index from contract mapping, fallback to 0
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

  // 4. Create or update SupportedClass
  const existingSupportedClass = await context.db.find(supportedClasses, {
    id: className,
  });

  if (!existingSupportedClass) {
    // Try to get index from contract mapping, fallback to 0
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

  // 5. Create or update TokenStats
  const existingTokenStats = await context.db.find(tokenStats, {
    id: tokenId.toString(),
  });

  if (!existingTokenStats) {
    await context.db.insert(tokenStats).values({
      id: tokenId.toString(),
      tokenId,
      totalSupply: amount,
      holders: 1n,
      transfers: 0n,
      asset: hashString,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db.update(tokenStats, { id: tokenId.toString() }).set({
      totalSupply: (existingTokenStats.totalSupply || 0n) + amount,
      updatedAt: event.block.timestamp,
    });
  }

  // 6. Create or update UserBalance
  const balanceIdStr = balanceId(account, tokenId);
  const existingBalance = await context.db.find(userBalances, {
    id: balanceIdStr,
  });

  if (!existingBalance) {
    await context.db.insert(userBalances).values({
      id: balanceIdStr,
      user: account.toLowerCase(),
      tokenId,
      balance: amount,
      asset: hashString,
      firstReceived: event.block.timestamp,
      lastUpdated: event.block.timestamp,
    });
  } else {
    await context.db.update(userBalances, { id: balanceIdStr }).set({
      balance: (existingBalance.balance || 0n) + amount,
      lastUpdated: event.block.timestamp,
    });
  }
});

// ============================================================================
// ASSET ATTRIBUTE ADDED HANDLER
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
// TRANSFER HANDLERS
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

  // Update token stats
  const existingTokenStats = await context.db.find(tokenStats, {
    id: tokenId.toString(),
  });

  if (existingTokenStats) {
    await context.db.update(tokenStats, { id: tokenId.toString() }).set({
      transfers: (existingTokenStats.transfers || 0n) + 1n,
      updatedAt: event.block.timestamp,
    });
  }

  // Update balances
  // From balance
  if (from !== '0x0000000000000000000000000000000000000000') {
    const fromBalanceId = balanceId(from, tokenId);
    const fromBalance = await context.db.find(userBalances, {
      id: fromBalanceId,
    });

    if (fromBalance) {
      const newBalance = (fromBalance.balance || 0n) - amount;
      if (newBalance > 0n) {
        await context.db.update(userBalances, { id: fromBalanceId }).set({
          balance: newBalance,
          lastUpdated: event.block.timestamp,
        });
      } else {
        await context.db.delete(userBalances, { id: fromBalanceId });
      }
    }
  }

  // To balance
  if (to !== '0x0000000000000000000000000000000000000000') {
    const toBalanceId = balanceId(to, tokenId);
    const toBalance = await context.db.find(userBalances, {
      id: toBalanceId,
    });

    // Get asset hash from tokenId
    const asset = await context.db.find(assets, { tokenId });
    const assetHash = asset ? asset.id : '';

    if (toBalance) {
      await context.db.update(userBalances, { id: toBalanceId }).set({
        balance: (toBalance.balance || 0n) + amount,
        lastUpdated: event.block.timestamp,
      });
    } else {
      await context.db.insert(userBalances).values({
        id: toBalanceId,
        user: to.toLowerCase(),
        tokenId,
        balance: amount,
        asset: assetHash,
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      });
    }
  }
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

  // Process each token transfer
  for (let i = 0; i < tokenIds.length; i++) {
    const tokenId = tokenIds[i];
    const amount = amounts[i];

    // Update token stats
    const existingTokenStats = await context.db.find(tokenStats, {
      id: tokenId.toString(),
    });

    if (existingTokenStats) {
      await context.db.update(tokenStats, { id: tokenId.toString() }).set({
        transfers: (existingTokenStats.transfers || 0n) + 1n,
        updatedAt: event.block.timestamp,
      });
    }

    // Update balances (similar to TransferSingle)
    if (from !== '0x0000000000000000000000000000000000000000') {
      const fromBalanceId = balanceId(from, tokenId);
      const fromBalance = await context.db.find(userBalances, {
        id: fromBalanceId,
      });

      if (fromBalance) {
        const newBalance = (fromBalance.balance || 0n) - amount;
        if (newBalance > 0n) {
          await context.db.update(userBalances, { id: fromBalanceId }).set({
            balance: newBalance,
            lastUpdated: event.block.timestamp,
          });
        } else {
          await context.db.delete(userBalances, { id: fromBalanceId });
        }
      }
    }

    if (to !== '0x0000000000000000000000000000000000000000') {
      const toBalanceId = balanceId(to, tokenId);
      const toBalance = await context.db.find(userBalances, {
        id: toBalanceId,
      });

      const asset = await context.db.find(assets, { tokenId });
      const assetHash = asset ? asset.id : '';

      if (toBalance) {
        await context.db.update(userBalances, { id: toBalanceId }).set({
          balance: (toBalance.balance || 0n) + amount,
          lastUpdated: event.block.timestamp,
        });
      } else {
        await context.db.insert(userBalances).values({
          id: toBalanceId,
          user: to.toLowerCase(),
          tokenId,
          balance: amount,
          asset: assetHash,
          firstReceived: event.block.timestamp,
          lastUpdated: event.block.timestamp,
        });
      }
    }
  }
});
