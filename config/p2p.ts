import { parseUnits } from 'ethers';

/**
 * Default P2P delivery bounty in whole quote-token units.
 * Keep this at '0' until driver bounty is re-enabled.
 */
export const DEFAULT_P2P_DELIVERY_BOUNTY_TOKENS = '0';
export const MIN_ONCHAIN_P2P_DELIVERY_BOUNTY_WEI = 1n;

export function getDefaultP2PDeliveryBountyWei(
  quoteTokenDecimals: number,
): bigint {
  const configured = parseUnits(
    DEFAULT_P2P_DELIVERY_BOUNTY_TOKENS,
    quoteTokenDecimals,
  );
  return configured > 0n ? configured : MIN_ONCHAIN_P2P_DELIVERY_BOUNTY_WEI;
}
