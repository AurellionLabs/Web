// Auto-generated handler for nodes domain
// Generated at: 2026-04-24T14:07:27.188Z
//
// Inline aggregate writes: raw event insert + aggregate table upsert in ONE ponder.on() handler.
// This avoids the Ponder 0.16 restriction: only one ponder.on() per event name is allowed.
// Events from: NodesFacet

import { ponder } from 'ponder:registry';

// Import event tables from generated schema
import {
  diamondClobApprovalGrantedEvents,
  diamondClobApprovalRevokedEvents,
  diamondNodeAdminRevokedEvents,
  diamondNodeAdminSetEvents,
  diamondNodeCapacityUpdatedEvents,
  diamondNodeDeactivatedEvents,
  diamondNodeRegisteredEvents,
  diamondNodeSellOrderPlacedEvents,
  diamondNodeUpdatedEvents,
  diamondSupportedAssetAddedEvents,
  diamondSupportedAssetsUpdatedEvents,
  diamondSupportingDocumentAddedEvents,
  diamondSupportingDocumentRemovedEvents,
  diamondTokensDepositedToNodeEvents,
  diamondTokensMintedToNodeEvents,
  diamondTokensTransferredBetweenNodesEvents,
  diamondTokensWithdrawnFromNodeEvents,
  diamondUpdateLocationEvents,
  diamondUpdateOwnerEvents,
  diamondUpdateStatusEvents,
} from 'ponder:schema';

// Utility functions
const eventId = (txHash: string, logIndex: number) => `${txHash}-${logIndex}`;

// =============================================================================
// NodesFacet Events
// =============================================================================

/**
 * Handle ClobApprovalGranted event from NodesFacet
 * Signature: ClobApprovalGranted(bytes32,address)
 * Hash: 0xd5126df4
 */
ponder.on('Diamond:ClobApprovalGranted', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondClobApprovalGrantedEvents).values({
    id: id,
    node_hash: nodeHash,
    clob_address: clobAddress,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle ClobApprovalRevoked event from NodesFacet
 * Signature: ClobApprovalRevoked(bytes32,address)
 * Hash: 0xbdd45b26
 */
ponder.on('Diamond:ClobApprovalRevoked', async ({ event, context }) => {
  const { nodeHash, clobAddress } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondClobApprovalRevokedEvents).values({
    id: id,
    node_hash: nodeHash,
    clob_address: clobAddress,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeAdminRevoked event from NodesFacet
 * Signature: NodeAdminRevoked(address)
 * Hash: 0xd75e887b
 */
ponder.on('Diamond:NodeAdminRevoked', async ({ event, context }) => {
  const { admin } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeAdminRevokedEvents).values({
    id: id,
    admin: admin,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeAdminSet event from NodesFacet
 * Signature: NodeAdminSet(address)
 * Hash: 0x73fad87b
 */
ponder.on('Diamond:NodeAdminSet', async ({ event, context }) => {
  const { admin } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeAdminSetEvents).values({
    id: id,
    admin: admin,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeCapacityUpdated event from NodesFacet
 * Signature: NodeCapacityUpdated(bytes32,uint256[])
 * Hash: 0x0ba8897d
 */
ponder.on('Diamond:NodeCapacityUpdated', async ({ event, context }) => {
  const { nodeHash, quantities } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeCapacityUpdatedEvents).values({
    id: id,
    node_hash: nodeHash,
    quantities: JSON.stringify(Array.from(quantities), (_, v) =>
      typeof v === 'bigint' ? v.toString() : v,
    ),
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeDeactivated event from NodesFacet
 * Signature: NodeDeactivated(bytes32)
 * Hash: 0x62b30865
 */
ponder.on('Diamond:NodeDeactivated', async ({ event, context }) => {
  const { nodeHash } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeDeactivatedEvents).values({
    id: id,
    node_hash: nodeHash,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeRegistered event from NodesFacet
 * Signature: NodeRegistered(bytes32,address,string)
 * Hash: 0x8326de45
 */
ponder.on('Diamond:NodeRegistered', async ({ event, context }) => {
  const { nodeHash, owner, nodeType } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeRegisteredEvents).values({
    id: id,
    node_hash: nodeHash,
    owner: owner,
    node_type: nodeType,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeSellOrderPlaced event from NodesFacet
 * Signature: NodeSellOrderPlaced(bytes32,uint256,address,uint256,uint256,bytes32)
 * Hash: 0x3de5f088
 */
ponder.on('Diamond:NodeSellOrderPlaced', async ({ event, context }) => {
  const { nodeHash, tokenId, quoteToken, price, amount, orderId } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeSellOrderPlacedEvents).values({
    id: id,
    node_hash: nodeHash,
    token_id: tokenId,
    quote_token: quoteToken,
    price: price,
    amount: amount,
    order_id: orderId,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle NodeUpdated event from NodesFacet
 * Signature: NodeUpdated(bytes32,string,uint256)
 * Hash: 0x9c97a401
 */
ponder.on('Diamond:NodeUpdated', async ({ event, context }) => {
  const { nodeHash, nodeType, capacity } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondNodeUpdatedEvents).values({
    id: id,
    node_hash: nodeHash,
    node_type: nodeType,
    capacity: capacity,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SupportedAssetAdded event from NodesFacet
 * Signature: SupportedAssetAdded(bytes32,address,uint256,uint256,uint256)
 * Hash: 0x9f0a9fa6
 */
ponder.on('Diamond:SupportedAssetAdded', async ({ event, context }) => {
  const { nodeHash, token, tokenId, price, capacity } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportedAssetAddedEvents).values({
    id: id,
    node_hash: nodeHash,
    token: token,
    token_id: tokenId,
    price: price,
    capacity: capacity,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SupportedAssetsUpdated event from NodesFacet
 * Signature: SupportedAssetsUpdated(bytes32,uint256)
 * Hash: 0x1af735b1
 */
ponder.on('Diamond:SupportedAssetsUpdated', async ({ event, context }) => {
  const { nodeHash, count } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportedAssetsUpdatedEvents).values({
    id: id,
    node_hash: nodeHash,
    count: count,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SupportingDocumentAdded event from NodesFacet
 * Signature: SupportingDocumentAdded(bytes32,string,string,string,string,bool,uint256,address)
 * Hash: 0xb9819508
 */
ponder.on('Diamond:SupportingDocumentAdded', async ({ event, context }) => {
  const {
    nodeHash,
    url,
    title,
    description,
    documentType,
    isFrozen,
    timestamp,
    addedBy,
  } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportingDocumentAddedEvents).values({
    id: id,
    node_hash: nodeHash,
    url: url,
    title: title,
    description: description,
    document_type: documentType,
    is_frozen: isFrozen,
    timestamp: timestamp,
    added_by: addedBy,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle SupportingDocumentRemoved event from NodesFacet
 * Signature: SupportingDocumentRemoved(bytes32,string,uint256,address)
 * Hash: 0x69399cc3
 */
ponder.on('Diamond:SupportingDocumentRemoved', async ({ event, context }) => {
  const { nodeHash, url, timestamp, removedBy } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondSupportingDocumentRemovedEvents).values({
    id: id,
    node_hash: nodeHash,
    url: url,
    timestamp: timestamp,
    removed_by: removedBy,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TokensDepositedToNode event from NodesFacet
 * Signature: TokensDepositedToNode(bytes32,uint256,uint256,address)
 * Hash: 0x9d994707
 */
ponder.on('Diamond:TokensDepositedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, depositor } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondTokensDepositedToNodeEvents).values({
    id: id,
    node_hash: nodeHash,
    token_id: tokenId,
    amount: amount,
    depositor: depositor,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TokensMintedToNode event from NodesFacet
 * Signature: TokensMintedToNode(bytes32,uint256,uint256,address)
 * Hash: 0x1177d829
 */
ponder.on('Diamond:TokensMintedToNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, minter } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondTokensMintedToNodeEvents).values({
    id: id,
    node_hash: nodeHash,
    token_id: tokenId,
    amount: amount,
    minter: minter,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TokensTransferredBetweenNodes event from NodesFacet
 * Signature: TokensTransferredBetweenNodes(bytes32,bytes32,uint256,uint256)
 * Hash: 0x5cee2a26
 */
ponder.on(
  'Diamond:TokensTransferredBetweenNodes',
  async ({ event, context }) => {
    const { fromNode, toNode, tokenId, amount } = event.args;
    const id = eventId(event.transaction.hash, event.log.logIndex);

    // Raw event insert
    await context.db.insert(diamondTokensTransferredBetweenNodesEvents).values({
      id: id,
      from_node: fromNode,
      to_node: toNode,
      token_id: tokenId,
      amount: amount,
      block_number: event.block.number,
      block_timestamp: BigInt(event.block.timestamp),
      transaction_hash: event.transaction.hash,
    });
  },
);

/**
 * Handle TokensWithdrawnFromNode event from NodesFacet
 * Signature: TokensWithdrawnFromNode(bytes32,uint256,uint256,address)
 * Hash: 0x59947f68
 */
ponder.on('Diamond:TokensWithdrawnFromNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, recipient } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondTokensWithdrawnFromNodeEvents).values({
    id: id,
    node_hash: nodeHash,
    token_id: tokenId,
    amount: amount,
    recipient: recipient,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle UpdateLocation event from NodesFacet
 * Signature: UpdateLocation(string,string,string,bytes32)
 * Hash: 0x6d4f5fd0
 */
ponder.on('Diamond:UpdateLocation', async ({ event, context }) => {
  const { addressName, lat, lng, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondUpdateLocationEvents).values({
    id: id,
    address_name: addressName,
    lat: lat,
    lng: lng,
    node: node,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle UpdateOwner event from NodesFacet
 * Signature: UpdateOwner(address,bytes32)
 * Hash: 0xea9df86c
 */
ponder.on('Diamond:UpdateOwner', async ({ event, context }) => {
  const { owner, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondUpdateOwnerEvents).values({
    id: id,
    owner: owner,
    node: node,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle UpdateStatus event from NodesFacet
 * Signature: UpdateStatus(bytes1,bytes32)
 * Hash: 0xcf4e8a63
 */
ponder.on('Diamond:UpdateStatus', async ({ event, context }) => {
  const { status, node } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(diamondUpdateStatusEvents).values({
    id: id,
    status: status,
    node: node,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});
