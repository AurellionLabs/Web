// Auto-generated handler for nodes domain - Raw event storage only
// Generated at: 2026-01-18T00:41:29.639Z
// 
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: NodesFacet

import { ponder } from "@/generated";

// Import event tables from generated schema
import { clobApprovalGrantedD512Events, clobApprovalRevokedBdd4Events, nodeCapacityUpdated_0ba8Events, nodeDeactivated_62b3Events, nodeRegistered_8326Events, nodeSellOrderPlaced_3de5Events, nodeUpdated_9c97Events, supportedAssetAdded_9f0aEvents, supportedAssetsUpdated_1af7Events, tokensDepositedToNode_9d99Events, tokensMintedToNode_1177Events, tokensTransferredBetweenNodes_5ceeEvents, tokensWithdrawnFromNode_5994Events, updateLocation_6d4fEvents, updateOwnerEa9dEvents, updateStatusCf4eEvents } from "@/generated-schema";

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
  
  // Insert raw event into event table
  await context.db.insert(clobApprovalGrantedD512Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(clobApprovalRevokedBdd4Events).values({
    id: id,
    node_hash: nodeHash,
    clob_address: clobAddress,
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
  
  // Insert raw event into event table
  await context.db.insert(nodeCapacityUpdated_0ba8Events).values({
    id: id,
    node_hash: nodeHash,
    quantities: quantities,
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
  
  // Insert raw event into event table
  await context.db.insert(nodeDeactivated_62b3Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(nodeRegistered_8326Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(nodeSellOrderPlaced_3de5Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(nodeUpdated_9c97Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(supportedAssetAdded_9f0aEvents).values({
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
  
  // Insert raw event into event table
  await context.db.insert(supportedAssetsUpdated_1af7Events).values({
    id: id,
    node_hash: nodeHash,
    count: count,
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
  
  // Insert raw event into event table
  await context.db.insert(tokensDepositedToNode_9d99Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(tokensMintedToNode_1177Events).values({
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
ponder.on('Diamond:TokensTransferredBetweenNodes', async ({ event, context }) => {
  const { fromNode, toNode, tokenId, amount } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  
  // Insert raw event into event table
  await context.db.insert(tokensTransferredBetweenNodes_5ceeEvents).values({
    id: id,
    from_node: fromNode,
    to_node: toNode,
    token_id: tokenId,
    amount: amount,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

/**
 * Handle TokensWithdrawnFromNode event from NodesFacet
 * Signature: TokensWithdrawnFromNode(bytes32,uint256,uint256,address)
 * Hash: 0x59947f68
 */
ponder.on('Diamond:TokensWithdrawnFromNode', async ({ event, context }) => {
  const { nodeHash, tokenId, amount, recipient } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  
  // Insert raw event into event table
  await context.db.insert(tokensWithdrawnFromNode_5994Events).values({
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
  
  // Insert raw event into event table
  await context.db.insert(updateLocation_6d4fEvents).values({
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
  
  // Insert raw event into event table
  await context.db.insert(updateOwnerEa9dEvents).values({
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
  
  // Insert raw event into event table
  await context.db.insert(updateStatusCf4eEvents).values({
    id: id,
    status: status,
    node: node,
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

