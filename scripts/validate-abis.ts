#!/usr/bin/env npx tsx
/**
 * Validate that generated ABIs are up to date with Hardhat artifacts
 *
 * This script compares the generated facet-selectors.json with what would
 * be generated from current Hardhat artifacts. If they differ, it means
 * contract changes were made without regenerating ABIs.
 *
 * Usage: npx tsx scripts/validate-abis.ts
 *
 * Exit codes:
 *   0 - ABIs are up to date
 *   1 - ABIs need regeneration
 */

import * as fs from 'fs';
import * as path from 'path';
import { keccak256, toUtf8Bytes } from 'ethers';

const ROOT_DIR = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts/contracts/diamond/facets');
const SELECTORS_PATH = path.join(
  ROOT_DIR,
  'infrastructure/contracts/facet-selectors.generated.json',
);
const FRONTEND_ABI_PATH = path.join(
  ROOT_DIR,
  'infrastructure/contracts/diamond-abi.generated.ts',
);

// Key facets to check (subset for faster validation)
const KEY_FACETS = [
  'NodesFacet',
  'AuSysFacet',
  'AuSysAdminFacet',
  'AuSysViewFacet',
  'OrderRouterFacet',
  'CLOBFacetV2',
];

interface ABIItem {
  type: string;
  name?: string;
  inputs?: { type: string; components?: any[] }[];
}

function getTypeString(input: { type: string; components?: any[] }): string {
  if (input.type === 'tuple') {
    const components = input.components || [];
    return `(${components.map(getTypeString).join(',')})`;
  }
  if (input.type === 'tuple[]') {
    const components = input.components || [];
    return `(${components.map(getTypeString).join(',')})[]`;
  }
  return input.type;
}

function computeSelector(signature: string): string {
  return keccak256(toUtf8Bytes(signature)).slice(0, 10);
}

function extractSelectorsFromArtifact(facetName: string): string[] | null {
  const artifactPath = path.join(
    ARTIFACTS_DIR,
    `${facetName}.sol`,
    `${facetName}.json`,
  );

  if (!fs.existsSync(artifactPath)) {
    return null;
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const selectors: string[] = [];

  for (const item of artifact.abi as ABIItem[]) {
    if (item.type === 'function' && item.name) {
      const inputs = (item.inputs || []).map(getTypeString).join(',');
      const signature = `${item.name}(${inputs})`;
      selectors.push(computeSelector(signature));
    }
  }

  return selectors.sort();
}

function loadGeneratedSelectors(): Record<string, string[]> | null {
  if (!fs.existsSync(SELECTORS_PATH)) {
    return null;
  }

  const data = JSON.parse(fs.readFileSync(SELECTORS_PATH, 'utf8'));
  const result: Record<string, string[]> = {};

  for (const [facetName, facetData] of Object.entries(data)) {
    result[facetName] = ((facetData as any).allSelectors || []).sort();
  }

  return result;
}

async function main(): Promise<void> {
  console.log('🔍 Validating ABIs are up to date...\n');

  // Check if generated files exist
  if (!fs.existsSync(SELECTORS_PATH)) {
    console.error('❌ facet-selectors.json not found!');
    console.error('   Run: npm run contract:gen');
    process.exit(1);
  }

  if (!fs.existsSync(FRONTEND_ABI_PATH)) {
    console.error('❌ diamond-abi.generated.ts not found!');
    console.error('   Run: npm run contract:gen');
    process.exit(1);
  }

  // Check if artifacts exist
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.log('⚠️  No artifacts found - skipping validation');
    console.log('   (Contracts may not have been compiled yet)');
    process.exit(0);
  }

  // Load generated selectors
  const generatedSelectors = loadGeneratedSelectors();
  if (!generatedSelectors) {
    console.error('❌ Could not load generated selectors');
    process.exit(1);
  }

  // Compare key facets
  let hasDiscrepancy = false;

  for (const facetName of KEY_FACETS) {
    const artifactSelectors = extractSelectorsFromArtifact(facetName);

    if (!artifactSelectors) {
      console.log(`  ⚠️  ${facetName}: Artifact not found (skipping)`);
      continue;
    }

    const generated = generatedSelectors[facetName] || [];

    // Compare
    const artifactSet = new Set(artifactSelectors);
    const generatedSet = new Set(generated);

    const missing = artifactSelectors.filter((s) => !generatedSet.has(s));
    const extra = generated.filter((s) => !artifactSet.has(s));

    if (missing.length > 0 || extra.length > 0) {
      console.log(`  ❌ ${facetName}: MISMATCH`);
      if (missing.length > 0) {
        console.log(`     Missing in generated: ${missing.length} selectors`);
      }
      if (extra.length > 0) {
        console.log(`     Extra in generated: ${extra.length} selectors`);
      }
      hasDiscrepancy = true;
    } else {
      console.log(
        `  ✓ ${facetName}: OK (${artifactSelectors.length} selectors)`,
      );
    }
  }

  if (hasDiscrepancy) {
    console.log('\n❌ ABIs are out of date!');
    console.log('   Run: npm run contract:gen');
    process.exit(1);
  }

  console.log('\n✅ ABIs are up to date');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
