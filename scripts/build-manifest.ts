#!/usr/bin/env npx ts-node
/**
 * Build Manifest
 *
 * Queries the on-chain Diamond state and writes a canonical
 * deployments/manifest.json that records every facet, its address,
 * bytecode hash, and selectors.
 *
 * Usage:
 *   bunx hardhat run scripts/build-manifest.ts --network baseSepolia
 *
 * Environment variables (for standalone / non-Hardhat usage):
 *   NEXT_PUBLIC_RPC_URL_84532 or BASE_TEST_RPC_URL  – RPC endpoint
 *   DIAMOND_ADDRESS  – override the default Diamond address
 */

import hre, { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  createDeploymentManifest,
  getDeploymentArtifactPaths,
} from './lib/deployment-manifest';
import { resolveDiamondAddress } from './lib/runtime-contracts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_DIAMOND_ADDRESS = '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7';

const FACET_SELECTORS_PATH = path.join(
  __dirname,
  '../infrastructure/contracts/facet-selectors.generated.json',
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacetSelectorsFile {
  [facetName: string]: {
    selectors: Record<string, string>;
    allSelectors: string[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getGitCommit(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Build a reverse lookup: selector (lowercase) -> facet name.
 * When a selector appears in multiple facets (e.g. supportsInterface) the
 * first match wins, which is fine – we only use this for best-effort naming.
 */
function buildSelectorToFacetMap(
  data: FacetSelectorsFile,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [facetName, facetData] of Object.entries(data)) {
    for (const selector of facetData.allSelectors) {
      const key = selector.toLowerCase();
      if (!map.has(key)) {
        map.set(key, facetName);
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const existingDiamondAddress = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
  const diamondAddress = resolveDiamondAddress({
    manifestDiamondAddress: existingDiamondAddress || DEFAULT_DIAMOND_ADDRESS,
    env: process.env,
  });
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const deploymentsDir = path.resolve(__dirname, '../deployments');
  const networkName = hre.network.name;
  const artifactPaths = getDeploymentArtifactPaths({
    deploymentsDir,
    networkName,
    chainId,
  });

  console.log(`\n📋 Building deployment manifest`);
  console.log(`   Diamond: ${diamondAddress}\n`);

  // Load selector -> facetName map from the generated JSON
  let selectorToFacet = new Map<string, string>();
  if (fs.existsSync(FACET_SELECTORS_PATH)) {
    const data: FacetSelectorsFile = JSON.parse(
      fs.readFileSync(FACET_SELECTORS_PATH, 'utf-8'),
    );
    selectorToFacet = buildSelectorToFacetMap(data);
  } else {
    console.warn(
      '⚠️  facet-selectors.generated.json not found – facets will be unnamed',
    );
  }

  // Query the on-chain Diamond via DiamondLoupe.
  // If no Diamond exists at this address (fresh network), write an empty manifest
  // so detect-facet-changes treats all facets as "new".
  const loupe = await ethers.getContractAt('IDiamondLoupe', diamondAddress);
  let onChainFacets: Array<{
    facetAddress: string;
    functionSelectors: string[];
  }> = [];
  try {
    onChainFacets = await loupe.facets();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('BAD_DATA') ||
      msg.includes('could not decode') ||
      msg.includes('0x')
    ) {
      console.warn(
        `⚠️  No Diamond found at ${diamondAddress} on this network — writing empty manifest (all facets will be treated as new)`,
      );
    } else {
      throw err;
    }
  }

  // For each facet address, group selectors and resolve the name
  // A single address may serve multiple named facets (rare) so we group by
  // address first, then try to resolve names.
  const addressToSelectors = new Map<string, string[]>();
  for (const facet of onChainFacets) {
    const addr = facet.facetAddress;
    const existing = addressToSelectors.get(addr) ?? [];
    for (const sel of facet.functionSelectors) {
      existing.push(sel);
    }
    addressToSelectors.set(addr, existing);
  }

  // Resolve facet names: for each address, pick the name that covers the
  // majority of its selectors.
  const facets: Record<string, ManifestFacet> = {};

  for (const [address, selectors] of addressToSelectors) {
    // Count votes for each facet name
    const votes = new Map<string, number>();
    for (const sel of selectors) {
      const name = selectorToFacet.get(sel.toLowerCase());
      if (name) {
        votes.set(name, (votes.get(name) ?? 0) + 1);
      }
    }

    let facetName: string;
    if (votes.size > 0) {
      // Pick the name with the most selector matches
      facetName = [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
    } else {
      // Fallback: use a truncated address as the name
      facetName = `Unknown_${address.slice(0, 8)}`;
    }

    // Fetch deployed bytecode and compute keccak256
    const bytecode = await ethers.provider.getCode(address);
    const codeHash = ethers.keccak256(bytecode);

    facets[facetName] = {
      address,
      codeHash,
      selectors: selectors.map((s) => s.toLowerCase()),
      deployedAt: new Date().toISOString(),
    };

    console.log(
      `   ✓ ${facetName}: ${address.slice(0, 10)}… (${selectors.length} selectors)`,
    );
  }

  // Build manifest
  const manifest = createDeploymentManifest({
    networkName,
    chainId,
    diamondAddress,
    gitCommit: getGitCommit(),
    facets,
  });

  // Write the manifest to the chain-specific deployment artifact path.
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(
    artifactPaths.manifestPath,
    JSON.stringify(manifest, null, 2) + '\n',
  );

  console.log(`\n✅ Manifest written to ${artifactPaths.manifestPath}`);
  console.log(`   ${Object.keys(facets).length} facets recorded\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ build-manifest failed:', error.message ?? error);
    process.exit(1);
  });
