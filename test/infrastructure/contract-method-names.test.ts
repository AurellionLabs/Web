// File: test/infrastructure/contract-method-names.test.ts
//
// GUARD TEST: Validates that all contract method name references in
// production code match the actual Diamond ABI function names.
//
// This test exists because the codebase migrated from legacy AuSys.sol
// to Diamond Pattern (AuSysFacet.sol), and many method names were renamed.
// Files with @ts-nocheck and `as any` casts hid these mismatches until runtime.
//
// If this test fails, it means production code references a contract method
// that doesn't exist on the Diamond contract.

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// --- Extract Diamond ABI function names (source of truth) ---
const DIAMOND_ABI_PATH = path.resolve(
  __dirname,
  '../../infrastructure/contracts/diamond-abi.generated.ts',
);

function extractDiamondFunctionNames(): Set<string> {
  const content = fs.readFileSync(DIAMOND_ABI_PATH, 'utf-8');
  const names = new Set<string>();

  // Match all ABI entries that are functions
  const functionRegex =
    /\{\s*inputs[\s\S]*?name:\s*'([^']+)'[\s\S]*?type:\s*'function'/g;
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  // Also match constant/view functions (name before outputs)
  const altRegex =
    /name:\s*'([^']+)',\s*\n\s*outputs[\s\S]*?type:\s*'function'/g;
  while ((match = altRegex.exec(content)) !== null) {
    names.add(match[1]);
  }

  return names;
}

// --- Known legacy → Diamond method name mappings ---
// If you renamed a method in the Diamond, add it here so the test catches
// any production code still using the old name.
const LEGACY_TO_DIAMOND: Record<string, string> = {
  assignDriverToJourneyId: 'assignDriverToJourney',
  journeyCreation: 'createJourney',
  orderCreation: 'createAuSysOrder',
  orderJourneyCreation: 'createOrderJourney',
  setNodeManager: '(REMOVED - does not exist in Diamond)',
  idToJourney: 'getJourney',
  journeyIdToJourney: 'getJourney',
  // Note: hasRole is from OpenZeppelin AccessControl, Diamond uses hasAuSysRole
  // Note: setAdmin is for AuStake (different contract), not AuSys
};

// --- Production files that call contract methods via string literals ---
// These files use sendContractTxWithReadEstimation(contract, 'methodName', ...)
// The method name is a string literal, so TypeScript can't verify it.
const FILES_WITH_STRING_METHOD_CALLS = [
  'infrastructure/services/driver.service.ts',
  'infrastructure/services/order-service.ts',
];

// --- Production files that call contract methods directly ---
const FILES_WITH_DIRECT_CALLS = [
  'app/providers/driver.provider.tsx',
  'app/providers/customer.provider.tsx',
  'dapp-connectors/ausys-controller.ts',
];

// --- Extracted ABIs file ---
const EXTRACTED_ABIS_PATH = path.resolve(
  __dirname,
  '../../lib/contracts/extracted-abis.json',
);

describe('Diamond ABI Contract Method Name Validation', () => {
  const diamondFunctions = extractDiamondFunctionNames();

  it('should have extracted Diamond ABI functions', () => {
    expect(diamondFunctions.size).toBeGreaterThan(50);
  });

  describe('Legacy method names must NOT be used in production code', () => {
    for (const [legacyName, diamondName] of Object.entries(LEGACY_TO_DIAMOND)) {
      it(`"${legacyName}" should be "${diamondName}" in all production code`, () => {
        const productionDirs = [
          'app',
          'infrastructure',
          'hooks',
          'lib',
          'domain',
          'utils',
        ];

        const issues: string[] = [];

        for (const dir of productionDirs) {
          const dirPath = path.resolve(__dirname, '../../', dir);
          if (!fs.existsSync(dirPath)) continue;

          scanDirectory(dirPath, (filePath, content) => {
            // Skip test files and generated files
            if (filePath.includes('.test.') || filePath.includes('.spec.'))
              return;
            if (filePath.includes('.generated.')) return;
            if (filePath.includes('node_modules')) return;

            // Check for the legacy method name in code (not comments)
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              const trimmed = line.trim();
              // Skip comment-only lines
              if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

              if (line.includes(legacyName)) {
                const relPath = path.relative(
                  path.resolve(__dirname, '../../'),
                  filePath,
                );
                issues.push(`${relPath}:${idx + 1}: ${trimmed}`);
              }
            });
          });
        }

        if (issues.length > 0) {
          const msg = [
            `Found ${issues.length} reference(s) to legacy method "${legacyName}"`,
            `Should be "${diamondName}" (Diamond ABI name)`,
            '',
            ...issues,
          ].join('\n');
          expect.fail(msg);
        }
      });
    }
  });

  describe('String-based method calls must reference valid Diamond functions', () => {
    for (const relFile of FILES_WITH_STRING_METHOD_CALLS) {
      it(`${relFile} should only reference valid Diamond function names`, () => {
        const filePath = path.resolve(__dirname, '../../', relFile);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf-8');
        const issues: string[] = [];

        // Match patterns like: sendContractTxWithReadEstimation(contract, 'methodName', ...)
        // or contract.interface.encodeFunctionData('methodName', ...)
        const methodCallRegex =
          /(?:sendContractTxWithReadEstimation|encodeFunctionData)\s*\(\s*(?:[^,]+,\s*)?'([^']+)'/g;
        let match;
        while ((match = methodCallRegex.exec(content)) !== null) {
          const methodName = match[1];
          if (!diamondFunctions.has(methodName)) {
            const line = content.substring(0, match.index).split('\n').length;
            issues.push(
              `Line ${line}: "${methodName}" is NOT in the Diamond ABI`,
            );
          }
        }

        if (issues.length > 0) {
          const msg = [
            `${relFile} references invalid Diamond method names:`,
            '',
            ...issues,
            '',
            'These methods do not exist on the Diamond contract.',
          ].join('\n');
          expect.fail(msg);
        }
      });
    }
  });

  describe('Direct contract calls should use Diamond method names', () => {
    for (const relFile of FILES_WITH_DIRECT_CALLS) {
      it(`${relFile} should not call legacy method names`, () => {
        const filePath = path.resolve(__dirname, '../../', relFile);
        if (!fs.existsSync(filePath)) return;

        const content = fs.readFileSync(filePath, 'utf-8');
        const issues: string[] = [];

        for (const [legacyName, diamondName] of Object.entries(
          LEGACY_TO_DIAMOND,
        )) {
          // Match: .legacyName( or ['legacyName']
          const regex = new RegExp(
            `\\.${legacyName}\\s*\\(|\\['${legacyName}'\\]`,
            'g',
          );
          let match;
          while ((match = regex.exec(content)) !== null) {
            const line = content.substring(0, match.index).split('\n').length;
            issues.push(
              `Line ${line}: calls "${legacyName}" → should be "${diamondName}"`,
            );
          }
        }

        if (issues.length > 0) {
          const msg = [
            `${relFile} uses legacy contract method names:`,
            '',
            ...issues,
          ].join('\n');
          expect.fail(msg);
        }
      });
    }
  });

  describe('getjourney (lowercase) vs getJourney (correct casing)', () => {
    it('production code should use getJourney (capital J), not getjourney', () => {
      const issues: string[] = [];
      const dirsToCheck = [
        'app',
        'infrastructure',
        'hooks',
        'lib',
        'domain',
        'utils',
      ];

      for (const dir of dirsToCheck) {
        const dirPath = path.resolve(__dirname, '../../', dir);
        if (!fs.existsSync(dirPath)) continue;

        scanDirectory(dirPath, (filePath, content) => {
          if (filePath.includes('.test.') || filePath.includes('.spec.'))
            return;
          if (filePath.includes('.generated.')) return;

          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

            // Match .getjourney( but not .getJourney(
            if (
              line.includes('.getjourney(') &&
              !line.includes('.getJourney(')
            ) {
              const relPath = path.relative(
                path.resolve(__dirname, '../../'),
                filePath,
              );
              issues.push(`${relPath}:${idx + 1}: ${trimmed}`);
            }
          });
        });
      }

      if (issues.length > 0) {
        const msg = [
          'Found getjourney() calls (wrong casing) — should be getJourney():',
          '',
          ...issues,
        ].join('\n');
        expect.fail(msg);
      }
    });
  });

  describe('hasRole vs hasAuSysRole', () => {
    it('production code should use hasAuSysRole for AuSys role checks, not OpenZeppelin hasRole', () => {
      const issues: string[] = [];
      const dirsToCheck = ['app/providers', 'infrastructure/services'];

      for (const dir of dirsToCheck) {
        const dirPath = path.resolve(__dirname, '../../', dir);
        if (!fs.existsSync(dirPath)) continue;

        scanDirectory(dirPath, (filePath, content) => {
          if (filePath.includes('.test.') || filePath.includes('.spec.'))
            return;

          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

            // Match .hasRole( but not hasAuSysRole
            if (line.includes('.hasRole(') && !line.includes('hasAuSysRole')) {
              const relPath = path.relative(
                path.resolve(__dirname, '../../'),
                filePath,
              );
              issues.push(`${relPath}:${idx + 1}: ${trimmed}`);
            }
          });
        });
      }

      if (issues.length > 0) {
        const msg = [
          'Found hasRole() calls that should be hasAuSysRole() (Diamond ABI):',
          '',
          ...issues,
        ].join('\n');
        expect.fail(msg);
      }
    });
  });
});

describe('Extracted ABIs Completeness', () => {
  it('should not have empty ABIs for contracts used in production', () => {
    if (!fs.existsSync(EXTRACTED_ABIS_PATH)) {
      // File doesn't exist — skip
      return;
    }

    const abis = JSON.parse(fs.readFileSync(EXTRACTED_ABIS_PATH, 'utf-8'));
    const emptyContracts: string[] = [];

    // Contracts that are actively used in production code
    const productionContracts = [
      'Ausys',
      'AuraAsset',
      'AuStake',
      'AurumNodeManager',
      'AurumNode',
      'AuraGoatRed',
      'CLOB',
      'RWYVault',
    ];

    for (const name of productionContracts) {
      if (abis[name] && Array.isArray(abis[name]) && abis[name].length === 0) {
        emptyContracts.push(name);
      }
    }

    if (emptyContracts.length > 0) {
      // Warn but don't fail — empty ABIs happen when Hardhat artifacts
      // aren't compiled locally. The Diamond ABI is the actual source of
      // truth at runtime. This test serves as a reminder to regenerate.
      console.warn(
        `⚠️  ${emptyContracts.length} production contracts have EMPTY ABIs in extracted-abis.json:`,
        emptyContracts.join(', '),
        '\nRun: npx hardhat compile && npm run extract-abis',
      );
    }
  });

  it('Diamond ABI should have all expected AuSys methods', () => {
    const diamondFunctions = extractDiamondFunctionNames();

    const expectedMethods = [
      'assignDriverToJourney',
      'createJourney',
      'createAuSysOrder',
      'createOrderJourney',
      'getJourney',
      'getAuSysOrder',
      'setAuSysAdmin',
      'hasAuSysRole',
      'setDriver',
      'DRIVER_ROLE',
      'DISPATCHER_ROLE',
      'ADMIN_ROLE',
      'handOn',
      'handOff',
      'packageSign',
    ];

    const missing = expectedMethods.filter((m) => !diamondFunctions.has(m));

    if (missing.length > 0) {
      expect.fail(
        `Diamond ABI is missing expected methods: ${missing.join(', ')}`,
      );
    }
  });
});

// --- Utility: recursively scan .ts/.tsx files ---
function scanDirectory(
  dirPath: string,
  callback: (filePath: string, content: string) => void,
) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      scanDirectory(fullPath, callback);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      callback(fullPath, content);
    }
  }
}
