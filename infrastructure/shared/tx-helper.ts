import { ethers, Contract, Provider, Signer } from 'ethers';
import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';

type BackoffOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
};

export type SendTxOptions = BackoffOptions & {
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

  // Always return immediately without waiting for receipt.
  // We use the Ponder indexer for event-driven transaction confirmation
  // via sendContractTxAndWaitForIndexer() wrapper.
  return { tx, receipt: null };
}
