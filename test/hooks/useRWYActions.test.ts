// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useRWYActions.test.ts
 * @description Vitest unit tests for useRWYStakeActions and useRWYOperatorActions hooks
 *
 * Note: These tests verify the hook interface and state management.
 * Full contract call testing requires integration-level mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock dependencies
vi.mock('@/infrastructure/services/rwy-service', () => ({
  RWYService: vi.fn().mockImplementation(() => ({
    stake: vi.fn().mockResolvedValue({ hash: '0xtest123' }),
    unstake: vi.fn().mockResolvedValue({ hash: '0xtest456' }),
    claimProfits: vi.fn().mockResolvedValue({ hash: '0xtest789' }),
    emergencyClaim: vi.fn().mockResolvedValue({ hash: '0xtestabc' }),
    approveTokensForStaking: vi.fn().mockResolvedValue({ hash: '0xtestdef' }),
    isApprovedForStaking: vi.fn().mockResolvedValue(true),
    createOpportunity: vi.fn().mockResolvedValue({
      opportunityId: 'new-opp-1',
      transactionHash: '0xcreate',
    }),
    startDelivery: vi.fn().mockResolvedValue({ hash: '0xstart' }),
    confirmDelivery: vi.fn().mockResolvedValue({ hash: '0xconfirm' }),
    completeProcessing: vi.fn().mockResolvedValue({ hash: '0xcomplete' }),
    cancelOpportunity: vi.fn().mockResolvedValue({ hash: '0xcancel' }),
  })),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x1234567890123456789012345678901234567890',
}));

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({
        getAddress: vi
          .fn()
          .mockResolvedValue('0xUser1234567890123456789012345678901234'),
      }),
    })),
  },
}));

// Import after mocks
import {
  useRWYStakeActions,
  useRWYOperatorActions,
} from '@/hooks/useRWYActions';

describe('useRWYStakeActions', () => {
  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useRWYStakeActions());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeNull();
    });

    it('should provide all action functions', () => {
      const { result } = renderHook(() => useRWYStakeActions());

      expect(typeof result.current.stake).toBe('function');
      expect(typeof result.current.unstake).toBe('function');
      expect(typeof result.current.claimProfits).toBe('function');
      expect(typeof result.current.emergencyClaim).toBe('function');
      expect(typeof result.current.approveTokens).toBe('function');
      expect(typeof result.current.checkApproval).toBe('function');
    });
  });
});

describe('useRWYOperatorActions', () => {
  describe('initialization', () => {
    it('should initialize with idle state', () => {
      const { result } = renderHook(() => useRWYOperatorActions());

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.txHash).toBeNull();
    });

    it('should provide all action functions', () => {
      const { result } = renderHook(() => useRWYOperatorActions());

      expect(typeof result.current.createOpportunity).toBe('function');
      expect(typeof result.current.startDelivery).toBe('function');
      expect(typeof result.current.confirmDelivery).toBe('function');
      expect(typeof result.current.completeProcessing).toBe('function');
      expect(typeof result.current.cancelOpportunity).toBe('function');
    });
  });
});
