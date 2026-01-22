/**
 * Diagnostic script to check asset metadata directly from IPFS
 * No Pinata SDK needed - just fetch the CID directly
 *
 * Usage:
 *   node scripts/check-asset-metadata.js <cid-or-token-id>
 *
 * Examples:
 *   node scripts/check-asset-metadata.js QmXXXXX...
 *   node scripts/check-asset-metadata.js 6627587080
 */

require('dotenv').config();

const INPUT = process.argv[2];

if (!INPUT) {
  console.error(
    'Usage: node scripts/check-asset-metadata.js <cid-or-token-id>',
  );
  console.error('Example: node scripts/check-asset-metadata.js QmXXXXX...');
  console.error('Example: node scripts/check-asset-metadata.js 6627587080');
  process.exit(1);
}

// List of public IPFS gateways to try
const GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

async function fetchFromGateway(cid, gateway) {
  const url = `${gateway}${cid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function main() {
  console.log(`Checking asset metadata for: ${INPUT}\n`);

  // Check if input is a CID or tokenId
  const isCID = INPUT.startsWith('Qm') || INPUT.startsWith('bafy');

  if (!isCID) {
    console.log('Input appears to be a tokenId, not a CID.');
    console.log('To check by tokenId, you need Pinata JWT configured.');
    console.log('Set NEXT_PUBLIC_PINATA_JWT in your .env file.');
    console.log('\nIf you know the CID, you can check it directly:');
    console.log(`  node scripts/check-asset-metadata.js <CID>`);
    process.exit(1);
  }

  let data = null;
  let usedGateway = null;

  // Try each gateway
  for (const gateway of GATEWAYS) {
    try {
      console.log(`Trying ${gateway}...`);
      data = await fetchFromGateway(INPUT, gateway);
      usedGateway = gateway;
      console.log('✅ Success!\n');
      break;
    } catch (err) {
      console.log(`  Failed: ${err.message}`);
    }
  }

  if (!data) {
    console.error('\n❌ Could not fetch metadata from any gateway');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log(`Fetched from: ${usedGateway}${INPUT}`);
  console.log('='.repeat(60));
  console.log('\nFull IPFS Metadata:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n' + '='.repeat(60));

  // Check for class field - check ALL possible locations
  const classValue =
    data.className ||
    data.class ||
    data.assetClass ||
    (data.asset && data.asset.assetClass);

  console.log('\nClass field analysis:');
  console.log('  - className:', data.className);
  console.log('  - class:', data.class);
  console.log('  - assetClass:', data.assetClass);
  console.log(
    '  - asset.assetClass:',
    data.asset ? data.asset.assetClass : 'N/A',
  );
  console.log('');

  if (classValue) {
    console.log(`✅ Asset class found: "${classValue}"`);
  } else {
    console.log(`❌ Asset class NOT FOUND - will display as "Unknown"`);
    console.log(
      '\nTo fix this, update the IPFS metadata JSON to include one of:',
    );
    console.log('  - className: "YourClassName"');
    console.log('  - class: "YourClassName"');
    console.log('  - assetClass: "YourClassName"');
    console.log('  - asset: { assetClass: "YourClassName", ... }');
  }
  console.log('');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
