/**
 * Standalone NodesFacet Upgrade Script
 * Upgrades NodesFacet to add Supporting Document functions
 *
 * Usage: node scripts/upgrade-nodes-facet-standalone.mjs
 */

import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as fs from 'fs';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Constants
const DIAMOND_ADDRESS = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';
const RPC_URL =
  process.env.BASE_TEST_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL_84532 || '';

// Diamond interfaces
const DIAMOND_LOUPE_ABI = [
  'function facetAddress(bytes4 _functionSelector) view returns (address)',
  'function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
];

const DIAMOND_CUT_ABI = [
  'function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[] _diamondCut, address _init, bytes _calldata) external',
];

// NodesFacet supporting document function selectors
const SUPPORTING_DOC_SELECTORS = [
  '0x284b031b', // addSupportingDocument
  '0x3b8b08a2', // removeSupportingDocument
  '0x8a1dd33d', // getSupportingDocuments
  '0x9ba82815', // getActiveSupportingDocuments
  '0x5310993c', // getSupportingDocumentCount
];

// Load NodesFacet bytecode from artifacts
function loadNodesFacetBytecode() {
  const artifactPath = join(
    __dirname,
    '..',
    'artifacts',
    'contracts',
    'diamond',
    'facets',
    'NodesFacet.sol',
    'NodesFacet.json',
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.bytecode;
}

async function main() {
  // Get private key from environment
  const privateKey = process.env.SEP_PRIVATE_KEY || process.env.PRIVATE_KEY;

  if (!privateKey) {
    console.error(
      '❌ Error: SEP_PRIVATE_KEY or PRIVATE_KEY not found in .env file',
    );
    process.exit(1);
  }

  console.log('\n🔧 Upgrading NodesFacet with Supporting Document Functions');
  console.log('='.repeat(60));
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);
  console.log(`RPC URL: ${RPC_URL}`);
  console.log(`New selectors: ${SUPPORTING_DOC_SELECTORS.length}`);
  console.log('');

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);
  const signerAddress = await signer.getAddress();
  console.log(`Deployer: ${signerAddress}`);

  // Get Diamond contracts
  const loupe = new ethers.Contract(
    DIAMOND_ADDRESS,
    DIAMOND_LOUPE_ABI,
    provider,
  );
  const diamondCut = new ethers.Contract(
    DIAMOND_ADDRESS,
    DIAMOND_CUT_ABI,
    signer,
  );

  // Step 1: Deploy new NodesFacet
  console.log('\n📦 Step 1: Deploy new NodesFacet...');
  const bytecode = loadNodesFacetBytecode();
  const factory = new ethers.ContractFactory([], bytecode, signer);
  const nodesFacet = await factory.deploy();
  await nodesFacet.waitForDeployment();
  const facetAddress = await nodesFacet.getAddress();
  console.log(`   ✓ Deployed: ${facetAddress}`);

  // Step 2: Analyze current state
  console.log('\n🔍 Step 2: Analyze Diamond state...');

  const toAdd = [];
  const toReplace = [];

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

  const facetCuts = [];

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
  } catch (error) {
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
