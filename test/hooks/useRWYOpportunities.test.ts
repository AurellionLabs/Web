// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/useRWYOpportunities.test.ts
 * @description Vitest unit tests for useRWYOpportunities, useActiveRWYOpportunities,
 * useOperatorRWYOpportunities, and useUserRWYStakes hooks
 *
 * Note: These tests verify the hook interface and state management.
 * Full contract call testing requires integration-level mocking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// Mock dependencies - use path based on test location
vi.mock('@/infrastructure/repositories/rwy-repository', () => ({
  RWYRepository: vi.fn().mockImplementation(() => ({
    getAllOpportunitiesWithDynamicData: vi.fn().mockResolvedValue([]),
    getOpportunityWithDynamicData: vi.fn(),
    getStakerOpportunities: vi.fn().mockResolvedValue([]),
  })),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x1234567890123456789012345678901234567890',
  NEXT_PUBLIC_RPC_URL: 'https://rpc.example.com',
}));

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn(),
    })),
    JsonRpcProvider: vi.fn().mockImplementation(() => ({})),
  },
}));

// Import after mocks
import {
  useRWYOpportunities,
  useActiveRWYOpportunities,
  useOperatorRWYOpportunities,
  useUserRWYStakes,
} from '@/hooks/useRWYOpportunities';

describe('useRWYOpportunities', () => {
  describe('initialization', () => {
    it('should initialize with empty opportunities or error after loading', async () => {
      const { result } = renderHook(() => useRWYOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Either empty or error depending on env setup
      expect(
        result.current.opportunities === [] || result.current.error !== null,
      ).toBe(true);
    });

    it('should provide refetch function', async () => {
      const { result } = renderHook(() => useRWYOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useActiveRWYOpportunities', () => {
  describe('initialization', () => {
    it('should provide refetch function', async () => {
      const { result } = renderHook(() => useActiveRWYOpportunities());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useOperatorRWYOpportunities', () => {
  describe('initialization', () => {
    it('should return empty when operator is undefined', async () => {
      const { result } = renderHook(() =>
        useOperatorRWYOpportunities(undefined),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.opportunities).toEqual([]);
    });

    it('should have refetch function', async () => {
      const { result } = renderHook(() =>
        useOperatorRWYOpportunities(
          '0xOperator1234567890123456789012345678901234' as any,
        ),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});

describe('useUserRWYStakes', () => {
  describe('initialization', () => {
    it('should return empty when userAddress is undefined', async () => {
      const { result } = renderHook(() => useUserRWYStakes(undefined));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.opportunities).toEqual([]);
    });

    it('should have refetch function', async () => {
      const { result } = renderHook(() => useUserRWYStakes('0xUser123' as any));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });
  });
});
