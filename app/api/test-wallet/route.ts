/**
 * /api/test-wallet
 *
 * JSON-RPC proxy backed by a server-side ethers.js Wallet.
 * Only active when NEXT_PUBLIC_E2E_TEST_MODE=true.
 * Uses TEST_WALLET_PRIVATE_KEY env var (never exposed to client).
 *
 * Supported methods:
 *  eth_accounts / eth_requestAccounts  → [walletAddress]
 *  eth_chainId                         → chainId hex
 *  net_version                         → chainId decimal
 *  eth_getBalance                      → balance hex
 *  eth_call                            → contract call result
 *  eth_sendTransaction                 → signed tx hash
 *  eth_estimateGas                     → gas estimate
 *  eth_gasPrice                        → gas price
 *  eth_getTransactionReceipt           → receipt
 *  eth_getTransactionByHash            → tx
 *  eth_blockNumber                     → latest block
 *  personal_sign / eth_sign            → signature
 *  eth_signTypedData_v4                → typed data signature
 *  *                                   → forwarded to RPC node
 */

import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const IS_E2E = process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true';
const PRIVATE_KEY = process.env.TEST_WALLET_PRIVATE_KEY;
const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL_84532 || 'https://sepolia.base.org';

function errorResponse(message: string, code = -32000, status = 400) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function POST(req: NextRequest) {
  if (!IS_E2E) {
    return errorResponse(
      'Test wallet not available outside E2E mode',
      -32099,
      403,
    );
  }
  if (!PRIVATE_KEY) {
    return errorResponse('TEST_WALLET_PRIVATE_KEY not configured', -32099, 500);
  }

  let body: { method: string; params?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body');
  }

  const { method, params = [] } = body;

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    switch (method) {
      case 'eth_accounts':
      case 'eth_requestAccounts':
        return NextResponse.json({ result: [wallet.address] });

      case 'eth_chainId':
        return NextResponse.json({ result: '0x14a34' }); // 84532 = Base Sepolia

      case 'net_version':
        return NextResponse.json({ result: '84532' });

      case 'wallet_requestPermissions':
        // Return granted permissions immediately — no MetaMask popup needed
        return NextResponse.json({
          result: [{ parentCapability: 'eth_accounts', caveats: [] }],
        });

      case 'wallet_getPermissions':
        return NextResponse.json({
          result: [{ parentCapability: 'eth_accounts', caveats: [] }],
        });

      case 'personal_sign':
      case 'eth_sign': {
        // personal_sign: params = [message, address]
        // eth_sign:      params = [address, message]
        const msg =
          method === 'personal_sign'
            ? (params[0] as string)
            : (params[1] as string);
        const sig = await wallet.signMessage(
          msg.startsWith('0x') ? ethers.getBytes(msg) : msg,
        );
        return NextResponse.json({ result: sig });
      }

      case 'eth_signTypedData_v4': {
        const typedData = JSON.parse(params[1] as string);
        const { domain, types, message: typedMsg } = typedData;
        // Remove EIP-712 meta type if present
        const filteredTypes = { ...types };
        delete filteredTypes['EIP712Domain'];
        const sig = await wallet.signTypedData(domain, filteredTypes, typedMsg);
        return NextResponse.json({ result: sig });
      }

      case 'eth_sendTransaction': {
        const txParams = params[0] as ethers.TransactionRequest;
        const tx = await wallet.sendTransaction(txParams);
        return NextResponse.json({ result: tx.hash });
      }

      default:
        // Forward everything else directly to the RPC node
        const result = await provider.send(method, params as unknown[]);
        return NextResponse.json({ result });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg);
  }
}
