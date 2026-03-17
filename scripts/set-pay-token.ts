#!/usr/bin/env bun

import path from 'node:path';

import { ethers, network } from 'hardhat';

import { NEXT_PUBLIC_AURA_TOKEN_ADDRESS } from '../chain-constants';
import { loadDeploymentManifest } from './lib/deployment-manifest';
import { sendWithNonceRetry } from './lib/nonce-retry';
import {
  assertAddressHasContractCode,
  isProductionPayTokenChain,
  resolveExpectedPayToken,
} from './lib/pay-token';
import {
  readDiamondAddressFromChainConstants,
  resolveDiamondAddress as resolveRuntimeDiamondAddress,
} from './lib/runtime-contracts';

interface CliOptions {
  diamondAddress?: string;
  tokenAddress?: string;
  dryRun: boolean;
  skipRwy: boolean;
}

interface TokenUpdateResult {
  target: string;
  current: string;
  action: 'updated' | 'unchanged' | 'dry-run' | 'skipped';
  txHash?: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    diamondAddress: process.env.DIAMOND_ADDRESS,
    tokenAddress: process.env.PAY_TOKEN_ADDRESS,
    dryRun: false,
    skipRwy: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--skip-rwy') {
      options.skipRwy = true;
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

    if (arg === '--token') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --token');
      }
      options.tokenAddress = value;
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

async function setAuSysPayToken(
  diamondAddress: string,
  targetToken: string,
  dryRun: boolean,
): Promise<TokenUpdateResult> {
  const auSysViewFacet = await ethers.getContractAt(
    'AuSysViewFacet',
    diamondAddress,
  );
  const auSysAdminFacet = await ethers.getContractAt(
    'AuSysAdminFacet',
    diamondAddress,
  );
  const current = await auSysViewFacet.getPayToken();

  if (current.toLowerCase() === targetToken.toLowerCase()) {
    return { current, target: targetToken, action: 'unchanged' };
  }

  if (dryRun) {
    return { current, target: targetToken, action: 'dry-run' };
  }

  const [signer] = await ethers.getSigners();
  const tx = await sendWithNonceRetry({
    label: 'AuSysAdminFacet.setPayToken',
    getPendingNonce: () => signer.getNonce('pending'),
    logger: console,
    send: (overrides) =>
      auSysAdminFacet.setPayToken(targetToken, overrides ?? {}),
  });
  await tx.wait();

  return {
    current,
    target: targetToken,
    action: 'updated',
    txHash: tx.hash,
  };
}

async function setRwyQuoteToken(
  diamondAddress: string,
  targetToken: string,
  dryRun: boolean,
): Promise<TokenUpdateResult> {
  const rwyFacet = await ethers.getContractAt(
    'RWYStakingFacet',
    diamondAddress,
  );
  const current = await rwyFacet.getRWYQuoteToken();

  if (current.toLowerCase() === targetToken.toLowerCase()) {
    return { current, target: targetToken, action: 'unchanged' };
  }

  if (dryRun) {
    return { current, target: targetToken, action: 'dry-run' };
  }

  const [signer] = await ethers.getSigners();
  const tx = await sendWithNonceRetry({
    label: 'RWYStakingFacet.setRWYQuoteToken',
    getPendingNonce: () => signer.getNonce('pending'),
    logger: console,
    send: (overrides) =>
      rwyFacet.setRWYQuoteToken(targetToken, overrides ?? {}),
  });
  await tx.wait();

  return {
    current,
    target: targetToken,
    action: 'updated',
    txHash: tx.hash,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const diamondAddress = await resolveDiamondAddress(options.diamondAddress);
  const targetToken = resolveExpectedPayToken({
    chainId,
    explicitTokenAddress: options.tokenAddress,
    fallbackTokenAddress: NEXT_PUBLIC_AURA_TOKEN_ADDRESS,
  });

  await assertAddressHasContractCode(
    ethers.provider,
    targetToken,
    'Target pay token',
  );

  console.log('\n=== Set Pay Token ===');
  console.log(`Network: ${network.name} (${chainId})`);
  console.log(`Diamond: ${diamondAddress}`);
  console.log(`Target token: ${targetToken}`);
  console.log(`Mode: ${options.dryRun ? 'dry-run' : 'write'}`);
  console.log(
    `Policy: ${isProductionPayTokenChain(chainId) ? 'production token enforced' : 'chain fallback token'}`,
  );

  const auSysResult = await setAuSysPayToken(
    diamondAddress,
    targetToken,
    options.dryRun,
  );
  let rwyResult: TokenUpdateResult;

  if (options.skipRwy) {
    rwyResult = {
      current: ethers.ZeroAddress,
      target: targetToken,
      action: 'skipped',
    };
  } else {
    rwyResult = await setRwyQuoteToken(
      diamondAddress,
      targetToken,
      options.dryRun,
    );
  }

  const summary = {
    chainId,
    network: network.name,
    diamondAddress,
    targetToken,
    dryRun: options.dryRun,
    auSys: auSysResult,
    rwy: rwyResult,
  };

  console.log('\n=== Result ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`SET_PAY_TOKEN_SUMMARY=${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error('\nSet pay token failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
