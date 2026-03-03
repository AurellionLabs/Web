#!/usr/bin/env npx ts-node
/**
 * Detect Facet Changes
 *
 * Compares the compiled bytecode of every facet registered in deploy.config.ts
 * against the code hashes stored in deployments/manifest.json.
 *
 * Outputs a JSON summary to stdout and writes deployments/pending-changes.json
 * for CI consumption.
 *
 * Usage:
 *   bunx hardhat run scripts/detect-facet-changes.ts --network baseSepolia
 */

import hre, { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import { CONTRACTS } from './deploy.config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestFacet {
  address: string;
  codeHash: string;
  selectors: string[];
  deployedAt: string;
}

interface Manifest {
  network: string;
  chainId: number;
  diamond: string;
  updatedAt: string;
  gitCommit: string;
  facets: Record<string, ManifestFacet>;
}

interface ChangeResult {
  new: string[];
  changed: string[];
  unchanged: string[];
  removed: string[];
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const MANIFEST_PATH = path.resolve(__dirname, '../deployments/manifest.json');
const PENDING_CHANGES_PATH = path.resolve(
  __dirname,
  '../deployments/pending-changes.json',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the keccak256 hash of a contract's *deployed* (runtime) bytecode
 * from the Hardhat artifact.  build-manifest.ts hashes on-chain deployed
 * bytecode via `provider.getCode()`, so we must use `deployedBytecode` from
 * the artifact for an apples-to-apples comparison.
 *
 * Uses Hardhat's artifact resolution so we don't need to guess file paths.
 */
async function getCompiledDeployedBytecodeHash(
  contractName: string,
): Promise<string | null> {
  try {
    const artifact = await hre.artifacts.readArtifact(contractName);
    if (artifact.deployedBytecode && artifact.deployedBytecode !== '0x') {
      return ethers.keccak256(artifact.deployedBytecode);
    }
    // Fallback to creation bytecode (won't match deployed exactly, but
    // a hash difference still indicates the facet has changed).
    if (artifact.bytecode && artifact.bytecode !== '0x') {
      return ethers.keccak256(artifact.bytecode);
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // Load manifest
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(
      '❌ deployments/manifest.json not found. Run build-manifest.ts first.',
    );
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, 'utf-8'),
  );

  console.error(`\n🔍 Detecting facet changes against manifest`);
  console.error(`   Manifest from: ${manifest.updatedAt}`);
  console.error(`   Git commit:    ${manifest.gitCommit}\n`);

  // Collect all facets from deploy.config.ts
  const configFacets = Object.entries(CONTRACTS)
    .filter(([, config]) => config.category === 'facet')
    .map(([name, config]) => ({ name, contractName: config.contractName }));

  const result: ChangeResult = {
    new: [],
    changed: [],
    unchanged: [],
    removed: [],
  };

  // Check each configured facet
  for (const { name, contractName } of configFacets) {
    const compiledHash = await getCompiledDeployedBytecodeHash(contractName);

    if (!compiledHash) {
      console.error(`   ⚠️  Could not compile ${contractName}, skipping`);
      continue;
    }

    const manifestEntry = manifest.facets[name];

    if (!manifestEntry) {
      // Facet exists in config but not in manifest → new
      result.new.push(name);
      console.error(`   + ${name} (new)`);
    } else if (manifestEntry.codeHash !== compiledHash) {
      // Bytecode changed
      result.changed.push(name);
      console.error(`   ~ ${name} (changed)`);
      console.error(`     manifest: ${manifestEntry.codeHash.slice(0, 18)}…`);
      console.error(`     compiled: ${compiledHash.slice(0, 18)}…`);
    } else {
      result.unchanged.push(name);
      console.error(`   = ${name} (unchanged)`);
    }
  }

  // Check for facets in manifest but not in config → removed
  const configFacetNames = new Set(configFacets.map((f) => f.name));
  for (const manifestName of Object.keys(manifest.facets)) {
    if (!configFacetNames.has(manifestName)) {
      result.removed.push(manifestName);
      console.error(`   - ${manifestName} (removed from config)`);
    }
  }

  // Summary
  console.error(
    `\n   Summary: ${result.new.length} new, ${result.changed.length} changed, ${result.unchanged.length} unchanged, ${result.removed.length} removed\n`,
  );

  // Write pending-changes.json
  const deploymentsDir = path.dirname(PENDING_CHANGES_PATH);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  fs.writeFileSync(
    PENDING_CHANGES_PATH,
    JSON.stringify(result, null, 2) + '\n',
  );
  console.error(`   Written to deployments/pending-changes.json`);

  // Output JSON to stdout for CI
  console.log(JSON.stringify(result));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ detect-facet-changes failed:', error.message ?? error);
    process.exit(1);
  });
