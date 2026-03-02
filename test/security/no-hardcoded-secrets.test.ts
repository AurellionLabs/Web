/**
 * Security: No Hardcoded Secrets
 *
 * Scans committed source files for hardcoded API keys, RPC URLs with keys,
 * and other secrets that should only live in .env files.
 *
 * This test exists because we shipped Infura API keys in chain-constants.ts
 * and 9 other files for weeks before catching it manually.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../');

/** Recursively collect files matching extensions, skipping ignored dirs */
function collectFiles(
  dir: string,
  extensions: string[],
  ignore: string[] = [],
): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relative = path.relative(ROOT, fullPath);

    if (ignore.some((ig) => relative.startsWith(ig) || entry.name === ig)) {
      continue;
    }

    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, extensions, ignore));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.cjs'];
const IGNORED_DIRS = [
  'node_modules',
  '.next',
  '.git',
  'out',
  'artifacts',
  'cache',
  'typechain-types',
  'coverage',
  'test', // Don't scan test files themselves
  '__tests__',
  'e2e',
];

// Patterns that indicate hardcoded secrets
const SECRET_PATTERNS = [
  {
    name: 'Infura API key in URL',
    pattern: /infura\.io\/v3\/[a-f0-9]{32}/gi,
  },
  {
    name: 'Alchemy API key in URL',
    pattern: /alchemy\.com\/v2\/[a-zA-Z0-9_-]{32}/gi,
  },
  {
    name: 'Generic API key pattern (32+ hex chars as string literal)',
    // Matches: 'abc123...' where the string is 32+ hex chars, in quotes
    pattern: /['"`][a-f0-9]{32,}['"`]/gi,
    // Allow known safe patterns (contract addresses start with 0x)
    exclude: /0x[a-fA-F0-9]{40}/,
  },
];

describe('No Hardcoded Secrets', () => {
  const sourceFiles = collectFiles(ROOT, SOURCE_EXTENSIONS, IGNORED_DIRS);

  it('should find source files to scan', () => {
    expect(sourceFiles.length).toBeGreaterThan(10);
  });

  it('should not contain hardcoded Infura URLs', () => {
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const matches = line.match(/infura\.io\/v3\/[a-f0-9]{32}/gi);
        if (matches) {
          violations.push({
            file: path.relative(ROOT, filePath),
            line: idx + 1,
            match: matches[0],
          });
        }
      });
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} hardcoded Infura URL(s):\n${report}\n\nMove API keys to .env and use process.env.NEXT_PUBLIC_RPC_URL_*`,
      );
    }
  });

  it('should not contain hardcoded Alchemy URLs', () => {
    const violations: { file: string; line: number; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        const matches = line.match(/alchemy\.com\/v2\/[a-zA-Z0-9_-]{32}/gi);
        if (matches) {
          violations.push({
            file: path.relative(ROOT, filePath),
            line: idx + 1,
            match: matches[0],
          });
        }
      });
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.file}:${v.line} -> ${v.match}`)
        .join('\n');
      throw new Error(
        `Found ${violations.length} hardcoded Alchemy URL(s):\n${report}`,
      );
    }
  });

  it('chain-constants.ts RPC URLs should use process.env', () => {
    const chainConstantsPath = path.join(ROOT, 'chain-constants.ts');
    const content = fs.readFileSync(chainConstantsPath, 'utf-8');

    // Find all NEXT_PUBLIC_RPC_URL exports
    const rpcExports = content.match(
      /export const NEXT_PUBLIC_RPC_URL_\d+\s*=[\s\S]*?;/g,
    );
    expect(rpcExports).not.toBeNull();
    expect(rpcExports!.length).toBeGreaterThan(0);

    for (const exportLine of rpcExports!) {
      expect(exportLine).toContain('process.env');
      // Should NOT contain a literal URL
      expect(exportLine).not.toMatch(/https?:\/\//);
    }
  });

  it('indexer/chain-constants.ts RPC URLs should use process.env', () => {
    const indexerConstantsPath = path.join(ROOT, 'indexer/chain-constants.ts');
    const content = fs.readFileSync(indexerConstantsPath, 'utf-8');

    const rpcExports = content.match(
      /export const NEXT_PUBLIC_RPC_URL_\d+\s*=[\s\S]*?;/g,
    );
    expect(rpcExports).not.toBeNull();
    expect(rpcExports!.length).toBeGreaterThan(0);

    for (const exportLine of rpcExports!) {
      expect(exportLine).toContain('process.env');
      expect(exportLine).not.toMatch(/https?:\/\//);
    }
  });

  it('.env should be in .gitignore', () => {
    const gitignorePath = path.join(ROOT, '.gitignore');
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    const lines = content.split('\n').map((l) => l.trim());
    expect(lines).toContain('.env');
  });
});
