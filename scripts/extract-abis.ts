/**
 * Extract ABIs from Hardhat artifacts to a committed JSON file
 *
 * Run this after `npx hardhat compile` to update the ABIs:
 *   npx ts-node scripts/extract-abis.ts
 *
 * This allows the ABIs to be available on Vercel without committing
 * the entire artifacts/ folder.
 */

import * as fs from 'fs';
import * as path from 'path';

const ARTIFACTS_DIR = path.join(__dirname, '../artifacts/contracts');
const OUTPUT_FILE = path.join(
  __dirname,
  '../lib/contracts/extracted-abis.json',
);

interface ArtifactFile {
  abi: unknown[];
  contractName: string;
}

const CONTRACTS_TO_EXTRACT: Record<string, string> = {
  Diamond: 'diamond/Diamond.sol/Diamond.json',
  DiamondCutFacet: 'diamond/facets/DiamondCutFacet.sol/DiamondCutFacet.json',
  DiamondLoupeFacet:
    'diamond/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json',
  OwnershipFacet: 'diamond/facets/OwnershipFacet.sol/OwnershipFacet.json',
  RWYStakingFacet: 'diamond/facets/RWYStakingFacet.sol/RWYStakingFacet.json',
};

async function extractAbis(): Promise<void> {
  const abis: Record<string, unknown[]> = {};

  for (const [name, artifactPath] of Object.entries(CONTRACTS_TO_EXTRACT)) {
    const fullPath = path.join(ARTIFACTS_DIR, artifactPath);

    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Artifact not found: ${fullPath}`);
      abis[name] = [];
      continue;
    }

    try {
      const artifact: ArtifactFile = JSON.parse(
        fs.readFileSync(fullPath, 'utf8'),
      );
      abis[name] = artifact.abi;
      console.log(`✓ Extracted ${name} (${artifact.abi.length} items)`);
    } catch (error) {
      console.error(`Error reading ${fullPath}:`, error);
      abis[name] = [];
    }
  }

  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(abis, null, 2));
  console.log(`\n✓ ABIs written to ${OUTPUT_FILE}`);
}

extractAbis().catch(console.error);
