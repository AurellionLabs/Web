import {
  ApprovalForAll as ApprovalForAllEvent,
  AssetAttributeAdded as AssetAttributeAddedEvent,
  MintedAsset as MintedAssetEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  TransferBatch as TransferBatchEvent,
  TransferSingle as TransferSingleEvent,
  URI as URIEvent,
} from '../generated/AuraAsset/AuraAsset';
import {
  ApprovalForAll,
  AssetAttributeAdded,
  MintedAsset,
  OwnershipTransferred,
  TransferBatch,
  TransferSingle,
  URI,
} from '../generated/schema';

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.account = event.params.account;
  entity.operator = event.params.operator;
  entity.approved = event.params.approved;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleAssetAttributeAdded(
  event: AssetAttributeAddedEvent,
): void {
  let entity = new AssetAttributeAdded(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.hash = event.params.hash;
  entity.attributeIndex = event.params.attributeIndex;
  entity.name = event.params.name;
  entity.values = event.params.values;
  entity.description = event.params.description;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleMintedAsset(event: MintedAssetEvent): void {
  let entity = new MintedAsset(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.account = event.params.account;
  entity.hash = event.params.hash;
  entity.tokenId = event.params.tokenId;
  entity.name = event.params.name;
  entity.assetClass = event.params.assetClass;
  entity.className = event.params.className;

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

export function handleTransferBatch(event: TransferBatchEvent): void {
  let entity = new TransferBatch(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.operator = event.params.operator;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.ids = event.params.ids;
  entity.values = event.params.values;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleTransferSingle(event: TransferSingleEvent): void {
  let entity = new TransferSingle(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.operator = event.params.operator;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.internal_id = event.params.id;
  entity.value = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}

export function handleURI(event: URIEvent): void {
  let entity = new URI(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.value = event.params.value;
  entity.internal_id = event.params.id;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();
}
