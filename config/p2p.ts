import { parseUnits } from 'ethers';
import { NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS } from '@/chain-constants';

/**
 * Default P2P delivery bounty in whole quote-token units.
 * Keep this at '0' until driver bounty is re-enabled.
 */
export const DEFAULT_P2P_DELIVERY_BOUNTY_TOKENS = '0';

export const DEFAULT_P2P_DELIVERY_BOUNTY_WEI = parseUnits(
  DEFAULT_P2P_DELIVERY_BOUNTY_TOKENS,
  NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS,
);
