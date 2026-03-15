#!/usr/bin/env bun

import path from 'node:path';

import { ethers } from 'hardhat';
import { PinataSDK } from 'pinata';

import { getIpfsGroupId } from '../chain-constants';
import { DEFAULT_SUPPORTED_ASSETS_DIR } from './lib/supported-assets';
import { syncSupportedAssets } from './lib/supported-assets-sync';

interface CliOptions {
  write: boolean;
  catalogDirectory: string;
  diamondAddress?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    catalogDirectory: process.env.SUPPORTED_ASSETS_DIR
      ? path.resolve(process.env.SUPPORTED_ASSETS_DIR)
      : DEFAULT_SUPPORTED_ASSETS_DIR,
    diamondAddress: process.env.DIAMOND_ADDRESS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--write') {
      options.write = true;
      continue;
    }

    if (arg === '--catalog') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --catalog');
      }
      options.catalogDirectory = path.resolve(value);
      index += 1;
      continue;
    }

    if (arg === '--diamond') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --diamond');
      }
      options.diamondAddress = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function resolveDiamondAddress(diamondAddress?: string): Promise<string> {
  if (diamondAddress) {
    return diamondAddress;
  }

  const chainConstants = await import('../chain-constants');
  const resolved = (chainConstants as { NEXT_PUBLIC_DIAMOND_ADDRESS?: string })
    .NEXT_PUBLIC_DIAMOND_ADDRESS;

  if (!resolved || resolved === ethers.ZeroAddress) {
    throw new Error(
      'Diamond address not found. Pass --diamond or set DIAMOND_ADDRESS.',
    );
  }

  return resolved;
}

function requirePinataJwt(): string {
  const pinataJwt =
    process.env.PINATA_JWT ?? process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!pinataJwt) {
    throw new Error('PINATA_JWT is required to sync supported asset metadata.');
  }

  return pinataJwt;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pinata = new PinataSDK({ pinataJwt: requirePinataJwt() });
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const diamondAddress = await resolveDiamondAddress(options.diamondAddress);
  const groupId = getIpfsGroupId(chainId);
  const assetsFacet = await ethers.getContractAt('AssetsFacet', diamondAddress);
  const summary = await syncSupportedAssets({
    write: options.write,
    catalogDirectory: options.catalogDirectory,
    diamondAddress,
    groupId,
    chainId,
    assetsFacet,
    pinata,
  });

  console.log('\n=== Supported Asset Sync ===');
  console.log(`Mode: ${options.write ? 'write' : 'dry-run'}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`Catalog: ${options.catalogDirectory}`);
  console.log(`Missing classes: ${summary.missingClasses.length}`);
  console.log(`Missing metadata: ${summary.missingMetadata.length}`);

  console.log('\n=== Sync Summary ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`SYNC_SUMMARY=${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error('\nSupported asset sync failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
