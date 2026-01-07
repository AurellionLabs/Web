import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const DIAMOND_ADDRESS = '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  const NEW_NODES_FACET = '0x7C3dc2A7fb69DEF36856F059b88a0900970b1dBD';

  // Selectors that need to be updated to point to new NodesFacet
  const selectorsToUpdate = [
    '0xbcd542d1', // placeSellOrderFromNode
    '0xd1a69b35', // setClobAddress
    '0x0f392fb4', // getClobAddress
  ];

  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  // Check current facet for placeSellOrderFromNode
  const currentFacet = await diamondLoupe.facetAddress('0xbcd542d1');
  console.log('Current facet for placeSellOrderFromNode:', currentFacet);
  console.log('New NodesFacet address:', NEW_NODES_FACET);

  if (currentFacet.toLowerCase() === NEW_NODES_FACET.toLowerCase()) {
    console.log('Already pointing to correct facet!');
    return;
  }

  // Replace the selectors
  console.log('\nReplacing selectors to point to new NodesFacet...');

  const tx = await diamondCut.diamondCut(
    [
      {
        facetAddress: NEW_NODES_FACET,
        action: 1, // Replace
        functionSelectors: selectorsToUpdate,
      },
    ],
    ethers.ZeroAddress,
    '0x',
  );

  const receipt = await tx.wait();
  console.log('Transaction hash:', receipt.hash);

  // Verify
  const newFacet = await diamondLoupe.facetAddress('0xbcd542d1');
  console.log('New facet for placeSellOrderFromNode:', newFacet);

  if (newFacet.toLowerCase() === NEW_NODES_FACET.toLowerCase()) {
    console.log('✅ Successfully updated!');
  } else {
    console.log('❌ Update failed!');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
