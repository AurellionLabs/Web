// @ts-nocheck - Script with chain constants defined inline

/**
 * Script to add supported asset classes and default assets to the AuraAsset contract
 * This should be run after deployment if asset classes were not added during deployment
 */

import { ethers } from 'hardhat';
import { PinataSDK } from 'pinata';
import * as dotenv from 'dotenv';
import { getIpfsGroupId } from '../chain-constants';
import {
  buildSupportedAssetMetadataPayload,
  getSupportedAssetClasses,
  loadSupportedAssetCatalog,
  toSupportedAssetContractAsset,
} from './lib/supported-assets';

dotenv.config();

const AURA_ASSET_ADDRESS = '0xdc1B355885ba73EFf0f0a5A72F12D87e785581a8';
const AURUM_NODE_MANAGER_ADDRESS = '0xc50F6505BcBb00Af8f1086d9121525695Bf09D30';

async function main() {
  const [deployer] = await ethers.getSigners();
  const catalog = loadSupportedAssetCatalog();
  const defaultClasses = getSupportedAssetClasses(catalog);
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

  const pinata = process.env.PINATA_JWT
    ? new PinataSDK({
        pinataJwt: process.env.PINATA_JWT,
        pinataGateway: 'orange-electronic-flyingfish-697.mypinata.cloud',
      })
    : null;
  const chainId = Number(process.env.CHAIN_ID || 84532);
  const groupId = pinata ? getIpfsGroupId(chainId) : null;

  console.log('\n=== Adding Supported Assets ===');
  for (const entry of catalog) {
    const defaultAsset = toSupportedAssetContractAsset(entry);
    const metadataJson = buildSupportedAssetMetadataPayload(entry);

    try {
      console.log(`Adding supported asset ${entry.name}...`);
      const addAssetTx = await auraAsset.addSupportedAsset(defaultAsset as any);
      await addAssetTx.wait();
      console.log(`✓ Added supported asset: ${entry.name}`);
    } catch (e: any) {
      if (e.message.includes('already') || e.message.includes('exists')) {
        console.log(`⚠ Asset ${entry.name} already exists`);
      } else {
        console.log(`✗ Failed to add ${entry.name}:`, e.message);
      }
    }

    if (!pinata || !groupId) {
      continue;
    }

    try {
      const existingMetadata = await pinata.files.public
        .list()
        .group(groupId)
        .keyvalues({ tokenId: metadataJson.tokenId })
        .all();

      if (existingMetadata.length > 0) {
        console.log(
          `⚠ Metadata for ${entry.name} already exists on Pinata (${metadataJson.tokenId})`,
        );
        continue;
      }

      const upload = await pinata.upload.public
        .json(metadataJson)
        .group(groupId)
        .name(`${metadataJson.tokenId}.json`)
        .keyvalues({
          tokenId: metadataJson.tokenId,
          className: metadataJson.className,
          hash: metadataJson.hash,
          assetName: entry.name,
        });

      console.log(`✓ Uploaded metadata for ${entry.name}:`, upload.cid);
    } catch (e: any) {
      console.log(`✗ Failed to upload metadata for ${entry.name}:`, e.message);
    }
  }

  if (!pinata) {
    console.log('⚠ PINATA_JWT not set, skipping IPFS upload');
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
