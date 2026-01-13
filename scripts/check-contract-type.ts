import { ethers } from 'hardhat';
import {
  NEXT_PUBLIC_AURA_ASSET_ADDRESS,
  NEXT_PUBLIC_DIAMOND_ADDRESS,
} from '../chain-constants';

async function main() {
  console.log('Checking what contract is at each address...\n');

  // Check AuraAsset address
  console.log('=== AuraAsset Address ===');
  console.log('Address:', NEXT_PUBLIC_AURA_ASSET_ADDRESS);

  // Try to call Diamond-specific functions
  const diamondLoupe = new ethers.Interface([
    'function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
    'function facetAddresses() view returns (address[])',
  ]);

  const provider = ethers.provider;

  // Check if it's a Diamond by calling facetAddresses
  try {
    const calldata = diamondLoupe.encodeFunctionData('facetAddresses', []);
    const result = await provider.call({
      to: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      data: calldata,
    });
    const decoded = diamondLoupe.decodeFunctionResult('facetAddresses', result);
    console.log('  ⚠️  This IS a Diamond! Facet addresses:', decoded[0]);
  } catch (e: any) {
    console.log('  ✓ Not a Diamond (facetAddresses call failed)');
  }

  // Try to call AuraAsset-specific functions
  const auraAssetIface = new ethers.Interface([
    'function owner() view returns (address)',
    'function supportedClasses(uint256) view returns (string)',
  ]);

  try {
    const calldata = auraAssetIface.encodeFunctionData('owner', []);
    const result = await provider.call({
      to: NEXT_PUBLIC_AURA_ASSET_ADDRESS,
      data: calldata,
    });
    const decoded = auraAssetIface.decodeFunctionResult('owner', result);
    console.log('  ✓ Has owner() function, owner:', decoded[0]);
  } catch (e: any) {
    console.log('  ✗ No owner() function:', e.message);
  }

  // Check Diamond address
  console.log('\n=== Diamond Address ===');
  console.log('Address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  try {
    const calldata = diamondLoupe.encodeFunctionData('facetAddresses', []);
    const result = await provider.call({
      to: NEXT_PUBLIC_DIAMOND_ADDRESS,
      data: calldata,
    });
    const decoded = diamondLoupe.decodeFunctionResult('facetAddresses', result);
    console.log('  ✓ This IS a Diamond! Facet addresses:', decoded[0]);
  } catch (e: any) {
    console.log('  ✗ Not a Diamond:', e.message);
  }

  // Check if AuraAsset and Diamond are the same
  console.log('\n=== Comparison ===');
  console.log(
    'AuraAsset === Diamond?',
    NEXT_PUBLIC_AURA_ASSET_ADDRESS.toLowerCase() ===
      NEXT_PUBLIC_DIAMOND_ADDRESS.toLowerCase(),
  );

  // Try calling nodeMint selector directly on AuraAsset
  console.log('\n=== Checking nodeMint ===');
  const nodeMintSelector = '0xbf72dbe1';

  // Check if the selector exists in the contract
  const code = await provider.getCode(NEXT_PUBLIC_AURA_ASSET_ADDRESS);
  const hasSelector = code
    .toLowerCase()
    .includes(nodeMintSelector.slice(2).toLowerCase());
  console.log('  nodeMint selector in bytecode:', hasSelector);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
