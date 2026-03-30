#!/usr/bin/env bun

import path from 'node:path';

import { ethers, network } from 'hardhat';

import { loadDeploymentManifest } from './lib/deployment-manifest';
import {
  parseTreasuryFeeArgs,
  updateTreasuryFeeBps,
} from './lib/ausys-treasury-fee';
import { assertAddressHasContractCode } from './lib/pay-token';
import {
  readDiamondAddressFromChainConstants,
  resolveDiamondAddress as resolveRuntimeDiamondAddress,
} from './lib/runtime-contracts';

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

  const resolved = resolveRuntimeDiamondAddress({
    explicitAddress: diamondAddress,
    manifestDiamondAddress: manifest?.diamond,
    chainConstantsDiamondAddress,
    preferManifestOverChainConstants: true,
    env: process.env,
  });

  await assertAddressHasContractCode(
    ethers.provider,
    resolved,
    'Diamond address',
  );

  return resolved;
}

export async function main(argv: string[] = process.argv.slice(2)) {
  const options = parseTreasuryFeeArgs(argv, process.env);
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const diamondAddress = await resolveDiamondAddress(options.diamondAddress);
  const auSysAdminFacet = await ethers.getContractAt(
    'AuSysAdminFacet',
    diamondAddress,
  );
  const [signer] = await ethers.getSigners();

  console.log('\n=== Set AuSys Treasury Fee ===');
  console.log(`Network: ${network.name} (${chainId})`);
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`Requested treasury fee: ${options.bps} bps`);
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'write'}`);

  const summary = await updateTreasuryFeeBps({
    contract: auSysAdminFacet,
    chainId,
    network: network.name,
    diamondAddress,
    requestedBps: options.bps,
    dryRun: options.dryRun,
    getPendingNonce: () => signer.getNonce('pending'),
    logger: console,
  });

  console.log('\n=== Result ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`SET_AUSYS_TREASURY_FEE_SUMMARY=${JSON.stringify(summary)}`);

  return summary;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error('\nSet AuSys treasury fee failed:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
