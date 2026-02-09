/**
 * Chain Constants Validation
 *
 * Ensures chain-constants.ts files:
 * - Use process.env for RPC URLs (not hardcoded)
 * - Have valid Ethereum address format for contract addresses
 * - Don't contain API keys or secrets
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../');

describe('Chain Constants Validation', () => {
  const rootConstants = path.join(ROOT, 'chain-constants.ts');
  const indexerConstants = path.join(ROOT, 'indexer/chain-constants.ts');

  describe('root chain-constants.ts', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(rootConstants, 'utf-8');
    });

    it('should exist', () => {
      expect(fs.existsSync(rootConstants)).toBe(true);
    });

    it('should use process.env for all RPC URLs', () => {
      // Match multi-line exports: "export const NEXT_PUBLIC_RPC_URL_XXX =\n  value;"
      const rpcExports = content.match(
        /export const NEXT_PUBLIC_RPC_URL_\d+[\s\S]*?;/g,
      );

      expect(rpcExports).not.toBeNull();
      expect(rpcExports!.length).toBeGreaterThan(0);

      for (const block of rpcExports!) {
        expect(block).toContain('process.env');
        // Should NOT have a hardcoded URL
        expect(block).not.toMatch(/https?:\/\/[a-z]/i);
      }
    });

    it('should have valid Ethereum addresses (0x + 40 hex chars)', () => {
      // Find all exported address constants
      const addressExports = content.matchAll(
        /export const (\w+_ADDRESS)\s*=\s*['"]([^'"]+)['"]/g,
      );

      let count = 0;
      for (const match of addressExports) {
        const [, name, value] = match;
        count++;

        // Should be a valid Ethereum address or empty/process.env
        if (value && value !== '') {
          expect(value).toMatch(/^0x[a-fA-F0-9]{40}$/);
        }
      }

      // We should have at least some address constants
      expect(count).toBeGreaterThan(0);
    });

    it('should not contain Infura/Alchemy API keys', () => {
      expect(content).not.toMatch(/infura\.io\/v3\/[a-f0-9]{32}/i);
      expect(content).not.toMatch(/alchemy\.com\/v2\/[a-zA-Z0-9_-]{32}/i);
    });
  });

  describe('indexer/chain-constants.ts', () => {
    let content: string;

    beforeAll(() => {
      content = fs.readFileSync(indexerConstants, 'utf-8');
    });

    it('should exist', () => {
      expect(fs.existsSync(indexerConstants)).toBe(true);
    });

    it('should use process.env for all RPC URLs', () => {
      const rpcExports = content.match(
        /export const NEXT_PUBLIC_RPC_URL_\d+[\s\S]*?;/g,
      );

      expect(rpcExports).not.toBeNull();
      expect(rpcExports!.length).toBeGreaterThan(0);

      for (const block of rpcExports!) {
        expect(block).toContain('process.env');
        expect(block).not.toMatch(/https?:\/\/[a-z]/i);
      }
    });

    it('should not contain Infura/Alchemy API keys', () => {
      expect(content).not.toMatch(/infura\.io\/v3\/[a-f0-9]{32}/i);
      expect(content).not.toMatch(/alchemy\.com\/v2\/[a-zA-Z0-9_-]{32}/i);
    });

    it('should have INDEXER_URL defined', () => {
      expect(content).toMatch(/NEXT_PUBLIC_INDEXER_URL/);
    });
  });

  describe('consistency between root and indexer chain-constants', () => {
    it('should export the same contract address constants', () => {
      const rootContent = fs.readFileSync(rootConstants, 'utf-8');
      const indexerContent = fs.readFileSync(indexerConstants, 'utf-8');

      // Extract all exported address constants from root
      const rootAddresses = [
        ...rootContent.matchAll(/export const (NEXT_PUBLIC_\w+_ADDRESS)/g),
      ].map((m) => m[1]);

      // Check key addresses exist in both
      const criticalAddresses = rootAddresses.filter(
        (addr) =>
          addr.includes('DIAMOND') ||
          addr.includes('AURA_ASSET') ||
          addr.includes('AURA_TOKEN'),
      );

      for (const addr of criticalAddresses) {
        expect(indexerContent).toContain(addr);
      }
    });
  });
});
