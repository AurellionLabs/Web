// @ts-nocheck - Script with outdated contract types
import { ethers } from 'hardhat';

async function main() {
  const AURUM_NODE_MANAGER = '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30';
  const AURA_ASSET = '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';

  console.log('Checking contracts on Base Sepolia...\n');

  // Get contract instances
  const aurum = await ethers.getContractAt(
    'AurumNodeManager',
    AURUM_NODE_MANAGER,
  );
  const auraAsset = await ethers.getContractAt('AuraAsset', AURA_ASSET);

  // Check supported classes on AuraAsset
  console.log('=== AuraAsset Supported Classes ===');
  try {
    const classes: string[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const className = await auraAsset.supportedClasses(i);
        classes.push(className);
        console.log(`Class ${i}: ${className}`);
      } catch (e) {
        // End of array
        break;
      }
    }
    console.log(`Total classes found: ${classes.length}`);
  } catch (e: any) {
    console.log('supportedClasses error:', e.message);
  }

  // Check supported assets on AuraAsset
  console.log('\n=== AuraAsset Supported Assets ===');
  try {
    const assets: string[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const assetName = await auraAsset.supportedAssets(i);
        assets.push(assetName);
        console.log(`Asset ${i}: ${assetName}`);
      } catch (e) {
        // End of array
        break;
      }
    }
    console.log(`Total assets found: ${assets.length}`);
  } catch (e: any) {
    console.log('supportedAssets error:', e.message);
  }

  // Check supported tokens on AurumNodeManager
  console.log('\n=== AurumNodeManager Supported Tokens ===');
  try {
    const tokens: string[] = [];
    for (let i = 0; i < 10; i++) {
      try {
        const token = await aurum.supportedTokens(i);
        tokens.push(token);
        console.log(`Token ${i}: ${token}`);
      } catch (e) {
        // End of array
        break;
      }
    }
    console.log(`Total tokens found: ${tokens.length}`);
  } catch (e: any) {
    console.log('supportedTokens error:', e.message);
  }

  // Check owner
  console.log('\n=== Contract Owners ===');
  try {
    const aurumOwner = await aurum.owner();
    console.log('AurumNodeManager owner:', aurumOwner);
  } catch (e: any) {
    console.log('owner() error:', e.message);
  }

  try {
    const auraAssetOwner = await auraAsset.owner();
    console.log('AuraAsset owner:', auraAssetOwner);
  } catch (e: any) {
    console.log('AuraAsset owner() error:', e.message);
  }

  console.log('\nDone!');
}

main().catch(console.error);
