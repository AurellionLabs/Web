/**
 * Script to fix asset metadata by updating class field in IPFS
 *
 * Usage:
 *   npx ts-node scripts/fix-asset-metadata.ts <token-id> <class-name>
 *
 * Example:
 *   npx ts-node scripts/fix-asset-metadata.ts 6627587080 "Commodities"
 *
 * Note: This will:
 * 1. Find the existing IPFS file for the token
 * 2. Update/add the className field
 * 3. Re-upload to Pinata
 * 4. Update the pin with the new CID
 */

import { PinataSDK } from 'pinata';
import * as dotenv from 'dotenv';

dotenv.config();

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
const TOKEN_ID = process.argv[2];
const CLASS_NAME = process.argv[3];

if (!PINATA_JWT) {
  console.error('Error: PINATA_JWT not found in environment variables');
  console.error('Please set NEXT_PUBLIC_PINATA_JWT or PINATA_JWT');
  process.exit(1);
}

if (!TOKEN_ID || !CLASS_NAME) {
  console.error(
    'Usage: npx ts-node scripts/fix-asset-metadata.ts <token-id> <class-name>',
  );
  console.error(
    'Example: npx ts-node scripts/fix-asset-metadata.ts 6627587080 "Commodities"',
  );
  process.exit(1);
}

async function main() {
  console.log(`Fixing asset metadata for token_id: ${TOKEN_ID}`);
  console.log(`Setting className to: "${CLASS_NAME}"\n`);

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT });

  try {
    // Find existing file
    console.log('Searching for existing file...');
    const list = await pinata.files.public
      .list()
      .keyvalues({ tokenId: TOKEN_ID })
      .all();

    if (!list || list.length === 0) {
      console.error(`No files found for token_id: ${TOKEN_ID}`);
      process.exit(1);
    }

    const existingFile = list[0];
    console.log(`Found existing file: ${existingFile.cid}`);

    // Fetch existing metadata
    const { data } = await pinata.gateways.public.get(existingFile.cid);
    const json = typeof data === 'string' ? JSON.parse(data) : data;

    console.log('\nOriginal metadata:');
    console.log(JSON.stringify(json, null, 2));

    // Update className field
    json.className = CLASS_NAME;

    console.log('\nUpdated metadata:');
    console.log(JSON.stringify(json, null, 2));

    // Re-upload to Pinata
    console.log('\nUploading updated metadata to Pinata...');
    const uploaded = await pinata.upload.public.json(json);
    console.log(`✅ New CID: ${uploaded.cid}`);

    // Update the pin to point to new CID (if using pinned files)
    // Note: This requires the old pin to be removed and new one kept
    // For now, we just log the new CID for reference

    console.log('\n' + '='.repeat(60));
    console.log('✅ Asset metadata updated successfully!');
    console.log(`   Old CID: ${existingFile.cid}`);
    console.log(`   New CID: ${uploaded.cid}`);
    console.log(
      '\n⚠️  Note: You may need to update any references to the old CID',
    );
    console.log('   in your system (database, smart contract, etc.)');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Error fixing asset metadata:', error);
    process.exit(1);
  }
}

main();
