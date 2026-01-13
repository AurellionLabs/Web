// @ts-nocheck - File with outdated contract types
/**
 * Ponder Database Client
 * Provides direct PostgreSQL access to Ponder indexed data
 *
 * This module provides an alternative to GraphQL queries by connecting
 * directly to the Ponder PostgreSQL database for faster read operations.
 */

import { Pool, type PoolClient } from 'pg';

// Database connection configuration
const DATABASE_URL =
  process.env.PONDER_DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ponder_indexer';

// Create a connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle Ponder DB client', err);
    });
  }
  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[],
): Promise<T[]> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(
  text: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
}

// Type definitions for Ponder database rows
export interface PonderNode {
  id: string;
  owner: string;
  address_name: string;
  lat: string;
  lng: string;
  valid_node: boolean;
  status: string;
  created_at: bigint;
  updated_at: bigint;
  block_number: bigint;
  transaction_hash: string;
}

export interface PonderNodeAsset {
  id: string;
  node: string;
  token: string;
  token_id: bigint;
  price: bigint;
  capacity: bigint;
  created_at: bigint;
  updated_at: bigint;
}

export interface PonderOrder {
  id: string;
  buyer: string;
  seller: string;
  token: string;
  token_id: bigint;
  token_quantity: bigint;
  requested_token_quantity: bigint;
  price: bigint;
  tx_fee: bigint;
  current_status: number;
  start_location_lat: string;
  start_location_lng: string;
  end_location_lat: string;
  end_location_lng: string;
  start_name: string;
  end_name: string;
  nodes: string; // JSON array
  created_at: bigint;
  updated_at: bigint;
}

export interface PonderJourney {
  id: string;
  sender: string;
  receiver: string;
  driver: string | null;
  current_status: number;
  bounty: bigint;
  journey_start: bigint;
  journey_end: bigint;
  eta: bigint;
  start_location_lat: string;
  start_location_lng: string;
  end_location_lat: string;
  end_location_lng: string;
  start_name: string;
  end_name: string;
  order_id: string | null;
  created_at: bigint;
  updated_at: bigint;
}

export interface PonderAsset {
  id: string;
  hash: string;
  token_id: bigint;
  name: string;
  asset_class: string;
  class_name: string;
  account: string;
  amount: bigint;
  created_at: bigint;
}

export interface PonderUserBalance {
  id: string;
  user: string;
  token_id: bigint;
  balance: bigint;
  asset: string;
  first_received: bigint;
  last_updated: bigint;
}

// RWY Vault Types
export interface PonderRWYOpportunity {
  id: string;
  opportunity_id: string;
  operator: string;
  input_token: string;
  input_amount: bigint;
  output_token_id: bigint;
  output_amount: bigint;
  status: string;
  total_funded: bigint;
  total_staked: bigint;
  created_at: bigint;
  updated_at: bigint;
}

export interface PonderRWYStake {
  id: string;
  opportunity_id: string;
  staker: string;
  principal: bigint;
  amount_staked: bigint;
  amount_unstaked: bigint;
  last_updated: bigint;
}

export interface PonderRWYOperator {
  id: string;
  operator: string;
  status: 'Approved' | 'Revoked';
  total_slashed: bigint;
  created_at: bigint;
  updated_at: bigint;
}

// Helper functions to convert Ponder rows to domain types
export function convertPonderNodeToDomain(row: PonderNode): any {
  return {
    address: row.id,
    owner: row.owner,
    location: {
      addressName: row.address_name,
      location: {
        lat: row.lat,
        lng: row.lng,
      },
    },
    validNode: row.valid_node,
    status: row.status as 'Active' | 'Inactive',
    assets: [], // Loaded separately
  };
}

export function convertPonderOrderToDomain(row: PonderOrder): any {
  const nodes = JSON.parse(row.nodes || '[]');
  return {
    id: row.id,
    buyer: row.buyer,
    seller: row.seller,
    token: row.token,
    tokenId: row.token_id.toString(),
    tokenQuantity: row.token_quantity.toString(),
    price: row.price.toString(),
    txFee: row.tx_fee.toString(),
    currentStatus: convertNumericToOrderStatus(row.current_status),
    locationData: {
      startLocation: {
        lat: row.start_location_lat,
        lng: row.start_location_lng,
      },
      endLocation: {
        lat: row.end_location_lat,
        lng: row.end_location_lng,
      },
      startName: row.start_name,
      endName: row.end_name,
    },
    nodes,
    journeyIds: [], // Loaded separately
    contractualAgreement: '',
  };
}

export function convertPonderJourneyToDomain(row: PonderJourney): any {
  return {
    journeyId: row.id,
    sender: row.sender,
    receiver: row.receiver,
    driver: row.driver || '0x0000000000000000000000000000000000000000',
    currentStatus: convertNumericToJourneyStatus(row.current_status),
    bounty: row.bounty,
    journeyStart: row.journey_start,
    journeyEnd: row.journey_end,
    ETA: row.eta,
    parcelData: {
      startLocation: {
        lat: row.start_location_lat,
        lng: row.start_location_lng,
      },
      endLocation: {
        lat: row.end_location_lat,
        lng: row.end_location_lng,
      },
      startName: row.start_name,
      endName: row.end_name,
    },
  };
}

function convertNumericToOrderStatus(status: number): string {
  const statusMap: { [key: number]: string } = {
    0: 'created',
    1: 'processing',
    2: 'settled',
    3: 'cancelled',
  };
  return statusMap[status] || 'created';
}

function convertNumericToJourneyStatus(status: number): string {
  const statusMap: { [key: number]: string } = {
    0: 'pending',
    1: 'in_transit',
    2: 'delivered',
    3: 'cancelled',
  };
  return statusMap[status] || 'pending';
}

// Query helpers for common operations
export const PonderQueries = {
  // Node queries
  getNodeByAddress: async (address: string) => {
    return queryOne<PonderNode>('SELECT * FROM nodes WHERE id = $1', [
      address.toLowerCase(),
    ]);
  },

  getNodesByOwner: async (ownerAddress: string) => {
    return query<PonderNode>('SELECT * FROM nodes WHERE owner = $1', [
      ownerAddress.toLowerCase(),
    ]);
  },

  getNodeAssets: async (nodeAddress: string) => {
    return query<PonderNodeAsset>('SELECT * FROM node_assets WHERE node = $1', [
      nodeAddress.toLowerCase(),
    ]);
  },

  getAllNodeAssets: async (limit = 500, offset = 0) => {
    return query<PonderNodeAsset>(
      'SELECT * FROM node_assets LIMIT $1 OFFSET $2',
      [limit, offset],
    );
  },

  // Order queries
  getOrderById: async (orderId: string) => {
    return queryOne<PonderOrder>('SELECT * FROM orders WHERE id = $1', [
      orderId,
    ]);
  },

  getOrdersByBuyer: async (buyerAddress: string) => {
    return query<PonderOrder>(
      'SELECT * FROM orders WHERE buyer = $1 ORDER BY created_at DESC',
      [buyerAddress.toLowerCase()],
    );
  },

  getOrdersBySeller: async (sellerAddress: string) => {
    return query<PonderOrder>(
      'SELECT * FROM orders WHERE seller = $1 ORDER BY created_at DESC',
      [sellerAddress.toLowerCase()],
    );
  },

  getOrdersByNode: async (nodeAddress: string) => {
    return query<PonderOrder>(
      `SELECT * FROM orders WHERE nodes::jsonb @> $1::jsonb ORDER BY created_at DESC`,
      [JSON.stringify([nodeAddress.toLowerCase()])],
    );
  },

  // Journey queries
  getJourneyById: async (journeyId: string) => {
    return queryOne<PonderJourney>('SELECT * FROM journeys WHERE id = $1', [
      journeyId,
    ]);
  },

  getJourneysBySender: async (senderAddress: string) => {
    return query<PonderJourney>(
      'SELECT * FROM journeys WHERE sender = $1 ORDER BY created_at DESC',
      [senderAddress.toLowerCase()],
    );
  },

  getJourneysByReceiver: async (receiverAddress: string) => {
    return query<PonderJourney>(
      'SELECT * FROM journeys WHERE receiver = $1 ORDER BY created_at DESC',
      [receiverAddress.toLowerCase()],
    );
  },

  getJourneysByOrderId: async (orderId: string) => {
    return query<PonderJourney>('SELECT * FROM journeys WHERE order_id = $1', [
      orderId,
    ]);
  },

  getAllJourneys: async (limit = 1000, offset = 0) => {
    return query<PonderJourney>(
      'SELECT * FROM journeys ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );
  },

  // Asset queries
  getAssetByHash: async (hash: string) => {
    return queryOne<PonderAsset>('SELECT * FROM assets WHERE hash = $1', [
      hash.toLowerCase(),
    ]);
  },

  getAssetsByTokenIds: async (tokenIds: string[]) => {
    return query<PonderAsset>(
      'SELECT * FROM assets WHERE token_id = ANY($1::bigint[])',
      [tokenIds.map((id) => BigInt(id))],
    );
  },

  getUserBalances: async (userAddress: string) => {
    return query<PonderUserBalance>(
      'SELECT * FROM user_balances WHERE "user" = $1',
      [userAddress.toLowerCase()],
    );
  },

  getUserBalanceByTokenId: async (userAddress: string, tokenId: string) => {
    return queryOne<PonderUserBalance>(
      'SELECT * FROM user_balances WHERE "user" = $1 AND token_id = $2',
      [userAddress.toLowerCase(), BigInt(tokenId)],
    );
  },

  // RWY Vault Queries
  getRWYOpportunityById: async (opportunityId: string) => {
    return queryOne<PonderRWYOpportunity>(
      'SELECT * FROM rwy_opportunities WHERE opportunity_id = $1',
      [opportunityId],
    );
  },

  getRWYOpportunitiesByOperator: async (operatorAddress: string) => {
    return query<PonderRWYOpportunity>(
      'SELECT * FROM rwy_opportunities WHERE operator = $1 ORDER BY created_at DESC',
      [operatorAddress.toLowerCase()],
    );
  },

  getRWYOpportunitiesByStatus: async (status: string) => {
    return query<PonderRWYOpportunity>(
      'SELECT * FROM rwy_opportunities WHERE status = $1 ORDER BY created_at DESC',
      [status],
    );
  },

  getAllRWYOpportunities: async (limit = 100, offset = 0) => {
    return query<PonderRWYOpportunity>(
      'SELECT * FROM rwy_opportunities ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset],
    );
  },

  getRWYStakesByUser: async (userAddress: string) => {
    return query<PonderRWYStake>(
      'SELECT * FROM rwy_stakes WHERE staker = $1 ORDER BY last_updated DESC',
      [userAddress.toLowerCase()],
    );
  },

  getRWYStakesByOpportunity: async (opportunityId: string) => {
    return query<PonderRWYStake>(
      'SELECT * FROM rwy_stakes WHERE opportunity_id = $1 ORDER BY last_updated DESC',
      [opportunityId],
    );
  },

  getRWYOperatorByAddress: async (operatorAddress: string) => {
    return queryOne<PonderRWYOperator>(
      'SELECT * FROM rwy_operators WHERE operator = $1',
      [operatorAddress.toLowerCase()],
    );
  },
};

export function convertPonderRWYOpportunityToDomain(row: any): any {
  return {
    id: row.opportunity_id,
    operator: row.operator,
    inputToken: row.input_token,
    inputAmount: row.input_amount.toString(),
    outputTokenId: row.output_token_id.toString(),
    outputAmount: row.output_amount.toString(),
    status: row.status,
    totalFunded: row.total_funded?.toString() || '0',
    totalStaked: row.total_staked?.toString() || '0',
    createdAt: row.created_at?.toString() || '0',
    updatedAt: row.updated_at?.toString() || '0',
  };
}

export function convertPonderRWYStakeToDomain(row: any): any {
  return {
    id: row.id,
    opportunityId: row.opportunity_id,
    staker: row.staker,
    principal: row.principal?.toString() || '0',
    amountStaked: row.amount_staked?.toString() || '0',
    amountUnstaked: row.amount_unstaked?.toString() || '0',
    lastUpdated: row.last_updated?.toString() || '0',
  };
}

export function convertPonderRWYOperatorToDomain(row: any): any {
  return {
    id: row.id,
    operator: row.operator,
    status: row.status,
    totalSlashed: row.total_slashed?.toString() || '0',
    createdAt: row.created_at?.toString() || '0',
    updatedAt: row.updated_at?.toString() || '0',
  };
}

// Check if Ponder database is available
export async function isPonderAvailable(): Promise<boolean> {
  try {
    const pool = getPool();
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.warn('Ponder database not available:', error);
    return false;
  }
}

// Feature flag to switch between Graph and Ponder
export function usePonderDatabase(): boolean {
  return process.env.USE_PONDER_DATABASE === 'true';
}

export default {
  query,
  queryOne,
  getPool,
  isPonderAvailable,
  usePonderDatabase,
  PonderQueries,
  convertPonderNodeToDomain,
  convertPonderOrderToDomain,
  convertPonderJourneyToDomain,
  convertPonderRWYOpportunityToDomain,
  convertPonderRWYStakeToDomain,
  convertPonderRWYOperatorToDomain,
};
