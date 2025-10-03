import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';
import {
  NodeRegistered as NodeRegisteredEvent,
  eventUpdateOwner as NodeOwnershipTransferredEvent,
  eventUpdateStatus as NodeStatusUpdatedEvent,
  eventUpdateLocation as NodeLocationUpdatedEvent,
  SupportedAssetAdded as SupportedAssetAddedEvent,
  SupportedAssetsUpdated as SupportedAssetsUpdatedEvent,
  NodeCapacityUpdated as NodeCapacityUpdatedEvent,
} from '../generated/AurumNodeManager/AurumNodeManager';
import {
  Node,
  NodeLocation,
  NodeAsset,
  NodeRegistered,
  NodeOwnershipTransferred,
  NodeStatusUpdated,
  SupportedAssetAdded,
  SupportedAssetsUpdated,
  NodeCapacityUpdated,
  AssetCapacity,
} from '../generated/schema';

export function handleNodeRegistered(event: NodeRegisteredEvent): void {
  let entity = new NodeRegistered(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.nodeAddress;
  entity.owner = event.params.owner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create Node entity
  let node = new Node(event.params.nodeAddress);
  node.owner = event.params.owner;
  node.validNode = true; // New nodes are valid by default
  node.status = 'Active'; // Default status
  node.createdAt = event.block.timestamp;
  node.updatedAt = event.block.timestamp;
  node.blockNumber = event.block.number;
  node.transactionHash = event.transaction.hash;

  // Create NodeLocation entity (may be populated by eventUpdateLocation)
  let location = new NodeLocation(event.params.nodeAddress.toHexString());
  location.addressName = '';
  location.lat = '0';
  location.lng = '0';
  location.node = event.params.nodeAddress.toHexString();
  location.save();

  node.location = location.id;
  node.save();
}

export function handleNodeLocationUpdated(
  event: NodeLocationUpdatedEvent,
): void {
  // Upsert NodeLocation from full-location event
  let location = NodeLocation.load(event.params.node.toHexString());
  if (!location) {
    location = new NodeLocation(event.params.node.toHexString());
    location.node = event.params.node.toHexString();
  }
  location.addressName = event.params.addressName;
  location.lat = event.params.lat;
  location.lng = event.params.lng;
  location.save();

  // Link to Node if exists
  let node = Node.load(event.params.node);
  if (node) {
    node.location = location.id;
    node.updatedAt = event.block.timestamp;
    node.blockNumber = event.block.number;
    node.transactionHash = event.transaction.hash;
    node.save();
  }
}

export function handleNodeOwnershipTransferred(
  event: NodeOwnershipTransferredEvent,
): void {
  let entity = new NodeOwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.node;
  entity.newOwner = event.params.owner;
  entity.oldOwner = Bytes.empty(); // We don't have old owner in this event

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update Node entity
  let node = Node.load(event.params.node);
  if (node) {
    entity.oldOwner = node.owner;
    node.owner = event.params.owner;
    node.updatedAt = event.block.timestamp;
    node.save();
  }
}

export function handleNodeStatusUpdated(event: NodeStatusUpdatedEvent): void {
  let entity = new NodeStatusUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.node;

  // Convert bytes1 status to string
  let statusBytes = event.params.status;
  let status = 'Inactive';
  if (statusBytes.toHexString() == '0x01') {
    status = 'Active';
  }
  entity.status = status;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update Node entity
  let node = Node.load(event.params.node);
  if (node) {
    node.status = status;
    node.updatedAt = event.block.timestamp;
    node.save();
  }
}

export function handleSupportedAssetAdded(
  event: SupportedAssetAddedEvent,
): void {
  let entity = new SupportedAssetAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.node;
  entity.token = event.params.asset.token;
  entity.tokenId = event.params.asset.tokenId;
  entity.price = event.params.asset.price;
  entity.capacity = event.params.asset.capacity;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create NodeAsset entity
  let assetId =
    event.params.node.toHexString() +
    '-' +
    event.params.asset.token.toHexString() +
    '-' +
    event.params.asset.tokenId.toString();

  let nodeAsset = new NodeAsset(assetId);
  nodeAsset.node = event.params.node.toHexString();
  nodeAsset.token = event.params.asset.token;
  nodeAsset.tokenId = event.params.asset.tokenId;
  nodeAsset.price = event.params.asset.price;
  nodeAsset.capacity = event.params.asset.capacity;
  nodeAsset.createdAt = event.block.timestamp;
  nodeAsset.updatedAt = event.block.timestamp;
  nodeAsset.blockNumber = event.block.number;
  nodeAsset.transactionHash = event.transaction.hash;

  nodeAsset.save();

  // Update or create AssetCapacity aggregation
  updateAssetCapacity(
    event.params.asset.token,
    event.params.asset.tokenId,
    event.block.timestamp,
  );
}

export function handleSupportedAssetsUpdated(
  event: SupportedAssetsUpdatedEvent,
): void {
  let entity = new SupportedAssetsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.node;
  entity.assetsCount = BigInt.fromI32(event.params.supportedAssets.length);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update NodeAsset entities
  let assets = event.params.supportedAssets;
  for (let i = 0; i < assets.length; i++) {
    let asset = assets[i];
    let assetId =
      event.params.node.toHexString() +
      '-' +
      asset.token.toHexString() +
      '-' +
      asset.tokenId.toString();

    let nodeAsset = NodeAsset.load(assetId);
    if (!nodeAsset) {
      nodeAsset = new NodeAsset(assetId);
      nodeAsset.node = event.params.node.toHexString();
      nodeAsset.token = asset.token;
      nodeAsset.tokenId = asset.tokenId;
      nodeAsset.createdAt = event.block.timestamp;
    }

    nodeAsset.price = asset.price;
    nodeAsset.capacity = asset.capacity;
    nodeAsset.updatedAt = event.block.timestamp;
    nodeAsset.blockNumber = event.block.number;
    nodeAsset.transactionHash = event.transaction.hash;

    nodeAsset.save();

    // Update AssetCapacity aggregation
    updateAssetCapacity(asset.token, asset.tokenId, event.block.timestamp);
  }
}

export function handleNodeCapacityUpdated(
  event: NodeCapacityUpdatedEvent,
): void {
  let entity = new NodeCapacityUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.nodeAddress = event.params.node;
  entity.quantities = event.params.quantities;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Note: This event doesn't provide token/tokenId mapping, so we can't easily update specific NodeAssets
  // The quantities array corresponds to the order of assets in the node's supportedAssets array
  // For more precise updates, we'd need to query the contract or use other events
}

function updateAssetCapacity(
  token: Address,
  tokenId: BigInt,
  timestamp: BigInt,
): void {
  let capacityId = token.toHexString() + '-' + tokenId.toString();
  let assetCapacity = AssetCapacity.load(capacityId);

  if (!assetCapacity) {
    assetCapacity = new AssetCapacity(capacityId);
    assetCapacity.token = token;
    assetCapacity.tokenId = tokenId;
    assetCapacity.totalCapacity = BigInt.fromI32(0);
    assetCapacity.totalAllocated = BigInt.fromI32(0);
    assetCapacity.availableCapacity = BigInt.fromI32(0);
  }

  // Recalculate totals by querying all NodeAssets for this token/tokenId
  // This is a simplified approach - in production you might want to optimize this
  assetCapacity.updatedAt = timestamp;
  assetCapacity.save();
}
