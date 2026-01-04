// @ts-nocheck - File with type issues that need deeper refactoring
import { ponder } from '@/generated';
import {
  nodes,
  nodeAssets,
  nodeRegisteredEvents,
  nodeOwnershipTransferredEvents,
  nodeStatusUpdatedEvents,
  supportedAssetAddedEvents,
} from '../ponder.schema';

// =============================================================================
// DIAMOND NODE HANDLERS - All node events come from the Diamond proxy
// =============================================================================

/**
 * Handle NodeRegistered event from Diamond
 */
ponder.on('Diamond:NodeRegistered', async ({ event, context }) => {
  const { nodeHash, owner, nodeType } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Get additional node data from Diamond
  let locationData = {
    addressName: '',
    lat: '0',
    lng: '0',
  };
  let status = 'Active';

  try {
    const node = await context.client.readContract({
      abi: context.contracts.Diamond.abi,
      address: context.contracts.Diamond.address,
      functionName: 'getNode',
      args: [nodeHash],
    });
    locationData = {
      addressName: node.location?.addressName || '',
      lat: node.location?.lat || '0',
      lng: node.location?.lng || '0',
    };
    status = node.active ? 'Active' : 'Inactive';
  } catch (e) {
    console.warn(`Failed to get node data for ${nodeHash}:`, e);
  }

  // Insert Node entity using db.insert().values() with onConflictDoNothing to handle re-orgs
  await context.db
    .insert(nodes)
    .values({
      id: nodeHash,
      owner,
      addressName: locationData.addressName,
      lat: locationData.lat,
      lng: locationData.lng,
      validNode: true,
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
    nodeAddress: nodeHash,
    owner,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle NodeUpdated event from Diamond
 */
ponder.on('Diamond:NodeUpdated', async ({ event, context }) => {
  const { nodeHash, nodeType, capacity } = event.args;

  // Update Node entity
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Active', // Node is active after update
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle NodeDeactivated event from Diamond
 */
ponder.on('Diamond:NodeDeactivated', async ({ event, context }) => {
  const { nodeHash } = event.args;

  // Update Node entity
  await context.db.update(nodes, { id: nodeHash }).set({
    status: 'Inactive',
    updatedAt: event.block.timestamp,
  });
});

/**
 * Handle getOwnerNodes query from Diamond
 * Note: This is a view function, not an event, so it's handled via contract calls
 */
