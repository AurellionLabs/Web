// @ts-nocheck - Test file with type issues
/**
 * @file test/hooks/usePackageSignatureProcess.test.ts
 * @description Vitest unit tests for usePackageSignatureProcess hook
 *
 * Covers:
 *  - Initialization and idle state
 *  - Input validation (missing parameters)
 *  - Reset functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { encodeBytes32String } from 'ethers';

// Mock the entire ethers module
vi.mock('ethers', async () => {
  const actual = await vi.importActual('ethers');
  return {
    ...actual,
    encodeBytes32String: vi.fn((str: string) => {
      if (str.length > 31) str = str.substring(0, 31);
      return '0x' + '00'.repeat(32);
    }),
  };
});

// Mock dependencies
vi.mock('@/infrastructure/contexts/repository-context', () => ({
  RepositoryContext: {
    getInstance: vi.fn(() => ({
      getAusysContract: vi.fn(),
      listenForSignature: vi.fn(),
    })),
  },
}));

// Import after mocks
import { usePackageSignatureProcess } from '@/hooks/usePackageSignatureProcess';
import { RepositoryContext } from '@/infrastructure/contexts/repository-context';

describe('usePackageSignatureProcess', () => {
  const mockRepositoryContext = RepositoryContext.getInstance as ReturnType<
    typeof vi.fn
  >;
  const mockGetAusysContract = vi.fn();
  const mockListenForSignature = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock behavior
    mockRepositoryContext.mockReturnValue({
      getAusysContract: mockGetAusysContract,
      listenForSignature: mockListenForSignature,
    });

    // Default: successful transaction
    mockGetAusysContract.mockReturnValue({
      packageSign: vi.fn().mockResolvedValue({
        wait: vi.fn().mockResolvedValue({ hash: '0xtest123' }),
      }),
    });

    // Default: successful signature listening
    mockListenForSignature.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with idle status', () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('should return reset and signAndListen functions', () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.signAndListen).toBe('function');
    });
  });

  describe('input validation', () => {
    it('should set error status when jobId is missing', async () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: '',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Missing required parameters');
    });

    it('should set error status when driverAddress is missing', async () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Missing required parameters');
    });

    it('should set error status when senderAddress is missing', async () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Missing required parameters');
    });
  });

  describe('successful flow', () => {
    it('should transition through signing, waiting, and complete states', async () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      // Should have gone through signing -> waiting -> complete
      expect(result.current.status).toBe('complete');
      expect(result.current.error).toBeNull();

      // Should have called contract method
      const contract = mockGetAusysContract();
      expect(contract.packageSign).toHaveBeenCalled();
    });

    it('should call listenForSignature after transaction', async () => {
      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      expect(mockListenForSignature).toHaveBeenCalledWith(
        'test-job-123',
        '0xDriver1234567890123456789012345678901234',
      );
    });
  });

  describe('error handling', () => {
    it('should handle transaction failure', async () => {
      // Mock contract to throw
      mockGetAusysContract.mockReturnValue({
        packageSign: vi
          .fn()
          .mockRejectedValue(new Error('Transaction reverted')),
      });

      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      await act(async () => {
        await result.current.signAndListen();
      });

      expect(result.current.status).toBe('error');
      expect(result.current.error).toContain('Transaction reverted');
    });
  });

  describe('reset functionality', () => {
    it('should reset status and error when reset is called', async () => {
      // Make the first call error
      mockGetAusysContract.mockReturnValue({
        packageSign: vi.fn().mockRejectedValue(new Error('Error')),
      });

      const { result } = renderHook(() =>
        usePackageSignatureProcess({
          jobId: 'test-job-123',
          driverAddress: '0xDriver1234567890123456789012345678901234',
          senderAddress: '0xSender1234567890123456789012345678901234',
        }),
      );

      // First make it error
      await act(async () => {
        await result.current.signAndListen();
      });

      // Now reset
      await act(async () => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });
});
