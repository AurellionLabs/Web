/**
 * Standalone AuSysFacet Upgrade Script
 * Upgrades AuSysFacet to add P2P trading functions
 *
 * Usage: node scripts/upgrade-ausys-facet-standalone.mjs
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
  process.env.BASE_TEST_RPC_URL ||
  'https://base-sepolia.infura.io/v3/30d0943a6329474e8b08a1ce7ab66892';

// Diamond interfaces
const DIAMOND_LOUPE_ABI = [
  'function facetAddress(bytes4 _functionSelector) view returns (address)',
  'function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
];

const DIAMOND_CUT_ABI = [
  'function diamondCut(tuple(address facetAddress, uint8 action, bytes4[] functionSelectors)[] _diamondCut, address _init, bytes _calldata) external',
];

// New P2P function selectors to add
const P2P_SELECTORS = [
  '0xe4189a40', // acceptP2POffer(bytes32)
  '0xf8919799', // cancelP2POffer(bytes32)
  '0xad4235e7', // getOpenP2POffers() view returns (bytes32[])
  '0xa448bbd3', // getUserP2POffers(address) view returns (bytes32[])
];

// Load AuSysFacet bytecode from artifacts
function loadAuSysFacetBytecode() {
  const artifactPath = join(
    __dirname,
    '..',
    'artifacts',
    'contracts',
    'diamond',
    'facets',
    'AuSysFacet.sol',
    'AuSysFacet.json',
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath}. Run 'npx hardhat compile' first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  return artifact.bytecode;
}

async function main() {
  console.log('\n🔧 AuSysFacet P2P Upgrade Script\n');
  console.log('━'.repeat(60));

  // Validate environment
  const privateKey = process.env.SEP_PRIVATE_KEY || process.env.WALLET_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('SEP_PRIVATE_KEY or WALLET_PRIVATE_KEY not set in environment');
  }

  // Connect to network
  console.log(`\n📡 Connecting to ${RPC_URL.includes('sepolia') ? 'Base Sepolia' : 'network'}...`);
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  console.log(`   Deployer: ${wallet.address}`);

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`   Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther('0.001')) {
    throw new Error('Insufficient balance for deployment');
  }

  // Connect to Diamond
  const diamondLoupe = new ethers.Contract(DIAMOND_ADDRESS, DIAMOND_LOUPE_ABI, provider);
  const diamondCut = new ethers.Contract(DIAMOND_ADDRESS, DIAMOND_CUT_ABI, wallet);

  // Check which selectors need to be added
  console.log('\n🔍 Checking existing selectors...');
  const selectorsToAdd = [];

  for (const selector of P2P_SELECTORS) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    if (facetAddr === ethers.ZeroAddress) {
      selectorsToAdd.push(selector);
      console.log(`   ${selector} - NOT FOUND (will add)`);
    } else {
      console.log(`   ${selector} - Already registered at ${facetAddr}`);
    }
  }

  if (selectorsToAdd.length === 0) {
    console.log('\n✅ All P2P selectors already registered. Nothing to do.');
    return;
  }

  // Deploy new AuSysFacet
  console.log('\n📦 Deploying new AuSysFacet...');
  const bytecode = loadAuSysFacetBytecode();
  const factory = new ethers.ContractFactory([], bytecode, wallet);

  const auSysFacet = await factory.deploy();
  await auSysFacet.waitForDeployment();
  const facetAddress = await auSysFacet.getAddress();
  console.log(`   New AuSysFacet deployed at: ${facetAddress}`);

  // Prepare diamondCut
  // Action: 0 = Add, 1 = Replace, 2 = Remove
  const cut = [
    {
      facetAddress: facetAddress,
      action: 0, // Add
      functionSelectors: selectorsToAdd,
    },
  ];

  console.log('\n💎 Executing diamondCut...');
  console.log(`   Adding ${selectorsToAdd.length} selectors`);

  const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, '0x');
  console.log(`   Transaction: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`   Confirmed in block ${receipt.blockNumber}`);

  // Verify selectors were added
  console.log('\n✅ Verifying selectors...');
  for (const selector of selectorsToAdd) {
    const facetAddr = await diamondLoupe.facetAddress(selector);
    if (facetAddr.toLowerCase() === facetAddress.toLowerCase()) {
      console.log(`   ${selector} ✓ registered at ${facetAddr}`);
    } else {
      console.log(`   ${selector} ✗ FAILED - got ${facetAddr}`);
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('✅ AuSysFacet P2P upgrade complete!\n');
  console.log(`New AuSysFacet: ${facetAddress}`);
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
