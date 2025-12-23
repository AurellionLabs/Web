import { newMockEvent } from 'matchstick-as';
import { ethereum, Address, BigInt, Bytes } from '@graphprotocol/graph-ts';
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
} from '../generated/AurumNodeManager/AurumNodeManager';

export function createNodeCapacityUpdatedEvent(
  node: Address,
  quantities: Array<BigInt>,
): NodeCapacityUpdated {
  let nodeCapacityUpdatedEvent =
    changetype<NodeCapacityUpdated>(newMockEvent());

  nodeCapacityUpdatedEvent.parameters = new Array();

  nodeCapacityUpdatedEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );
  nodeCapacityUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      'quantities',
      ethereum.Value.fromUnsignedBigIntArray(quantities),
    ),
  );

  return nodeCapacityUpdatedEvent;
}

export function createNodeRegisteredEvent(
  nodeAddress: Address,
  owner: Address,
): NodeRegistered {
  let nodeRegisteredEvent = changetype<NodeRegistered>(newMockEvent());

  nodeRegisteredEvent.parameters = new Array();

  nodeRegisteredEvent.parameters.push(
    new ethereum.EventParam(
      'nodeAddress',
      ethereum.Value.fromAddress(nodeAddress),
    ),
  );
  nodeRegisteredEvent.parameters.push(
    new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)),
  );

  return nodeRegisteredEvent;
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address,
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent());

  ownershipTransferredEvent.parameters = new Array();

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      'previousOwner',
      ethereum.Value.fromAddress(previousOwner),
    ),
  );
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam('newOwner', ethereum.Value.fromAddress(newOwner)),
  );

  return ownershipTransferredEvent;
}

export function createSupportedAssetAddedEvent(
  node: Address,
  asset: ethereum.Tuple,
): SupportedAssetAdded {
  let supportedAssetAddedEvent =
    changetype<SupportedAssetAdded>(newMockEvent());

  supportedAssetAddedEvent.parameters = new Array();

  supportedAssetAddedEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );
  supportedAssetAddedEvent.parameters.push(
    new ethereum.EventParam('asset', ethereum.Value.fromTuple(asset)),
  );

  return supportedAssetAddedEvent;
}

export function createSupportedAssetsUpdatedEvent(
  node: Address,
  supportedAssets: Array<ethereum.Tuple>,
): SupportedAssetsUpdated {
  let supportedAssetsUpdatedEvent =
    changetype<SupportedAssetsUpdated>(newMockEvent());

  supportedAssetsUpdatedEvent.parameters = new Array();

  supportedAssetsUpdatedEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );
  supportedAssetsUpdatedEvent.parameters.push(
    new ethereum.EventParam(
      'supportedAssets',
      ethereum.Value.fromTupleArray(supportedAssets),
    ),
  );

  return supportedAssetsUpdatedEvent;
}

export function createeventUpdateAdminEvent(admin: Address): eventUpdateAdmin {
  let eventUpdateAdminEvent = changetype<eventUpdateAdmin>(newMockEvent());

  eventUpdateAdminEvent.parameters = new Array();

  eventUpdateAdminEvent.parameters.push(
    new ethereum.EventParam('admin', ethereum.Value.fromAddress(admin)),
  );

  return eventUpdateAdminEvent;
}

export function createeventUpdateLocationEvent(
  addressName: string,
  lat: string,
  lng: string,
  node: Address,
): eventUpdateLocation {
  let eventUpdateLocationEvent =
    changetype<eventUpdateLocation>(newMockEvent());

  eventUpdateLocationEvent.parameters = new Array();

  eventUpdateLocationEvent.parameters.push(
    new ethereum.EventParam(
      'addressName',
      ethereum.Value.fromString(addressName),
    ),
  );
  eventUpdateLocationEvent.parameters.push(
    new ethereum.EventParam('lat', ethereum.Value.fromString(lat)),
  );
  eventUpdateLocationEvent.parameters.push(
    new ethereum.EventParam('lng', ethereum.Value.fromString(lng)),
  );
  eventUpdateLocationEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );

  return eventUpdateLocationEvent;
}

export function createeventUpdateOwnerEvent(
  owner: Address,
  node: Address,
): eventUpdateOwner {
  let eventUpdateOwnerEvent = changetype<eventUpdateOwner>(newMockEvent());

  eventUpdateOwnerEvent.parameters = new Array();

  eventUpdateOwnerEvent.parameters.push(
    new ethereum.EventParam('owner', ethereum.Value.fromAddress(owner)),
  );
  eventUpdateOwnerEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );

  return eventUpdateOwnerEvent;
}

export function createeventUpdateStatusEvent(
  status: Bytes,
  node: Address,
): eventUpdateStatus {
  let eventUpdateStatusEvent = changetype<eventUpdateStatus>(newMockEvent());

  eventUpdateStatusEvent.parameters = new Array();

  eventUpdateStatusEvent.parameters.push(
    new ethereum.EventParam('status', ethereum.Value.fromFixedBytes(status)),
  );
  eventUpdateStatusEvent.parameters.push(
    new ethereum.EventParam('node', ethereum.Value.fromAddress(node)),
  );

  return eventUpdateStatusEvent;
}
