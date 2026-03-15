#!/usr/bin/env npx tsx
/**
 * Unified ABI/Selector Generator
 *
 * Reads Hardhat artifacts (the single source of truth) and generates:
 * - Frontend Diamond ABI (infrastructure/contracts/diamond-abi.generated.ts)
 * - Facet selectors JSON (lib/contracts/facet-selectors.json)
 * - Indexer ABIs (via existing generate-indexer.ts)
 *
 * This ensures all consumers (frontend, deployment, indexer) stay in sync
 * with actual compiled contracts.
 *
 * Usage: npx tsx scripts/gen-all.ts
 *
 * Workflow:
 *   1. npx hardhat compile        # Compile contracts
 *   2. npx tsx scripts/gen-all.ts # Generate all ABIs/selectors
 *   3. Deploy as needed
 */

import * as fs from 'fs';
import * as path from 'path';
import { keccak256, toUtf8Bytes } from 'ethers';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOT_DIR = path.join(__dirname, '..');
const ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts/contracts/diamond/facets');
const EXTERNAL_ARTIFACTS_DIR = path.join(ROOT_DIR, 'artifacts/contracts');

const OUTPUT = {
  frontendABI: path.join(
    ROOT_DIR,
    'infrastructure/contracts/diamond-abi.generated.ts',
  ),
  facetSelectors: path.join(
    ROOT_DIR,
    'infrastructure/contracts/facet-selectors.generated.json',
  ),
  facetABIs: path.join(
    ROOT_DIR,
    'infrastructure/contracts/facet-abis.generated.json',
  ),
};

// Facets to include in the frontend Diamond ABI
// Add new facets here as they're created
const FRONTEND_FACETS = [
  'NodesFacet',
  'AuSysFacet',
  'AuSysAdminFacet',
  'AuSysViewFacet',
  'OrderRouterFacet',
  'CLOBFacetV2',
  'CLOBMatchingFacet',
  'DiamondLoupeFacet',
  'OwnershipFacet',
  'ERC1155ReceiverFacet',
  'OperatorFacet',
  'CLOBLogisticsFacet',
  'AssetsFacet',
];

// All facets to extract selectors for (used by deployment)
// This should include ALL facets in the Diamond
const ALL_FACETS = [
  'NodesFacet',
  'AuSysFacet',
  'AuSysAdminFacet',
  'AuSysViewFacet',
  'OrderRouterFacet',
  'CLOBFacetV2',
  'CLOBMatchingFacet',
  'CLOBAdminFacet',
  'CLOBLogisticsFacet',
  'DiamondLoupeFacet',
  'DiamondCutFacet',
  'OwnershipFacet',
  'ERC1155ReceiverFacet',
  'OperatorFacet',
  'BridgeFacet',
  'RWYStakingFacet',
  'AssetsFacet',
];

// ============================================================================
// TYPES
// ============================================================================

interface ABIItem {
  type: string;
  name?: string;
  inputs?: ABIInput[];
  outputs?: ABIOutput[];
  anonymous?: boolean;
  stateMutability?: string;
}

interface ABIInput {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
  components?: ABIInput[];
}

interface ABIOutput {
  name: string;
  type: string;
  internalType?: string;
  components?: ABIOutput[];
}

interface FacetSelectors {
  [facetName: string]: {
    selectors: { [functionName: string]: string };
    allSelectors: string[];
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function loadArtifact(
  facetName: string,
): { abi: ABIItem[]; bytecode: string } | null {
  // Try facets directory first
  let artifactPath = path.join(
    ARTIFACTS_DIR,
    `${facetName}.sol`,
    `${facetName}.json`,
  );

  if (!fs.existsSync(artifactPath)) {
    // Try external contracts directory
    artifactPath = path.join(
      EXTERNAL_ARTIFACTS_DIR,
      `${facetName}.sol`,
      `${facetName}.json`,
    );
  }

  if (!fs.existsSync(artifactPath)) {
    return null;
  }

  try {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return { abi: artifact.abi, bytecode: artifact.bytecode };
  } catch (err) {
    console.error(`  ⚠ Error loading ${facetName}:`, err);
    return null;
  }
}

function computeSelector(signature: string): string {
  const hash = keccak256(toUtf8Bytes(signature));
  return hash.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
}

function getTypeString(input: ABIInput): string {
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

function extractSelectorsFromABI(abi: ABIItem[]): {
  selectors: { [name: string]: string };
  allSelectors: string[];
} {
  const selectors: { [name: string]: string } = {};
  const allSelectors: string[] = [];

  for (const item of abi) {
    if (item.type === 'function' && item.name) {
      const inputs = (item.inputs || []).map(getTypeString).join(',');
      const signature = `${item.name}(${inputs})`;
      const selector = computeSelector(signature);
      selectors[item.name] = selector;
      allSelectors.push(selector);
    }
  }

  return { selectors, allSelectors };
}

function getUniqueSignature(item: ABIItem): string {
  if (item.type === 'function') {
    const inputs = (item.inputs || []).map(getTypeString).join(',');
    return `function:${item.name}(${inputs})`;
  }
  if (item.type === 'event') {
    const inputs = (item.inputs || [])
      .map((i) => `${i.type}${i.indexed ? ' indexed' : ''}`)
      .join(',');
    return `event:${item.name}(${inputs})`;
  }
  return `${item.type}:${item.name || 'anonymous'}`;
}

// ============================================================================
// GENERATORS
// ============================================================================

function generateFacetSelectors(): FacetSelectors {
  console.log('📦 Extracting facet selectors...\n');

  const facetSelectors: FacetSelectors = {};

  for (const facetName of ALL_FACETS) {
    const artifact = loadArtifact(facetName);
    if (!artifact) {
      console.log(`  ⚠ ${facetName}: Not found (skipping)`);
      continue;
    }

    const { selectors, allSelectors } = extractSelectorsFromABI(artifact.abi);
    facetSelectors[facetName] = { selectors, allSelectors };

    console.log(`  ✓ ${facetName}: ${allSelectors.length} functions`);
  }

  return facetSelectors;
}

function generateFrontendABI(): ABIItem[] {
  console.log('\n💎 Generating frontend Diamond ABI...\n');

  const combinedABI: ABIItem[] = [];
  const seenSignatures = new Set<string>();

  for (const facetName of FRONTEND_FACETS) {
    const artifact = loadArtifact(facetName);
    if (!artifact) {
      console.log(`  ⚠ ${facetName}: Not found (skipping)`);
      continue;
    }

    let added = 0;
    for (const item of artifact.abi) {
      // Only include functions and events
      if (item.type !== 'function' && item.type !== 'event') continue;

      // Deduplicate by signature
      const sig = getUniqueSignature(item);
      if (seenSignatures.has(sig)) continue;

      seenSignatures.add(sig);
      combinedABI.push(item);
      added++;
    }

    console.log(`  ✓ ${facetName}: ${added} items added`);
  }

  return combinedABI;
}

function generateFacetABIs(): { [facetName: string]: ABIItem[] } {
  console.log('\n📄 Extracting individual facet ABIs...\n');

  const facetABIs: { [facetName: string]: ABIItem[] } = {};

  for (const facetName of ALL_FACETS) {
    const artifact = loadArtifact(facetName);
    if (!artifact) {
      console.log(`  ⚠ ${facetName}: Not found (skipping)`);
      continue;
    }

    facetABIs[facetName] = artifact.abi;
    console.log(`  ✓ ${facetName}: ${artifact.abi.length} ABI items`);
  }

  return facetABIs;
}

// ============================================================================
// FILE WRITERS
// ============================================================================

function writeFacetSelectors(selectors: FacetSelectors): void {
  ensureDir(path.dirname(OUTPUT.facetSelectors));

  const content = JSON.stringify(selectors, null, 2);
  fs.writeFileSync(OUTPUT.facetSelectors, content);

  console.log(`\n✓ Wrote ${OUTPUT.facetSelectors}`);
}

function writeFrontendABI(abi: ABIItem[]): void {
  ensureDir(path.dirname(OUTPUT.frontendABI));

  const content = `/**
 * Auto-generated Diamond ABI for frontend
 *
 * DO NOT EDIT MANUALLY - This file is generated from Hardhat artifacts
 * Run: npm run contract:gen
 *
 * Generated: ${new Date().toISOString()}
 * Facets: ${FRONTEND_FACETS.join(', ')}
 * Total items: ${abi.length}
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DIAMOND_ABI: any[] = ${JSON.stringify(abi, null, 2)};
`;

  fs.writeFileSync(OUTPUT.frontendABI, content);
  console.log(`✓ Wrote ${OUTPUT.frontendABI} (${abi.length} items)`);
}

function writeFacetABIs(abis: { [facetName: string]: ABIItem[] }): void {
  ensureDir(path.dirname(OUTPUT.facetABIs));

  const content = JSON.stringify(abis, null, 2);
  fs.writeFileSync(OUTPUT.facetABIs, content);

  console.log(`✓ Wrote ${OUTPUT.facetABIs}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('━'.repeat(60));
  console.log('🔧 Contract-First ABI/Selector Generator');
  console.log('━'.repeat(60));
  console.log('\nSource: Hardhat artifacts (artifacts/contracts/)');
  console.log('Output:');
  console.log(`  - Frontend ABI: ${OUTPUT.frontendABI}`);
  console.log(`  - Facet Selectors: ${OUTPUT.facetSelectors}`);
  console.log(`  - Facet ABIs: ${OUTPUT.facetABIs}`);
  console.log('');

  // Check if artifacts exist
  if (!fs.existsSync(ARTIFACTS_DIR)) {
    console.error('❌ Artifacts directory not found!');
    console.error('   Run: npx hardhat compile');
    process.exit(1);
  }

  // Generate all outputs
  const facetSelectors = generateFacetSelectors();
  const frontendABI = generateFrontendABI();
  const facetABIs = generateFacetABIs();

  // Write outputs
  console.log('\n📝 Writing output files...\n');
  writeFacetSelectors(facetSelectors);
  writeFrontendABI(frontendABI);
  writeFacetABIs(facetABIs);

  // Summary
  console.log('\n' + '━'.repeat(60));
  console.log('✅ Generation complete!');
  console.log('━'.repeat(60));
  console.log(`\nFacets processed: ${Object.keys(facetSelectors).length}`);
  console.log(`Frontend ABI items: ${frontendABI.length}`);
  console.log(`\nNext steps:`);
  console.log(`  - Deploy: DEPLOY_FACET=FacetName npm run contract:deploy`);
  console.log(`  - Or commit the generated files`);
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
