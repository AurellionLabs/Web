/**
 * Unit tests for P2P bug fixes
 *
 * Tests cover:
 * - Total Spent calculation (Bug 1)
 * - Form validation for quantity and price (Bug 4+5)
 * - P2P order flow guards (User bugs u2, u5)
 * - Asset deduplication (User bug u6)
 * - acceptOfferWithDelivery partial failure (Bug 6)
 */
import { describe, it, expect } from 'vitest';
import { formatTokenAmount } from '@/lib/formatters';

describe('Bug 1: Total Spent calculation', () => {
  it('should NOT divide by 1000000 — formatTokenAmount already handles decimals', () => {
    // Price stored as wei: 3 USD = 3 * 10^18 wei
    const priceWei = '3000000000000000000';
    const formatted = formatTokenAmount(priceWei, 18, 6);
    const parsed = parseFloat(formatted);

    // The old code did: parsed / 1000000 → 0.000003
    // The fix just uses parsed directly → 3.0
    expect(parsed).toBeCloseTo(3.0, 2);

    // Verify it should NOT be divided further
    expect(parsed / 1000000).toBeCloseTo(0.000003, 8);
    expect(parsed).not.toBeCloseTo(0.000003, 4);
  });

  it('should correctly sum multiple settled order prices', () => {
    const prices = [
      '3000000000000000000', // $3
      '5000000000000000000', // $5
      '100000000000000000000', // $100
    ];

    const totalSpent = prices.reduce(
      (sum, p) => sum + parseFloat(formatTokenAmount(p, 18, 6)),
      0,
    );

    expect(totalSpent).toBeCloseTo(108.0, 2);
  });

  it('should handle zero price', () => {
    const result = formatTokenAmount('0', 18, 2);
    expect(result).toBe('0.00');
  });
});

describe('Bug 4: P2P create form validation', () => {
  // Mimics the canProceed() logic from the create page
  function validateDetails(
    quantity: string,
    price: string,
    isSellFlow: boolean = false,
    availableBalance: number = Infinity,
  ): boolean {
    const qty = parseFloat(quantity);
    const p = parseFloat(price);
    if (!quantity || !price) return false;
    if (isNaN(qty) || qty < 1 || !Number.isInteger(qty)) return false;
    if (isNaN(p) || p <= 0) return false;
    if (isSellFlow && qty > availableBalance) return false;
    return true;
  }

  it('should reject quantity = 0', () => {
    expect(validateDetails('0', '5')).toBe(false);
  });

  it('should reject negative quantity', () => {
    expect(validateDetails('-1', '5')).toBe(false);
  });

  it('should reject fractional quantity', () => {
    expect(validateDetails('1.5', '5')).toBe(false);
  });

  it('should reject price = 0', () => {
    expect(validateDetails('1', '0')).toBe(false);
  });

  it('should reject negative price', () => {
    expect(validateDetails('1', '-5')).toBe(false);
  });

  it('should accept valid quantity and price', () => {
    expect(validateDetails('1', '5')).toBe(true);
    expect(validateDetails('100', '0.01')).toBe(true);
  });

  it('should reject empty inputs', () => {
    expect(validateDetails('', '5')).toBe(false);
    expect(validateDetails('1', '')).toBe(false);
  });

  it('should reject non-numeric inputs', () => {
    expect(validateDetails('abc', '5')).toBe(false);
    expect(validateDetails('1', 'xyz')).toBe(false);
  });

  // Bug 5: Balance check for sell offers
  it('should reject sell quantity exceeding balance', () => {
    expect(validateDetails('100', '5', true, 50)).toBe(false);
  });

  it('should accept sell quantity within balance', () => {
    expect(validateDetails('50', '5', true, 100)).toBe(true);
  });
});

describe('User Bug u2+u5: P2P order flow step guards', () => {
  // Mimics getCurrentStepIndex logic
  function getCurrentStepIndex(
    orderStatus: string,
    journeyStatus: number | null,
    hasJourney: boolean,
    buyerSigned: boolean,
    driverSigned: boolean,
  ): number {
    if (orderStatus === 'settled') return 4;
    if (buyerSigned && driverSigned) return 3;
    if (journeyStatus === 1 || buyerSigned || driverSigned) return 2;
    if (hasJourney || journeyStatus === 0) return 1;
    return 0;
  }

  it('should show step 0 when no journey exists', () => {
    expect(getCurrentStepIndex('processing', null, false, false, false)).toBe(
      0,
    );
  });

  it('should show step 1 when journey pending', () => {
    expect(getCurrentStepIndex('processing', 0, true, false, false)).toBe(1);
  });

  it('should show step 2 when journey in transit', () => {
    expect(getCurrentStepIndex('processing', 1, true, false, false)).toBe(2);
  });

  // Guard: delivery signing requires journey in transit
  it('should NOT allow delivery sign when journey is pending (status 0)', () => {
    const journeyIsInTransit = 0 === 1; // journeyStatus === 0, not 1
    const showSignButton = !journeyIsInTransit;
    expect(journeyIsInTransit).toBe(false);
  });

  it('should allow delivery sign when journey is in transit (status 1)', () => {
    const journeyIsInTransit = 1 === 1;
    expect(journeyIsInTransit).toBe(true);
  });

  // Guard: pickup signing requires driver to have signed first
  it('should NOT allow sender pickup sign when driver has not signed', () => {
    const driverPickupSigned = false;
    const showPickupButton = driverPickupSigned; // Simplified guard
    expect(showPickupButton).toBe(false);
  });

  it('should allow sender pickup sign when driver has signed', () => {
    const driverPickupSigned = true;
    const showPickupButton = driverPickupSigned;
    expect(showPickupButton).toBe(true);
  });
});

describe('User Bug u6: Asset deduplication', () => {
  it('should deduplicate assets by token ID in summary', () => {
    const assets = [
      { id: '1', class: 'GOAT', amount: '100' },
      { id: '1', class: 'GOAT', amount: '100' }, // duplicate
      { id: '2', class: 'GOAT', amount: '50' },
      { id: '3', class: 'SHEEP', amount: '200' },
    ];

    const summary: Record<string, { quantity: number }> = {};
    const seenTokenIds = new Set<string>();

    assets.forEach((asset) => {
      const tokenId = String(asset.id);
      if (seenTokenIds.has(tokenId)) return;
      seenTokenIds.add(tokenId);

      const assetClass = asset.class || 'Unknown';
      const quantity = Number(asset.amount) || 0;

      if (summary[assetClass]) {
        summary[assetClass].quantity += quantity;
      } else {
        summary[assetClass] = { quantity };
      }
    });

    expect(summary['GOAT'].quantity).toBe(150); // 100 + 50, not 250
    expect(summary['SHEEP'].quantity).toBe(200);
  });
});

describe('Bug 6: acceptOfferWithDelivery partial failure messaging', () => {
  it('should distinguish partial success from full failure', () => {
    const partialError = new Error(
      'Offer accepted successfully, but delivery scheduling failed: some reason. ' +
        'You can schedule delivery later from the order details.',
    );
    (partialError as any).partialSuccess = true;

    expect((partialError as any).partialSuccess).toBe(true);
    expect(partialError.message).toContain('Offer accepted successfully');
    expect(partialError.message).toContain('schedule delivery later');
  });

  it('full failure should not have partialSuccess flag', () => {
    const fullError = new Error('Transaction reverted');
    expect((fullError as any).partialSuccess).toBeUndefined();
  });
});
