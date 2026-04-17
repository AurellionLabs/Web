#!/usr/bin/env ts-node
/**
 * Smart Contract-First Indexer Generator
 *
 * Generates Ponder indexer configuration from Hardhat artifacts:
 * - Per-facet ABI files (eliminates duplicate event conflicts)
 * - Ponder schema with proper indexes and relationships
 * - Handler stubs with correct event signatures
 *
 * Usage: npx ts-node scripts/generate-indexer.ts
 *
 * @author Staff Engineer Implementation
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { keccak256, toBytes } from 'viem';

import 'dotenv/config';
console.log(process.env);
// ============================================================================
// CONFIGURATION
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_DIR = path.join(
  __dirname,
  '../artifacts/contracts/diamond/facets',
);
const CONTRACTS_DIR = path.join(__dirname, '../artifacts/contracts');
const INDEXER_DIR = path.join(__dirname, '../indexer');
const GENERATED_ABIS_DIR = path.join(INDEXER_DIR, 'abis/generated');
const GENERATED_HANDLERS_DIR = path.join(INDEXER_DIR, 'src/handlers');
const GENERATED_SCHEMA_FILE = path.join(INDEXER_DIR, 'generated-schema.ts');

// Facets to index - maps to Hardhat artifact paths
const FACETS_TO_INDEX: Record<string, { domain: string; priority: number }> = {
  NodesFacet: { domain: 'nodes', priority: 1 },
  CLOBFacetV2: { domain: 'clob', priority: 2 },
  OrderMatchingFacet: { domain: 'clob', priority: 3 },
  OrderRouterFacet: { domain: 'clob', priority: 4 },
  BridgeFacet: { domain: 'bridge', priority: 5 },
  RWYStakingFacet: { domain: 'rwy-staking', priority: 6 },
  // OperatorFacet removed: operator events are not queried by any frontend repository.
  // Re-add when operator reputation/stats UI is built.
  CLOBAdminFacet: { domain: 'clob-admin', priority: 8 },
  CLOBMEVFacet: { domain: 'clob-mev', priority: 13 },
  // DiamondCutFacet / OwnershipFacet removed: governance-only events, not queried by frontend.
  AuSysFacet: { domain: 'ausys', priority: 11 },
  AssetsFacet: { domain: 'assets', priority: 12 },
};

// External contracts (not facets) that emit events we want to index
// RWY staking events come from RWYStakingFacet in Diamond.
const EXTERNAL_CONTRACTS: Record<
  string,
  { domain: string; artifactPath: string; priority: number }
> = {
  AuraAsset: {
    domain: 'aura-asset',
    artifactPath: 'AuraAsset.sol/AuraAsset.json',
    priority: 13,
  },
};

// Ponder currently enforces a maximum of 100 schema tables.
// Exclude low-value admin domains to keep the generated schema within limit.
const EXCLUDED_INDEXER_DOMAINS = new Set<string>();

// Event-level exclusions: skip specific events that are not queried by any
// frontend repository. Add event names here (without 'Diamond:' prefix) to
// prevent generating tables + handlers for them. Re-enable when needed.
const EXCLUDED_EVENTS = new Set<string>([
  // Legacy OrderMatchingFacet events superseded by CLOBFacetV2 / OrderRouterFacet:
  'AusysOrderFilled', // diamondAusysOrderFilledEvents — not queried
  'MatchingOrderCancelled', // diamondMatchingOrderCancelledEvents — not queried
  'TradeExecuted', // diamondTradeExecutedEvents (old matching engine) — not queried
  'OrderRouted', // diamondOrderRoutedEvents — not queried
  // OrderRouterFacet events not queried (RouterOrderPlaced IS queried, keep it):
  'RouterOrderCancelled', // diamondRouterOrderCancelledEvents — not queried
  'RouterOrderCreated', // diamondRouterOrderCreatedEvents — not queried
  'RouterTradeExecuted', // diamondRouterTradeExecutedEvents — not queried
  // Emergency governance events — not queried in frontend
  'EmergencyActionCancelled',
  'EmergencyActionExecuted',
  'EmergencyActionInitiated',
  'EmergencyWithdrawal',
  // Admin/config events — not queried by frontend, re-enable when dashboards need them
  'NodeRegistrarUpdated',
  'JourneyDriverAssigned',
  'NodeFeeBpsUpdated',
  'TokenDestinationPending',
  'TokenDestinationSelected',
  'TreasuryFeeAccrued',
  'TreasuryFeeBpsUpdated',
  'TreasuryFeeClaimed',
]);

// ============================================================================
// AGGREGATE TABLE CONFIGURATION (US-001, US-002, US-003)
// ============================================================================

interface AggregateColumn {
  name: string;
  ponderType: string; // e.g. 't.text()' or 't.bigint()'
  notNull?: boolean;
}

interface AggregateTableDef {
  columns: AggregateColumn[];
  /** Single-column indexes (column names) */
  indexes: string[];
  /** Composite indexes — each entry is an array of column names */
  compositeIndexes?: string[][];
}

const AGGREGATE_TABLES: Record<string, AggregateTableDef> = {
  assets: {
    columns: [
      { name: 'id', ponderType: 't.text().primaryKey()', notNull: false },
      { name: 'hash', ponderType: 't.hex()', notNull: true },
      { name: 'token_id', ponderType: 't.bigint()', notNull: true },
      { name: 'name', ponderType: 't.text()', notNull: true },
      { name: 'asset_class', ponderType: 't.text()', notNull: true },
      { name: 'class_name', ponderType: 't.text()', notNull: true },
      { name: 'account', ponderType: 't.hex()', notNull: true },
      { name: 'created_at', ponderType: 't.bigint()', notNull: true },
      { name: 'updated_at', ponderType: 't.bigint()', notNull: true },
      { name: 'block_number', ponderType: 't.bigint()', notNull: true },
      { name: 'transaction_hash', ponderType: 't.hex()', notNull: true },
    ],
    indexes: ['token_id', 'account'],
    compositeIndexes: [['asset_class', 'class_name']],
  },
  orders: {
    columns: [
      { name: 'id', ponderType: 't.text().primaryKey()', notNull: false },
      { name: 'buyer', ponderType: 't.hex()', notNull: true },
      { name: 'seller', ponderType: 't.hex()', notNull: true },
      { name: 'token', ponderType: 't.hex()', notNull: true },
      { name: 'token_id', ponderType: 't.bigint()', notNull: true },
      { name: 'token_quantity', ponderType: 't.bigint()', notNull: true },
      {
        name: 'requested_token_quantity',
        ponderType: 't.bigint()',
        notNull: true,
      },
      { name: 'price', ponderType: 't.bigint()', notNull: true },
      { name: 'tx_fee', ponderType: 't.bigint()', notNull: true },
      { name: 'current_status', ponderType: 't.integer()', notNull: true },
      { name: 'start_location_lat', ponderType: 't.text()', notNull: false },
      { name: 'start_location_lng', ponderType: 't.text()', notNull: false },
      { name: 'end_location_lat', ponderType: 't.text()', notNull: false },
      { name: 'end_location_lng', ponderType: 't.text()', notNull: false },
      { name: 'start_name', ponderType: 't.text()', notNull: false },
      { name: 'end_name', ponderType: 't.text()', notNull: false },
      { name: 'nodes', ponderType: 't.text()', notNull: false },
      { name: 'created_at', ponderType: 't.bigint()', notNull: true },
      { name: 'updated_at', ponderType: 't.bigint()', notNull: true },
      { name: 'block_number', ponderType: 't.bigint()', notNull: true },
      { name: 'transaction_hash', ponderType: 't.hex()', notNull: true },
    ],
    indexes: ['buyer', 'seller', 'current_status'],
  },
  journeys: {
    columns: [
      { name: 'id', ponderType: 't.text().primaryKey()', notNull: false },
      { name: 'sender', ponderType: 't.hex()', notNull: true },
      { name: 'receiver', ponderType: 't.hex()', notNull: true },
      { name: 'driver', ponderType: 't.hex()', notNull: false },
      { name: 'current_status', ponderType: 't.integer()', notNull: true },
      { name: 'bounty', ponderType: 't.bigint()', notNull: true },
      { name: 'journey_start', ponderType: 't.bigint()', notNull: false },
      { name: 'journey_end', ponderType: 't.bigint()', notNull: false },
      { name: 'eta', ponderType: 't.bigint()', notNull: false },
      { name: 'start_location_lat', ponderType: 't.text()', notNull: false },
      { name: 'start_location_lng', ponderType: 't.text()', notNull: false },
      { name: 'end_location_lat', ponderType: 't.text()', notNull: false },
      { name: 'end_location_lng', ponderType: 't.text()', notNull: false },
      { name: 'start_name', ponderType: 't.text()', notNull: false },
      { name: 'end_name', ponderType: 't.text()', notNull: false },
      { name: 'order_id', ponderType: 't.hex()', notNull: true },
      { name: 'created_at', ponderType: 't.bigint()', notNull: true },
      { name: 'updated_at', ponderType: 't.bigint()', notNull: true },
      { name: 'block_number', ponderType: 't.bigint()', notNull: true },
      { name: 'transaction_hash', ponderType: 't.hex()', notNull: true },
    ],
    indexes: ['sender', 'receiver', 'driver', 'current_status', 'order_id'],
    compositeIndexes: [['current_status', 'created_at']],
  },
};

// ============================================================================
// EVENT-TO-AGGREGATE MAPPING (US-006, US-007, US-008)
// ============================================================================

interface AggregateAction {
  /** The aggregate table to write to */
  table: string;
  /**
   * 'insert'  = db.insert().values().onConflictDoNothing()
   * 'upsert'  = db.insert().values().onConflictDoUpdate() — must supply ALL notNull columns
   * 'update'  = db.update().set().where(eq(table.id, <id column value>)) — partial update
   */
  action: 'insert' | 'upsert' | 'update';
  /**
   * Mapping from aggregate column name → event field name (or a literal JS expression).
   * Entries beginning with '$' are treated as literal JS code (e.g. '$0' → 0).
   * For 'update' action, the 'id' entry is used as the WHERE clause value.
   */
  mapping: Record<string, string>;
  /** Optional guard expression evaluated in generated code (e.g. "from === '0x0000…'") */
  guard?: string;
}

const EVENT_TO_AGGREGATE_MAPPING: Record<string, AggregateAction[]> = {
  // US-006: UnifiedOrderCreated → orders insert
  // ABI: UnifiedOrderCreated(bytes32 unifiedOrderId, bytes32 clobOrderId, address buyer,
  //                          address seller, address token, uint256 tokenId,
  //                          uint256 quantity, uint256 price)
  UnifiedOrderCreated: [
    {
      table: 'orders',
      action: 'insert',
      mapping: {
        id: 'unifiedOrderId',
        buyer: 'buyer',
        seller: 'seller',
        token: 'token',
        token_id: 'tokenId',
        token_quantity: 'quantity',
        requested_token_quantity: 'quantity',
        price: 'price',
        tx_fee: '$BigInt(0)',
        current_status: '$0',
        created_at: '$BigInt(event.block.timestamp)',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
  // US-006: OrderSettled → orders update current_status = 4
  // ABI: OrderSettled(bytes32 unifiedOrderId, address seller, uint256 sellerAmount,
  //                   address driver, uint256 driverAmount)
  OrderSettled: [
    {
      table: 'orders',
      action: 'update',
      mapping: {
        id: 'unifiedOrderId',
        current_status: '$4',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
  // US-006: BridgeOrderCancelled → orders update current_status = 5
  // ABI: BridgeOrderCancelled(bytes32 unifiedOrderId, uint8 previousStatus)
  BridgeOrderCancelled: [
    {
      table: 'orders',
      action: 'update',
      mapping: {
        id: 'unifiedOrderId',
        current_status: '$5',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
  // US-007: LogisticsOrderCreated → journeys insert
  // ABI: LogisticsOrderCreated(bytes32 unifiedOrderId, bytes32 ausysOrderId,
  //                            bytes32[] journeyIds, uint256 bounty, address node)
  LogisticsOrderCreated: [
    {
      table: 'journeys',
      action: 'insert',
      mapping: {
        id: 'ausysOrderId',
        sender: 'node',
        receiver: 'node',
        current_status: '$0',
        bounty: 'bounty',
        order_id: 'unifiedOrderId',
        created_at: '$BigInt(event.block.timestamp)',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
  // US-007: JourneyStatusUpdated → journeys update (partial update on status)
  // ABI: JourneyStatusUpdated(bytes32 unifiedOrderId, bytes32 journeyId, uint8 phase)
  JourneyStatusUpdated: [
    {
      table: 'journeys',
      action: 'update',
      mapping: {
        id: 'journeyId',
        current_status: 'phase',
        order_id: 'unifiedOrderId',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
  // US-008: MintedAsset → assets upsert (re-mint updates the record)
  // ABI: MintedAsset(address account, bytes32 hash, uint256 tokenId, string name,
  //                  string assetClass, string className)
  MintedAsset: [
    {
      table: 'assets',
      action: 'upsert',
      mapping: {
        id: 'hash',
        hash: 'hash',
        token_id: 'tokenId',
        name: 'name',
        asset_class: 'assetClass',
        class_name: 'className',
        account: 'account',
        created_at: '$BigInt(event.block.timestamp)',
        updated_at: '$BigInt(event.block.timestamp)',
        block_number: '$event.block.number',
        transaction_hash: '$event.transaction.hash',
      },
    },
  ],
};

// ============================================================================
// TYPES
// ============================================================================

interface AbiItem {
  type: string;
  name?: string;
  inputs?: AbiInput[];
  outputs?: AbiOutput[];
  anonymous?: boolean;
  stateMutability?: string;
}

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
  components?: AbiInput[];
}

interface AbiOutput {
  name: string;
  type: string;
  internalType?: string;
  components?: AbiOutput[];
}

interface EventInfo {
  name: string;
  facet: string;
  domain: string;
  signature: string;
  signatureHash: string;
  fullSignature?: string; // Set when event name has duplicates with different signatures
  inputs: AbiInput[];
  abi: AbiItem;
}

interface FacetInfo {
  name: string;
  domain: string;
  events: EventInfo[];
  functions: AbiItem[];
  abi: AbiItem[];
}

function shouldIndexEvent(event: EventInfo): boolean {
  if (EXCLUDED_INDEXER_DOMAINS.has(event.domain)) return false;
  if (EXCLUDED_EVENTS.has(event.name)) return false;
  return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function computeEventSignature(event: AbiItem): string {
  if (!event.inputs) return `${event.name}()`;
  const params = event.inputs.map((i) => i.type).join(',');
  return `${event.name}(${params})`;
}

function computeSignatureHash(signature: string): string {
  const hash = keccak256(toBytes(signature));
  return hash.slice(0, 10); // First 4 bytes = 10 hex chars including 0x
}

function solidityTypeToTsType(type: string): string {
  if (type.startsWith('uint') || type.startsWith('int')) return 'bigint';
  if (type === 'address') return '`0x${string}`';
  if (type === 'bool') return 'boolean';
  if (type.startsWith('bytes32')) return '`0x${string}`';
  if (type.startsWith('bytes')) return '`0x${string}`';
  if (type === 'string') return 'string';
  if (type.endsWith('[]'))
    return `${solidityTypeToTsType(type.slice(0, -2))}[]`;
  return 'unknown';
}

function solidityTypeToPonderType(type: string): string {
  // Arrays are serialized as JSON text — must check before scalar matchers
  if (type.endsWith('[]')) return 't.text()';
  if (type.startsWith('uint') || type.startsWith('int')) return 't.bigint()';
  if (type === 'address') return 't.hex()';
  if (type === 'bool') return 't.boolean()';
  if (type.startsWith('bytes32')) return 't.hex()';
  if (type.startsWith('bytes')) return 't.hex()';
  if (type === 'string') return 't.text()';
  return 't.text()';
}

function camelToSnake(str: string): string {
  return str
    .replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    .replace(/^_/, '');
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// ============================================================================
// ARTIFACT PARSING
// ============================================================================

function loadFacetArtifact(facetName: string): AbiItem[] | null {
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    `${facetName}.sol/${facetName}.json`,
  );

  if (!fs.existsSync(artifactPath)) {
    console.warn(`⚠️  Artifact not found: ${artifactPath}`);
    return null;
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.error(`❌ Error loading ${facetName}:`, error);
    return null;
  }
}

function extractEvents(
  abi: AbiItem[],
  facetName: string,
  domain: string,
): EventInfo[] {
  return abi
    .filter((item) => item.type === 'event' && item.name)
    .map((event) => {
      const signature = computeEventSignature(event);
      return {
        name: event.name!,
        facet: facetName,
        domain,
        signature,
        signatureHash: computeSignatureHash(signature),
        inputs: event.inputs || [],
        abi: event,
      };
    });
}

function loadArtifact(
  contractName: string,
  artifactPath: string,
): AbiItem[] | null {
  const fullPath = path.join(CONTRACTS_DIR, artifactPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`Artifact not found: ${fullPath}`);
    return null;
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    return artifact.abi;
  } catch (error) {
    console.error(`Error loading ${contractName}:`, error);
    return null;
  }
}

function parseFacets(): Map<string, FacetInfo> {
  const facets = new Map<string, FacetInfo>();

  // Parse Diamond facets
  for (const [facetName, config] of Object.entries(FACETS_TO_INDEX)) {
    const abi = loadFacetArtifact(facetName);
    if (!abi) continue;

    const allEvents = extractEvents(abi, facetName, config.domain);

    const seenSignatures = new Set<string>();
    const events: EventInfo[] = [];
    for (const event of allEvents) {
      if (!seenSignatures.has(event.signatureHash)) {
        seenSignatures.add(event.signatureHash);
        events.push(event);
      }
    }

    const functions = abi.filter((item) => item.type === 'function');

    facets.set(facetName, {
      name: facetName,
      domain: config.domain,
      events,
      functions,
      abi,
    });

    console.log(
      `Parsed ${facetName}: ${events.length} events, ${functions.length} functions`,
    );
  }

  // Parse external contract ABIs when configured.
  for (const [contractName, config] of Object.entries(EXTERNAL_CONTRACTS)) {
    const abi = loadArtifact(contractName, config.artifactPath);
    if (!abi) continue;

    const allEvents = extractEvents(abi, contractName, config.domain);

    const seenSignatures = new Set<string>();
    const events: EventInfo[] = [];
    for (const event of allEvents) {
      if (!seenSignatures.has(event.signatureHash)) {
        seenSignatures.add(event.signatureHash);
        events.push(event);
      }
    }

    const functions = abi.filter((item) => item.type === 'function');

    facets.set(contractName, {
      name: contractName,
      domain: config.domain,
      events,
      functions,
      abi,
    });

    console.log(
      `Parsed ${contractName}: ${events.length} events, ${functions.length} functions`,
    );
  }

  return facets;
}

// ============================================================================
// ABI GENERATION
// ============================================================================

function generatePerFacetAbis(facets: Map<string, FacetInfo>): void {
  ensureDir(GENERATED_ABIS_DIR);

  // Generate individual facet ABI files
  for (const [facetName, facet] of facets) {
    const content = `// Auto-generated from ${facetName}.sol - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

export const ${facetName}ABI = ${JSON.stringify(facet.abi, null, 2)} as const;

export const ${facetName}Events = ${JSON.stringify(
      facet.events.map((e) => ({
        name: e.name,
        signature: e.signature,
        signatureHash: e.signatureHash,
      })),
      null,
      2,
    )} as const;
`;

    fs.writeFileSync(path.join(GENERATED_ABIS_DIR, `${facetName}.ts`), content);
  }

  // Generate combined Diamond ABI (events only, deduplicated by signature hash)
  const allEvents = new Map<string, EventInfo>();
  const allFunctions = new Map<string, AbiItem>();

  for (const facet of facets.values()) {
    for (const event of facet.events) {
      // Use signature hash as key to deduplicate
      const key = event.signatureHash;
      if (!allEvents.has(key)) {
        allEvents.set(key, event);
      }
    }
    for (const fn of facet.functions) {
      if (fn.name && !allFunctions.has(fn.name)) {
        allFunctions.set(fn.name, fn);
      }
    }
  }

  const combinedAbi = [
    ...Array.from(allEvents.values()).map((e) => e.abi),
    ...Array.from(allFunctions.values()),
  ];

  const indexContent = `// Auto-generated Diamond ABI - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// 
// This file combines ABIs from all facets with events deduplicated by signature hash.
// For per-facet ABIs, import from the individual files.

${Array.from(facets.keys())
  .map((name) => `export { ${name}ABI, ${name}Events } from './${name}';`)
  .join('\n')}

// Combined ABI for Diamond contract (deduplicated events)
export const DiamondABI = ${JSON.stringify(combinedAbi, null, 2)} as const;

// Event signature registry for disambiguation
export const EventSignatureRegistry = ${JSON.stringify(
    Object.fromEntries(
      Array.from(allEvents.values()).map((e) => [
        e.signatureHash,
        {
          name: e.name,
          facet: e.facet,
          signature: e.signature,
        },
      ]),
    ),
    null,
    2,
  )} as const;
`;

  fs.writeFileSync(path.join(GENERATED_ABIS_DIR, 'index.ts'), indexContent);
  console.log(`\n✓ Generated ${facets.size} per-facet ABIs + combined index`);
}

// ============================================================================
// SCHEMA GENERATION
// ============================================================================

interface SchemaTable {
  name: string;
  columns: {
    name: string;
    type: string;
    indexed?: boolean;
    primaryKey?: boolean;
  }[];
  indexes: string[];
  /** Composite indexes — each entry is an ordered array of column names */
  compositeIndexes?: string[][];
}

function generateEventTable(
  event: EventInfo,
  contractName: string,
): SchemaTable {
  // Use contract prefix for readable names: {contract}_{event_name}_events
  // External contracts use their name, Diamond facets use 'diamond'
  const prefix = EXTERNAL_CONTRACTS[event.facet]
    ? event.facet.toLowerCase()
    : 'diamond';
  const tableName = `${prefix}_${camelToSnake(event.name)}_events`;
  const columns: SchemaTable['columns'] = [
    { name: 'id', type: 't.text().primaryKey()', primaryKey: true },
  ];
  const indexes: string[] = [];

  // Reserved column names that conflict with our schema structure
  const reservedColumns = new Set([
    'id',
    'block_number',
    'block_timestamp',
    'transaction_hash',
  ]);

  for (const input of event.inputs) {
    let colName = camelToSnake(input.name);

    // Rename reserved column names to avoid conflicts with primary key and metadata
    if (reservedColumns.has(colName)) {
      colName = `event_${colName}`;
    }

    let colType = solidityTypeToPonderType(input.type);

    if (input.indexed) {
      indexes.push(colName);
    }

    columns.push({
      name: colName,
      type: `${colType}.notNull()`,
      indexed: input.indexed,
    });
  }

  // Add metadata columns
  columns.push(
    { name: 'block_number', type: 't.bigint().notNull()' },
    { name: 'block_timestamp', type: 't.bigint().notNull()' },
    { name: 'transaction_hash', type: 't.hex().notNull()' },
  );

  return { name: tableName, columns, indexes };
}

// ============================================================================
// AGGREGATE TABLE GENERATION (US-004)
// ============================================================================

function generateAggregateTables(): SchemaTable[] {
  const tables: SchemaTable[] = [];

  for (const [tableName, def] of Object.entries(AGGREGATE_TABLES)) {
    const columns: SchemaTable['columns'] = def.columns.map((col) => {
      // primaryKey columns already include .primaryKey() in the ponderType string
      const isPK = col.ponderType.includes('.primaryKey()');
      if (isPK) {
        return { name: col.name, type: col.ponderType, primaryKey: true };
      }
      const typeStr = col.notNull
        ? `${col.ponderType}.notNull()`
        : col.ponderType;
      return { name: col.name, type: typeStr };
    });

    tables.push({
      name: tableName,
      columns,
      indexes: def.indexes,
      compositeIndexes: def.compositeIndexes,
    });
  }

  return tables;
}

function generateSchema(facets: Map<string, FacetInfo>): void {
  const eventTables: SchemaTable[] = [];
  const seenSignatures = new Set<string>();

  // Generate event tables (deduplicated by signature)
  // Pure Dumb Indexer: Only raw event tables, no aggregate tables
  for (const facet of facets.values()) {
    for (const event of facet.events) {
      if (!shouldIndexEvent(event)) continue;
      if (seenSignatures.has(event.signatureHash)) continue;
      seenSignatures.add(event.signatureHash);
      eventTables.push(generateEventTable(event, facet.name));
    }
  }

  // Include aggregate tables alongside raw event tables
  const aggregateTables = generateAggregateTables();
  const allTables = [...aggregateTables, ...eventTables];

  // Generate schema file
  let schemaContent = `// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// 
// This schema is derived from Diamond facet events.
// Regenerate with: npm run generate:indexer

import { onchainTable, index } from 'ponder';

`;

  for (const table of allTables) {
    // Build single-column index entries
    const singleIdxLines = table.indexes.map(
      (idx) => `    ${snakeToCamel(idx)}Idx: index().on(table.${idx}),`,
    );
    // Build composite index entries
    const compositeIdxLines = (table.compositeIndexes ?? []).map((cols) => {
      const idxName = `${cols.map(snakeToCamel).join('_')}Idx`;
      return `    ${idxName}: index().on(${cols.map((c) => `table.${c}`).join(', ')}),`;
    });
    const allIdxLines = [...singleIdxLines, ...compositeIdxLines];
    const indexDefs =
      allIdxLines.length > 0
        ? `,\n  (table) => ({\n${allIdxLines.join('\n')}\n  })`
        : '';

    schemaContent += `export const ${snakeToCamel(table.name)} = onchainTable(
  '${table.name}',
  (t) => ({
${table.columns.map((col) => `    ${col.name}: ${col.type},`).join('\n')}
  })${indexDefs}
);

`;
  }

  // Add export list
  schemaContent += `// Export all tables
export const tables = {
${allTables.map((t) => `  ${snakeToCamel(t.name)},`).join('\n')}
};
`;

  fs.writeFileSync(GENERATED_SCHEMA_FILE, schemaContent);

  // Generate ponder.schema.ts that re-exports generated-schema
  const ponderSchemaContent = `// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
//
// This file re-exports the auto-generated schema from generated-schema.ts
// Dumb indexer pattern: Store raw events, aggregate in repository layer.
// Regenerate with: npm run generate:indexer

// Import all generated tables
export * from './generated-schema';
`;

  fs.writeFileSync(
    path.join(INDEXER_DIR, 'ponder.schema.ts'),
    ponderSchemaContent,
  );

  console.log(
    `✓ Generated schema with ${aggregateTables.length} aggregate tables + ${eventTables.length} raw event tables`,
  );
}

// ============================================================================
// HANDLER GENERATION
// ============================================================================

// ============================================================================
// AGGREGATE HANDLER GENERATION (US-009)
// ============================================================================

/**
 * Generate the aggregates.generated.ts handler file.
 * Each event listed in EVENT_TO_AGGREGATE_MAPPING gets a ponder.on() listener
 * that writes to the appropriate aggregate table after the raw event insert.
 * We need to know which domain handles each event so we can emit the right
 * Ponder event key (Diamond:X vs ContractName:X).
 */
function generateAggregateHandlers(_facets: Map<string, FacetInfo>): void {
  // Aggregate writes are now inlined into domain handlers by generateHandlerStub().
  // Ponder 0.16 only allows ONE ponder.on() per event name across ALL handler files.
  // A separate aggregates.generated.ts with its own ponder.on() calls would create
  // duplicate registrations → BuildError at startup.
  //
  // This function emits an empty stub so the import in index.ts doesn't break.
  const content = `// Auto-generated aggregate handlers - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
//
// ⚠️  Aggregate writes are INLINED into domain handler files (bridge.generated.ts, etc.)
// to comply with Ponder 0.16 constraint: only one ponder.on() per event name is allowed.
// This file is intentionally empty.
`;

  const outFile = path.join(GENERATED_HANDLERS_DIR, 'aggregates.generated.ts');
  fs.writeFileSync(outFile, content);
  console.log(
    `✓ Generated aggregates.generated.ts (empty stub — aggregates inlined in domain handlers)`,
  );
}

function generateHandlerStub(domain: string, events: EventInfo[]): string {
  // Group events by facet for comments
  const eventsByFacet = new Map<string, EventInfo[]>();

  for (const event of events) {
    if (!eventsByFacet.has(event.facet)) {
      eventsByFacet.set(event.facet, []);
    }
    eventsByFacet.get(event.facet)!.push(event);
  }

  // Determine which aggregate tables are needed for events in this domain
  const aggTableImports = new Set<string>();
  for (const event of events) {
    const aggActions = EVENT_TO_AGGREGATE_MAPPING[event.name];
    if (aggActions) {
      for (const action of aggActions) {
        aggTableImports.add(snakeToCamel(action.table));
      }
    }
  }

  const hasAggregates = aggTableImports.size > 0;

  let content = `// Auto-generated handler for ${domain} domain
// Generated at: ${new Date().toISOString()}
//
// Inline aggregate writes: raw event insert + aggregate table upsert in ONE ponder.on() handler.
// This avoids the Ponder 0.16 restriction: only one ponder.on() per event name is allowed.
// Events from: ${Array.from(eventsByFacet.keys()).join(', ')}

import { ponder } from "ponder:registry";

// Import event tables from generated schema
`;

  // Collect all table imports
  const tableImports: string[] = [];

  for (const [, facetEvents] of eventsByFacet) {
    for (const event of facetEvents) {
      const prefix = EXTERNAL_CONTRACTS[event.facet]
        ? event.facet.toLowerCase()
        : 'diamond';
      const tableName = `${prefix}_${camelToSnake(event.name)}_events`;
      tableImports.push(snakeToCamel(tableName));
    }
  }

  const uniqueTableImports = Array.from(new Set(tableImports));

  if (hasAggregates) {
    // Import both raw event tables and aggregate tables in one statement
    const allImports = Array.from(
      new Set([...uniqueTableImports, ...aggTableImports]),
    );
    content += `import { ${allImports.join(', ')} } from "ponder:schema";\n`;
  } else {
    content += `import { ${uniqueTableImports.join(', ')} } from "ponder:schema";\n`;
  }

  content += `\n// Utility functions
const eventId = (txHash: string, logIndex: number) => \`\${txHash}-\${logIndex}\`;
`;

  // Reserved variable names that conflict with our generated code
  const reservedNames = new Set(['id', 'event', 'context', 'eventId', 'value']);

  for (const [facetName, facetEvents] of eventsByFacet) {
    content += `\n// =============================================================================
// ${facetName} Events
// =============================================================================

`;

    for (const event of facetEvents) {
      const destructureParts: string[] = [];
      const renamedInputs: Map<string, string> = new Map();

      for (const input of event.inputs) {
        if (reservedNames.has(input.name)) {
          const renamed = `arg_${input.name}`;
          destructureParts.push(`${input.name}: ${renamed}`);
          renamedInputs.set(input.name, renamed);
        } else {
          destructureParts.push(input.name);
          renamedInputs.set(input.name, input.name);
        }
      }

      const destructure = destructureParts.join(', ');

      const prefix = EXTERNAL_CONTRACTS[event.facet]
        ? event.facet.toLowerCase()
        : 'diamond';
      const tableName = `${prefix}_${camelToSnake(event.name)}_events`;
      const camelTable = snakeToCamel(tableName);

      const isExternalContract = !!EXTERNAL_CONTRACTS[event.facet];
      const eventKey = isExternalContract
        ? `${event.facet}:${event.name}`
        : `Diamond:${event.name}`;

      const reservedColumns = new Set([
        'id',
        'block_number',
        'block_timestamp',
        'transaction_hash',
      ]);

      const valueAssignments = event.inputs
        .map((i) => {
          const varName = renamedInputs.get(i.name)!;
          let colName = camelToSnake(i.name);
          if (reservedColumns.has(colName)) {
            colName = `event_${colName}`;
          }
          if (i.type.endsWith('[]')) {
            const serialized = `JSON.stringify(Array.from(${varName}), (_, v) => typeof v === 'bigint' ? v.toString() : v)`;
            return `    ${colName}: ${serialized},`;
          }
          const smallUintMatch = i.type.match(/^u?int(\d+)$/);
          if (smallUintMatch) {
            const bits = parseInt(smallUintMatch[1], 10);
            if (bits <= 48) {
              return `    ${colName}: BigInt(${varName}),`;
            }
          }
          return `    ${colName}: ${varName},`;
        })
        .join('\n');

      // Build inline aggregate code for this event (if any)
      const aggActions = EVENT_TO_AGGREGATE_MAPPING[event.name];
      let inlineAggCode = '';
      if (aggActions && aggActions.length > 0) {
        inlineAggCode += `\n  // Inline aggregate writes (inlined to avoid duplicate ponder.on() for same event)\n`;
        for (const action of aggActions) {
          const tableConst = snakeToCamel(action.table);
          const tableDef = AGGREGATE_TABLES[action.table];

          const valueLines: string[] = [];
          for (const [col, src] of Object.entries(action.mapping)) {
            let val: string;
            if (src.startsWith('$')) {
              val = src.slice(1);
            } else {
              val = renamedInputs.get(src) ?? src;
              const inputMeta = event.inputs.find((i) => i.name === src);
              if (inputMeta) {
                const smallUintMatch = inputMeta.type.match(/^u?int(\d+)$/);
                if (smallUintMatch) {
                  const bits = parseInt(smallUintMatch[1], 10);
                  if (bits <= 48) {
                    val = `BigInt(${val})`;
                  }
                }
              }
              const colDef = tableDef?.columns.find((c) => c.name === col);
              if (colDef?.ponderType === 't.integer()') {
                val = `Number(${val})`;
              }
            }
            valueLines.push(`    ${col}: ${val},`);
          }

          const idEntry = Object.entries(action.mapping).find(
            ([col]) => col === 'id',
          );
          const idValueExpr = idEntry
            ? idEntry[1].startsWith('$')
              ? idEntry[1].slice(1)
              : (renamedInputs.get(idEntry[1]) ?? idEntry[1])
            : 'undefined';

          if (action.action === 'insert') {
            inlineAggCode += `  await context.db.insert(${tableConst}).values({
${valueLines.join('\n')}
  }).onConflictDoNothing();
`;
          } else if (action.action === 'upsert') {
            const updateLines = valueLines.filter(
              (l) => !l.trim().startsWith('id:'),
            );
            inlineAggCode += `  await context.db
    .insert(${tableConst})
    .values({
${valueLines.join('\n')}
    })
    .onConflictDoUpdate({
${updateLines.join('\n')}
    });
`;
          } else {
            // update
            const setLines = valueLines.filter(
              (l) => !l.trim().startsWith('id:'),
            );
            inlineAggCode += `  await context.db
    .update(${tableConst}, { id: ${idValueExpr} })
    .set({
${setLines.join('\n')}
    });
`;
          }
        }
      }

      content += `/**
 * Handle ${event.name} event from ${facetName}
 * Signature: ${event.signature}
 * Hash: ${event.signatureHash}
 */
ponder.on('${eventKey}', async ({ event, context }) => {
  const { ${destructure} } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);

  // Raw event insert
  await context.db.insert(${camelTable}).values({
    id: id,
${valueAssignments}
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
${inlineAggCode}});

`;
    }
  }

  return content;
}

function generateHandlers(facets: Map<string, FacetInfo>): void {
  ensureDir(GENERATED_HANDLERS_DIR);

  // No manual handlers - all events are generated
  console.log('\n🔌 Generating handler stubs...');

  // Events to skip (common initialization/metadata events that aren't useful to index)
  const skipEvents = new Set([
    'Initialized',
    'OwnershipTransferStarted',
    'RoleGranted',
    'RoleRevoked',
    'DiamondCut',
    'OwnershipTransferred',
    'OwnershipTransferStarted',
  ]);

  // Track events by name to avoid duplicates (Ponder matches by name only)
  // But if same name has different signatures, we need to use full signature
  const processedEventNames = new Map<string, EventInfo>(); // name -> first event
  const processedSignatures = new Map<string, string>(); // signatureHash -> domain (first claim wins)
  const eventsByDomain = new Map<string, EventInfo[]>();

  for (const [facetName, config] of facets.entries()) {
    const facet = facets.get(facetName)!;

    for (const event of facet.events) {
      if (!shouldIndexEvent(event)) continue;

      // Check if this exact signature was already claimed by another facet
      const claimedDomain = processedSignatures.get(event.signatureHash);
      if (claimedDomain && claimedDomain !== config.domain) {
        console.log(
          `  Skipping ${event.name} in ${facetName} (already in ${claimedDomain})`,
        );
        continue;
      }

      // Check if we've seen this event name before
      const existing = processedEventNames.get(event.name);

      if (existing) {
        // Same name, different signature - use full signature for both
        existing.fullSignature = existing.signature;
        event.fullSignature = event.signature;
      } else {
        // First time seeing this event name
        processedEventNames.set(event.name, event);
      }

      // Claim this signature for this domain
      processedSignatures.set(event.signatureHash, config.domain);

      // Skip common skip events
      if (skipEvents.has(event.name)) continue;

      // Add to domain
      if (!eventsByDomain.has(config.domain)) {
        eventsByDomain.set(config.domain, []);
      }
      eventsByDomain.get(config.domain)!.push(event);
    }
  }

  // Generate handler file for each domain
  const generatedFiles = new Set<string>();
  for (const [domain, events] of eventsByDomain) {
    const fileName = `${domain}.generated.ts`;
    generatedFiles.add(fileName);

    const content = generateHandlerStub(domain, events);
    fs.writeFileSync(path.join(GENERATED_HANDLERS_DIR, fileName), content);
    console.log(`✓ Generated ${fileName} with ${events.length} event handlers`);
  }

  // Clean up old handler files that are no longer needed
  if (fs.existsSync(GENERATED_HANDLERS_DIR)) {
    for (const file of fs.readdirSync(GENERATED_HANDLERS_DIR)) {
      if (file.endsWith('.generated.ts') && !generatedFiles.has(file)) {
        fs.unlinkSync(path.join(GENERATED_HANDLERS_DIR, file));
        console.log(`🗑️  Removed obsolete ${file}`);
      }
    }
  }

  // Generate aggregate handlers (US-009)
  generateAggregateHandlers(facets);

  // Generate index file (US-010)
  const domains = Array.from(eventsByDomain.keys());
  const indexContent = `// Auto-generated handler index - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

${domains.map((d) => `import './${d}.generated';`).join('\n')}
import './aggregates.generated';

// Handler domains: ${domains.join(', ')}, aggregates
`;

  fs.writeFileSync(path.join(GENERATED_HANDLERS_DIR, 'index.ts'), indexContent);
}

// ============================================================================
// PONDER CONFIG GENERATION
// ============================================================================

// ============================================================================
// PONDER CONFIG GENERATION
// ============================================================================

// Mapping of external contract names to their chain-constants variable names
// This handles cases where the constant name doesn't match the contract name pattern
const EXTERNAL_CONTRACT_ADDRESS_MAPPING: Record<
  string,
  { addressConst: string; blockConst: string }
> = {
  AuraAsset: {
    addressConst: 'NEXT_PUBLIC_AURA_ASSET_ADDRESS',
    blockConst: 'AURA_ASSET_DEPLOY_BLOCK',
  },
};

function generatePonderConfig(facets: Map<string, FacetInfo>): void {
  // Get external contracts that exist in our facets map
  const externalFacets = Array.from(facets.values()).filter(
    (f) => EXTERNAL_CONTRACTS[f.name],
  );

  // Generate contract configurations for external contracts
  const externalContracts = externalFacets
    .map((facet) => {
      const mapping = EXTERNAL_CONTRACT_ADDRESS_MAPPING[facet.name];
      if (!mapping) {
        console.warn(
          `⚠️  No address mapping for external contract: ${facet.name}`,
        );
        return null;
      }
      return `    ${facet.name}: {
      chain: 'baseSepolias',
      abi: ${facet.name}ABI,
      address: ${mapping.addressConst} as \`0x\${string}\`,
      startBlock: ${mapping.blockConst},
    }`;
    })
    .filter(Boolean)
    .join(',\n');

  // Generate ABI imports for external contracts
  const abiImports = externalFacets
    .map((f) => `import { ${f.name}ABI } from './abis/generated/${f.name}';`)
    .join('\n');

  // Generate chain constant imports based on what external contracts we have
  const chainConstantImports: string[] = [
    'NEXT_PUBLIC_RPC_URL_84532',
    'NEXT_PUBLIC_RPC_URL_42161',
  ];
  for (const facet of externalFacets) {
    const mapping = EXTERNAL_CONTRACT_ADDRESS_MAPPING[facet.name];
    if (mapping) {
      chainConstantImports.push(mapping.addressConst);
      chainConstantImports.push(mapping.blockConst);
    }
  }

  const configContent = `// Auto-generated Ponder config - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

import { createConfig } from 'ponder';

// Import generated ABIs
import { DiamondABI } from './abis/generated';
${abiImports}

// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  ${chainConstantImports.join(',\n  ')},
} from './chain-constants';
import * as dotenv from 'dotenv';
dotenv.config();


export default createConfig({
  chains: {
    chain_${process.env.CHAIN_ID}: {
      id: Number(process.env.CHAIN_ID),
      rpc: process.env.PONDER_RPC_URL,
    },
  },
  contracts: {
    Diamond: {
    chain: 'chain_${process.env.CHAIN_ID}', 
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    }${externalContracts ? `,\n${externalContracts}` : ''}
  },
});
`;

  console.log(`>>>>>>>>>>>>>>>>>>>>>>>>${process.env.CHAIN_ID}`);

  fs.writeFileSync(
    path.join(INDEXER_DIR, 'ponder.config.generated.ts'),
    configContent,
  );
  console.log('✓ Generated ponder.config.generated.ts');
}

// ============================================================================
// QUERY TYPE GENERATION
// ============================================================================

const INFRASTRUCTURE_DIR = path.join(__dirname, '../infrastructure/shared');
const GENERATED_QUERIES_FILE = path.join(
  INFRASTRUCTURE_DIR,
  'generated-graphql-types.ts',
);

/**
 * Generate TypeScript types and query helpers from schema
 * This ensures type safety between GraphQL queries and Ponder schema
 */
function generateQueryTypes(facets: Map<string, FacetInfo>): void {
  const seenSignatures = new Set<string>();
  const eventTables: Array<{
    eventName: string;
    tableName: string;
    graphqlTableName: string;
    columns: Array<{ name: string; tsType: string; isIndexed: boolean }>;
  }> = [];

  // Collect all event tables
  for (const facet of facets.values()) {
    for (const event of facet.events) {
      if (!shouldIndexEvent(event)) continue;
      if (seenSignatures.has(event.signatureHash)) continue;
      seenSignatures.add(event.signatureHash);

      const prefix = EXTERNAL_CONTRACTS[event.facet]
        ? event.facet.toLowerCase()
        : 'diamond';
      const tableName = `${prefix}_${camelToSnake(event.name)}_events`;
      // Ponder GraphQL uses camelCase table name + 's' for pluralization
      const graphqlTableName = snakeToCamel(tableName) + 's';

      const columns: Array<{
        name: string;
        tsType: string;
        isIndexed: boolean;
      }> = [{ name: 'id', tsType: 'string', isIndexed: false }];

      const reservedColumns = new Set([
        'id',
        'block_number',
        'block_timestamp',
        'transaction_hash',
      ]);

      for (const input of event.inputs) {
        let colName = camelToSnake(input.name);
        if (reservedColumns.has(colName)) {
          colName = `event_${colName}`;
        }

        columns.push({
          name: colName,
          tsType: solidityTypeToGraphQLTsType(input.type),
          isIndexed: input.indexed || false,
        });
      }

      // Add metadata columns
      columns.push(
        { name: 'block_number', tsType: 'string', isIndexed: false },
        { name: 'block_timestamp', tsType: 'string', isIndexed: false },
        { name: 'transaction_hash', tsType: 'string', isIndexed: false },
      );

      eventTables.push({
        eventName: event.name,
        tableName,
        graphqlTableName,
        columns,
      });
    }
  }

  // Generate TypeScript file
  let content = `// Auto-generated GraphQL types - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
//
// This file provides type-safe GraphQL query helpers for Ponder tables.
// All table names and field names are derived from the schema generator.
// Regenerate with: npm run generate:indexer

// ============================================================================
// TABLE NAME CONSTANTS
// ============================================================================
// Use these constants in GraphQL queries to ensure correct table names

`;

  // Generate table name constants
  for (const table of eventTables) {
    const constName = `TABLE_${table.tableName.toUpperCase()}`;
    content += `export const ${constName} = '${table.graphqlTableName}' as const;\n`;
  }

  content += `
// All valid table names for validation
export const VALID_TABLE_NAMES = [
${eventTables.map((t) => `  '${t.graphqlTableName}',`).join('\n')}
] as const;

export type ValidTableName = typeof VALID_TABLE_NAMES[number];

// ============================================================================
// EVENT RESPONSE TYPES
// ============================================================================
// These types match the exact field names returned by Ponder GraphQL

`;

  // Generate response types for each event table
  for (const table of eventTables) {
    const typeName = `${snakeToCamel(table.tableName).replace(/Events$/, '')}Event`;
    content += `export interface ${typeName} {\n`;
    for (const col of table.columns) {
      content += `  ${col.name}: ${col.tsType};\n`;
    }
    content += `}\n\n`;
  }

  content += `// ============================================================================
// GRAPHQL RESPONSE WRAPPERS
// ============================================================================

export interface PonderPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface PonderItemsResponse<T> {
  items: T[];
  pageInfo?: PonderPageInfo;
}

`;

  // Generate response wrapper types
  for (const table of eventTables) {
    const typeName = `${snakeToCamel(table.tableName).replace(/Events$/, '')}Event`;
    const responseName = `${snakeToCamel(table.tableName).replace(/Events$/, '')}EventsResponse`;
    content += `export interface ${responseName} {\n`;
    content += `  ${table.graphqlTableName}: PonderItemsResponse<${typeName}>;\n`;
    content += `}\n\n`;
  }

  content += `// ============================================================================
// QUERY FIELD CONSTANTS
// ============================================================================
// Use these to build type-safe queries with correct field names

`;

  // Generate field constants for each table
  for (const table of eventTables) {
    const constName = `FIELDS_${table.tableName.toUpperCase()}`;
    content += `export const ${constName} = [\n`;
    for (const col of table.columns) {
      content += `  '${col.name}',\n`;
    }
    content += `] as const;\n\n`;
  }

  content += `// ============================================================================
// QUERY BUILDER HELPERS
// ============================================================================

/**
 * Validates that a GraphQL query string uses valid table names
 * Throws an error if an invalid table name is found
 */
export function validateQueryTableNames(query: string): void {
  // Extract table names from query (pattern: tableName( or tableName {)
  const tableNamePattern = /([a-zA-Z]+[a-zA-Z0-9]*(?:Eventss|ss))\\s*[({]/g;
  let match;
  
  while ((match = tableNamePattern.exec(query)) !== null) {
    const tableName = match[1];
    if (!VALID_TABLE_NAMES.includes(tableName as ValidTableName)) {
      throw new Error(
        \`Invalid GraphQL table name: "\${tableName}". \\n\` +
        \`Valid table names are: \${VALID_TABLE_NAMES.slice(0, 5).join(', ')}...\`
      );
    }
  }
}

/**
 * Type guard to check if a table name is valid
 */
export function isValidTableName(name: string): name is ValidTableName {
  return VALID_TABLE_NAMES.includes(name as ValidTableName);
}

/**
 * Get the correct GraphQL table name for an event
 */
export function getTableName(eventName: string): ValidTableName | undefined {
  const mapping: Record<string, ValidTableName> = {
${eventTables.map((t) => `    '${t.eventName}': '${t.graphqlTableName}',`).join('\n')}
  };
  return mapping[eventName];
}

// ============================================================================
// COLUMN NAME MAPPING
// ============================================================================
// Maps camelCase field names to snake_case column names

export const COLUMN_NAME_MAP: Record<string, string> = {
  // Common mappings
  orderId: 'order_id',
  baseToken: 'base_token',
  baseTokenId: 'base_token_id',
  quoteToken: 'quote_token',
  isBuy: 'is_buy',
  orderType: 'order_type',
  blockNumber: 'block_number',
  blockTimestamp: 'block_timestamp',
  transactionHash: 'transaction_hash',
  tradeId: 'trade_id',
  takerOrderId: 'taker_order_id',
  makerOrderId: 'maker_order_id',
  fillAmount: 'fill_amount',
  fillPrice: 'fill_price',
  remainingAmount: 'remaining_amount',
  cumulativeFilled: 'cumulative_filled',
  quoteAmount: 'quote_amount',
  takerFee: 'taker_fee',
  makerFee: 'maker_fee',
  takerIsBuy: 'taker_is_buy',
  marketId: 'market_id',
  nodeHash: 'node_hash',
  tokenId: 'token_id',
  assetClass: 'asset_class',
  className: 'class_name',
  classNameHash: 'class_name_hash',
  unifiedOrderId: 'unified_order_id',
  clobOrderId: 'clob_order_id',
  journeyId: 'journey_id',
  ausysOrderId: 'ausys_order_id',
  eventId: 'event_id',
};

/**
 * Convert camelCase field name to snake_case column name
 */
export function toColumnName(fieldName: string): string {
  return COLUMN_NAME_MAP[fieldName] || fieldName.replace(/[A-Z]/g, (letter) => \`_\${letter.toLowerCase()}\`);
}
`;

  ensureDir(INFRASTRUCTURE_DIR);
  fs.writeFileSync(GENERATED_QUERIES_FILE, content);
  console.log(
    `✓ Generated query types with ${eventTables.length} event tables`,
  );
}

/**
 * Convert Solidity type to TypeScript type for GraphQL responses
 * Note: BigInt comes back as string in GraphQL
 */
function solidityTypeToGraphQLTsType(type: string): string {
  if (type.startsWith('uint') || type.startsWith('int')) return 'string'; // BigInt serialized as string
  if (type === 'address') return 'string';
  if (type === 'bool') return 'boolean';
  if (type.startsWith('bytes')) return 'string';
  if (type === 'string') return 'string';
  if (type.endsWith('[]'))
    return `${solidityTypeToGraphQLTsType(type.slice(0, -2))}[]`;
  return 'string';
}

// ============================================================================
// FRONTEND DIAMOND ABI GENERATION
// ============================================================================

const FRONTEND_DIAMOND_ABI_PATH = path.join(
  __dirname,
  '../infrastructure/contracts/diamond-abi.generated.ts',
);

// Facets to include in the frontend Diamond ABI
const FRONTEND_FACETS = [
  'OrderRouterFacet',
  'CLOBFacet',
  'NodesFacet',
  'AuSysFacet',
  'DiamondLoupeFacet',
  'OwnershipFacet',
  'ERC1155ReceiverFacet',
];

function generateFrontendDiamondABI(): void {
  const combinedABI: AbiItem[] = [];
  const includedItems = new Set<string>();

  for (const facetName of FRONTEND_FACETS) {
    const abi = loadFacetArtifact(facetName);
    if (!abi) {
      console.warn(`  ⚠ Facet ${facetName} not found`);
      continue;
    }

    let added = 0;
    for (const item of abi) {
      if (item.type !== 'function' && item.type !== 'event') continue;

      const key = `${item.type}:${item.name}`;
      if (!includedItems.has(key)) {
        includedItems.add(key);
        combinedABI.push(item);
        added++;
      }
    }

    console.log(`  ✓ ${facetName}: ${added} items added`);
  }

  const content = `/**
 * Diamond Contract ABI - Auto-generated
 *
 * DO NOT EDIT THIS FILE DIRECTLY!
 * This file is generated from Hardhat artifacts.
 *
 * To regenerate:
 *   npx hardhat compile
 *   bun scripts/generate-indexer.ts
 *
 * Generated: ${new Date().toISOString()}
 * Facets: ${FRONTEND_FACETS.join(', ')}
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DIAMOND_ABI: any[] = ${JSON.stringify(combinedABI, null, 2)};
`;

  ensureDir(path.dirname(FRONTEND_DIAMOND_ABI_PATH));
  fs.writeFileSync(FRONTEND_DIAMOND_ABI_PATH, content);
  console.log(
    `\n✓ Generated frontend Diamond ABI with ${combinedABI.length} items`,
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('🔧 Smart Contract-First Indexer Generator\n');
  console.log('━'.repeat(60));

  // Step 1: Parse facets
  console.log('\n📖 Parsing facet artifacts...\n');
  const facets = parseFacets();

  if (facets.size === 0) {
    console.error('❌ No facets found. Run `npx hardhat compile` first.');
    process.exit(1);
  }

  // Step 2: Generate per-facet ABIs
  console.log('\n📝 Generating per-facet ABIs...\n');
  generatePerFacetAbis(facets);

  // Step 3: Generate schema
  console.log('\n📊 Generating Ponder schema...\n');
  generateSchema(facets);

  // Step 4: Generate handler stubs
  console.log('\n🔌 Generating handler stubs...\n');
  generateHandlers(facets);

  // Step 5: Generate Ponder config
  console.log('\n⚙️  Generating Ponder config...\n');
  generatePonderConfig(facets);

  // Step 6: Generate query types (NEW)
  console.log('\n🔍 Generating GraphQL query types...\n');
  generateQueryTypes(facets);

  // NOTE: Frontend Diamond ABI is now generated by gen-all.ts
  // This ensures all facets are included and avoids duplication
  // Run: npm run contract:gen (which calls gen-all.ts first)

  // Summary
  console.log('\n━'.repeat(60));
  console.log('✅ Generation complete!\n');

  let totalEvents = 0;
  for (const facet of facets.values()) {
    totalEvents += facet.events.length;
  }

  console.log(`   Facets:  ${facets.size}`);
  console.log(`   Events:  ${totalEvents}`);
  console.log(
    `   Domains: ${new Set(Array.from(facets.values()).map((f) => f.domain)).size}`,
  );
  console.log('\nGenerated files:');
  console.log('  - indexer/abis/generated/*.ts (per-facet ABIs)');
  console.log('  - indexer/generated-schema.ts (Ponder schema)');
  console.log('  - indexer/src/handlers/*.generated.ts (event handlers)');
  console.log(
    '  - infrastructure/shared/generated-graphql-types.ts (query types)',
  );
  console.log('\nNext steps:');
  console.log('  1. Review generated files');
  console.log('  2. Run tests: npm test');
  console.log('  3. Start indexer: cd indexer && npm run dev');
}

main().catch(console.error);
