import { ponder } from '@/generated';

// =============================================================================
// AURUM NODE MANAGER EVENT HANDLERS - Nodes, NodeAssets, Capacity
// =============================================================================

/**
 * Handle NodeRegistered event
 */
ponder.on('AurumNodeManager:NodeRegistered', async ({ event, context }) => {
  const { nodeAddress, owner } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Safety check: ensure db and nodes table are available
  if (!context.db) {
    console.error('[NodeRegistered] context.db is undefined');
    return;
  }
  if (!context.db.nodes) {
    console.error(
      '[NodeRegistered] context.db.nodes is undefined. Available tables:',
      Object.keys(context.db || {}),
    );
    return;
  }

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
    console.warn(`Failed to get node data for ${nodeAddress}:`, e);
  }

  // Create Node entity
  await context.db.nodes.create({
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
  });

  // Create NodeRegistered event
  await context.db.nodeRegisteredEvents.create({
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

    // Safety check: ensure nodes table is available
    if (!context.db?.nodes) {
      console.warn(
        '[eventUpdateLocation] context.db.nodes not available, skipping',
      );
      return;
    }

    // Update Node entity
    await context.db.nodes.update({
      id: node,
      data: {
        addressName,
        lat,
        lng,
        updatedAt: event.block.timestamp,
      },
    });
  },
);

/**
 * Handle eventUpdateOwner event
 * TODO: Temporarily disabled due to context.db.nodes being undefined - needs investigation
 */
// ponder.on('AurumNodeManager:eventUpdateOwner', async ({ event, context }) => {
//   const { owner, node } = event.args;
//   const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

//   // Safety check: ensure db and nodes table are available
//   if (!context.db?.nodes) {
//     console.error('context.db.nodes is not available in eventUpdateOwner handler');
//     return;
//   }

//   // Get old owner before update, or create node if it doesn't exist
//   let oldOwner = '0x0000000000000000000000000000000000000000' as `0x${string}`;
//   const existingNode = await context.db.nodes.findUnique({ id: node });

//   if (existingNode) {
//     oldOwner = existingNode.owner;
//     // Update Node entity
//     await context.db.nodes.update({
//       id: node,
//       data: {
//         owner,
//         updatedAt: event.block.timestamp,
//       },
//     });
//   } else {
//     // Node doesn't exist yet (events processed out of order), create it with minimal data
//     await context.db.nodes.create({
//       id: node,
//       owner,
//       addressName: '',
//       lat: '0',
//       lng: '0',
//       validNode: true,
//       status: 'Active',
//       createdAt: event.block.timestamp,
//       updatedAt: event.block.timestamp,
//       blockNumber: event.block.number,
//       transactionHash: event.transaction.hash,
//     });
//   }

//   // Create NodeOwnershipTransferred event
//   await context.db.nodeOwnershipTransferredEvents.create({
//     id: eventId,
//     nodeAddress: node,
//     oldOwner,
//     newOwner: owner,
//     blockNumber: event.block.number,
//     blockTimestamp: event.block.timestamp,
//     transactionHash: event.transaction.hash,
//   });
// });

/**
 * Handle eventUpdateStatus event
 */
ponder.on('AurumNodeManager:eventUpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const eventId = `${event.transaction.hash}-${event.log.logIndex}`;

  // Safety check: ensure nodes table is available
  if (!context.db?.nodes) {
    console.warn(
      '[eventUpdateStatus] context.db.nodes not available, skipping',
    );
    return;
  }

  const statusString = status === '0x01' ? 'Active' : 'Inactive';

  // Update Node entity
  await context.db.nodes.update({
    id: node,
    data: {
      status: statusString,
      updatedAt: event.block.timestamp,
    },
  });

  // Create NodeStatusUpdated event
  await context.db.nodeStatusUpdatedEvents.create({
    id: eventId,
    nodeAddress: node,
    status: statusString,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
  });
});

/**
 * Handle SupportedAssetAdded event
 */
ponder.on(
  'AurumNodeManager:SupportedAssetAdded',
  async ({ event, context }) => {
    const { node, asset } = event.args;
    const eventId = `${event.transaction.hash}-${event.log.logIndex}`;
    const nodeAssetId = `${node}-${asset.token}-${asset.tokenId.toString()}`;

    // Create or update NodeAsset entity
    const existingNodeAsset = await context.db.nodeAssets.findUnique({
      id: nodeAssetId,
    });
    if (existingNodeAsset) {
      await context.db.nodeAssets.update({
        id: nodeAssetId,
        data: {
          price: asset.price,
          capacity: asset.capacity,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        },
      });
    } else {
      await context.db.nodeAssets.create({
        id: nodeAssetId,
        node,
        token: asset.token,
        tokenId: asset.tokenId,
        price: asset.price,
        capacity: asset.capacity,
        createdAt: event.block.timestamp,
        updatedAt: event.block.timestamp,
        blockNumber: event.block.number,
        transactionHash: event.transaction.hash,
      });
    }

    // Create SupportedAssetAdded event
    await context.db.supportedAssetAddedEvents.create({
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

    // Update AssetCapacity aggregation
    await updateAssetCapacity(
      context,
      asset.token,
      asset.tokenId,
      event.block.timestamp,
    );
  },
);

/**
 * Handle SupportedAssetsUpdated event
 */
ponder.on(
  'AurumNodeManager:SupportedAssetsUpdated',
  async ({ event, context }) => {
    const { node, supportedAssets } = event.args;

    // Update each asset
    for (const asset of supportedAssets) {
      const nodeAssetId = `${node}-${asset.token}-${asset.tokenId.toString()}`;

      const existingNodeAsset = await context.db.nodeAssets.findUnique({
        id: nodeAssetId,
      });
      if (existingNodeAsset) {
        await context.db.nodeAssets.update({
          id: nodeAssetId,
          data: {
            price: asset.price,
            capacity: asset.capacity,
            updatedAt: event.block.timestamp,
            blockNumber: event.block.number,
            transactionHash: event.transaction.hash,
          },
        });
      } else {
        await context.db.nodeAssets.create({
          id: nodeAssetId,
          node,
          token: asset.token,
          tokenId: asset.tokenId,
          price: asset.price,
          capacity: asset.capacity,
          createdAt: event.block.timestamp,
          updatedAt: event.block.timestamp,
          blockNumber: event.block.number,
          transactionHash: event.transaction.hash,
        });
      }

      // Update AssetCapacity aggregation
      await updateAssetCapacity(
        context,
        asset.token,
        asset.tokenId,
        event.block.timestamp,
      );
    }
  },
);

/**
 * Handle NodeCapacityUpdated event
 */
ponder.on(
  'AurumNodeManager:NodeCapacityUpdated',
  async ({ event, context }) => {
    const { node, quantities } = event.args;

    // Note: This event doesn't give us token/tokenId info
    // We would need to fetch the node's assets and update capacities by index
    // For now, just log it
    console.log(
      `Node ${node} capacity updated with ${quantities.length} quantities`,
    );
  },
);

/**
 * Helper function to update AssetCapacity aggregation
 */
async function updateAssetCapacity(
  context: any,
  token: `0x${string}`,
  tokenId: bigint,
  timestamp: bigint,
) {
  const assetCapacityId = `${token}-${tokenId.toString()}`;

  // Get all node assets for this token/tokenId
  // Note: In Ponder, we'd need to query this differently
  // For now, we'll just update the record if it exists or create a new one
  const existingCapacity = await context.db.assetCapacity.findUnique({
    id: assetCapacityId,
  });

  if (existingCapacity) {
    await context.db.assetCapacity.update({
      id: assetCapacityId,
      data: {
        updatedAt: timestamp,
      },
    });
  } else {
    await context.db.assetCapacity.create({
      id: assetCapacityId,
      token,
      tokenId,
      totalCapacity: 0n,
      totalAllocated: 0n,
      availableCapacity: 0n,
      updatedAt: timestamp,
    });
  }
}
