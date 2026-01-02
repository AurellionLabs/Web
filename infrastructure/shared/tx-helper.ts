import { ethers, Contract, Provider, Signer } from 'ethers';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';

type BackoffOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

type SendTxOptions = BackoffOptions & {
  from?: string;
  value?: bigint;
  gasHeadroomRatio?: number; // e.g. 1.2 for +20%
  readProvider?: Provider;
};

async function estimateGasWithBackoff(
  provider: Provider,
  request: {
    to: string;
    from?: string;
    data: string;
    value?: bigint;
  },
  { maxRetries = 3, baseDelayMs = 1000 }: BackoffOptions = {},
): Promise<bigint> {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const est = await provider.estimateGas(request);
      return est;
    } catch (error: any) {
      attempt += 1;
      const isRateLimit =
        error?.code === 'BAD_DATA' ||
        error?.code === -32005 ||
        error?.message?.includes?.('rate') ||
        error?.message?.includes?.('429');

      if (!isRateLimit || attempt >= maxRetries) {
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

export async function sendContractTxWithReadEstimation(
  contract: Contract,
  method: string,
  args: unknown[],
  options: SendTxOptions = {},
) {
  const runner = contract.runner as Signer | null;
  if (!runner) throw new Error('Contract is not connected to a signer');

  const provider = runner.provider as Provider | null;
  if (!provider) throw new Error('Signer has no provider');

  const to = await contract.getAddress();
  const iface = contract.interface;
  const data = iface.encodeFunctionData(method, args as any);

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const readProvider =
    options.readProvider ?? RpcProviderFactory.getReadOnlyProvider(chainId);

  const fromAddress =
    options.from ?? (await (runner as Signer).getAddress?.()) ?? undefined;

  const est = await estimateGasWithBackoff(
    readProvider,
    { to, from: fromAddress, data, value: options.value },
    options,
  );

  const headroom =
    options.gasHeadroomRatio && options.gasHeadroomRatio > 1
      ? options.gasHeadroomRatio
      : 1.2;
  const gasLimit = (est * BigInt(Math.floor(headroom * 100))) / 100n;

  const tx = await (contract as any)[method](...(args as any), {
    gasLimit,
    value: options.value,
  });

  // Wait for transaction with retry logic for rate limits
  // Use provider.waitForTransaction with polling interval to reduce RPC calls
  let receipt;
  try {
    // Wait with 1 confirmation and a longer polling interval to reduce RPC calls
    receipt = await tx.wait(1);
  } catch (error: any) {
    // If tx.wait fails due to rate limiting, try using provider.waitForTransaction
    // which gives us more control over polling
    const isRateLimit =
      error?.code === -32005 ||
      error?.error?.code === -32005 ||
      error?.message?.includes?.('Too Many Requests') ||
      error?.message?.includes?.('rate limit');

    if (isRateLimit) {
      console.warn(
        '[tx-helper] Rate limit hit during tx.wait(), using provider.waitForTransaction with backoff',
      );
      // Use provider.waitForTransaction with a custom polling interval
      receipt = await waitForTransactionWithBackoff(provider, tx.hash, {
        maxRetries: 10,
        baseDelayMs: 2000,
      });
    } else {
      throw error;
    }
  }

  return { tx, receipt };
}

async function waitForTransactionWithBackoff(
  provider: Provider,
  txHash: string,
  { maxRetries = 10, baseDelayMs = 2000 }: BackoffOptions = {},
): Promise<any> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      const receipt = await provider.getTransactionReceipt(txHash);
      if (receipt) {
        return receipt;
      }
      // Transaction not mined yet, wait before next poll
      const delay = baseDelayMs * Math.pow(1.5, attempt);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
    } catch (error: any) {
      const isRateLimit =
        error?.code === -32005 ||
        error?.error?.code === -32005 ||
        error?.message?.includes?.('Too Many Requests') ||
        error?.message?.includes?.('rate limit');

      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[tx-helper] Rate limit hit, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`,
        );
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
      } else {
        throw error;
      }
    }
  }
  throw new Error(
    `Transaction ${txHash} not found after ${maxRetries} attempts`,
  );
}
