/**
 * @file test/utils/p2p-status-mapping.test.ts
 * @description Vitest unit tests for domain/p2p/p2p.ts status mapping
 *
 * Covers:
 *  - mapContractStatusToP2PStatus for all valid status codes (0-4)
 *  - default case for unknown status codes
 */

import { describe, it, expect } from 'vitest';
import { P2POfferStatus, mapContractStatusToP2PStatus } from '@/domain/p2p/p2p';

describe('domain/p2p/p2p.ts', () => {
  describe('mapContractStatusToP2PStatus', () => {
    it('should map status 0 to P2POfferStatus.CREATED', () => {
      expect(mapContractStatusToP2PStatus(0)).toBe(P2POfferStatus.CREATED);
    });

    it('should map status 1 to P2POfferStatus.PROCESSING', () => {
      expect(mapContractStatusToP2PStatus(1)).toBe(P2POfferStatus.PROCESSING);
    });

    it('should map status 2 to P2POfferStatus.SETTLED', () => {
      expect(mapContractStatusToP2PStatus(2)).toBe(P2POfferStatus.SETTLED);
    });

    it('should map status 3 to P2POfferStatus.CANCELLED', () => {
      expect(mapContractStatusToP2PStatus(3)).toBe(P2POfferStatus.CANCELLED);
    });

    it('should map status 4 to P2POfferStatus.EXPIRED', () => {
      expect(mapContractStatusToP2PStatus(4)).toBe(P2POfferStatus.EXPIRED);
    });

    it('should return CREATED for unknown status codes (default case)', () => {
      // Test various unknown status codes
      expect(mapContractStatusToP2PStatus(5)).toBe(P2POfferStatus.CREATED);
      expect(mapContractStatusToP2PStatus(10)).toBe(P2POfferStatus.CREATED);
      expect(mapContractStatusToP2PStatus(99)).toBe(P2POfferStatus.CREATED);
      expect(mapContractStatusToP2PStatus(255)).toBe(P2POfferStatus.CREATED);
    });

    it('should return CREATED for negative status codes', () => {
      expect(mapContractStatusToP2PStatus(-1)).toBe(P2POfferStatus.CREATED);
      expect(mapContractStatusToP2PStatus(-100)).toBe(P2POfferStatus.CREATED);
    });
  });
});
