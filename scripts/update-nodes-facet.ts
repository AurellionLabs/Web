import { ethers } from 'hardhat';
import { NEXT_PUBLIC_DIAMOND_ADDRESS } from '../chain-constants';

// Function selectors
const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

async function main() {
  console.log('Updating NodesFacet with new getNodeStatus...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', signer.address);
  console.log('Diamond address:', NEXT_PUBLIC_DIAMOND_ADDRESS);

  // Get current facet address for getNodeStatus
  const diamondLoupe = await ethers.getContractAt(
    'IDiamondLoupe',
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );
  const getNodeStatusSelector = '0xb65f8177';
  const currentFacet = await diamondLoupe.facetAddress(getNodeStatusSelector);
  console.log('\nCurrent getNodeStatus facet:', currentFacet);

  // Deploy new NodesFacet
  console.log('\n=== Deploying Updated NodesFacet ===');
  const NodesFacet = await ethers.getContractFactory('NodesFacet');
  const nodesFacet = await NodesFacet.deploy();
  await nodesFacet.waitForDeployment();
  const newFacetAddress = await nodesFacet.getAddress();
  console.log('New NodesFacet deployed to:', newFacetAddress);

  // We only need to replace getNodeStatus selector
  // The other functions remain the same
  const selectorsToReplace = [getNodeStatusSelector];

  console.log('\nSelectors to replace:');
  console.log('  getNodeStatus:', getNodeStatusSelector);

  // Prepare diamond cut - REPLACE action
  const cut = [
    {
      facetAddress: newFacetAddress,
      action: FacetCutAction.Replace,
      functionSelectors: selectorsToReplace,
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

  // Verify the function is now registered to new facet
  console.log('\n=== Verifying Registration ===');
  const updatedFacet = await diamondLoupe.facetAddress(getNodeStatusSelector);
  console.log(`getNodeStatus facet: ${updatedFacet}`);
  if (updatedFacet.toLowerCase() === newFacetAddress.toLowerCase()) {
    console.log('  ✓ Successfully updated to new facet');
  } else {
    console.log('  ⚠️ Unexpected facet address');
  }

  // Test the new getNodeStatus with signer's address
  console.log('\n=== Testing New getNodeStatus ===');
  const diamond = new ethers.Contract(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
    ['function getNodeStatus(address) external view returns (bytes1)'],
    signer,
  );

  // Test Diamond address (should still be valid)
  const diamondStatus = await diamond.getNodeStatus(
    NEXT_PUBLIC_DIAMOND_ADDRESS,
  );
  console.log(`getNodeStatus(Diamond): ${diamondStatus} (expected: 0x01)`);

  // Test signer's address (will be valid if they own a node)
  const signerStatus = await diamond.getNodeStatus(signer.address);
  console.log(`getNodeStatus(Signer ${signer.address}): ${signerStatus}`);

  if (signerStatus === '0x01') {
    console.log('  ✓ Signer is a valid node owner');
  } else {
    console.log(
      '  ℹ Signer does not own any active nodes (this is expected if no nodes registered)',
    );
  }

  console.log('\n=== Update Complete ===');
  console.log(
    'NodesFacet updated. Node owner wallets can now receive minted tokens.',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
