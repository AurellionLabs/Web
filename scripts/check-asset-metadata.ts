/**
 * Diagnostic script to find and check asset metadata
 *
 * Usage:
 *   npx ts-node scripts/check-asset-metadata.ts <token-id>
 *
 * Example:
 *   npx ts-node scripts/check-asset-metadata.ts 6627587080
 */

import { PinataSDK } from 'pinata';
import * as dotenv from 'dotenv';

dotenv.config();

const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT || process.env.PINATA_JWT;
const TOKEN_ID = process.argv[2];

if (!PINATA_JWT) {
  console.error('Error: PINATA_JWT not found in environment variables');
  console.error('Please set NEXT_PUBLIC_PINATA_JWT or PINATA_JWT');
  process.exit(1);
}

if (!TOKEN_ID) {
  console.error(
    'Usage: npx ts-node scripts/check-asset-metadata.ts <token-id>',
  );
  console.error(
    'Example: npx ts-node scripts/check-asset-metadata.ts 6627587080',
  );
  process.exit(1);
}

async function main() {
  console.log(`Checking asset metadata for token_id: ${TOKEN_ID}\n`);

  const pinata = new PinataSDK({ pinataJwt: PINATA_JWT });

  try {
    // Search for files with this tokenId
    console.log('Searching Pinata for files with tokenId...');
    const list = await pinata.files.public
      .list()
      .keyvalues({ tokenId: TOKEN_ID })
      .all();

    if (!list || list.length === 0) {
      console.error(`No files found for token_id: ${TOKEN_ID}`);
      process.exit(1);
    }

    console.log(`Found ${list.length} file(s)\n`);

    for (const item of list) {
      console.log('='.repeat(60));
      console.log(`CID: ${item.cid}`);
      console.log(`Name: ${item.name}`);
      console.log(`Keyvalues:`, JSON.stringify(item.keyvalues, null, 2));
      console.log('-'.repeat(60));

      // Fetch and display the metadata
      try {
        const { data } = await pinata.gateways.public.get(item.cid);
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        console.log('\nIPFS Metadata:');
        console.log(JSON.stringify(json, null, 2));

        // Check for class field
        const classValue =
          (json.className as string) ??
          (json.class as string) ??
          (json.assetClass as string) ??
          (json.asset?.assetClass as string);

        console.log('\n' + '='.repeat(60));
        if (classValue) {
          console.log(`✅ Asset class found: "${classValue}"`);
        } else {
          console.log(`❌ Asset class NOT FOUND - will display as "Unknown"`);
          console.log(
            '\nTo fix this, update the IPFS metadata to include one of:',
          );
          console.log('  - className: "YourClassName"');
          console.log('  - class: "YourClassName"');
          console.log('  - assetClass: "YourClassName"');
          console.log('  - asset: { assetClass: "YourClassName", ... }');
        }
      } catch (err) {
        console.error(`Failed to fetch IPFS content: ${err}`);
      }
      console.log('');
    }
  } catch (error) {
    console.error('Error searching Pinata:', error);
    process.exit(1);
  }
}

main();
