import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const DIAMOND_ADDRESS = '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  const CLOB_FACET = '0xdFca2E2288C6E8e502aE139854B971a5f19B9C97';

  // New selectors that need to be added to CLOBFacet
  const newSelectorsToAdd = [
    '0x631adcef', // placeNodeSellOrder - for node sell orders
    '0x069e403f', // placeBuyOrder - for buy orders
    '0x5cc519cd', // cancelCLOBOrder - cancel any order
    '0x337cd847', // getOpenOrders - view open orders
    '0x882363ae', // getOrderWithTokens - get order with token info
  ];

  const diamondCut = await ethers.getContractAt('IDiamondCut', DIAMOND_ADDRESS);
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    DIAMOND_ADDRESS,
  );

  // Check if selectors already exist
  console.log('\nChecking current selector mappings:');
  for (const selector of newSelectorsToAdd) {
    const facet = await diamondLoupe.facetAddress(selector);
    console.log(
      `  ${selector}: ${facet === ethers.ZeroAddress ? 'NOT REGISTERED' : facet}`,
    );
  }

  // Add the new selectors
  console.log('\nAdding new selectors to CLOBFacet...');

  try {
    const tx = await diamondCut.diamondCut(
      [
        {
          facetAddress: CLOB_FACET,
          action: 0, // Add
          functionSelectors: newSelectorsToAdd,
        },
      ],
      ethers.ZeroAddress,
      '0x',
    );

    const receipt = await tx.wait();
    console.log('Transaction hash:', receipt.hash);

    // Verify
    console.log('\nVerifying new selector mappings:');
    for (const selector of newSelectorsToAdd) {
      const facet = await diamondLoupe.facetAddress(selector);
      console.log(`  ${selector}: ${facet}`);
    }

    console.log('\n✅ Successfully added CLOBFacet selectors!');
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log('Selectors already exist, trying replace...');
      const tx = await diamondCut.diamondCut(
        [
          {
            facetAddress: CLOB_FACET,
            action: 1, // Replace
            functionSelectors: newSelectorsToAdd,
          },
        ],
        ethers.ZeroAddress,
        '0x',
      );
      const receipt = await tx.wait();
      console.log('Transaction hash:', receipt.hash);
      console.log('✅ Successfully replaced CLOBFacet selectors!');
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
