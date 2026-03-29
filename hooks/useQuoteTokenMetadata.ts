'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDiamond } from '@/app/providers/diamond.provider';
import {
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
  NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
  NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL,
} from '@/chain-constants';
import type { IP2PService } from '@/domain/p2p';

export interface QuoteTokenMetadata {
  address: string;
  decimals: number;
  symbol: string;
}

interface P2PServiceWithQuoteTokenMetadata extends IP2PService {
  getQuoteTokenMetadata?: () => Promise<QuoteTokenMetadata>;
}

const FALLBACK_QUOTE_TOKEN_METADATA: QuoteTokenMetadata = {
  address: NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS,
  decimals: NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
  symbol: NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL,
};

export function useQuoteTokenMetadata(): QuoteTokenMetadata & {
  refresh: () => Promise<QuoteTokenMetadata>;
} {
  const { p2pService, isReadOnly } = useDiamond();
  const [metadata, setMetadata] = useState<QuoteTokenMetadata>(
    FALLBACK_QUOTE_TOKEN_METADATA,
  );

  const refresh = useCallback(async (): Promise<QuoteTokenMetadata> => {
    if (isReadOnly) {
      setMetadata(FALLBACK_QUOTE_TOKEN_METADATA);
      return FALLBACK_QUOTE_TOKEN_METADATA;
    }

    const service = p2pService as P2PServiceWithQuoteTokenMetadata | null;
    if (!service || typeof service.getQuoteTokenMetadata !== 'function') {
      setMetadata(FALLBACK_QUOTE_TOKEN_METADATA);
      return FALLBACK_QUOTE_TOKEN_METADATA;
    }

    try {
      const resolved = await service.getQuoteTokenMetadata();
      setMetadata(resolved);
      return resolved;
    } catch (error) {
      console.warn(
        '[useQuoteTokenMetadata] Failed to resolve quote token metadata from chain; using fallback constants.',
        error,
      );
      setMetadata(FALLBACK_QUOTE_TOKEN_METADATA);
      return FALLBACK_QUOTE_TOKEN_METADATA;
    }
  }, [isReadOnly, p2pService]);

  useEffect(() => {
    if (isReadOnly) {
      setMetadata(FALLBACK_QUOTE_TOKEN_METADATA);
      return;
    }

    void refresh();
  }, [isReadOnly, refresh]);

  return {
    ...metadata,
    refresh,
  };
}
