import { NEXT_PUBLIC_DEFAULT_CHAIN_ID } from '@/chain-constants';
import { NETWORK_CONFIGS } from '@/config/network';

export const PUBLIC_NODE_CHAIN_IDS = [84532, 42161] as const;

export type PublicNodeChainId = (typeof PUBLIC_NODE_CHAIN_IDS)[number];

export const DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID: PublicNodeChainId = 42161;

type SearchParamsLike = {
  get(name: string): string | null;
};

const PUBLIC_NODE_CHAIN_ID_SET = new Set<number>(PUBLIC_NODE_CHAIN_IDS);

export function isSupportedPublicNodeChainId(
  chainId: number,
): chainId is PublicNodeChainId {
  return PUBLIC_NODE_CHAIN_ID_SET.has(chainId);
}

export function getPublicNodeChainOptions(): Array<{
  id: PublicNodeChainId;
  label: string;
}> {
  return PUBLIC_NODE_CHAIN_IDS.map((chainId) => ({
    id: chainId,
    label: NETWORK_CONFIGS[chainId]?.name ?? String(chainId),
  }));
}

export function resolvePublicNodeChain(searchParams: SearchParamsLike): {
  chainId: PublicNodeChainId | null;
  error: string | null;
  wasDefaulted: boolean;
} {
  const rawChainId = searchParams.get('chainId');

  if (!rawChainId) {
    if (isSupportedPublicNodeChainId(NEXT_PUBLIC_DEFAULT_CHAIN_ID)) {
      return {
        chainId: NEXT_PUBLIC_DEFAULT_CHAIN_ID,
        error: null,
        wasDefaulted: true,
      };
    }

    return {
      chainId: null,
      error: `Unsupported default public chain: ${NEXT_PUBLIC_DEFAULT_CHAIN_ID}.`,
      wasDefaulted: true,
    };
  }

  const parsedChainId = Number(rawChainId);
  if (
    !Number.isInteger(parsedChainId) ||
    !isSupportedPublicNodeChainId(parsedChainId)
  ) {
    return {
      chainId: null,
      error: `Unsupported public chain ID: ${rawChainId}.`,
      wasDefaulted: false,
    };
  }

  return {
    chainId: parsedChainId,
    error: null,
    wasDefaulted: false,
  };
}
