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
  const GAS_ESTIMATION_TIMEOUT = 30000; // 30 seconds timeout
  
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      // Add timeout to gas estimation to prevent hanging
      const est = await Promise.race([
        provider.estimateGas(request),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error('Gas estimation timeout after 30s')),
            GAS_ESTIMATION_TIMEOUT,
          ),
        ),
      ]);
      return est;
    } catch (error: any) {
      attempt += 1;
      const isRateLimit =
        error?.code === 'BAD_DATA' ||
        error?.code === -32005 ||
        error?.message?.includes?.('rate') ||
        error?.message?.includes?.('429');

      // Don't retry on timeout errors
      if (error?.message?.includes?.('timeout')) {
        console.error('Gas estimation timed out:', error);
        throw new Error(
          'Gas estimation timed out. The RPC provider may be slow or unresponsive. Please try again.',
        );
      }

      if (!isRateLimit || attempt >= maxRetries) {
        console.error('Gas estimation failed:', error);
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.log(`Gas estimation rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
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
  
  console.log(`[tx-helper] Preparing transaction: ${method} to ${to}`);
  
  let data: string;
  try {
    data = iface.encodeFunctionData(method, args as any);
    console.log(`[tx-helper] Encoded function data: ${data.substring(0, 100)}...`);
  } catch (error) {
    console.error(`[tx-helper] Failed to encode function data for ${method}:`, error);
    throw new Error(`Failed to encode transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  const readProvider =
    options.readProvider ?? RpcProviderFactory.getReadOnlyProvider(chainId);

  const fromAddress =
    options.from ?? (await (runner as Signer).getAddress?.()) ?? undefined;

  console.log(`[tx-helper] Estimating gas for ${method} from ${fromAddress}...`);
  const est = await estimateGasWithBackoff(
    readProvider,
    { to, from: fromAddress, data, value: options.value },
    options,
  );
  console.log(`[tx-helper] Gas estimated: ${est.toString()}`);

  const headroom =
    options.gasHeadroomRatio && options.gasHeadroomRatio > 1
      ? options.gasHeadroomRatio
      : 1.2;
  const gasLimit = (est * BigInt(Math.floor(headroom * 100))) / 100n;
  console.log(`[tx-helper] Gas limit with ${headroom}x headroom: ${gasLimit.toString()}`);

  console.log(`[tx-helper] Sending transaction to wallet...`);
  const tx = await (contract as any)[method](...(args as any), {
    gasLimit,
    value: options.value,
  });
  console.log(`[tx-helper] Transaction sent, hash: ${tx.hash}, waiting for confirmation...`);
  const receipt = await tx.wait();
  console.log(`[tx-helper] Transaction confirmed in block ${receipt.blockNumber}`);
  return { tx, receipt };
}
