import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

// Function selectors
const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

async function main() {
  console.log('Adding ERC1155ReceiverFacet to Diamond...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Deploy ERC1155ReceiverFacet
  console.log('\n=== Deploying ERC1155ReceiverFacet ===');
  const ERC1155ReceiverFacet = await ethers.getContractFactory(
    'ERC1155ReceiverFacet',
  );
  const erc1155ReceiverFacet = await ERC1155ReceiverFacet.deploy();
  await erc1155ReceiverFacet.waitForDeployment();
  const facetAddress = await erc1155ReceiverFacet.getAddress();
  console.log('ERC1155ReceiverFacet deployed to:', facetAddress);

  // Get function selectors
  const selectors = [
    '0xf23a6e61', // onERC1155Received(address,address,uint256,uint256,bytes)
    '0xbc197c81', // onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)
  ];

  console.log('\nSelectors to add:');
  console.log('  onERC1155Received:', selectors[0]);
  console.log('  onERC1155BatchReceived:', selectors[1]);

  // Note: NOT adding supportsInterface (0x01ffc9a7) because it's likely already registered
  // by DiamondLoupeFacet. We need to check first.

  // Check if supportsInterface is already registered
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );
  const supportsInterfaceSelector = '0x01ffc9a7';
  const existingFacet = await diamondLoupe.facetAddress(
    supportsInterfaceSelector,
  );
  console.log('\nsupportsInterface already registered at:', existingFacet);

  if (existingFacet === '0x0000000000000000000000000000000000000000') {
    selectors.push(supportsInterfaceSelector);
    console.log('Adding supportsInterface to the cut');
  } else {
    console.log(
      'supportsInterface already exists, not adding to avoid conflict',
    );
  }

  // Prepare diamond cut
  const cut = [
    {
      facetAddress: facetAddress,
      action: FacetCutAction.Add,
      functionSelectors: selectors,
    },
  ];

  console.log('\n=== Executing Diamond Cut ===');
  const diamondCut = await ethers.getContractAt(
    'IDiamondCut',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, '0x');
  console.log('Transaction hash:', tx.hash);

  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt?.blockNumber);

  // Verify the functions are now registered
  console.log('\n=== Verifying Registration ===');

  for (const selector of selectors) {
    const facet = await diamondLoupe.facetAddress(selector);
    console.log(`Selector ${selector} -> ${facet}`);
    if (facet.toLowerCase() === facetAddress.toLowerCase()) {
      console.log('  ✓ Correctly registered');
    } else {
      console.log('  ⚠️ Unexpected facet address');
    }
  }

  // Test that nodeMint should now work
  console.log('\n=== Testing nodeMint ===');
  const auraAsset = await ethers.getContractAt(
    'AuraAsset',
    '0x1235E39477752713902bCE541Fc02ADeb6FF465b',
  );

  const asset = {
    name: 'AUGOAT',
    assetClass: 'GOAT',
    attributes: [
      { name: 'Weight', values: ['M'], description: '' },
      { name: 'Sex', values: ['M'], description: '' },
    ],
  };

  try {
    const gasEstimate = await auraAsset.nodeMint.estimateGas(
      NEXT_PUBLIC_DIAMOND_ADDRESS,
      asset,
      1,
      'GOAT',
      '0x',
    );
    console.log('✓ Gas estimate succeeded:', gasEstimate.toString());
    console.log('\nnodeMint should now work! Run the actual mint to confirm.');
  } catch (e: any) {
    console.log('✗ Gas estimate still failed:', e.message);
    if (e.data) {
      console.log('Error data:', e.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
