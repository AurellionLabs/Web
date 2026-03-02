const { ethers } = require('hardhat');

async function main() {
  const diamond = '0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58';

  // Try calling getRWYConfig
  try {
    const rwy = await ethers.getContractAt('IRWYStaking', diamond);
    const config = await rwy.getRWYConfig();
    console.log('=== RWY Config ===');
    console.log(
      'minOperatorCollateralBps:',
      config.minOperatorCollateralBps?.toString(),
    );
    console.log('maxYieldBps:', config.maxYieldBps?.toString());
    console.log('protocolFeeBps:', config.protocolFeeBps?.toString());
    console.log(
      'defaultProcessingDays:',
      config.defaultProcessingDays?.toString(),
    );
  } catch (e) {
    console.log('getRWYConfig error:', e.message.slice(0, 200));
  }

  // Also try calling initializeRWYStaking again to see if it's already initialized
  try {
    const rwy2 = await ethers.getContractAt('RWYStakingFacet', diamond);
    const tx = await rwy2.initializeRWYStaking();
    console.log('\ninitializeRWYStaking() called again - tx:', tx.hash);
  } catch (e) {
    console.log('\ninitializeRWYStaking result:', e.message.slice(0, 300));
  }
}

main().catch(console.error);
