#!/usr/bin/env bun

import path from 'node:path';

import { ethers, network } from 'hardhat';

import {
  DEFAULT_PERMISSIONS_DIR,
  loadPermissionsCatalog,
} from './lib/permissions-catalog';
import { loadDeploymentManifest } from './lib/deployment-manifest';
import { syncPermissions } from './lib/permissions-sync-runner';
import {
  readDiamondAddressFromChainConstants,
  resolveDiamondAddress as resolveRuntimeDiamondAddress,
} from './lib/runtime-contracts';

interface CliOptions {
  write: boolean;
  allowEmpty: boolean;
  permissionsDirectory: string;
  diamondAddress?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    write: false,
    allowEmpty: false,
    permissionsDirectory: process.env.PERMISSIONS_DIR
      ? path.resolve(process.env.PERMISSIONS_DIR)
      : DEFAULT_PERMISSIONS_DIR,
    diamondAddress: process.env.DIAMOND_ADDRESS,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--write') {
      options.write = true;
      continue;
    }

    if (arg === '--allow-empty') {
      options.allowEmpty = true;
      continue;
    }

    if (arg === '--permissions-dir') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --permissions-dir');
      }
      options.permissionsDirectory = path.resolve(value);
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
  const activeChainId = Number((await ethers.provider.getNetwork()).chainId);
  const manifest = loadDeploymentManifest({
    deploymentsDir: path.resolve(process.cwd(), 'deployments'),
    networkName: network.name,
    chainId: activeChainId,
  });
  const chainConstantsDiamondAddress = readDiamondAddressFromChainConstants(
    path.resolve(process.cwd(), 'chain-constants.ts'),
  );

  return resolveRuntimeDiamondAddress({
    explicitAddress: diamondAddress,
    chainConstantsDiamondAddress,
    manifestDiamondAddress: manifest?.diamond,
    env: process.env,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const catalog = loadPermissionsCatalog(options.permissionsDirectory);
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const diamondAddress = await resolveDiamondAddress(options.diamondAddress);
  const auSysFacet = await ethers.getContractAt('AuSysFacet', diamondAddress);
  const nodesFacet = await ethers.getContractAt('NodesFacet', diamondAddress);

  const summary = await syncPermissions({
    write: options.write,
    desiredDrivers: catalog.drivers,
    desiredNodeRegistrars: catalog.nodeRegistrars,
    auSysFacet,
    nodesFacet,
    allowEmpty: options.allowEmpty,
  });

  console.log('\n=== Permission Sync ===');
  console.log(`Mode: ${options.write ? 'write' : 'dry-run'}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`Permissions directory: ${options.permissionsDirectory}`);
  console.log(
    `Drivers add/remove: ${summary.drivers.toAdd.length}/${summary.drivers.toRemove.length}`,
  );
  console.log(
    `Node registrars add/remove: ${summary.nodeRegistrars.toAdd.length}/${summary.nodeRegistrars.toRemove.length}`,
  );

  console.log('\n=== Sync Summary ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`PERMISSION_SYNC_SUMMARY=${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error('\nPermission sync failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
