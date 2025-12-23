import {
  NodeCapacityUpdated as NodeCapacityUpdatedEvent,
  NodeRegistered as NodeRegisteredEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  SupportedAssetAdded as SupportedAssetAddedEvent,
  SupportedAssetsUpdated as SupportedAssetsUpdatedEvent,
  eventUpdateAdmin as eventUpdateAdminEvent,
  eventUpdateLocation as eventUpdateLocationEvent,
  eventUpdateOwner as eventUpdateOwnerEvent,
  eventUpdateStatus as eventUpdateStatusEvent,
} from '../generated/AurumNodeManager/AurumNodeManager';
import {
  NodeCapacityUpdated,
  NodeRegistered,
  OwnershipTransferred,
  SupportedAssetAdded,
  SupportedAssetsUpdated,
  eventUpdateAdmin,
  eventUpdateLocation,
  eventUpdateOwner,
  eventUpdateStatus,
} from '../generated/schema';
import { Bytes } from '@graphprotocol/graph-ts';

export function handleNodeCapacityUpdated(
  event: NodeCapacityUpdatedEvent,
): void {
  let entity = new NodeCapacityUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.node = event.params.node;
  entity.quantities = event.params.quantities;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

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
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent,
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.previousOwner = event.params.previousOwner;
  entity.newOwner = event.params.newOwner;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleSupportedAssetAdded(
  event: SupportedAssetAddedEvent,
): void {
  let entity = new SupportedAssetAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.node = event.params.node;
  entity.asset_token = event.params.asset.token;
  entity.asset_tokenId = event.params.asset.tokenId;
  entity.asset_price = event.params.asset.price;
  entity.asset_capacity = event.params.asset.capacity;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleSupportedAssetsUpdated(
  event: SupportedAssetsUpdatedEvent,
): void {
  let entity = new SupportedAssetsUpdated(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.node = event.params.node;
  entity.supportedAssets = changetype<Bytes[]>(event.params.supportedAssets);

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleeventUpdateAdmin(event: eventUpdateAdminEvent): void {
  let entity = new eventUpdateAdmin(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.admin = event.params.admin;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleeventUpdateLocation(
  event: eventUpdateLocationEvent,
): void {
  let entity = new eventUpdateLocation(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.addressName = event.params.addressName;
  entity.lat = event.params.lat;
  entity.lng = event.params.lng;
  entity.node = event.params.node;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleeventUpdateOwner(event: eventUpdateOwnerEvent): void {
  let entity = new eventUpdateOwner(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.owner = event.params.owner;
  entity.node = event.params.node;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleeventUpdateStatus(event: eventUpdateStatusEvent): void {
  let entity = new eventUpdateStatus(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.status = event.params.status;
  entity.node = event.params.node;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
