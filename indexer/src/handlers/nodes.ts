/**
 * Nodes Handler
 *
 * Handles all node-related events from NodesFacet.
 * Uses simple event names - no signature disambiguation needed.
 *
 * Note: Stores only raw events - repositories handle aggregation at query time.
 */

import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeTokenBalances,
  nodeRegisteredEvents,
  nodeOwnershipTransferredEvents,
  nodeStatusUpdatedEvents,
  tokensDepositedToNodeEvents,
  tokensWithdrawnFromNodeEvents,
  tokensMintedToNodeEvents,
  supportedAssetAddedEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;
const assetId = (nodeHash: string, token: string, tokenId: bigint) =>
  `${nodeHash}-${token.toLowerCase()}-${tokenId}`;

// ============================================================================
// NODE REGISTRATION - Store only raw events
// ============================================================================

ponder.on('Diamond:NodeRegistered', async ({ event, context }) => {
  const { nodeHash, owner, nodeType } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[nodes] NodeRegistered: ${nodeHash}`);

  // Fetch location from contract
  let locationData = { addressName: '', lat: '0', lng: '0' };
  let status = 'Active';

  try {
    const node = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getNode',
      args: [nodeHash],
    });

    if (node) {
      const n = node as any;
      locationData = {
        addressName: n.addressName || '',
        lat: n.lat || '0',
        lng: n.lng || '0',
      };
      status = n.active !== false ? 'Active' : 'Inactive';
    }
  } catch (e) {
    // Use defaults
  }

  // Create or update node entity
  await context.db
    .insert(nodes)
    .values({
      id: nodeHash,
      owner,
      status,
      addressName: locationData.addressName,
      lat: locationData.lat,
      lng: locationData.lng,
      validNode: true,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        status,
        addressName: locationData.addressName,
        lat: locationData.lat,
        lng: locationData.lng,
        updatedAt: event.block.timestamp,
      },
    });

  // Create event record
  await context.db
    .insert(nodeRegisteredEvents)
    .values({
      id,
      nodeAddress: nodeHash,
      owner,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:NodeUpdated', async ({ event, context }) => {
  const { nodeHash } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[nodes] NodeUpdated: ${nodeHash}`);

  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Active',
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(nodeStatusUpdatedEvents)
    .values({
      id,
      nodeAddress: nodeHash,
      status: 'Active',
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:NodeDeactivated', async ({ event, context }) => {
  const { nodeHash } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[nodes] NodeDeactivated: ${nodeHash}`);

  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Inactive',
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(nodeStatusUpdatedEvents)
    .values({
      id,
      nodeAddress: nodeHash,
      status: 'Inactive',
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// TOKEN INVENTORY - Store only raw events
// ============================================================================

ponder.on('Diamond:TokensDepositedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, depositor } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balId = `${nodeHash}-${tokenId}`;

  console.log(`[nodes] TokensDeposited: ${amount} to ${nodeHash}`);

  const existing = await context.db.find(nodeTokenBalances, { id: balId });
  const newBalance = (existing?.balance ?? 0n) + amount;

  await context.db
    .insert(nodeTokenBalances)
    .values({
      id: balId,
      nodeHash,
      tokenId,
      balance: newBalance,
      firstCreditedAt: event.block.timestamp,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        balance: newBalance,
        lastUpdatedAt: event.block.timestamp,
      },
    });

  await context.db
    .insert(tokensDepositedToNodeEvents)
    .values({
      id,
      nodeHash,
      tokenId,
      amount,
      depositor,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:TokensWithdrawnFromNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, recipient } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balId = `${nodeHash}-${tokenId}`;

  console.log(`[nodes] TokensWithdrawn: ${amount} from ${nodeHash}`);

  const existing = await context.db.find(nodeTokenBalances, { id: balId });
  const newBalance =
    (existing?.balance ?? 0n) > amount
      ? (existing?.balance ?? 0n) - amount
      : 0n;

  if (existing) {
    await context.db.update(nodeTokenBalances, { id: balId }).set({
      balance: newBalance,
      lastUpdatedAt: event.block.timestamp,
    });
  }

  await context.db
    .insert(tokensWithdrawnFromNodeEvents)
    .values({
      id,
      nodeHash,
      tokenId,
      amount,
      recipient,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

ponder.on('Diamond:TokensMintedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, minter } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balId = `${nodeHash}-${tokenId}`;

  console.log(`[nodes] TokensMintedToNode: ${amount} to ${nodeHash}`);

  const existing = await context.db.find(nodeTokenBalances, { id: balId });
  const newBalance = (existing?.balance ?? 0n) + amount;

  await context.db
    .insert(nodeTokenBalances)
    .values({
      id: balId,
      nodeHash,
      tokenId,
      balance: newBalance,
      firstCreditedAt: event.block.timestamp,
      lastUpdatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        balance: newBalance,
        lastUpdatedAt: event.block.timestamp,
      },
    });

  await context.db
    .insert(tokensMintedToNodeEvents)
    .values({
      id,
      nodeHash,
      tokenId,
      amount,
      minter:
        minter ||
        ('0x0000000000000000000000000000000000000000' as `0x${string}`),
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// ASSET CONFIGURATION - Store only raw events
// ============================================================================

ponder.on('Diamond:SupportedAssetAdded', async ({ event, context }) => {
  const { nodeHash, token, tokenId, price, capacity } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const aId = assetId(nodeHash, token, tokenId);

  console.log(`[nodes] SupportedAssetAdded: ${token} to ${nodeHash}`);

  await context.db
    .insert(nodeAssets)
    .values({
      id: aId,
      node: nodeHash,
      token,
      tokenId,
      price,
      capacity,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoUpdate({
      set: {
        price,
        capacity,
        updatedAt: event.block.timestamp,
      },
    });

  await context.db
    .insert(supportedAssetAddedEvents)
    .values({
      id,
      nodeAddress: nodeHash,
      token,
      tokenId,
      price,
      capacity,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});

// ============================================================================
// LOCATION & OWNERSHIP - Store only raw events
// ============================================================================

ponder.on('Diamond:UpdateLocation', async ({ event, context }) => {
  const { addressName, lat, lng, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[nodes] UpdateLocation: ${node}`);

  await context.db.update(nodes, { id: node }).set({
    addressName,
    lat,
    lng,
    updatedAt: event.block.timestamp,
  });
});

ponder.on('Diamond:UpdateOwner', async ({ event, context }) => {
  const { owner, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  console.log(`[nodes] UpdateOwner: ${node}`);

  const existingNode = await context.db.find(nodes, { id: node });
  const oldOwner = existingNode?.owner;

  await context.db.update(nodes, { id: node }).set({
    owner,
    updatedAt: event.block.timestamp,
  });

  if (oldOwner && oldOwner !== owner) {
    await context.db
      .insert(nodeOwnershipTransferredEvents)
      .values({
        id,
        nodeAddress: node,
        oldOwner,
        newOwner: owner,
        blockNumber: event.block.number,
        blockTimestamp: event.block.timestamp,
        transactionHash: event.transaction.hash,
      })
      .onConflictDoNothing();
  }
});

ponder.on('Diamond:UpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const statusStr = status === '0x01' ? 'Active' : 'Inactive';

  console.log(`[nodes] UpdateStatus: ${node} -> ${statusStr}`);

  await context.db.update(nodes, { id: node }).set({
    status: statusStr,
    updatedAt: event.block.timestamp,
  });

  await context.db
    .insert(nodeStatusUpdatedEvents)
    .values({
      id,
      nodeAddress: node,
      status: statusStr,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();
});
