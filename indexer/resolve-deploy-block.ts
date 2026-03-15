/**
 * Resolve the deployment block for a contract address.
 *
 * Strategy:
 *   1. Explorer API (Basescan / Arbiscan / Etherscan) — getcontractcreation
 *   2. Binary search eth_getCode via RPC — finds first block with code
 *   3. Fallback to provided default
 *
 * Works with top-level await in ESM ponder config.
 */

// Explorer base URLs per chain ID
// V1 endpoints (chain-specific, free tier — some deprecated)
const EXPLORER_API_V1: Record<number, string> = {
  1: 'https://api.etherscan.io/api',
  42161: 'https://api.arbiscan.io/api',
  8453: 'https://api.basescan.org/api',
  84532: 'https://api-sepolia.basescan.org/api',
  11155111: 'https://api-sepolia.etherscan.io/api',
};

// Etherscan V2 unified endpoint (requires API key, supports all chains via chainid param)
const EXPLORER_API_V2 = 'https://api.etherscan.io/v2/api';

// ---------------------------------------------------------------------------
// Strategy 1 — Explorer API
// ---------------------------------------------------------------------------

async function fromExplorerAPI(
  address: string,
  chainId: number,
  apiKey?: string,
): Promise<number | null> {
  // Try V2 unified endpoint first (if we have an API key)
  if (apiKey) {
    const v2Result = await tryExplorerEndpoint(
      EXPLORER_API_V2,
      address,
      chainId,
      apiKey,
    );
    if (v2Result !== null) return v2Result;
  }

  // Fall back to V1 chain-specific endpoint
  const v1Base = EXPLORER_API_V1[chainId];
  if (v1Base) {
    const v1Result = await tryExplorerEndpoint(
      v1Base,
      address,
      chainId,
      apiKey,
    );
    if (v1Result !== null) return v1Result;
  }

  return null;
}

async function tryExplorerEndpoint(
  baseUrl: string,
  address: string,
  chainId: number,
  apiKey?: string,
): Promise<number | null> {
  const url = new URL(baseUrl);
  url.searchParams.set('module', 'contract');
  url.searchParams.set('action', 'getcontractcreation');
  url.searchParams.set('contractaddresses', address);
  // V2 needs chainid param
  if (baseUrl === EXPLORER_API_V2) {
    url.searchParams.set('chainid', String(chainId));
  }
  if (apiKey) url.searchParams.set('apikey', apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status: string;
      result: Array<{ txHash: string; blockNumber?: string }> | string;
    };

    if (
      json.status !== '1' ||
      !Array.isArray(json.result) ||
      json.result.length === 0
    ) {
      return null;
    }

    // If blockNumber is returned directly, use it
    const entry = json.result[0];
    if (entry.blockNumber) {
      return Number(entry.blockNumber);
    }

    // Otherwise fetch the tx receipt to get the block number
    if (entry.txHash) {
      return await blockFromTxHash(entry.txHash, chainId);
    }

    return null;
  } catch {
    return null;
  }
}

/** Get block number from a tx hash via explorer proxy API */
async function blockFromTxHash(
  txHash: string,
  chainId: number,
): Promise<number | null> {
  const base = EXPLORER_API_V1[chainId];
  if (!base) return null;

  const url = new URL(base);
  url.searchParams.set('module', 'proxy');
  url.searchParams.set('action', 'eth_getTransactionReceipt');
  url.searchParams.set('txhash', txHash);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { result?: { blockNumber?: string } };
    if (json.result?.blockNumber) {
      return Number(json.result.blockNumber); // hex → number
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 2 — Binary search eth_getCode via RPC
// ---------------------------------------------------------------------------

async function rpcCall(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json()) as { result?: unknown; error?: unknown };
  if (json.error) throw new Error(JSON.stringify(json.error));
  return json.result;
}

async function hasCodeAtBlock(
  rpcUrl: string,
  address: string,
  block: number,
): Promise<boolean> {
  const code = (await rpcCall(rpcUrl, 'eth_getCode', [
    address,
    '0x' + block.toString(16),
  ])) as string;
  return code !== '0x' && code !== '0x0';
}

async function binarySearchDeployBlock(
  rpcUrl: string,
  address: string,
): Promise<number | null> {
  try {
    const latestHex = (await rpcCall(rpcUrl, 'eth_blockNumber', [])) as string;
    const latest = Number(latestHex);

    // Confirm the contract exists now
    if (!(await hasCodeAtBlock(rpcUrl, address, latest))) {
      return null; // Contract doesn't exist at all
    }

    let lo = 0;
    let hi = latest;

    // Binary search: find the first block where code exists
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (await hasCodeAtBlock(rpcUrl, address, mid)) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    return lo;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 3 — First transaction to address (via explorer)
// ---------------------------------------------------------------------------

async function firstTxBlock(
  address: string,
  chainId: number,
  apiKey?: string,
): Promise<number | null> {
  const base = EXPLORER_API_V1[chainId];
  if (!base) return null;

  const url = new URL(base);
  url.searchParams.set('module', 'account');
  url.searchParams.set('action', 'txlist');
  url.searchParams.set('address', address);
  url.searchParams.set('startblock', '0');
  url.searchParams.set('endblock', '99999999');
  url.searchParams.set('page', '1');
  url.searchParams.set('offset', '1');
  url.searchParams.set('sort', 'asc');
  if (apiKey) url.searchParams.set('apikey', apiKey);

  try {
    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status: string;
      result: Array<{ blockNumber: string }> | string;
    };

    if (
      json.status !== '1' ||
      !Array.isArray(json.result) ||
      json.result.length === 0
    ) {
      return null;
    }

    return Number(json.result[0].blockNumber);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ResolveOptions {
  address: string;
  chainId: number;
  rpcUrl: string;
  fallback?: number;
  explorerApiKey?: string;
}

/**
 * Resolve the deployment block for a contract.
 *
 * Tries in order:
 *   1. Explorer API — contract creation tx
 *   2. Binary search — eth_getCode via RPC
 *   3. Explorer API — first transaction to address
 *   4. Fallback value
 */
export async function resolveDeployBlock(
  opts: ResolveOptions,
): Promise<number> {
  const { address, chainId, rpcUrl, fallback = 0, explorerApiKey } = opts;

  // 1. Explorer: contract creation
  const fromExplorer = await fromExplorerAPI(address, chainId, explorerApiKey);
  if (fromExplorer !== null && fromExplorer > 0) {
    console.log(
      `[deploy-block] ${address} on chain ${chainId}: block ${fromExplorer} (explorer API)`,
    );
    return fromExplorer;
  }

  // 2. Binary search via RPC
  const fromBinary = await binarySearchDeployBlock(rpcUrl, address);
  if (fromBinary !== null && fromBinary > 0) {
    console.log(
      `[deploy-block] ${address} on chain ${chainId}: block ${fromBinary} (binary search)`,
    );
    return fromBinary;
  }

  // 3. First tx to address
  const fromFirstTx = await firstTxBlock(address, chainId, explorerApiKey);
  if (fromFirstTx !== null && fromFirstTx > 0) {
    console.log(
      `[deploy-block] ${address} on chain ${chainId}: block ${fromFirstTx} (first tx)`,
    );
    return fromFirstTx;
  }

  // 4. Fallback
  console.warn(
    `[deploy-block] ${address} on chain ${chainId}: using fallback block ${fallback}`,
  );
  return fallback;
}
