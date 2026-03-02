'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useNodes } from '@/app/providers/nodes.provider';
import {
  NEXT_PUBLIC_DIAMOND_ADDRESS,
  NEXT_PUBLIC_RPC_URL_84532,
} from '@/chain-constants';

const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
];

export interface CustodyEntry {
  nodeAddress: string;
  nodeLocation: string;
  amount: bigint;
}

export interface AssetCustodyResult {
  inWallet: bigint;
  nodes: CustodyEntry[];
  totalBalance: bigint;
  isLoading: boolean;
  error: string | null;
}

/**
 * For a given tokenId + wallet address, returns how much is held
 * in-wallet vs custodied across each of the user's nodes.
 */
export function useAssetCustody(
  tokenId: string | undefined,
  walletAddress: string | undefined,
  walletBalance: bigint,
): AssetCustodyResult {
  const { nodes } = useNodes();
  const [nodeCustody, setNodeCustody] = useState<CustodyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustody = useCallback(async () => {
    if (!tokenId || !walletAddress || nodes.length === 0) {
      setNodeCustody([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new ethers.JsonRpcProvider(NEXT_PUBLIC_RPC_URL_84532);
      const contract = new ethers.Contract(
        NEXT_PUBLIC_DIAMOND_ADDRESS,
        ERC1155_ABI,
        provider,
      );

      const tokenIdBigInt = BigInt(tokenId);
      const nodeAddresses = nodes.map((n) => n.address);
      const ids = nodeAddresses.map(() => tokenIdBigInt);

      let balances: bigint[];
      try {
        balances = await contract.balanceOfBatch(nodeAddresses, ids);
      } catch {
        // fallback to individual calls
        balances = await Promise.all(
          nodeAddresses.map((addr) => contract.balanceOf(addr, tokenIdBigInt)),
        );
      }

      const entries: CustodyEntry[] = [];
      for (let i = 0; i < nodes.length; i++) {
        if (balances[i] > 0n) {
          entries.push({
            nodeAddress: nodes[i].address,
            nodeLocation: nodes[i].location?.addressName || nodes[i].address,
            amount: balances[i],
          });
        }
      }

      setNodeCustody(entries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch custody');
    } finally {
      setIsLoading(false);
    }
  }, [tokenId, walletAddress, nodes]);

  useEffect(() => {
    fetchCustody();
  }, [fetchCustody]);

  // inWallet = walletBalance - sum of all node balances (tokens held at node addresses)
  const totalNodeCustody = nodeCustody.reduce((sum, e) => sum + e.amount, 0n);
  const inWallet =
    walletBalance > totalNodeCustody ? walletBalance - totalNodeCustody : 0n;

  return {
    inWallet,
    nodes: nodeCustody,
    totalBalance: walletBalance,
    isLoading,
    error,
  };
}
