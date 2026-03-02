/**
 * GraphQL Query Validation Tests
 *
 * These tests validate that all GraphQL queries in the codebase
 * use correct table names and field names that match the Ponder schema.
 *
 * This prevents production errors like:
 * "Cannot query field 'clobOrderss' on type 'Query'"
 */

import { describe, it, expect } from 'vitest';
import {
  VALID_TABLE_NAMES,
  validateQueryTableNames,
} from '@/infrastructure/shared/generated-graphql-types';

// Import all query files to validate
import * as repoQueries from '@/infrastructure/repositories/shared/graph-queries';
import * as sharedQueries from '@/infrastructure/shared/graph-queries';
import { DocumentNode, print } from 'graphql';

/**
 * Helper to extract query string from gql template literal result
 * graphql-request's gql tag returns strings, not DocumentNodes
 */
function getQueryString(query: unknown): string {
  if (!query) return '';

  // Handle string (graphql-request gql returns strings)
  if (typeof query === 'string') {
    return query;
  }

  // Handle graphql DocumentNode (in case we switch to graphql-tag)
  if (typeof query === 'object' && 'kind' in (query as DocumentNode)) {
    return print(query as DocumentNode);
  }

  return '';
}

/**
 * Check if a value is a GraphQL query
 * graphql-request's gql tag returns strings, so we check for string type
 */
function isGraphQLQuery(value: unknown): boolean {
  // graphql-request gql returns strings
  if (typeof value === 'string' && value.includes('query ')) {
    return true;
  }

  // Also support DocumentNode from graphql-tag
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in (value as DocumentNode) &&
    (value as DocumentNode).kind === 'Document'
  );
}

/**
 * Extract table names from a GraphQL query string
 * Matches Ponder table patterns like: diamondOrderPlacedWithTokensEventss(
 * All Ponder event tables start with "diamond" prefix
 */
function extractTableNames(queryString: string): string[] {
  // Ponder table names for Diamond events start with "diamond" and end in 'ss'
  // They appear in query context as: tableName( or tableName {
  // Pattern: diamond followed by CamelCase event name, ending in ss
  const tableNamePattern = /(diamond[A-Z][a-zA-Z0-9]*ss)\s*[({]/g;
  let match;
  const foundTables: string[] = [];

  while ((match = tableNamePattern.exec(queryString)) !== null) {
    foundTables.push(match[1]);
  }

  return foundTables;
}

describe('GraphQL Query Validation', () => {
  describe('Valid Table Names', () => {
    it('should have generated valid table names from schema', () => {
      expect(VALID_TABLE_NAMES.length).toBeGreaterThan(0);

      // Verify table names follow Ponder convention (camelCase + double 's')
      for (const tableName of VALID_TABLE_NAMES) {
        expect(tableName).toMatch(/^[a-z][a-zA-Z0-9]*ss$/);
      }
    });

    it('should include core event tables', () => {
      // Verify key tables we use in queries exist
      const coreTables = [
        'diamondOrderPlacedWithTokensEventss',
        'diamondCLOBOrderFilledEventss',
        'diamondCLOBOrderCancelledEventss',
        'diamondCLOBTradeExecutedEventss',
        'diamondNodeRegisteredEventss',
        'diamondTransferSingleEventss',
        'diamondMintedAssetEventss',
        'diamondSupportedAssetAddedEventss',
        'diamondSupportedClassAddedEventss',
        'diamondOpportunityCreatedEventss',
      ];

      for (const table of coreTables) {
        expect(
          VALID_TABLE_NAMES.includes(
            table as (typeof VALID_TABLE_NAMES)[number],
          ),
          `Missing core table: ${table}`,
        ).toBe(true);
      }
    });
  });

  describe('Repository Query Validation (infrastructure/repositories/shared/graph-queries.ts)', () => {
    // Filter for GraphQL DocumentNode exports (gql template results)
    const queryExports = Object.entries(repoQueries).filter(
      ([key, value]) => key.startsWith('GET_') && isGraphQLQuery(value),
    );

    it('should have queries to validate', () => {
      expect(queryExports.length).toBeGreaterThan(0);
    });

    // Test each exported query
    for (const [queryName, queryObj] of queryExports) {
      it(`${queryName} should use valid table names`, () => {
        const queryString = getQueryString(queryObj);
        const foundTables = extractTableNames(queryString);

        // Validate each found table name
        for (const tableName of foundTables) {
          expect(
            VALID_TABLE_NAMES.includes(
              tableName as (typeof VALID_TABLE_NAMES)[number],
            ),
            `Query "${queryName}" uses invalid table name: "${tableName}"`,
          ).toBe(true);
        }
      });
    }
  });

  describe('Shared Query Validation (infrastructure/shared/graph-queries.ts)', () => {
    // Filter for GraphQL DocumentNode exports (gql template results)
    const queryExports = Object.entries(sharedQueries).filter(
      ([key, value]) => key.startsWith('GET_') && isGraphQLQuery(value),
    );

    it('should have queries to validate', () => {
      expect(queryExports.length).toBeGreaterThan(0);
    });

    // Test each exported query
    for (const [queryName, queryObj] of queryExports) {
      it(`${queryName} should use valid table names`, () => {
        const queryString = getQueryString(queryObj);
        const foundTables = extractTableNames(queryString);

        for (const tableName of foundTables) {
          expect(
            VALID_TABLE_NAMES.includes(
              tableName as (typeof VALID_TABLE_NAMES)[number],
            ),
            `Query "${queryName}" uses invalid table name: "${tableName}"`,
          ).toBe(true);
        }
      });
    }
  });

  describe('validateQueryTableNames helper', () => {
    it('should pass for valid queries', () => {
      const validQuery = `
        query GetOrders {
          diamondOrderPlacedWithTokensEventss(limit: 100) {
            items { id }
          }
        }
      `;

      expect(() => validateQueryTableNames(validQuery)).not.toThrow();
    });

    it('should throw for invalid table names', () => {
      const invalidQuery = `
        query GetOrders {
          clobOrderss(limit: 100) {
            items { id }
          }
        }
      `;

      expect(() => validateQueryTableNames(invalidQuery)).toThrow(
        /Invalid GraphQL table name/,
      );
    });

    it('should throw for old aggregate table names', () => {
      const oldQuery = `
        query GetNodes {
          nodess(limit: 100) {
            items { id }
          }
        }
      `;

      expect(() => validateQueryTableNames(oldQuery)).toThrow(
        /Invalid GraphQL table name/,
      );
    });
  });

  describe('Field Name Validation (snake_case)', () => {
    it('should use snake_case field names in queries', () => {
      // Get all query strings from both files
      const allQueries = [
        ...Object.entries(repoQueries),
        ...Object.entries(sharedQueries),
      ]
        .filter(
          ([key, value]) => key.startsWith('GET_') && isGraphQLQuery(value),
        )
        .map(([name, queryObj]) => ({
          name,
          query: getQueryString(queryObj),
        }));

      // Common camelCase fields that should be snake_case
      const wrongFieldPatterns = [
        { wrong: /\borderId\b/, correct: 'order_id' },
        { wrong: /\bbaseToken\b/, correct: 'base_token' },
        { wrong: /\bbaseTokenId\b/, correct: 'base_token_id' },
        { wrong: /\bquoteToken\b/, correct: 'quote_token' },
        { wrong: /\bisBuy\b/, correct: 'is_buy' },
        { wrong: /\borderType\b/, correct: 'order_type' },
        { wrong: /\bblockNumber\b/, correct: 'block_number' },
        { wrong: /\bblockTimestamp\b/, correct: 'block_timestamp' },
        { wrong: /\btransactionHash\b/, correct: 'transaction_hash' },
        { wrong: /\btradeId\b/, correct: 'trade_id' },
        { wrong: /\btakerOrderId\b/, correct: 'taker_order_id' },
        { wrong: /\bmakerOrderId\b/, correct: 'maker_order_id' },
        { wrong: /\bfillAmount\b/, correct: 'fill_amount' },
        { wrong: /\bfillPrice\b/, correct: 'fill_price' },
        { wrong: /\bremainingAmount\b/, correct: 'remaining_amount' },
        { wrong: /\bcumulativeFilled\b/, correct: 'cumulative_filled' },
        { wrong: /\bnodeHash\b/, correct: 'node_hash' },
        { wrong: /\btokenId\b/, correct: 'token_id' },
        { wrong: /\bassetClass\b/, correct: 'asset_class' },
        { wrong: /\bclassName\b/, correct: 'class_name' },
      ];

      const errors: string[] = [];

      for (const { name, query } of allQueries) {
        for (const { wrong, correct } of wrongFieldPatterns) {
          // Skip if the field is in a variable definition (e.g., $orderId)
          // or in orderBy/where clauses as string values
          const cleanQuery = query
            .replace(/\$\w+/g, '') // Remove variables
            .replace(/"[^"]*"/g, ''); // Remove string literals

          if (wrong.test(cleanQuery)) {
            errors.push(
              `${name}: uses "${wrong.source}" instead of "${correct}"`,
            );
          }
        }
      }

      expect(errors, errors.join('\n')).toEqual([]);
    });
  });

  describe('No Legacy Table Names', () => {
    it('should not use old aggregate table names', () => {
      const allQueries = [
        ...Object.entries(repoQueries),
        ...Object.entries(sharedQueries),
      ]
        .filter(
          ([key, value]) => key.startsWith('GET_') && isGraphQLQuery(value),
        )
        .map(([name, queryObj]) => ({
          name,
          query: getQueryString(queryObj),
        }));

      // Old aggregate table names that should no longer be used
      const legacyTables = [
        'clobOrderss',
        'clobTradess',
        'nodess',
        'journeyss',
        'transferEventss',
        'mintedAssetEventss',
        'nodeAssetss',
        'supportedClassess',
        'operationss',
      ];

      const errors: string[] = [];

      for (const { name, query } of allQueries) {
        for (const legacyTable of legacyTables) {
          const pattern = new RegExp(`\\b${legacyTable}\\s*[({]`);
          if (pattern.test(query)) {
            errors.push(`${name}: uses legacy table "${legacyTable}"`);
          }
        }
      }

      expect(errors, errors.join('\n')).toEqual([]);
    });
  });
});
