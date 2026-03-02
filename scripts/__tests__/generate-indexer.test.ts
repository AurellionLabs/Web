/**
 * Generator Unit Tests
 *
 * Tests for the indexer generator to ensure correct code generation:
 * - Reserved variable name handling
 * - Primary key column naming
 * - Virtual module imports
 * - Column name mapping
 *
 * @author Staff Engineer Implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { keccak256, toBytes } from 'viem';

// ============================================================================
// TYPES (mirrored from generator)
// ============================================================================

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
}

interface EventInfo {
  name: string;
  facet: string;
  domain: string;
  signature: string;
  signatureHash: string;
  fullSignature?: string;
  inputs: AbiInput[];
  abi: any;
}

// ============================================================================
// UTILITY FUNCTIONS (mirrored from generator)
// ============================================================================

function computeSignatureHash(signature: string): string {
  const hash = keccak256(toBytes(signature));
  return hash.slice(0, 10);
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
// GENERATOR FUNCTION (extracted for testing)
// ============================================================================

const RESERVED_NAMES = new Set(['id', 'event', 'context', 'eventId', 'value']);

function generateHandlerStub(domain: string, events: EventInfo[]): string {
  const eventsByFacet = new Map<string, EventInfo[]>();

  for (const event of events) {
    if (!eventsByFacet.has(event.facet)) {
      eventsByFacet.set(event.facet, []);
    }
    eventsByFacet.get(event.facet)!.push(event);
  }

  const tableImports: string[] = [];
  for (const [facetName, facetEvents] of eventsByFacet) {
    for (const event of facetEvents) {
      const shortHash = event.signatureHash.slice(2, 6);
      const tableName = `${camelToSnake(event.name)}_${shortHash}_events`;
      tableImports.push(snakeToCamel(tableName));
    }
  }

  let content = `// Auto-generated handler for ${domain} domain
// Generated at: ${new Date().toISOString()}

import { ponder } from "@/generated";
import { ${tableImports.join(', ')} } from "@/generated-schema";

const eventId = (txHash: string, logIndex: number) => \`\${txHash}-\${logIndex}\`;
`;

  for (const [facetName, facetEvents] of eventsByFacet) {
    content += `\n// =============================================================================
// ${facetName} Events
// =============================================================================

`;

    for (const event of facetEvents) {
      const destructureParts: string[] = [];
      const renamedInputs: Map<string, string> = new Map();

      for (const input of event.inputs) {
        if (RESERVED_NAMES.has(input.name)) {
          const renamed = `arg_${input.name}`;
          destructureParts.push(`${input.name}: ${renamed}`);
          renamedInputs.set(input.name, renamed);
        } else {
          destructureParts.push(input.name);
          renamedInputs.set(input.name, input.name);
        }
      }

      const destructure = destructureParts.join(', ');

      const shortHash = event.signatureHash.slice(2, 6);
      const tableName = `${camelToSnake(event.name)}_${shortHash}_events`;
      const camelTable = snakeToCamel(tableName);

      const isExternalContract = ![
        'NodesFacet',
        'CLOBFacetV2',
        'OrderMatchingFacet',
        'OrderRouterFacet',
        'BridgeFacet',
        'StakingFacet',
        'CLOBAdminFacet',
        'DiamondCutFacet',
        'OwnershipFacet',
      ].includes(event.facet);

      const eventKey = isExternalContract
        ? `${event.facet}:${event.name}`
        : `Diamond:${event.name}`;

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

// ============================================================================
// TESTS: Reserved Variable Names
// ============================================================================

describe('Generator - Reserved Variable Names', () => {
  it('should rename "id" parameter to avoid collision with event ID', () => {
    const event: EventInfo = {
      name: 'TransferSingle',
      facet: 'AuraAsset',
      domain: 'aura-asset',
      signature: 'TransferSingle(address,address,address,uint256,uint256)',
      signatureHash: '0xc3d58168',
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'id', type: 'uint256' },
        { name: 'value', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'TransferSingle', inputs: [] },
    };

    const handler = generateHandlerStub('aura-asset', [event]);

    expect(handler).toContain('id: arg_id');
    expect(handler).toContain('value: arg_value');
    expect(handler).not.toContain(/\bid:\s*id\b/);
  });

  it('should rename "value" parameter if present', () => {
    const event: EventInfo = {
      name: 'TransferSingle',
      facet: 'AuraAsset',
      domain: 'aura-asset',
      signature: 'TransferSingle(address,address,address,uint256,uint256)',
      signatureHash: '0xc3d58168',
      inputs: [
        { name: 'operator', type: 'address' },
        { name: 'value', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'TransferSingle', inputs: [] },
    };

    const handler = generateHandlerStub('aura-asset', [event]);

    expect(handler).toContain('value: arg_value');
    expect(handler).not.toMatch(/\bvalue:\s*value\b/);
  });

  it('should not rename non-reserved parameters', () => {
    const event: EventInfo = {
      name: 'OrderCreated',
      facet: 'CLOBFacetV2',
      domain: 'clob',
      signature: 'OrderCreated(bytes32,address,uint256)',
      signatureHash: '0x43fe20c0',
      inputs: [
        { name: 'orderId', type: 'bytes32' },
        { name: 'maker', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'OrderCreated', inputs: [] },
    };

    const handler = generateHandlerStub('clob', [event]);

    expect(handler).toContain('order_id: orderId');
    expect(handler).toContain('maker: maker');
    expect(handler).toContain('amount: amount');
  });
});

// ============================================================================
// TESTS: Primary Key Column
// ============================================================================

describe('Generator - Primary Key Column', () => {
  it('should use "id: id" for primary key, not bare "id"', () => {
    const event: EventInfo = {
      name: 'TestEvent',
      facet: 'TestFacet',
      domain: 'test',
      signature: 'TestEvent()',
      signatureHash: '0x12345678',
      inputs: [],
      abi: { type: 'event', name: 'TestEvent', inputs: [] },
    };

    const handler = generateHandlerStub('test', [event]);

    expect(handler).toMatch(/id:\s*id,/);
    expect(handler).not.toMatch(/^id,$/m);
  });

  it('should generate unique event ID from txHash and logIndex', () => {
    const event: EventInfo = {
      name: 'TestEvent',
      facet: 'TestFacet',
      domain: 'test',
      signature: 'TestEvent()',
      signatureHash: '0x12345678',
      inputs: [],
      abi: { type: 'event', name: 'TestEvent', inputs: [] },
    };

    const handler = generateHandlerStub('test', [event]);

    expect(handler).toContain(
      'const id = eventId(event.transaction.hash, event.log.logIndex)',
    );
  });
});

// ============================================================================
// TESTS: Virtual Module Imports
// ============================================================================

describe('Generator - Virtual Module Imports', () => {
  it('should use ponder:registry import', () => {
    const event: EventInfo = {
      name: 'TestEvent',
      facet: 'TestFacet',
      domain: 'test',
      signature: 'TestEvent()',
      signatureHash: '0x12345678',
      inputs: [],
      abi: { type: 'event', name: 'TestEvent', inputs: [] },
    };

    const handler = generateHandlerStub('test', [event]);

    expect(handler).toContain("import { ponder } from 'ponder:registry';");
  });

  it('should use ponder:schema import for tables', () => {
    const event: EventInfo = {
      name: 'OrderCreated',
      facet: 'CLOBFacetV2',
      domain: 'clob',
      signature: 'OrderCreated(bytes32,address,uint256)',
      signatureHash: '0x43fe20c0',
      inputs: [
        { name: 'orderId', type: 'bytes32' },
        { name: 'maker', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'OrderCreated', inputs: [] },
    };

    const handler = generateHandlerStub('clob', [event]);

    expect(handler).toContain(
      "import { orderCreated_43feEvents } from 'ponder:schema';",
    );
  });
});

// ============================================================================
// TESTS: Column Name Mapping
// ============================================================================

describe('Generator - Column Name Mapping', () => {
  it('should convert camelCase to snake_case for column names', () => {
    const event: EventInfo = {
      name: 'OrderCreated',
      facet: 'CLOBFacetV2',
      domain: 'clob',
      signature: 'OrderCreated(bytes32,address,uint256)',
      signatureHash: '0x43fe20c0',
      inputs: [
        { name: 'orderId', type: 'bytes32' },
        { name: 'maker', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'OrderCreated', inputs: [] },
    };

    const handler = generateHandlerStub('clob', [event]);

    expect(handler).toContain('order_id: orderId');
    expect(handler).toContain('maker: maker');
    expect(handler).toContain('amount: amount');
  });

  it('should handle indexed parameters', () => {
    const event: EventInfo = {
      name: 'TransferSingle',
      facet: 'AuraAsset',
      domain: 'aura-asset',
      signature: 'TransferSingle(address,address,address,uint256,uint256)',
      signatureHash: '0xc3d58168',
      inputs: [
        { name: 'operator', type: 'address', indexed: true },
        { name: 'from', type: 'address', indexed: true },
        { name: 'to', type: 'address', indexed: true },
        { name: 'id', type: 'uint256' },
        { name: 'value', type: 'uint256' },
      ],
      abi: { type: 'event', name: 'TransferSingle', inputs: [] },
    };

    const handler = generateHandlerStub('aura-asset', [event]);

    expect(handler).toContain('operator: operator');
    expect(handler).toContain('from: from');
    expect(handler).toContain('to: to');
    expect(handler).toContain('id: arg_id');
    expect(handler).toContain('value: arg_value');
  });
});

// ============================================================================
// TESTS: Event Key Generation
// ============================================================================

describe('Generator - Event Key Generation', () => {
  it('should use Diamond: prefix for Diamond contract events', () => {
    const event: EventInfo = {
      name: 'OrderCreated',
      facet: 'CLOBFacetV2',
      domain: 'clob',
      signature: 'OrderCreated(bytes32,address,uint256)',
      signatureHash: '0x43fe20c0',
      inputs: [],
      abi: { type: 'event', name: 'OrderCreated', inputs: [] },
    };

    const handler = generateHandlerStub('clob', [event]);

    expect(handler).toContain("ponder.on('Diamond:OrderCreated'");
  });

  it('should use contract name prefix for external contract events', () => {
    const event: EventInfo = {
      name: 'TransferSingle',
      facet: 'AuraAsset',
      domain: 'aura-asset',
      signature: 'TransferSingle(address,address,address,uint256,uint256)',
      signatureHash: '0xc3d58168',
      inputs: [],
      abi: { type: 'event', name: 'TransferSingle', inputs: [] },
    };

    const handler = generateHandlerStub('aura-asset', [event]);

    expect(handler).toContain("ponder.on('AuraAsset:TransferSingle'");
  });
});

// ============================================================================
// TESTS: Metadata Columns
// ============================================================================

describe('Generator - Metadata Columns', () => {
  it('should include block_number, block_timestamp, and transaction_hash', () => {
    const event: EventInfo = {
      name: 'TestEvent',
      facet: 'TestFacet',
      domain: 'test',
      signature: 'TestEvent()',
      signatureHash: '0x12345678',
      inputs: [],
      abi: { type: 'event', name: 'TestEvent', inputs: [] },
    };

    const handler = generateHandlerStub('test', [event]);

    expect(handler).toContain('block_number: event.block.number');
    expect(handler).toContain('block_timestamp: BigInt(event.block.timestamp)');
    expect(handler).toContain('transaction_hash: event.transaction.hash');
  });
});
