import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeRegisteredEvents,
  nodeOwnershipTransferredEvents,
  nodeStatusUpdatedEvents,
  supportedAssetAddedEvents,
} from '../ponder.schema';
import { logger, eventId as makeEventId } from './utils';
import { ZERO_ADDRESS } from './types';

// Create logger for this module
const log = logger('AurumNodeManager');

// =============================================================================
// AURUM NODE MANAGER EVENT HANDLERS - Nodes, NodeAssets, Capacity
// =============================================================================

/**
 * Handle NodeRegistered event
 */
ponder.on('AurumNodeManager:NodeRegistered', async ({ event, context }) => {
  const { nodeAddress, owner } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Try to get additional node data from contract
  let locationData = {
    addressName: '',
    lat: '0',
    lng: '0',
  };
  let validNode = true;
  let status = 'Active';

  try {
    const node = await context.client.readContract({
      abi: context.contracts.AurumNodeManager.abi,
      address: context.contracts.AurumNodeManager.address,
      functionName: 'getNode',
      args: [nodeAddress],
    });
    locationData = {
      addressName: node.location.addressName,
      lat: node.location.location.lat,
      lng: node.location.location.lng,
    };
    validNode = node.validNode === '0x01';
    status = node.status === '0x01' ? 'Active' : 'Inactive';
  } catch (e) {
    log.warn(`Failed to get node data for ${nodeAddress}`, e);
  }

  // Insert Node entity using db.insert().values() with onConflictDoNothing to handle re-orgs
  await context.db
    .insert(nodes)
    .values({
      id: nodeAddress,
      owner,
      addressName: locationData.addressName,
      lat: locationData.lat,
      lng: locationData.lng,
      validNode,
      status,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    })
    .onConflictDoNothing();

  // Insert NodeRegistered event
  await context.db.insert(nodeRegisteredEvents).values({
    id: eventId,
    nodeAddress,
    owner,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle eventUpdateLocation event
 */
ponder.on(
  'AurumNodeManager:eventUpdateLocation',
  async ({ event, context }) => {
    const { addressName, lat, lng, node } = event.args;

    // Update Node entity
    await context.db.update(nodes, { id: node }).set({
      addressName,
      lat,
      lng,
      updatedAt: event.block.timestamp,
    });
  },
);

/**
 * Handle eventUpdateOwner event
 */
ponder.on('AurumNodeManager:eventUpdateOwner', async ({ event, context }) => {
  const { owner, node } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  // Get old owner before update using db.find()
  let oldOwner = ZERO_ADDRESS;
  const existingNode = await context.db.find(nodes, { id: node });

  if (existingNode) {
    oldOwner = existingNode.owner;
    // Update Node entity
    await context.db.update(nodes, { id: node }).set({
      owner,
      updatedAt: event.block.timestamp,
    });
  } else {
    // Node doesn't exist yet (events processed out of order), insert it
    await context.db.insert(nodes).values({
      id: node,
      owner,
      addressName: '',
      lat: '0',
      lng: '0',
      validNode: true,
      status: 'Active',
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });
  }

  // Insert NodeOwnershipTransferred event
  await context.db.insert(nodeOwnershipTransferredEvents).values({
    id: eventId,
    nodeAddress: node,
    oldOwner,
    newOwner: owner,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle eventUpdateStatus event
 */
ponder.on('AurumNodeManager:eventUpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const eventId = makeEventId(event.transaction.hash, event.log.logIndex);

  const nodeStatus = status === '0x01' ? 'Active' : 'Inactive';

  // Update Node entity
  await context.db.update(nodes, { id: node }).set({
    status: nodeStatus,
    updatedAt: event.block.timestamp,
  });

  // Insert NodeStatusUpdated event
  await context.db.insert(nodeStatusUpdatedEvents).values({
    id: eventId,
    nodeAddress: node,
    status: nodeStatus,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle NodeCapacityUpdated event
 */
ponder.on(
  'AurumNodeManager:NodeCapacityUpdated',
  async ({ event, context }) => {
    const { node, quantities } = event.args;
    log.info(`Node ${node} capacity updated`, {
      assetCount: quantities.length,
    });
  },
);

/**
 * Handle SupportedAssetAdded event
 */
ponder.on(
  'AurumNodeManager:SupportedAssetAdded',
  async ({ event, context }) => {
    const { node, asset } = event.args;
    const eventId = makeEventId(event.transaction.hash, event.log.logIndex);
    const assetId = `${node}-${asset.token}-${asset.tokenId}`;

    // Insert node asset
    await context.db.insert(nodeAssets).values({
      id: assetId,
      node: node,
      token: asset.token,
      tokenId: asset.tokenId,
      price: asset.price,
      capacity: asset.capacity,
      createdAt: event.block.timestamp,
      updatedAt: event.block.timestamp,
      blockNumber: event.block.number,
      transactionHash: event.transaction.hash,
    });

    // Insert SupportedAssetAdded event
    await context.db.insert(supportedAssetAddedEvents).values({
      id: eventId,
      nodeAddress: node,
      token: asset.token,
      tokenId: asset.tokenId,
      price: asset.price,
      capacity: asset.capacity,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    });
  },
);

/**
 * Handle SupportedAssetsUpdated event
 */
ponder.on(
  'AurumNodeManager:SupportedAssetsUpdated',
  async ({ event, context }) => {
    const { node, supportedAssets } = event.args;

    // Update all supported assets for this node using upsert pattern
    for (const asset of supportedAssets) {
      const assetId = `${node}-${asset.token}-${asset.tokenId}`;

      // Use insert with onConflictDoUpdate for atomic upsert
      await context.db
        .insert(nodeAssets)
        .values({
          id: assetId,
          node: node,
          token: asset.token,
          tokenId: asset.tokenId,
          price: asset.price,
          capacity: asset.capacity,
          createdAt: event.block.timestamp,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        })
        .onConflictDoUpdate({
          price: asset.price,
          capacity: asset.capacity,
          updatedAt: event.block.timestamp,
        });
    }
  },
);
