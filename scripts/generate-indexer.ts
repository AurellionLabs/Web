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
import { keccak256, toBytes } from 'viem';

// ============================================================================
// CONFIGURATION
// ============================================================================

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
  StakingFacet: { domain: 'staking', priority: 6 },
  CLOBAdminFacet: { domain: 'clob-admin', priority: 7 },
  DiamondCutFacet: { domain: 'diamond', priority: 8 },
  OwnershipFacet: { domain: 'diamond', priority: 9 },
};

// External contracts (not facets) that emit events we want to index
const EXTERNAL_CONTRACTS: Record<
  string,
  { domain: string; artifactPath: string; priority: number }
> = {
  RWYVault: {
    domain: 'rwy-vault',
    artifactPath: 'RWYVault.sol/RWYVault.json',
    priority: 10,
  },
  AuraAsset: {
    domain: 'aura-asset',
    artifactPath: 'AuraAsset.sol/AuraAsset.json',
    priority: 11,
  },
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
    const events = [];
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

  // Parse external contracts (RWYVault, AuraAsset, etc.)
  for (const [contractName, config] of Object.entries(EXTERNAL_CONTRACTS)) {
    const abi = loadArtifact(contractName, config.artifactPath);
    if (!abi) continue;

    const allEvents = extractEvents(abi, contractName, config.domain);

    const seenSignatures = new Set<string>();
    const events = [];
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
}

function generateEventTable(event: EventInfo): SchemaTable {
  // Use signature hash prefix to avoid collisions when same event name has different signatures
  const shortHash = event.signatureHash.slice(2, 6); // First 4 bytes of hash
  const tableName = `${camelToSnake(event.name)}_${shortHash}_events`;
  const columns: SchemaTable['columns'] = [
    { name: 'id', type: 't.text().primaryKey()', primaryKey: true },
  ];
  const indexes: string[] = [];

  for (const input of event.inputs) {
    const colName = camelToSnake(input.name);
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

function generateEntityTables(): SchemaTable[] {
  // Dumb indexer pattern: No entity tables, only event tables
  // All state is derived from events at query time in repository layer
  return [];
}

function generateSchema(facets: Map<string, FacetInfo>): void {
  const eventTables: SchemaTable[] = [];
  const seenSignatures = new Set<string>();

  // Generate event tables (deduplicated by signature)
  for (const facet of facets.values()) {
    for (const event of facet.events) {
      if (seenSignatures.has(event.signatureHash)) continue;
      seenSignatures.add(event.signatureHash);
      eventTables.push(generateEventTable(event));
    }
  }

  // Get entity tables
  const entityTables = generateEntityTables();
  const allTables = [...entityTables, ...eventTables];

  // Generate schema file
  let schemaContent = `// Auto-generated Ponder Schema - DO NOT EDIT
// Generated at: ${new Date().toISOString()}
// 
// This schema is derived from Diamond facet events.
// Regenerate with: npm run generate:indexer

import { onchainTable, index } from '@ponder/core';

`;

  for (const table of allTables) {
    const indexDefs =
      table.indexes.length > 0
        ? `,\n  (table) => ({\n${table.indexes
            .map(
              (idx) => `    ${snakeToCamel(idx)}Idx: index().on(table.${idx}),`,
            )
            .join('\n')}\n  })`
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
    `✓ Generated schema with ${entityTables.length} entity tables + ${eventTables.length} event tables`,
  );
}

// ============================================================================
// HANDLER GENERATION
// ============================================================================

function generateHandlerStub(domain: string, events: EventInfo[]): string {
  const imports = new Set<string>();
  imports.add("import { ponder } from '@/generated';");

  // Group events by facet for comments
  const eventsByFacet = new Map<string, EventInfo[]>();

  for (const event of events) {
    if (!eventsByFacet.has(event.facet)) {
      eventsByFacet.set(event.facet, []);
    }
    eventsByFacet.get(event.facet)!.push(event);
  }

  let content = `// Auto-generated handler for ${domain} domain - Raw event storage only
// Generated at: ${new Date().toISOString()}
// 
// Dumb indexer pattern: Store raw events, aggregate in repository layer
// Events from: ${Array.from(eventsByFacet.keys()).join(', ')}

import { ponder } from "@/generated";

// Import event tables from generated schema
`;

  // Collect all table imports
  const tableImports: string[] = [];
  for (const [facetName, facetEvents] of eventsByFacet) {
    for (const event of facetEvents) {
      // Table names have hash suffix to handle duplicate event names
      const shortHash = event.signatureHash.slice(2, 6);
      const tableName = `${camelToSnake(event.name)}_${shortHash}_events`;
      tableImports.push(snakeToCamel(tableName));
    }
  }

  // Single import from generated schema
  content += `import { ${tableImports.join(', ')} } from "@/generated-schema";\n`;

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
      const paramTypes = event.inputs
        .map((i) => {
          const tsType = solidityTypeToTsType(i.type);
          return `${i.name}: ${tsType}`;
        })
        .join(', ');

      // Handle reserved names by renaming them in destructuring
      // e.g., { id } becomes { id: arg_id }
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

      // Table names have hash suffix to handle duplicate event names
      const shortHash = event.signatureHash.slice(2, 6);
      const tableName = `${camelToSnake(event.name)}_${shortHash}_events`;
      const camelTable = snakeToCamel(tableName);

      // Use contract name as prefix for all events
      // Diamond contract events use "Diamond:" prefix
      // External contracts (RWYVault, AuraAsset) use their contract name
      const contractName = event.facet;
      const isExternalContract = !!EXTERNAL_CONTRACTS[contractName];

      // Use unique event name for event key
      // Ponder only supports event names, not full signatures
      const eventKey = isExternalContract
        ? `${contractName}:${event.name}`
        : `Diamond:${event.name}`;

      // Generate the values object with proper column names
      // Column names use snake_case, variable names use the (possibly renamed) input names
      const valueAssignments = event.inputs
        .map((i) => {
          const varName = renamedInputs.get(i.name)!;
          return `    ${camelToSnake(i.name)}: ${varName},`;
        })
        .join('\n');

      content += `/**
 * Handle ${event.name} event from ${facetName}
 * Signature: ${event.signature}
 * Hash: ${event.signatureHash}
 */
ponder.on('${eventKey}', async ({ event, context }) => {
  const { ${destructure} } = event.args;
  const id = eventId(event.transaction.hash, event.log.logIndex);
  
  // Insert raw event into event table
  await context.db.insert(${camelTable}).values({
    id: id,
${valueAssignments}
    block_number: event.block.number,
    block_timestamp: BigInt(event.block.timestamp),
    transaction_hash: event.transaction.hash,
  });
});

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
  const eventsByDomain = new Map<string, EventInfo[]>();

  for (const [facetName, config] of facets.entries()) {
    const facet = facets.get(facetName)!;

    for (const event of facet.events) {
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

  // Generate index file
  const domains = Array.from(eventsByDomain.keys());
  const indexContent = `// Auto-generated handler index - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

${domains.map((d) => `import './${d}.generated';`).join('\n')}

// Handler domains: ${domains.join(', ')}
`;

  fs.writeFileSync(path.join(GENERATED_HANDLERS_DIR, 'index.ts'), indexContent);
}

// ============================================================================
// PONDER CONFIG GENERATION
// ============================================================================

// ============================================================================
// PONDER CONFIG GENERATION
// ============================================================================

function generatePonderConfig(facets: Map<string, FacetInfo>): void {
  // Generate contract configurations for external contracts
  const externalContracts = Array.from(facets.values())
    .filter((f) => EXTERNAL_CONTRACTS[f.name])
    .map((facet) => {
      const config = EXTERNAL_CONTRACTS[facet.name];
      const addressConstant = `NEXT_PUBLIC_${facet.name.toUpperCase()}_ADDRESS`;
      const startBlockConstant = `${facet.name.toUpperCase()}_DEPLOY_BLOCK`;
      return `    ${facet.name}: {
      network: 'baseSepolia',
      abi: ${facet.name}ABI,
      address: ${addressConstant} as \`0x\${string}\`,
      startBlock: ${startBlockConstant},
    }`;
    })
    .join(',\n');

  const configContent = `// Auto-generated Ponder config - DO NOT EDIT
// Generated at: ${new Date().toISOString()}

import { createConfig } from '@ponder/core';
import { http } from 'viem';

// Import generated ABIs
import { DiamondABI } from './abis/generated';
${Array.from(facets.values())
  .filter((f) => EXTERNAL_CONTRACTS[f.name])
  .map((f) => `import { ${f.name}ABI } from './abis/generated/${f.name}';`)
  .join('\n')}

// Import chain constants
import { DIAMOND_ADDRESS, DIAMOND_DEPLOY_BLOCK } from './diamond-constants';
import {
  NEXT_PUBLIC_RPC_URL_84532,
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_RWY_VAULT_ADDRESS,
  AURA_ASSET_DEPLOY_BLOCK,
  RWY_VAULT_DEPLOY_BLOCK,
} from './chain-constants';

const BASE_SEPOLIA_CHAIN_ID = 84532;

export default createConfig({
  networks: {
    baseSepolia: {
      chainId: BASE_SEPOLIA_CHAIN_ID,
      transport: http(NEXT_PUBLIC_RPC_URL_84532),
    },
  },
  contracts: {
    Diamond: {
      network: 'baseSepolia',
      abi: DiamondABI,
      address: DIAMOND_ADDRESS,
      startBlock: DIAMOND_DEPLOY_BLOCK,
    }${externalContracts ? `,\n${externalContracts}` : ''}
  },
});
`;

  fs.writeFileSync(
    path.join(INDEXER_DIR, 'ponder.config.generated.ts'),
    configContent,
  );
  console.log('✓ Generated ponder.config.generated.ts');
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
  console.log('\nNext steps:');
  console.log('  1. Review generated files in indexer/');
  console.log('  2. Implement handler logic in src/handlers/*.generated.ts');
  console.log('  3. Run tests: cd indexer && npm test');
  console.log('  4. Start indexer: cd indexer && npm run dev');
}

main().catch(console.error);
