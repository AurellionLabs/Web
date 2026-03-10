import { describe, expect, it } from 'vitest';
import {
  extractOrderBigInt,
  extractOrderIsSellerInitiated,
  extractOrderParticipants,
  extractOrderPickupMetadata,
  isZeroAddress,
} from '@/utils/p2p-order-resolution';

describe('p2p-order-resolution', () => {
  it('extracts participants from named fields', () => {
    const order = {
      buyer: '0xbuyer000000000000000000000000000000000001',
      seller: '0xseller0000000000000000000000000000000001',
    };

    expect(extractOrderParticipants(order)).toEqual({
      buyer: '0xbuyer000000000000000000000000000000000001',
      seller: '0xseller0000000000000000000000000000000001',
    });
  });

  it('falls back to tuple indices for participants when named fields are absent', () => {
    const tupleLike = {
      6: '0xbuyer000000000000000000000000000000000002',
      7: '0xseller0000000000000000000000000000000002',
    };

    expect(extractOrderParticipants(tupleLike)).toEqual({
      buyer: '0xbuyer000000000000000000000000000000000002',
      seller: '0xseller0000000000000000000000000000000002',
    });
  });

  it('extracts pickup metadata from tuple-style location data', () => {
    const tupleLike = {
      10: {
        0: {
          0: '-26.2041',
          1: '28.0473',
        },
        2: 'Johannesburg Node',
      },
    };

    expect(extractOrderPickupMetadata(tupleLike)).toEqual({
      startLat: '-26.2041',
      startLng: '28.0473',
      startName: 'Johannesburg Node',
    });
  });

  it('extracts boolean and bigint values from tuple indices', () => {
    const tupleLike = {
      4: '1000000000000000000',
      5: '20000000000000000',
      13: true,
    };

    expect(extractOrderBigInt(tupleLike, 'price')).toBe(1000000000000000000n);
    expect(extractOrderBigInt(tupleLike, 'txFee')).toBe(20000000000000000n);
    expect(extractOrderIsSellerInitiated(tupleLike)).toBe(true);
  });

  it('detects zero addresses', () => {
    expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(
      true,
    );
    expect(isZeroAddress('0xabc')).toBe(false);
  });
});
