import { NEXT_PUBLIC_DEFAULT_CHAIN_ID } from '@/chain-constants';
import { NETWORK_CONFIGS } from '@/config/network';

const SUPPORTED_PUBLIC_NODE_CHAIN_IDS = [84532, 42161] as const;

export type PublicNodeChainId =
  (typeof SUPPORTED_PUBLIC_NODE_CHAIN_IDS)[number];

export type SearchParamsLike = {
  get(name: string): string | null;
};

const PUBLIC_NODE_CHAIN_ID_SET = new Set<number>(
  SUPPORTED_PUBLIC_NODE_CHAIN_IDS,
);

export function isSupportedPublicNodeChainId(
  chainId: number,
): chainId is PublicNodeChainId {
  return PUBLIC_NODE_CHAIN_ID_SET.has(chainId);
}

export const DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID: PublicNodeChainId | null =
  isSupportedPublicNodeChainId(NEXT_PUBLIC_DEFAULT_CHAIN_ID)
    ? NEXT_PUBLIC_DEFAULT_CHAIN_ID
    : null;

export const PUBLIC_NODE_CHAIN_IDS: PublicNodeChainId[] =
  DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID === null
    ? []
    : [DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID];

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

  if (rawChainId !== null) {
    const parsedChainId = Number(rawChainId);

    if (
      !Number.isInteger(parsedChainId) ||
      !isSupportedPublicNodeChainId(parsedChainId)
    ) {
      return {
        chainId: null,
        error: `Unsupported public chain: ${rawChainId}.`,
        wasDefaulted: false,
      };
    }

    return {
      chainId: parsedChainId,
      error: null,
      wasDefaulted: false,
    };
  }

  if (DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID === null) {
    return {
      chainId: null,
      error: `Unsupported default public chain: ${NEXT_PUBLIC_DEFAULT_CHAIN_ID}.`,
      wasDefaulted: true,
    };
  }

  return {
    chainId: DEFAULT_PUBLIC_NODE_EXPLORER_CHAIN_ID,
    error: null,
    wasDefaulted: true,
  };
}
