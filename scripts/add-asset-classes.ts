// @ts-nocheck - Script with chain constants defined inline

/**
 * Script to add supported asset classes and default assets to the AuraAsset contract
 * This should be run after deployment if asset classes were not added during deployment
 */

// IPFS Group IDs per chain
const IPFS_GROUP_IDS: Record<number, string> = {
  42161: '9282bdc8-1a27-469a-b132-1e820e2433db', // Arbitrum One
  84532: '6eae9d79-14a8-45c4-9d1c-acf2a0f9a42c', // Base Sepolia
};

function getIpfsGroupId(chainId: number): string {
  const groupId = IPFS_GROUP_IDS[chainId];
  if (!groupId) {
    throw new Error(`No IPFS group configured for chain ${chainId}`);
  }
  return groupId;
}

import { ethers } from 'hardhat';
import { PinataSDK } from 'pinata';
import * as dotenv from 'dotenv';

dotenv.config();

const AURA_ASSET_ADDRESS = '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';
const AURUM_NODE_MANAGER_ADDRESS = '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Adding asset classes with account:', deployer.address);
  console.log(
    'Account balance:',
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    'ETH',
  );

  // Get contract instances
  const AuraAsset = await ethers.getContractFactory('AuraAsset');
  const auraAsset = AuraAsset.attach(AURA_ASSET_ADDRESS);

  const AurumNodeManager = await ethers.getContractFactory('AurumNodeManager');
  const aurumNodeManager = AurumNodeManager.attach(AURUM_NODE_MANAGER_ADDRESS);

  // Check current state
  console.log('\n=== Current State ===');
  try {
    const supportedClasses = await auraAsset.getSupportedClasses();
    console.log('Current supported classes:', supportedClasses);
  } catch (e: any) {
    console.log('No getSupportedClasses method or error:', e.message);
  }

  // Add default classes for testing
  console.log('\n=== Adding Supported Classes ===');
  const defaultClasses = ['GOAT', 'SHEEP', 'COW', 'CHICKEN', 'DUCK'];

  for (const className of defaultClasses) {
    try {
      console.log(`Adding class: ${className}...`);
      const tx = await auraAsset.addSupportedClass(className);
      await tx.wait();
      console.log(`✓ Added class: ${className}`);
    } catch (e: any) {
      if (e.message.includes('already') || e.message.includes('exists')) {
        console.log(`⚠ Class ${className} already exists`);
      } else {
        console.log(`✗ Failed to add ${className}:`, e.message);
      }
    }
  }

  // Add default AUGOAT asset with attributes
  console.log('\n=== Adding Default Asset (AUGOAT) ===');
  const defaultAsset = {
    name: 'AUGOAT',
    assetClass: 'GOAT',
    attributes: [
      {
        name: 'weight',
        values: ['S', 'M', 'L'],
        description: 'A goats weight either S = 20 KG, M = 30 KG, L = 40KG',
      },
      {
        name: 'sex',
        values: ['M', 'F'],
        description: 'Gender of the goat',
      },
    ],
  };

  try {
    console.log('Adding supported asset AUGOAT...');
    const addAssetTx = await auraAsset.addSupportedAsset(defaultAsset as any);
    await addAssetTx.wait();
    console.log('✓ Added default asset: AUGOAT');

    // Get the hash/tokenId for the asset
    const hash = await auraAsset.ipfsID(0);
    console.log('Asset hash/tokenId:', hash.toString());

    // Upload metadata to IPFS via Pinata
    if (process.env.PINATA_JWT) {
      console.log('\n=== Uploading to IPFS ===');
      const pinata = new PinataSDK({
        pinataJwt: process.env.PINATA_JWT,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      });

      const metadataJson = {
        tokenId: hash.toString(),
        hash: hash.toString(),
        asset: defaultAsset,
        className: defaultAsset.assetClass,
      };

      const metadataBase64 = Buffer.from(JSON.stringify(metadataJson)).toString(
        'base64',
      );

      // Get chain from environment or default to Base Sepolia
      const chainId = Number(process.env.CHAIN_ID || 84532);
      const groupId = getIpfsGroupId(chainId);
      console.log(`Using IPFS group: ${groupId} for chain: ${chainId}`);

      const upload = await pinata.upload.public
        .base64(metadataBase64)
        .group(groupId)
        .name(`${hash}.json`)
        .keyvalues({
          tokenId: hash.toString(),
          className: defaultAsset.assetClass,
        });

      console.log('✓ Uploaded to IPFS:', upload);
    } else {
      console.log('⚠ PINATA_JWT not set, skipping IPFS upload');
    }
  } catch (e: any) {
    if (e.message.includes('already') || e.message.includes('exists')) {
      console.log('⚠ Asset AUGOAT already exists');
    } else {
      console.log('✗ Failed to add AUGOAT:', e.message);
    }
  }

  // Add AuraAsset token to AurumNodeManager if not already added
  console.log('\n=== Adding Token to AurumNodeManager ===');
  try {
    const tx = await aurumNodeManager.addToken(AURA_ASSET_ADDRESS);
    await tx.wait();
    console.log('✓ Added AuraAsset token to AurumNodeManager');
  } catch (e: any) {
    if (e.message.includes('already') || e.message.includes('exists')) {
      console.log('⚠ Token already added to AurumNodeManager');
    } else {
      console.log('✗ Failed to add token:', e.message);
    }
  }

  // Verify final state
  console.log('\n=== Final State ===');
  try {
    const supportedClasses = await auraAsset.getSupportedClasses();
    console.log('Supported classes:', supportedClasses);
  } catch (e: any) {
    console.log('Could not get supported classes:', e.message);
  }

  try {
    const supportedAssets = await aurumNodeManager.getSupportedAssets();
    console.log('Supported assets in AurumNodeManager:', supportedAssets);
  } catch (e: any) {
    console.log('Could not get supported assets:', e.message);
  }

  console.log('\n✓ Asset class setup complete!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
