import { ethers } from 'hardhat';

/**
 * Configure the AuraAsset address on the Diamond's NodesFacet
 * This is required before nodes can use approveClobForTokens()
 */

async function main() {
  console.log('==========================================');
  console.log('Configuring AuraAsset Address on Diamond');
  console.log('==========================================\n');

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}\n`);

  // Addresses
  const DIAMOND_ADDRESS =
    process.env.DIAMOND_ADDRESS || '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  const AURA_ASSET_ADDRESS =
    process.env.AURA_ASSET_ADDRESS ||
    '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';

  console.log(`Diamond address: ${DIAMOND_ADDRESS}`);
  console.log(`AuraAsset address: ${AURA_ASSET_ADDRESS}\n`);

  // Get NodesFacet interface on Diamond
  const nodesFacet = await ethers.getContractAt('NodesFacet', DIAMOND_ADDRESS);

  // Check current value
  try {
    const currentAddress = await nodesFacet.getAuraAssetAddress();
    console.log(`Current AuraAsset address: ${currentAddress}`);

    if (currentAddress.toLowerCase() === AURA_ASSET_ADDRESS.toLowerCase()) {
      console.log('✓ AuraAsset address already configured correctly!\n');
      return;
    }
  } catch (e) {
    console.log('AuraAsset address not yet configured\n');
  }

  // Set the address
  console.log('Setting AuraAsset address...');
  const tx = await nodesFacet.setAuraAssetAddress(AURA_ASSET_ADDRESS);
  await tx.wait();
  console.log(`✓ Transaction hash: ${tx.hash}\n`);

  // Verify
  const newAddress = await nodesFacet.getAuraAssetAddress();
  console.log(`Verified AuraAsset address: ${newAddress}`);

  if (newAddress.toLowerCase() === AURA_ASSET_ADDRESS.toLowerCase()) {
    console.log('✓ AuraAsset address configured successfully!\n');
  } else {
    console.log('⚠ Address mismatch - please verify manually\n');
  }

  console.log('==========================================');
  console.log('Configuration Complete!');
  console.log('==========================================\n');

  console.log('Nodes registered through the Diamond can now use:');
  console.log(
    '  - placeSellOrderFromNode() - Place sell orders from node inventory',
  );
  console.log('  - creditNodeTokens() - Credit tokens to node inventory');
  console.log('  - getNodeTokenBalance() - Check node token balances');
  console.log('\nNote: CLOB approval functions are deprecated.');
  console.log(
    'CLOBFacet is now internal to Diamond - no external approval needed.\n',
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
