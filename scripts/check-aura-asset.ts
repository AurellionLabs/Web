import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '../chain-constants';

async function main() {
  console.log('=== Checking AuraAsset Contract ===\n');
  console.log('AuraAsset address:', NEXT_PUBLIC_AURA_ASSET_ADDRESS);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Check if the contract has code
  const code = await ethers.provider.getCode(NEXT_PUBLIC_AURA_ASSET_ADDRESS);
  console.log('\n--- Contract Code ---');
  console.log('  Has code:', code.length > 2 ? 'Yes' : 'No');
  console.log('  Code length:', code.length, 'bytes');

  // Check if it might be a Diamond proxy by looking for DiamondLoupe functions
  console.log('\n--- Checking if contract is a Diamond proxy ---');
  const diamondLoupeInterface = new ethers.Interface([
    'function facets() external view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
    'function facetFunctionSelectors(address _facet) external view returns (bytes4[])',
    'function facetAddresses() external view returns (address[])',
  ]);

  try {
    const contract = new ethers.Contract(
      NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      diamondLoupeInterface,
      ethers.provider,
    );
    const facetAddresses = await contract.facetAddresses();
    console.log('  ⚠️  CONTRACT IS A DIAMOND PROXY!');
    console.log('  Facet addresses:', facetAddresses);
    console.log(
      '\n  ERROR: AuraAsset address points to a Diamond contract, not AuraAsset!',
    );
    console.log(
      '  You need to redeploy AuraAsset and update chain-constants.ts',
    );
    return;
  } catch (e: any) {
    console.log('  ✓ Not a Diamond proxy (facetAddresses() failed)');
  }

  // Now check AuraAsset-specific functions
  console.log('\n--- AuraAsset Contract Info ---');
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  );

  try {
    const owner = await auraAsset.owner();
    console.log('  Owner:', owner);
  } catch (e: any) {
    console.log('  Error getting owner:', e.message);
  }

  try {
    const nodeManager = await auraAsset.NodeManager();
    console.log('  NodeManager:', nodeManager);
    console.log(
      '  NodeManager === Diamond?',
      nodeManager.toLowerCase() === NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase(),
    );
  } catch (e: any) {
    console.log('  Error getting NodeManager:', e.message);
  }

  // Check supported classes
  console.log('\n--- Supported Classes ---');
  try {
    const goatClassKey = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(['string'], ['GOAT']),
    );
    const isGoatActive = await auraAsset.isClassActive(goatClassKey);
    console.log('  GOAT class active:', isGoatActive);
  } catch (e: any) {
    console.log('  Error checking GOAT class:', e.message);
  }

  // Check nodeMint selector
  const iface = new ethers.Interface([
    'function nodeMint(address account, tuple(string name, string assetClass, tuple(string name, string[] values, string description)[] attributes) asset, uint256 amount, string className, bytes data) returns (bytes32, uint256)',
  ]);
  const selector = iface.getFunction('nodeMint')?.selector;
  console.log('\n--- Function Selectors ---');
  console.log('  nodeMint selector:', selector);
  console.log(
    '  nodeMint in bytecode:',
    code.toLowerCase().includes(selector!.slice(2).toLowerCase()),
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
