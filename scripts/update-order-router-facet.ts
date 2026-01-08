import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

// Function selectors
const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

async function main() {
  console.log(
    'Updating OrderRouterFacet with OrderPlacedWithTokens events...\n',
  );

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Get current facet address for placeOrder
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  // Deploy new OrderRouterFacet
  console.log('\n=== Deploying Updated OrderRouterFacet ===');
  const OrderRouterFacet = await ethers.getContractFactory('OrderRouterFacet');
  const orderRouterFacet = await OrderRouterFacet.deploy();
  await orderRouterFacet.waitForDeployment();
  const newFacetAddress = await orderRouterFacet.getAddress();
  console.log('New OrderRouterFacet deployed to:', newFacetAddress);

  // Get all function selectors from the new facet
  const facetInterface = OrderRouterFacet.interface;
  const selectorsToReplace: string[] = [];

  for (const fragment of facetInterface.fragments) {
    if (fragment.type === 'function') {
      const selector = facetInterface.getFunction(fragment.name)?.selector;
      if (selector) {
        // Check if this selector already exists in the Diamond
        const existingFacet = await diamondLoupe.facetAddress(selector);
        if (existingFacet !== ethers.ZeroAddress) {
          selectorsToReplace.push(selector);
          console.log(`  Replace: ${fragment.name} (${selector})`);
        } else {
          console.log(
            `  Skip (not in Diamond): ${fragment.name} (${selector})`,
          );
        }
      }
    }
  }

  if (selectorsToReplace.length === 0) {
    console.log('\nNo selectors to replace. Exiting.');
    return;
  }

  // Prepare diamond cut - REPLACE action
  const cut = [
    {
      facetAddress: newFacetAddress,
      action: FacetCutAction.Replace,
      functionSelectors: selectorsToReplace,
    },
  ];

  console.log(
    `\n=== Executing Diamond Cut (${selectorsToReplace.length} selectors) ===`,
  );
  const diamondCut = await ethers.getContractAt(
    'IDiamondCut',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  const tx = await diamondCut.diamondCut(cut, ethers.ZeroAddress, '0x');
  console.log('Transaction hash:', tx.hash);
  const receipt = await tx.wait();
  console.log('Transaction confirmed in block:', receipt?.blockNumber);

  // Verify the update
  console.log('\n=== Verifying Update ===');
  const verifySelector = selectorsToReplace[0];
  const updatedFacet = await diamondLoupe.facetAddress(verifySelector);
  console.log(`Facet for ${verifySelector}: ${updatedFacet}`);
  console.log(`Expected: ${newFacetAddress}`);
  console.log(
    `Match: ${updatedFacet.toLowerCase() === newFacetAddress.toLowerCase()}`,
  );

  console.log('\n✅ OrderRouterFacet updated successfully!');
  console.log(
    'New orders will now emit OrderPlacedWithTokens events for the indexer.',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
