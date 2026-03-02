const { ethers } = require('hardhat');

async function main() {
  const diamond = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';
  const [signer] = await ethers.getSigners();

  console.log('Signer:', signer.address);
  console.log('Diamond:', diamond);
  console.log('');

  const rwy = await ethers.getContractAt('RWYStakingFacet', diamond);

  // Get current config
  console.log('=== Current Config ===');
  const currentConfig = await rwy.getRWYConfig();
  console.log(
    'minOperatorCollateralBps:',
    currentConfig.minOperatorCollateralBps?.toString(),
  );
  console.log('maxYieldBps:', currentConfig.maxYieldBps?.toString());
  console.log('protocolFeeBps:', currentConfig.protocolFeeBps?.toString());
  console.log(
    'defaultProcessingDays:',
    currentConfig.defaultProcessingDays?.toString(),
  );
  console.log('');

  // Update maxYieldBps to 5000 (50%)
  console.log('=== Updating maxYieldBps to 5000 (50%) ===');
  const tx1 = await rwy.setMaxYieldBps(5000);
  await tx1.wait();
  console.log('Transaction:', tx1.hash);

  // Update minOperatorCollateralBps to 2000 (20%)
  console.log('\n=== Updating minOperatorCollateralBps to 2000 (20%) ===');
  const tx2 = await rwy.setMinCollateralBps(2000);
  await tx2.wait();
  console.log('Transaction:', tx2.hash);

  // Verify new config
  console.log('\n=== New Config ===');
  const newConfig = await rwy.getRWYConfig();
  console.log(
    'minOperatorCollateralBps:',
    newConfig.minOperatorCollateralBps?.toString(),
  );
  console.log('maxYieldBps:', newConfig.maxYieldBps?.toString());
  console.log('protocolFeeBps:', newConfig.protocolFeeBps?.toString());
  console.log(
    'defaultProcessingDays:',
    newConfig.defaultProcessingDays?.toString(),
  );

  console.log('\n✅ RWY Staking config updated successfully!');
}

main().catch(console.error);
