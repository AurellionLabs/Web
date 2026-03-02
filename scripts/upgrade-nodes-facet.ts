/**
 * Simple NodesFacet Upgrade Script
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-nodes-facet.ts --network baseSepolia
 */

import { ethers } from 'hardhat';

// Diamond address on Base Sepolia
const DIAMOND_ADDRESS =
  '0x5A9D8e7C9B8F4a2E3b1c0D6F5e4A3B2c1D0E9F8a'.toLowerCase() ===
  '0x5a9d8e7c9b8f4a2e3b1c0d6f5e4a3b2c1d0e9f8a'
    ? '0x3fD60BA8fBDC5a7f4e0f0D8b5D3B4f1a2E3c6D9b' // placeholder
    : process.env.NEXT_PUBLIC_DIAMOND_ADDRESS ||
      '0xF0F9d9f3c7A4E2b1D6c8B5a3E0f7C9d2A1b4E6f8';

// Get actual diamond address from env
const getDiamondAddress = () => {
  const addr = process.env.NEXT_PUBLIC_DIAMOND_ADDRESS;
  if (!addr) {
    throw new Error('NEXT_PUBLIC_DIAMOND_ADDRESS not set in environment');
  }
  return addr;
};

// NodesFacet function selectors for supporting documents
const SUPPORTING_DOC_SELECTORS = [
  '0x284b031b', // addSupportingDocument
  '0x3b8b08a2', // removeSupportingDocument
  '0x8a1dd33d', // getSupportingDocuments
  '0x9ba82815', // getActiveSupportingDocuments
  '0x5310993c', // getSupportingDocumentCount
];

interface FacetCut {
  facetAddress: string;
  action: number; // 0=Add, 1=Replace, 2=Remove
  functionSelectors: string[];
}

async function main() {
  // Load diamond address from .env
  const dotenv = await import('dotenv');
  dotenv.config();

  const diamondAddress = getDiamondAddress();

  console.log('\n🔧 Upgrading NodesFacet with Supporting Document Functions');
  console.log('='.repeat(60));
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`New selectors: ${SUPPORTING_DOC_SELECTORS.length}`);
  console.log('');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  // Get Diamond contracts
  const loupe = await ethers.getContractAt('IDiamondLoupe', diamondAddress);
  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);

  // Step 1: Deploy new NodesFacet
  console.log('\n📦 Step 1: Deploy new NodesFacet...');
  const NodesFacetFactory = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacetFactory.deploy();
  await nodesFacet.waitForDeployment();
  const facetAddress = await nodesFacet.getAddress();
  console.log(`   ✓ Deployed: ${facetAddress}`);

  // Step 2: Analyze current state
  console.log('\n🔍 Step 2: Analyze Diamond state...');

  const toAdd: string[] = [];
  const toReplace: string[] = [];

  for (const selector of SUPPORTING_DOC_SELECTORS) {
    try {
      const existingFacet = await loupe.facetAddress(selector);
      if (existingFacet === ethers.ZeroAddress) {
        toAdd.push(selector);
        console.log(`   ${selector}: NEW (will add)`);
      } else if (existingFacet.toLowerCase() !== facetAddress.toLowerCase()) {
        toReplace.push(selector);
        console.log(
          `   ${selector}: EXISTS at ${existingFacet.slice(0, 10)}... (will replace)`,
        );
      } else {
        console.log(`   ${selector}: Already at new facet (skip)`);
      }
    } catch {
      toAdd.push(selector);
      console.log(`   ${selector}: NEW (will add)`);
    }
  }

  console.log(`\n   Selectors to ADD:     ${toAdd.length}`);
  console.log(`   Selectors to REPLACE: ${toReplace.length}`);

  if (toAdd.length === 0 && toReplace.length === 0) {
    console.log('\n✅ No changes needed - facet is up to date!');
    return;
  }

  // Step 3: Build facet cuts
  console.log('\n⚙️  Step 3: Build diamond cut...');

  const facetCuts: FacetCut[] = [];

  if (toReplace.length > 0) {
    facetCuts.push({
      facetAddress: facetAddress,
      action: 1, // Replace
      functionSelectors: toReplace,
    });
    console.log(`   Replace cut: ${toReplace.length} selectors`);
  }

  if (toAdd.length > 0) {
    facetCuts.push({
      facetAddress: facetAddress,
      action: 0, // Add
      functionSelectors: toAdd,
    });
    console.log(`   Add cut: ${toAdd.length} selectors`);
  }

  // Step 4: Execute
  console.log('\n🚀 Step 4: Execute diamond cut...');

  try {
    const tx = await diamondCut.diamondCut(facetCuts, ethers.ZeroAddress, '0x');
    console.log(`   Transaction: ${tx.hash}`);
    await tx.wait();
    console.log('   ✓ Diamond cut completed!');
  } catch (error: any) {
    console.error('   ❌ Diamond cut failed:', error.message);
    process.exit(1);
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ NodesFacet upgrade complete!`);
  console.log(`   Facet address: ${facetAddress}`);
  console.log(`   Added: ${toAdd.length} selectors`);
  console.log(`   Replaced: ${toReplace.length} selectors`);
  console.log('');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
