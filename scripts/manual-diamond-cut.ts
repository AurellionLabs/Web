import { ethers } from 'hardhat';

async function main() {
  const diamondAddress = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';
  const facetAddress = '0x2fBeAA431a6fCE7F5b727602bD6d3E4D652Be1EA';

  // Selectors
  const toAdd = ['0x8bb3f5f3', '0x22fa658e', '0x1cbb4757']; // initializeCLOBV2, placeLimitOrder, placeMarketOrder
  const toReplace = ['0x94ca6c47', '0x7489ec23']; // placeNodeSellOrderV2, cancelOrder

  console.log('🔧 Manual Diamond Cut for CLOBFacetV2\n');
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`Facet: ${facetAddress}`);
  console.log(`\nSelectors to REPLACE: ${toReplace.join(', ')}`);
  console.log(`Selectors to ADD: ${toAdd.join(', ')}`);

  const diamondCut = await ethers.getContractAt('IDiamondCut', diamondAddress);

  const facetCuts = [
    {
      facetAddress: facetAddress,
      action: 1, // Replace
      functionSelectors: toReplace,
    },
    {
      facetAddress: facetAddress,
      action: 0, // Add
      functionSelectors: toAdd,
    },
  ];

  console.log('\n⚙️  Executing diamondCut...');

  try {
    const tx = await diamondCut.diamondCut(facetCuts, ethers.ZeroAddress, '0x');
    console.log(`   TX: ${tx.hash}`);
    await tx.wait();
    console.log('   ✓ Diamond cut successful!\n');

    // Verify
    const diamondLoupe = await ethers.getContractAt(
      'IDiamondLoupe',
      diamondAddress,
    );
    console.log('🔍 Verifying selectors...');

    for (const selector of [...toReplace, ...toAdd]) {
      const addr = await diamondLoupe.facetAddress(selector);
      const match = addr.toLowerCase() === facetAddress.toLowerCase();
      console.log(`   ${selector} → ${addr} ${match ? '✓' : '✗'}`);
    }
  } catch (error: any) {
    console.error('❌ Diamond cut failed:', error.message);
  }
}

main().catch(console.error);
