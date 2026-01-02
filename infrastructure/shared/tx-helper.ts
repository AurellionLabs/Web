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
      console.log(
        `Gas estimation rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`,
      );
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
    console.log(
      `[tx-helper] Encoded function data: ${data.substring(0, 100)}...`,
    );
  } catch (error) {
    console.error(
      `[tx-helper] Failed to encode function data for ${method}:`,
      error,
    );
    throw new Error(
      `Failed to encode transaction data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  // Add timeout for network detection
  let network: ethers.Network;
  try {
    network = await Promise.race([
      provider.getNetwork(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Network detection timeout: Unable to detect network from provider',
              ),
            ),
          10000, // 10 second timeout for network detection
        ),
      ),
    ]);
  } catch (error: any) {
    console.error('[tx-helper] Failed to get network:', error);
    // Try to get chainId from the provider directly if available
    if (error?.message?.includes?.('timeout')) {
      throw new Error(
        'Network detection timed out. Please check your wallet connection and try again.',
      );
    }
    throw error;
  }
  const chainId = Number(network.chainId);

  const readProvider =
    options.readProvider ?? RpcProviderFactory.getReadOnlyProvider(chainId);

  const fromAddress =
    options.from ?? (await (runner as Signer).getAddress?.()) ?? undefined;

  console.log(
    `[tx-helper] Estimating gas for ${method} from ${fromAddress}...`,
  );
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
  console.log(
    `[tx-helper] Gas limit with ${headroom}x headroom: ${gasLimit.toString()}`,
  );

  // Check wallet responsiveness before sending transaction
  console.log(`[tx-helper] Checking wallet connection...`);
  try {
    const walletCheck = await Promise.race([
      (runner as Signer).getAddress(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Wallet connection check timeout')),
          5000, // 5 second timeout
        ),
      ),
    ]);
    console.log(`[tx-helper] Wallet connected: ${walletCheck}`);
  } catch (error: any) {
    console.error('[tx-helper] Wallet connection check failed:', error);
    throw new Error(
      'Wallet is not responding. Please ensure your wallet is unlocked and connected, then try again.',
    );
  }

  console.log(`[tx-helper] Sending transaction to wallet...`);

  // Add timeout for wallet interaction (60 seconds should be enough for user to approve)
  const WALLET_TX_TIMEOUT = 60000;

  let tx: ethers.ContractTransactionResponse;
  try {
    tx = (await Promise.race([
      (contract as any)[method](...(args as any), {
        gasLimit,
        value: options.value,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'Transaction send timeout: Wallet did not respond within 60 seconds. Please check your wallet and try again.',
              ),
            ),
          WALLET_TX_TIMEOUT,
        ),
      ),
    ])) as ethers.ContractTransactionResponse;

    console.log(
      `[tx-helper] Transaction sent, hash: ${tx.hash}, waiting for confirmation...`,
    );
  } catch (error: any) {
    // Check for wallet-specific errors
    if (
      error?.message?.includes?.('timeout') ||
      error?.message?.includes?.('Wallet timeout')
    ) {
      console.error('[tx-helper] Wallet timeout error:', error);
      throw new Error(
        'Wallet timeout: Your wallet did not respond. Please ensure your wallet is unlocked and connected, then try again.',
      );
    }
    if (
      error?.code === 'ACTION_REJECTED' ||
      error?.message?.includes?.('rejected')
    ) {
      console.error('[tx-helper] Transaction rejected by user:', error);
      throw new Error('Transaction was rejected by user');
    }
    if (
      error?.code === 'UNSUPPORTED_OPERATION' ||
      error?.message?.includes?.('not connected')
    ) {
      console.error('[tx-helper] Wallet not connected:', error);
      throw new Error(
        'Wallet is not connected. Please connect your wallet and try again.',
      );
    }
    console.error('[tx-helper] Error sending transaction:', error);
    throw error;
  }

  // Wait for transaction with retry logic for rate limits
  // Use provider.waitForTransaction with polling interval to reduce RPC calls
  let receipt;
  try {
    // Wait with 1 confirmation and a longer polling interval to reduce RPC calls
    receipt = await tx.wait(1);
    console.log(
      `[tx-helper] Transaction confirmed in block ${receipt.blockNumber}`,
    );
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
      console.log(
        `[tx-helper] Transaction confirmed in block ${receipt.blockNumber}`,
      );
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
