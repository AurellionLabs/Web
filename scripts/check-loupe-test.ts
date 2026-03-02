import { ethers } from 'hardhat';

async function main() {
  const DIAMOND = '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7';
  const loupe = await ethers.getContractAt('IDiamondLoupe', DIAMOND);
  const facets = await loupe.facets();
  // Print first 3 selectors from any facet to see format
  for (const facet of facets.slice(0, 3)) {
    console.log('facet:', facet.facetAddress);
    console.log('selectors sample:', facet.functionSelectors.slice(0, 3));
    break;
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
