import { Interface, type Log, type TransactionReceipt } from 'ethers';

import { sendWithNonceRetry } from './nonce-retry';

export interface TreasuryFeeCliOptions {
  diamondAddress?: string;
  bps: number;
  dryRun: boolean;
}

export interface TreasuryFeeUpdateSummary {
  chainId: number;
  network: string;
  diamondAddress: string;
  requestedBps: number;
  dryRun: boolean;
  action: 'dry-run' | 'updated';
  previousBps: number | null;
  newBps: number | null;
  txHash?: string;
}

export interface TreasuryFeeTxResponse {
  hash: string;
  wait(): Promise<TransactionReceipt>;
}

export interface TreasuryFeeContract {
  setTreasuryFeeBps(
    bps: number,
    overrides?: { nonce?: number },
  ): Promise<TreasuryFeeTxResponse>;
}

export interface UpdateTreasuryFeeOptions {
  contract: TreasuryFeeContract;
  chainId: number;
  network: string;
  diamondAddress: string;
  requestedBps: number;
  dryRun: boolean;
  getPendingNonce: () => Promise<number>;
  logger?: Pick<typeof console, 'warn'>;
}

const TREASURY_FEE_BPS_MAX = 500;
const treasuryFeeInterface = new Interface([
  'event TreasuryFeeBpsUpdated(uint16 oldBps, uint16 newBps)',
]);

function getArgValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}`);
  }

  return value;
}

export function parseTreasuryFeeBps(value: string): number {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error('Missing value for --bps');
  }

  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Treasury fee bps must be an integer: ${value}`);
  }

  const bps = Number(trimmed);
  if (!Number.isSafeInteger(bps)) {
    throw new Error(`Treasury fee bps is too large: ${value}`);
  }

  if (bps < 0 || bps > TREASURY_FEE_BPS_MAX) {
    throw new Error(
      `Treasury fee bps must be between 0 and ${TREASURY_FEE_BPS_MAX}: ${bps}`,
    );
  }

  return bps;
}

export function parseTreasuryFeeArgs(
  argv: string[],
  env: NodeJS.ProcessEnv = process.env,
): TreasuryFeeCliOptions {
  const options: TreasuryFeeCliOptions = {
    diamondAddress: env.DIAMOND_ADDRESS,
    bps: Number.NaN,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--diamond') {
      options.diamondAddress = getArgValue(argv, index, '--diamond');
      index += 1;
      continue;
    }

    if (arg === '--bps') {
      options.bps = parseTreasuryFeeBps(getArgValue(argv, index, '--bps'));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!Number.isInteger(options.bps)) {
    throw new Error('Missing required argument: --bps');
  }

  return options;
}

export function decodeTreasuryFeeUpdate(
  receipt: Pick<TransactionReceipt, 'logs'>,
): { previousBps: number; newBps: number } {
  for (const log of receipt.logs as Array<Pick<Log, 'topics' | 'data'>>) {
    try {
      const parsed = treasuryFeeInterface.parseLog({
        topics: log.topics,
        data: log.data,
      });

      if (parsed?.name === 'TreasuryFeeBpsUpdated') {
        return {
          previousBps: Number(parsed.args.oldBps),
          newBps: Number(parsed.args.newBps),
        };
      }
    } catch {
      continue;
    }
  }

  throw new Error(
    'Treasury fee update transaction did not emit TreasuryFeeBpsUpdated.',
  );
}

export async function updateTreasuryFeeBps(
  options: UpdateTreasuryFeeOptions,
): Promise<TreasuryFeeUpdateSummary> {
  if (options.dryRun) {
    return {
      chainId: options.chainId,
      network: options.network,
      diamondAddress: options.diamondAddress,
      requestedBps: options.requestedBps,
      dryRun: true,
      action: 'dry-run',
      previousBps: null,
      newBps: null,
    };
  }

  const tx = await sendWithNonceRetry({
    label: 'AuSysAdminFacet.setTreasuryFeeBps',
    getPendingNonce: options.getPendingNonce,
    logger: options.logger,
    send: (overrides) =>
      overrides
        ? options.contract.setTreasuryFeeBps(options.requestedBps, overrides)
        : options.contract.setTreasuryFeeBps(options.requestedBps),
  });
  const receipt = await tx.wait();
  const update = decodeTreasuryFeeUpdate(receipt);

  return {
    chainId: options.chainId,
    network: options.network,
    diamondAddress: options.diamondAddress,
    requestedBps: options.requestedBps,
    dryRun: false,
    action: 'updated',
    previousBps: update.previousBps,
    newBps: update.newBps,
    txHash: tx.hash,
  };
}
