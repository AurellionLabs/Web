import { ethers } from 'hardhat';

/**
 * Set the CLOB address on the Diamond contract
 */
async function main() {
  const DIAMOND_ADDRESS = '0x2516CAdb7b3d4E94094bC4580C271B8559902e3f';
  const CLOB_ADDRESS = '0x2f17AF60e5Ca09Eb55560bFB9A374701711a4C49';

  console.log('Setting CLOB address on Diamond...');
  console.log(`Diamond: ${DIAMOND_ADDRESS}`);
  console.log(`CLOB: ${CLOB_ADDRESS}`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const diamond = await ethers.getContractAt('NodesFacet', DIAMOND_ADDRESS);

  // Check current CLOB address
  try {
    const currentClob = await diamond.getClobAddress();
    console.log(`Current CLOB address: ${currentClob}`);

    if (currentClob.toLowerCase() === CLOB_ADDRESS.toLowerCase()) {
      console.log('CLOB address already set correctly!');
      return;
    }
  } catch (e) {
    console.log('Could not get current CLOB address (may not be set)');
  }

  // Set CLOB address
  console.log('\nSetting CLOB address...');
  const tx = await diamond.setClobAddress(CLOB_ADDRESS);
  await tx.wait();
  console.log('✅ CLOB address set!');

  // Verify
  const newClob = await diamond.getClobAddress();
  console.log(`New CLOB address: ${newClob}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
