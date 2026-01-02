import { ethers } from 'hardhat';

async function main() {
  const AURA_ASSET_ADDRESS = '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';

  const AuraAsset = await ethers.getContractFactory('AuraAsset');
  const auraAsset = AuraAsset.attach(AURA_ASSET_ADDRESS);

  console.log('Checking supportedClasses array...\n');

  // Try to read indices until we hit an error
  const classes: string[] = [];
  let emptyCount = 0;

  for (let i = 0; i < 50; i++) {
    try {
      const className = await auraAsset.supportedClasses(i);
      if (className && className.length > 0) {
        classes.push(className);
        console.log(`  [${i}]: "${className}"`);
      } else {
        emptyCount++;
        console.log(`  [${i}]: (empty/tombstoned)`);
      }
    } catch (err: any) {
      if (
        err.code === 'CALL_EXCEPTION' ||
        err.code === 'BAD_DATA' ||
        err.code === 'UNPREDICTABLE_GAS_LIMIT' ||
        err.message?.includes('could not decode') ||
        err.message?.includes('execution reverted')
      ) {
        console.log(`  [${i}]: (end of array - no more entries)`);
        break;
      }
      throw err;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total supported classes found: ${classes.length}`);
  console.log(`Empty/tombstoned entries: ${emptyCount}`);
  if (classes.length > 0) {
    console.log(`\nClasses: ${classes.join(', ')}`);
  } else {
    console.log('\nNo supported classes found in the array.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
