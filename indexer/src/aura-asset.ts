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
} from '../ponder.schema';

// =============================================================================
// AURA ASSET EVENT HANDLERS - ERC1155 Mints, Transfers, Balances
// =============================================================================

const ZERO_ADDRESS =
  '0x0000000000000000000000000000000000000000' as `0x${string}`;

/**
 * Handle MintedAsset event
 */
ponder.on('AuraAsset:MintedAsset', async ({ event, context }) => {
  const { account, hash, tokenId, name, assetClass, className } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
  const hashString = hash.toLowerCase();

  // Insert MintedAsset event
  await context.db.insert(mintedAssetEvents).values({
    id: eventId,
    account,
    hash,
    tokenId,
    assetName: name,
    assetClass,
    className,
    amount: 1n, // Default amount
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Insert Asset entity
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
      amount: 1n, // Default amount
      createdAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Update or create SupportedAsset
  const existingSupportedAsset = await context.db.find(supportedAssets, {
    id: name,
  });
  if (existingSupportedAsset) {
    await context.db.update(supportedAssets, { id: name }).set({
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(supportedAssets)
      .values({
        id: name,
        name,
        index: 0n, // Would need to get from contract
        asset: hashString,
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }

  // Update or create SupportedClass
  if (className !== '') {
    const existingClass = await context.db.find(supportedClasses, {
      id: className,
    });
    if (existingClass) {
      await context.db.update(supportedClasses, { id: className }).set({
        updatedAt: event.block.timestamp,
      });
    } else {
      await context.db
        .insert(supportedClasses)
        .values({
          id: className,
          name: className,
          index: 0n, // Would need to get from contract
          isActive: true,
          createdAt: event.block.timestamp,
          updatedAt: event.block.timestamp,
        })
        .onConflictDoNothing();
    }
  }

  // Create or update TokenStats
  const tokenStatsId = tokenId.toString();
  const existingTokenStats = await context.db.find(tokenStats, {
    id: tokenStatsId,
  });
  if (existingTokenStats) {
    await context.db.update(tokenStats, { id: tokenStatsId }).set({
      updatedAt: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(tokenStats)
      .values({
        id: tokenStatsId,
        tokenId,
        totalSupply: 0n,
        holders: 0n,
        transfers: 0n,
        asset: hashString,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      })
      .onConflictDoNothing();
  }

  // Create or update UserBalance
  const balanceId = `${account.toLowerCase()}-${tokenId.toString()}`;
  const existingBalance = await context.db.find(userBalances, {
    id: balanceId,
  });
  if (existingBalance) {
    await context.db.update(userBalances, { id: balanceId }).set({
      balance: existingBalance.balance + 1n,
      lastUpdated: event.block.timestamp,
    });
  } else {
    await context.db
      .insert(userBalances)
      .values({
        id: balanceId,
        user: account,
        tokenId,
        balance: 1n,
        asset: hashString,
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      })
      .onConflictDoNothing();
  }
});

/**
 * Handle AssetAttributeAdded event
 */
ponder.on('AuraAsset:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const attributeId = `${hash.toLowerCase()}-${attributeIndex.toString()}`;

  await context.db
    .insert(assetAttributes)
    .values({
      id: attributeId,
      assetId: hash.toLowerCase(),
      name,
      values: JSON.stringify(values),
      description,
    })
    .onConflictDoNothing();
});

/**
 * Handle TransferSingle event
 */
ponder.on('AuraAsset:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id: tokenId, value } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert Transfer event
  await context.db.insert(transferEvents).values({
    id: eventId,
    operator,
    from,
    to,
    tokenId,
    amount: value,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Update TokenStats
  const tokenStatsId = tokenId.toString();
  const tokenStatsRecord = await context.db.find(tokenStats, {
    id: tokenStatsId,
  });
  if (tokenStatsRecord) {
    await context.db.update(tokenStats, { id: tokenStatsId }).set({
      transfers: tokenStatsRecord.transfers + 1n,
      updatedAt: event.block.timestamp,
    });
  }

  // Update UserBalances - subtract from sender
  if (from !== ZERO_ADDRESS) {
    const fromBalanceId = `${from.toLowerCase()}-${tokenId.toString()}`;
    const fromBalance = await context.db.find(userBalances, {
      id: fromBalanceId,
    });
    if (fromBalance) {
      await context.db.update(userBalances, { id: fromBalanceId }).set({
        balance: fromBalance.balance - value,
        lastUpdated: event.block.timestamp,
      });
    }
  }

  // Update UserBalances - add to receiver
  if (to !== ZERO_ADDRESS) {
    const toBalanceId = `${to.toLowerCase()}-${tokenId.toString()}`;
    const toBalance = await context.db.find(userBalances, {
      id: toBalanceId,
    });
    if (toBalance) {
      await context.db.update(userBalances, { id: toBalanceId }).set({
        balance: toBalance.balance + value,
        lastUpdated: event.block.timestamp,
      });
    } else {
      await context.db
        .insert(userBalances)
        .values({
          id: toBalanceId,
          user: to,
          tokenId,
          balance: value,
          asset: '', // Would need to look up from tokenId
          firstReceived: event.block.timestamp,
          lastUpdated: event.block.timestamp,
        })
        .onConflictDoNothing();
    }
  }
});

/**
 * Handle TransferBatch event
 */
ponder.on('AuraAsset:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids, values } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Insert TransferBatch event
  await context.db.insert(transferBatchEvents).values({
    id: eventId,
    operator,
    from,
    to,
    tokenIds: JSON.stringify(ids.map((id) => id.toString())),
    amounts: JSON.stringify(values.map((v) => v.toString())),
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });

  // Process each token in the batch
  for (let i = 0; i < ids.length; i++) {
    const tokenId = ids[i];
    const amount = values[i];

    // Update TokenStats
    const tokenStatsId = tokenId.toString();
    const tokenStatsRecord = await context.db.find(tokenStats, {
      id: tokenStatsId,
    });
    if (tokenStatsRecord) {
      await context.db.update(tokenStats, { id: tokenStatsId }).set({
        transfers: tokenStatsRecord.transfers + 1n,
        updatedAt: event.block.timestamp,
      });
    }

    // Update UserBalances - subtract from sender
    if (from !== ZERO_ADDRESS) {
      const fromBalanceId = `${from.toLowerCase()}-${tokenId.toString()}`;
      const fromBalance = await context.db.find(userBalances, {
        id: fromBalanceId,
      });
      if (fromBalance) {
        await context.db.update(userBalances, { id: fromBalanceId }).set({
          balance: fromBalance.balance - amount,
          lastUpdated: event.block.timestamp,
        });
      }
    }

    // Update UserBalances - add to receiver
    if (to !== ZERO_ADDRESS) {
      const toBalanceId = `${to.toLowerCase()}-${tokenId.toString()}`;
      const toBalance = await context.db.find(userBalances, {
        id: toBalanceId,
      });
      if (toBalance) {
        await context.db.update(userBalances, { id: toBalanceId }).set({
          balance: toBalance.balance + amount,
          lastUpdated: event.block.timestamp,
        });
      } else {
        await context.db
          .insert(userBalances)
          .values({
            id: toBalanceId,
            user: to,
            tokenId,
            balance: amount,
            asset: '', // Would need to look up from tokenId
            firstReceived: event.block.timestamp,
            lastUpdated: event.block.timestamp,
          })
          .onConflictDoNothing();
      }
    }
  }
});
