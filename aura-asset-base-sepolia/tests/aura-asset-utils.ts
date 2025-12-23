import { newMockEvent } from 'matchstick-as';
import { ethereum, Address, Bytes, BigInt } from '@graphprotocol/graph-ts';
import {
  ApprovalForAll,
  AssetAttributeAdded,
  MintedAsset,
  OwnershipTransferred,
  TransferBatch,
  TransferSingle,
  URI,
} from '../generated/AuraAsset/AuraAsset';

export function createApprovalForAllEvent(
  account: Address,
  operator: Address,
  approved: boolean,
): ApprovalForAll {
  let approvalForAllEvent = changetype<ApprovalForAll>(newMockEvent());

  approvalForAllEvent.parameters = new Array();

  approvalForAllEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
  );
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam('operator', ethereum.Value.fromAddress(operator)),
  );
  approvalForAllEvent.parameters.push(
    new ethereum.EventParam('approved', ethereum.Value.fromBoolean(approved)),
  );

  return approvalForAllEvent;
}

export function createAssetAttributeAddedEvent(
  hash: Bytes,
  attributeIndex: BigInt,
  name: string,
  values: Array<string>,
  description: string,
): AssetAttributeAdded {
  let assetAttributeAddedEvent =
    changetype<AssetAttributeAdded>(newMockEvent());

  assetAttributeAddedEvent.parameters = new Array();

  assetAttributeAddedEvent.parameters.push(
    new ethereum.EventParam('hash', ethereum.Value.fromFixedBytes(hash)),
  );
  assetAttributeAddedEvent.parameters.push(
    new ethereum.EventParam(
      'attributeIndex',
      ethereum.Value.fromUnsignedBigInt(attributeIndex),
    ),
  );
  assetAttributeAddedEvent.parameters.push(
    new ethereum.EventParam('name', ethereum.Value.fromString(name)),
  );
  assetAttributeAddedEvent.parameters.push(
    new ethereum.EventParam('values', ethereum.Value.fromStringArray(values)),
  );
  assetAttributeAddedEvent.parameters.push(
    new ethereum.EventParam(
      'description',
      ethereum.Value.fromString(description),
    ),
  );

  return assetAttributeAddedEvent;
}

export function createMintedAssetEvent(
  account: Address,
  hash: Bytes,
  tokenId: BigInt,
  name: string,
  assetClass: string,
  className: string,
): MintedAsset {
  let mintedAssetEvent = changetype<MintedAsset>(newMockEvent());

  mintedAssetEvent.parameters = new Array();

  mintedAssetEvent.parameters.push(
    new ethereum.EventParam('account', ethereum.Value.fromAddress(account)),
  );
  mintedAssetEvent.parameters.push(
    new ethereum.EventParam('hash', ethereum.Value.fromFixedBytes(hash)),
  );
  mintedAssetEvent.parameters.push(
    new ethereum.EventParam(
      'tokenId',
      ethereum.Value.fromUnsignedBigInt(tokenId),
    ),
  );
  mintedAssetEvent.parameters.push(
    new ethereum.EventParam('name', ethereum.Value.fromString(name)),
  );
  mintedAssetEvent.parameters.push(
    new ethereum.EventParam(
      'assetClass',
      ethereum.Value.fromString(assetClass),
    ),
  );
  mintedAssetEvent.parameters.push(
    new ethereum.EventParam('className', ethereum.Value.fromString(className)),
  );

  return mintedAssetEvent;
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

export function createTransferBatchEvent(
  operator: Address,
  from: Address,
  to: Address,
  ids: Array<BigInt>,
  values: Array<BigInt>,
): TransferBatch {
  let transferBatchEvent = changetype<TransferBatch>(newMockEvent());

  transferBatchEvent.parameters = new Array();

  transferBatchEvent.parameters.push(
    new ethereum.EventParam('operator', ethereum.Value.fromAddress(operator)),
  );
  transferBatchEvent.parameters.push(
    new ethereum.EventParam('from', ethereum.Value.fromAddress(from)),
  );
  transferBatchEvent.parameters.push(
    new ethereum.EventParam('to', ethereum.Value.fromAddress(to)),
  );
  transferBatchEvent.parameters.push(
    new ethereum.EventParam('ids', ethereum.Value.fromUnsignedBigIntArray(ids)),
  );
  transferBatchEvent.parameters.push(
    new ethereum.EventParam(
      'values',
      ethereum.Value.fromUnsignedBigIntArray(values),
    ),
  );

  return transferBatchEvent;
}

export function createTransferSingleEvent(
  operator: Address,
  from: Address,
  to: Address,
  id: BigInt,
  value: BigInt,
): TransferSingle {
  let transferSingleEvent = changetype<TransferSingle>(newMockEvent());

  transferSingleEvent.parameters = new Array();

  transferSingleEvent.parameters.push(
    new ethereum.EventParam('operator', ethereum.Value.fromAddress(operator)),
  );
  transferSingleEvent.parameters.push(
    new ethereum.EventParam('from', ethereum.Value.fromAddress(from)),
  );
  transferSingleEvent.parameters.push(
    new ethereum.EventParam('to', ethereum.Value.fromAddress(to)),
  );
  transferSingleEvent.parameters.push(
    new ethereum.EventParam('id', ethereum.Value.fromUnsignedBigInt(id)),
  );
  transferSingleEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromUnsignedBigInt(value)),
  );

  return transferSingleEvent;
}

export function createURIEvent(value: string, id: BigInt): URI {
  let uriEvent = changetype<URI>(newMockEvent());

  uriEvent.parameters = new Array();

  uriEvent.parameters.push(
    new ethereum.EventParam('value', ethereum.Value.fromString(value)),
  );
  uriEvent.parameters.push(
    new ethereum.EventParam('id', ethereum.Value.fromUnsignedBigInt(id)),
  );

  return uriEvent;
}
