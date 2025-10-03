import { BigInt, Bytes, Address } from '@graphprotocol/graph-ts';
import {
  MintedAsset as MintedAssetEvent,
  AssetAttributeAdded as AssetAttributeAddedEvent,
  TransferSingle as TransferSingleEvent,
  TransferBatch as TransferBatchEvent,
  AuraAsset,
} from '../generated/AuraAsset/AuraAsset';
import {
  Asset,
  AssetAttribute,
  SupportedAsset,
  SupportedClass,
  MintedAsset,
  Transfer,
  TransferBatch,
  TokenStats,
  UserBalance,
} from '../generated/schema';

export function handleMintedAsset(event: MintedAssetEvent): void {
  let entity = new MintedAsset(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.account = event.params.account;
  entity.hash = event.params.hash;
  entity.tokenId = event.params.tokenId;
  entity.assetName = event.params.name;
  entity.assetClass = event.params.assetClass;
  entity.className = event.params.className;
  entity.amount = BigInt.fromI32(0); // Will be populated from contract call

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Create Asset entity
  let asset = new Asset(event.params.hash.toHexString());
  asset.hash = event.params.hash;
  asset.tokenId = event.params.tokenId;
  asset.name = event.params.name;
  asset.assetClass = event.params.assetClass;
  asset.className = event.params.className;
  asset.account = event.params.account;
  asset.amount = BigInt.fromI32(1); // Default amount
  asset.createdAt = event.block.timestamp;
  asset.blockNumber = event.block.number;
  asset.transactionHash = event.transaction.hash;

  // Save the Asset first so we can reference it
  asset.save();

  // Update or create SupportedAsset
  let supportedAsset = SupportedAsset.load(event.params.name);
  if (!supportedAsset) {
    supportedAsset = new SupportedAsset(event.params.name);
    supportedAsset.name = event.params.name;
    supportedAsset.index = BigInt.fromI32(0); // Will be updated from contract
    supportedAsset.asset = asset.id;
    supportedAsset.isActive = true;
    supportedAsset.createdAt = event.block.timestamp;

    // Try to get index from contract
    let contract = AuraAsset.bind(event.address);
    let indexResult = contract.try_nameToSupportedAssetIndex(event.params.name);
    if (!indexResult.reverted) {
      supportedAsset.index = indexResult.value;
    }
  }
  supportedAsset.updatedAt = event.block.timestamp;
  supportedAsset.save();

  // Update or create SupportedClass
  if (event.params.className != '') {
    let supportedClass = SupportedClass.load(event.params.className);
    if (!supportedClass) {
      supportedClass = new SupportedClass(event.params.className);
      supportedClass.name = event.params.className;
      supportedClass.index = BigInt.fromI32(0);
      supportedClass.isActive = true;
      supportedClass.createdAt = event.block.timestamp;

      // Try to get index from contract
      let contract = AuraAsset.bind(event.address);
      let classIndexResult = contract.try_nameToSupportedClassIndex(
        event.params.className,
      );
      if (!classIndexResult.reverted) {
        supportedClass.index = classIndexResult.value;
      }
    }
    supportedClass.updatedAt = event.block.timestamp;
    supportedClass.save();
  }

  // Create or update TokenStats
  updateTokenStats(
    event.params.tokenId,
    event.params.hash.toHexString(),
    event.block.timestamp,
  );

  // Create or update UserBalance
  updateUserBalance(
    event.params.account,
    event.params.tokenId,
    BigInt.fromI32(1),
    event.params.hash.toHexString(),
    event.block.timestamp,
  );
}

export function handleAssetAttributeAdded(
  event: AssetAttributeAddedEvent,
): void {
  let attributeId =
    event.params.hash.toHexString() +
    '-' +
    event.params.attributeIndex.toString();

  let assetAttribute = new AssetAttribute(attributeId);
  assetAttribute.asset = event.params.hash.toHexString(); // Reference to Asset entity
  assetAttribute.name = event.params.name;
  assetAttribute.values = event.params.values;
  assetAttribute.description = event.params.description;

  assetAttribute.save();
}

export function handleTransferSingle(event: TransferSingleEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.operator = event.params.operator;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.tokenId = event.params.id;
  entity.amount = event.params.value;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update TokenStats
  let tokenStats = TokenStats.load(event.params.id.toString());
  if (tokenStats) {
    tokenStats.transfers = tokenStats.transfers.plus(BigInt.fromI32(1));
    tokenStats.updatedAt = event.block.timestamp;
    tokenStats.save();
  }

  // Update UserBalances
  if (event.params.from.notEqual(Address.zero())) {
    // Subtract from sender
    let fromBalanceId =
      event.params.from.toHexString() + '-' + event.params.id.toString();
    let fromBalance = UserBalance.load(fromBalanceId);
    if (fromBalance) {
      fromBalance.balance = fromBalance.balance.minus(event.params.value);
      fromBalance.lastUpdated = event.block.timestamp;
      fromBalance.save();
    }
  }

  if (event.params.to.notEqual(Address.zero())) {
    // Add to receiver
    let toBalanceId =
      event.params.to.toHexString() + '-' + event.params.id.toString();
    let toBalance = UserBalance.load(toBalanceId);
    if (!toBalance) {
      toBalance = new UserBalance(toBalanceId);
      toBalance.user = event.params.to;
      toBalance.tokenId = event.params.id;
      toBalance.balance = BigInt.fromI32(0);
      toBalance.asset = ''; // Will be set below
      toBalance.firstReceived = event.block.timestamp;

      // Try to find the asset for this tokenId
      let contract = AuraAsset.bind(event.address);
      // Note: We'd need a way to map tokenId back to hash - this is a limitation
      // For now, we'll leave it empty and could be populated by other means
    }
    toBalance.balance = toBalance.balance.plus(event.params.value);
    toBalance.lastUpdated = event.block.timestamp;
    toBalance.save();
  }
}

export function handleTransferBatch(event: TransferBatchEvent): void {
  let entity = new TransferBatch(
    event.transaction.hash.concatI32(event.logIndex.toI32()),
  );
  entity.operator = event.params.operator;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.tokenIds = event.params.ids;
  entity.amounts = event.params.values;

  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;

  entity.save();

  // Update stats for each token in the batch
  let tokenIds = event.params.ids;
  let amounts = event.params.values;

  for (let i = 0; i < tokenIds.length; i++) {
    let tokenId = tokenIds[i];
    let amount = amounts[i];

    // Update TokenStats
    let tokenStats = TokenStats.load(tokenId.toString());
    if (tokenStats) {
      tokenStats.transfers = tokenStats.transfers.plus(BigInt.fromI32(1));
      tokenStats.updatedAt = event.block.timestamp;
      tokenStats.save();
    }

    // Update UserBalances (similar to single transfer)
    if (event.params.from.notEqual(Address.zero())) {
      let fromBalanceId =
        event.params.from.toHexString() + '-' + tokenId.toString();
      let fromBalance = UserBalance.load(fromBalanceId);
      if (fromBalance) {
        fromBalance.balance = fromBalance.balance.minus(amount);
        fromBalance.lastUpdated = event.block.timestamp;
        fromBalance.save();
      }
    }

    if (event.params.to.notEqual(Address.zero())) {
      let toBalanceId =
        event.params.to.toHexString() + '-' + tokenId.toString();
      let toBalance = UserBalance.load(toBalanceId);
      if (!toBalance) {
        toBalance = new UserBalance(toBalanceId);
        toBalance.user = event.params.to;
        toBalance.tokenId = tokenId;
        toBalance.balance = BigInt.fromI32(0);
        toBalance.asset = '';
        toBalance.firstReceived = event.block.timestamp;
      }
      toBalance.balance = toBalance.balance.plus(amount);
      toBalance.lastUpdated = event.block.timestamp;
      toBalance.save();
    }
  }
}

function updateTokenStats(
  tokenId: BigInt,
  assetId: string,
  timestamp: BigInt,
): void {
  let tokenIdString = tokenId.toString();
  let tokenStats = TokenStats.load(tokenIdString);
  if (!tokenStats) {
    tokenStats = new TokenStats(tokenIdString);
    tokenStats.tokenId = tokenId;
    tokenStats.totalSupply = BigInt.fromI32(0);
    tokenStats.holders = BigInt.fromI32(0);
    tokenStats.transfers = BigInt.fromI32(0);
    tokenStats.asset = assetId;
    tokenStats.createdAt = timestamp;
  }

  // Note: totalSupply and holders would need to be calculated more precisely
  // by querying the contract or tracking all transfers
  tokenStats.updatedAt = timestamp;
  tokenStats.save();
}

function updateUserBalance(
  user: Address,
  tokenId: BigInt,
  amount: BigInt,
  assetId: string,
  timestamp: BigInt,
): void {
  let balanceId = user.toHexString() + '-' + tokenId.toString();
  let userBalance = UserBalance.load(balanceId);

  if (!userBalance) {
    userBalance = new UserBalance(balanceId);
    userBalance.user = user;
    userBalance.tokenId = tokenId;
    userBalance.balance = BigInt.fromI32(0);
    userBalance.asset = assetId;
    userBalance.firstReceived = timestamp;
  }

  userBalance.balance = userBalance.balance.plus(amount);
  userBalance.lastUpdated = timestamp;
  userBalance.save();
}
