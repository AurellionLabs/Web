/**
 * Nodes Handler
 *
 * Handles all node-related events from NodesFacet.
 * Uses simple event names - no signature disambiguation needed.
 */

import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeTokenBalances,
  nodeRegisteredEvents,
  tokensDepositedToNodeEvents,
  tokensWithdrawnFromNodeEvents,
  supportedAssetAddedEvents,
} from '../../ponder.schema';

// ============================================================================
// UTILITIES
// ============================================================================

const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;
const balanceId = (nodeHash: string, tokenId: bigint) =>
  `${nodeHash}-${tokenId}`;
const assetId = (nodeHash: string, token: string, tokenId: bigint) =>
  `${nodeHash}-${token.toLowerCase()}-${tokenId}`;

const safeSub = (a: bigint, b: bigint): bigint => (a > b ? a - b : 0n);

// ============================================================================
// NODE REGISTRATION
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
    .onConflictDoNothing();

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
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Active',
    updatedAt: event.block.timestamp,
  });
});

ponder.on('Diamond:NodeDeactivated', async ({ event, context }) => {
  const { nodeHash } = event.args;
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Inactive',
    updatedAt: event.block.timestamp,
  });
});

// ============================================================================
// TOKEN INVENTORY
// ============================================================================

ponder.on('Diamond:TokensDepositedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, depositor } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  const balId = balanceId(nodeHash, tokenId);

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
      balance: newBalance,
      lastUpdatedAt: event.block.timestamp,
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
  const balId = balanceId(nodeHash, tokenId);

  const existing = await context.db.find(nodeTokenBalances, { id: balId });
  const newBalance = safeSub(existing?.balance ?? 0n, amount);

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
  const { nodeHash, tokenId, amount } = event.args;
  const balId = balanceId(nodeHash, tokenId);

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
      balance: newBalance,
      lastUpdatedAt: event.block.timestamp,
    });
});

// ============================================================================
// ASSET CONFIGURATION
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
      price,
      capacity,
      updatedAt: event.block.timestamp,
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
// LOCATION & OWNERSHIP
// ============================================================================

ponder.on('Diamond:UpdateLocation', async ({ event, context }) => {
  const { addressName, lat, lng, node } = event.args;
  await context.db.update(nodes, { id: node }).set({
    addressName,
    lat,
    lng,
    updatedAt: event.block.timestamp,
  });
});

ponder.on('Diamond:UpdateOwner', async ({ event, context }) => {
  const { owner, node } = event.args;
  await context.db.update(nodes, { id: node }).set({
    owner,
    updatedAt: event.block.timestamp,
  });
});

ponder.on('Diamond:UpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const statusStr = status === '0x01' ? 'Active' : 'Inactive';
  await context.db.update(nodes, { id: node }).set({
    status: statusStr,
    updatedAt: event.block.timestamp,
  });
});
