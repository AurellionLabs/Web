import { ponder } from '@/generated';

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

  // Create MintedAsset event
  await context.db.mintedAssetEvents.create({
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

  // Create Asset entity
  await context.db.assets.create({
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
  });

  // Update or create SupportedAsset
  const existingSupportedAsset = await context.db.supportedAssets.findUnique({
    id: name,
  });
  if (existingSupportedAsset) {
    await context.db.supportedAssets.update({
      id: name,
      data: {
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.supportedAssets.create({
      id: name,
      name,
      index: 0n, // Would need to get from contract
      asset: hashString,
      isActive: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }

  // Update or create SupportedClass
  if (className !== '') {
    const existingClass = await context.db.supportedClasses.findUnique({
      id: className,
    });
    if (existingClass) {
      await context.db.supportedClasses.update({
        id: className,
        data: {
          updatedAt: event.block.timestamp,
        },
      });
    } else {
      await context.db.supportedClasses.create({
        id: className,
        name: className,
        index: 0n, // Would need to get from contract
        isActive: true,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
      });
    }
  }

  // Create or update TokenStats
  const tokenStatsId = tokenId.toString();
  const existingTokenStats = await context.db.tokenStats.findUnique({
    id: tokenStatsId,
  });
  if (existingTokenStats) {
    await context.db.tokenStats.update({
      id: tokenStatsId,
      data: {
        updatedAt: event.block.timestamp,
      },
    });
  } else {
    await context.db.tokenStats.create({
      id: tokenStatsId,
      tokenId,
      totalSupply: 0n,
      holders: 0n,
      transfers: 0n,
      asset: hashString,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
    });
  }

  // Create or update UserBalance
  const balanceId = `${account.toLowerCase()}-${tokenId.toString()}`;
  const existingBalance = await context.db.userBalances.findUnique({
    id: balanceId,
  });
  if (existingBalance) {
    await context.db.userBalances.update({
      id: balanceId,
      data: {
        balance: existingBalance.balance + 1n,
        lastUpdated: event.block.timestamp,
      },
    });
  } else {
    await context.db.userBalances.create({
      id: balanceId,
      user: account,
      tokenId,
      balance: 1n,
      asset: hashString,
      firstReceived: event.block.timestamp,
      lastUpdated: event.block.timestamp,
    });
  }
});

/**
 * Handle AssetAttributeAdded event
 */
ponder.on('AuraAsset:AssetAttributeAdded', async ({ event, context }) => {
  const { hash, attributeIndex, name, values, description } = event.args;
  const attributeId = `${hash.toLowerCase()}-${attributeIndex.toString()}`;

  await context.db.assetAttributes.create({
    id: attributeId,
    assetId: hash.toLowerCase(),
    name,
    values: JSON.stringify(values),
    description,
  });
});

/**
 * Handle TransferSingle event
 */
ponder.on('AuraAsset:TransferSingle', async ({ event, context }) => {
  const { operator, from, to, id: tokenId, value } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create Transfer event
  await context.db.transferEvents.create({
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
  const tokenStats = await context.db.tokenStats.findUnique({
    id: tokenStatsId,
  });
  if (tokenStats) {
    await context.db.tokenStats.update({
      id: tokenStatsId,
      data: {
        transfers: tokenStats.transfers + 1n,
        updatedAt: event.block.timestamp,
      },
    });
  }

  // Update UserBalances - subtract from sender
  if (from !== ZERO_ADDRESS) {
    const fromBalanceId = `${from.toLowerCase()}-${tokenId.toString()}`;
    const fromBalance = await context.db.userBalances.findUnique({
      id: fromBalanceId,
    });
    if (fromBalance) {
      await context.db.userBalances.update({
        id: fromBalanceId,
        data: {
          balance: fromBalance.balance - value,
          lastUpdated: event.block.timestamp,
        },
      });
    }
  }

  // Update UserBalances - add to receiver
  if (to !== ZERO_ADDRESS) {
    const toBalanceId = `${to.toLowerCase()}-${tokenId.toString()}`;
    const toBalance = await context.db.userBalances.findUnique({
      id: toBalanceId,
    });
    if (toBalance) {
      await context.db.userBalances.update({
        id: toBalanceId,
        data: {
          balance: toBalance.balance + value,
          lastUpdated: event.block.timestamp,
        },
      });
    } else {
      await context.db.userBalances.create({
        id: toBalanceId,
        user: to,
        tokenId,
        balance: value,
        asset: '', // Would need to look up from tokenId
        firstReceived: event.block.timestamp,
        lastUpdated: event.block.timestamp,
      });
    }
  }
});

/**
 * Handle TransferBatch event
 */
ponder.on('AuraAsset:TransferBatch', async ({ event, context }) => {
  const { operator, from, to, ids, values } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Create TransferBatch event
  await context.db.transferBatchEvents.create({
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
    const tokenStats = await context.db.tokenStats.findUnique({
      id: tokenStatsId,
    });
    if (tokenStats) {
      await context.db.tokenStats.update({
        id: tokenStatsId,
        data: {
          transfers: tokenStats.transfers + 1n,
          updatedAt: event.block.timestamp,
        },
      });
    }

    // Update UserBalances - subtract from sender
    if (from !== ZERO_ADDRESS) {
      const fromBalanceId = `${from.toLowerCase()}-${tokenId.toString()}`;
      const fromBalance = await context.db.userBalances.findUnique({
        id: fromBalanceId,
      });
      if (fromBalance) {
        await context.db.userBalances.update({
          id: fromBalanceId,
          data: {
            balance: fromBalance.balance - amount,
            lastUpdated: event.block.timestamp,
          },
        });
      }
    }

    // Update UserBalances - add to receiver
    if (to !== ZERO_ADDRESS) {
      const toBalanceId = `${to.toLowerCase()}-${tokenId.toString()}`;
      const toBalance = await context.db.userBalances.findUnique({
        id: toBalanceId,
      });
      if (toBalance) {
        await context.db.userBalances.update({
          id: toBalanceId,
          data: {
            balance: toBalance.balance + amount,
            lastUpdated: event.block.timestamp,
          },
        });
      } else {
        await context.db.userBalances.create({
          id: toBalanceId,
          user: to,
          tokenId,
          balance: amount,
          asset: '', // Would need to look up from tokenId
          firstReceived: event.block.timestamp,
          lastUpdated: event.block.timestamp,
        });
      }
    }
  }
});
