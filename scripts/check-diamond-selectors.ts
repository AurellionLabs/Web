import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

async function main() {
  console.log('Checking Diamond selectors...\n');
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );

  // Get all facets
  const facets = await diamondLoupe.facets();

  console.log('\n=== Facets and Selectors ===\n');

  const getNodeStatusSelector = '0xb65f8177';
  let foundGetNodeStatus = false;

  for (const facet of facets) {
    console.log(`Facet: ${facet.facetAddress}`);
    console.log(`  Selectors (${facet.functionSelectors.length}):`);
    for (const selector of facet.functionSelectors) {
      const isGetNodeStatus =
        selector.toLowerCase() === getNodeStatusSelector.toLowerCase();
      if (isGetNodeStatus) {
        foundGetNodeStatus = true;
        console.log(`    ${selector} <-- getNodeStatus() FOUND!`);
      } else {
        console.log(`    ${selector}`);
      }
    }
    console.log('');
  }

  console.log('=== Summary ===');
  console.log(
    `getNodeStatus (${getNodeStatusSelector}) registered in Diamond:`,
    foundGetNodeStatus,
  );

  if (!foundGetNodeStatus) {
    console.log('\n⚠️  getNodeStatus is NOT registered in the Diamond!');
    console.log(
      'This is why nodeMint fails - AuraAsset calls Diamond.getNodeStatus() but it does not exist.',
    );
    console.log(
      '\nTo fix: Update NodesFacet in the Diamond to include getNodeStatus selector.',
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
