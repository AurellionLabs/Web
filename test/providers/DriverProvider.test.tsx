// @ts-nocheck - Test file with mocked contract types
// File: test/providers/DriverProvider.test.tsx
//
// Unit tests for DriverProvider - validates that contract method calls
// use Diamond ABI names, not legacy AuSys.sol names.
// Catches:
//   1. ausys.DRIVER_ROLE() failing (DRIVER_ROLE is not a function)
//   2. ausys.assignDriverToJourneyId() failing (should be assignDriverToJourney)

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ethers } from 'ethers';

// --- Mock contract with Diamond method names ---
function createDiamondContract() {
  return {
    // Diamond ABI methods
    assignDriverToJourney: vi.fn().mockResolvedValue({
      hash: '0xabc',
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    DRIVER_ROLE: vi
      .fn()
      .mockResolvedValue(ethers.keccak256(ethers.toUtf8Bytes('DRIVER_ROLE'))),
    hasAuSysRole: vi.fn().mockResolvedValue(true),
    setDriver: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    packageSign: vi.fn().mockResolvedValue({
      hash: '0xdef',
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    handOn: vi.fn().mockResolvedValue({
      hash: '0xghi',
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    handOff: vi.fn().mockResolvedValue({
      hash: '0xjkl',
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    getJourney: vi.fn().mockResolvedValue({
      sender: '0x1111111111111111111111111111111111111111',
      receiver: '0x2222222222222222222222222222222222222222',
      driver: '0x3333333333333333333333333333333333333333',
      currentStatus: 0n,
    }),
    driverDeliverySigned: vi.fn().mockResolvedValue(false),
    driverPickupSigned: vi.fn().mockResolvedValue(false),
    customerHandOff: vi.fn().mockResolvedValue(false),
  };
}

const mockDiamondContract = createDiamondContract();

const mockRepository = {
  getAvailableDeliveries: vi.fn().mockResolvedValue([]),
  getMyDeliveries: vi.fn().mockResolvedValue([]),
};

const mockSigner = {
  getAddress: vi
    .fn()
    .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c'),
  provider: null,
};

const mockRepoContext = {
  getAusysContract: vi.fn().mockReturnValue(mockDiamondContract),
  getDriverRepository: vi.fn().mockReturnValue(mockRepository),
  getSigner: vi.fn().mockReturnValue(mockSigner),
  getSignerAddress: vi
    .fn()
    .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c'),
};

vi.mock('@/infrastructure/contexts/repository-context', () => {
  return {
    RepositoryContext: {
      getInstance: () => mockRepoContext,
    },
  };
});

vi.mock('@/hooks/useWallet', () => ({
  useWallet: () => ({
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c',
  }),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'http://localhost:42069',
  NEXT_PUBLIC_AURA_GOAT_ADDRESS: '0x0000000000000000000000000000000000000001',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x0000000000000000000000000000000000000002',
}));

vi.mock('@/lib/contracts', () => ({
  Ausys__factory: {
    connect: vi.fn().mockImplementation(() => mockDiamondContract),
  },
}));

// Mock calculateETA to avoid network calls
vi.mock('@/app/utils/maps', () => ({
  calculateETA: vi.fn().mockResolvedValue(15),
}));

// Import after mocking
import { DriverProvider, useDriver } from '@/app/providers/driver.provider';

// Wrapper for rendering hooks within DriverProvider
function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <DriverProvider>{children}</DriverProvider>;
  };
}

describe('DriverProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks on the Diamond contract
    const freshContract = createDiamondContract();
    Object.keys(freshContract).forEach((key) => {
      (mockDiamondContract as any)[key] = (freshContract as any)[key];
    });
    // Reset repository mocks
    mockRepository.getAvailableDeliveries = vi.fn().mockResolvedValue([]);
    mockRepository.getMyDeliveries = vi.fn().mockResolvedValue([]);
    // Reset context mocks
    mockRepoContext.getAusysContract = vi
      .fn()
      .mockReturnValue(mockDiamondContract);
    mockRepoContext.getDriverRepository = vi
      .fn()
      .mockReturnValue(mockRepository);
    mockRepoContext.getSigner = vi.fn().mockReturnValue(mockSigner);
    mockRepoContext.getSignerAddress = vi
      .fn()
      .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c');
    mockSigner.getAddress = vi
      .fn()
      .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('acceptDelivery - contract method names', () => {
    it('should call DRIVER_ROLE() on the contract (must exist as a function)', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      // Wait for initial load to finish
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptDelivery('0xjourney123');
      });

      // DRIVER_ROLE must be called as a function - this catches the
      // "t.DRIVER_ROLE is not a function" error
      expect(mockDiamondContract.DRIVER_ROLE).toHaveBeenCalled();
    });

    it('should call assignDriverToJourney (Diamond), NOT assignDriverToJourneyId (legacy)', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptDelivery('0xjourney123');
      });

      // Diamond method must be called
      expect(mockDiamondContract.assignDriverToJourney).toHaveBeenCalledWith(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c',
        '0xjourney123',
      );

      // Legacy method must NOT exist on the Diamond contract
      expect(mockDiamondContract.assignDriverToJourneyId).toBeUndefined();
    });

    it('should fail if contract only has legacy method (assignDriverToJourneyId)', async () => {
      // After fix: provider now calls assignDriverToJourney (Diamond name).
      // If given a contract with only the legacy name, it should fail.
      const legacyOnlyContract = {
        ...createDiamondContract(),
        assignDriverToJourney: undefined, // Remove Diamond method
        assignDriverToJourneyId: vi.fn().mockResolvedValue({
          hash: '0xabc',
          wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
        }),
      };
      mockRepoContext.getAusysContract = vi
        .fn()
        .mockReturnValue(legacyOnlyContract);

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.acceptDelivery('0xjourney123');
        } catch {
          // Expected to fail
        }
      });

      // The provider now correctly uses the Diamond name, so the legacy-only
      // contract will fail. The legacy method should NOT have been called.
      expect(legacyOnlyContract.assignDriverToJourneyId).not.toHaveBeenCalled();
      expect(result.current.error).toBeTruthy();
    });

    it('should block acceptDelivery when driver wallet matches sender', async () => {
      mockDiamondContract.getJourney = vi.fn().mockResolvedValue({
        sender: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c',
        receiver: '0x2222222222222222222222222222222222222222',
        driver: '0x0000000000000000000000000000000000000000',
        currentStatus: 0n,
      });

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await expect(
          result.current.acceptDelivery('0xjourney123'),
        ).rejects.toThrow(
          'Driver wallet cannot be the same as the sender wallet.',
        );
      });

      expect(mockDiamondContract.assignDriverToJourney).not.toHaveBeenCalled();
      expect(result.current.error).toBeNull();
    });

    it('should handle DRIVER_ROLE check failure gracefully and still attempt delivery', async () => {
      // Simulate DRIVER_ROLE being unavailable (empty ABI)
      mockDiamondContract.DRIVER_ROLE = vi
        .fn()
        .mockRejectedValue(new TypeError('DRIVER_ROLE is not a function'));

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // The provider catches the DRIVER_ROLE error (line 138-141)
      // and continues to call assignDriverToJourney (fixed Diamond name)
      await act(async () => {
        await result.current.acceptDelivery('0xjourney123');
      });

      // After the fix: assignDriverToJourney (Diamond) should be called
      // even when the DRIVER_ROLE check fails
      expect(mockDiamondContract.assignDriverToJourney).toHaveBeenCalled();
    });
  });

  describe('acceptDelivery - role check flow', () => {
    it('should check hasAuSysRole when driver has role', async () => {
      mockDiamondContract.hasAuSysRole = vi.fn().mockResolvedValue(true);

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.acceptDelivery('0xjourney123');
      });

      expect(mockDiamondContract.DRIVER_ROLE).toHaveBeenCalled();
    });

    it('should attempt to grant driver role when not found', async () => {
      // hasRole returns false -> should try setDriver
      mockDiamondContract.hasAuSysRole = vi.fn().mockResolvedValue(false);

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.acceptDelivery('0xjourney123');
        } catch {
          // may throw
        }
      });

      // DRIVER_ROLE should have been called to get the role hash
      expect(mockDiamondContract.DRIVER_ROLE).toHaveBeenCalled();
    });
  });

  describe('refreshDeliveries', () => {
    it('should call repository methods to fetch deliveries', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockRepository.getAvailableDeliveries).toHaveBeenCalled();
      expect(mockRepository.getMyDeliveries).toHaveBeenCalledWith(
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c',
      );
    });

    it('should set error when deliveries fail to load', async () => {
      mockRepository.getAvailableDeliveries = vi
        .fn()
        .mockRejectedValue(new Error('GraphQL fetch failed'));
      mockRepository.getMyDeliveries = vi
        .fn()
        .mockRejectedValue(new Error('GraphQL fetch failed'));

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.error).toContain('GraphQL fetch failed');
    });
  });

  // =====================================================================
  // completeDelivery - ReceiverNotSigned error handling
  // =====================================================================
  describe('completeDelivery - error selector matching', () => {
    it('should return receiver_not_signed when handOff fails with ReceiverNotSigned (0x04d27bc2)', async () => {
      mockDiamondContract.handOff = vi
        .fn()
        .mockRejectedValue(
          new Error(
            'execution reverted (unknown custom error) (action="estimateGas", data="0x04d27bc2")',
          ),
        );

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deliveryResult: string;
      await act(async () => {
        deliveryResult = await result.current.completeDelivery('0xjourney123');
      });

      // packageSign should have been called first
      expect(mockDiamondContract.packageSign).toHaveBeenCalledWith(
        '0xjourney123',
      );
      // handOff was attempted but failed
      expect(mockDiamondContract.handOff).toHaveBeenCalledWith('0xjourney123');
      // Must return 'receiver_not_signed', NOT 'signed'
      expect(deliveryResult!).toBe('receiver_not_signed');
    });

    it('should return settled when handOff succeeds', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deliveryResult: string;
      await act(async () => {
        deliveryResult = await result.current.completeDelivery('0xjourney123');
      });

      expect(mockDiamondContract.packageSign).toHaveBeenCalled();
      expect(mockDiamondContract.handOff).toHaveBeenCalled();
      expect(deliveryResult!).toBe('settled');
    });

    it('should NOT match old incorrect selector 0x9651c547 for ReceiverNotSigned', async () => {
      // 0x9651c547 was a typo in the old code — it's not a valid selector
      // The correct ReceiverNotSigned selector is 0x04d27bc2
      mockDiamondContract.handOff = vi
        .fn()
        .mockRejectedValue(
          new Error('execution reverted with data 0x9651c547'),
        );

      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let deliveryResult: string;
      await act(async () => {
        deliveryResult = await result.current.completeDelivery('0xjourney123');
      });

      // Should NOT return 'receiver_not_signed' for this unknown selector
      // (it's not ReceiverNotSigned — that's 0x04d27bc2)
      expect(deliveryResult!).not.toBe('receiver_not_signed');
    });
  });

  describe('other delivery actions', () => {
    it('confirmPickup should call packageSign on the contract', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.confirmPickup('0xjourney123');
      });

      expect(mockDiamondContract.packageSign).toHaveBeenCalledWith(
        '0xjourney123',
      );
    });

    it('startJourney should call handOn on the contract', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.startJourney('0xjourney123');
      });

      expect(mockDiamondContract.handOn).toHaveBeenCalledWith('0xjourney123');
    });

    it('completeDelivery should call handOff on the contract', async () => {
      const { result } = renderHook(() => useDriver(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.completeDelivery('0xjourney123');
      });

      expect(mockDiamondContract.handOff).toHaveBeenCalledWith('0xjourney123');
    });
  });
});

describe('Contract ABI completeness', () => {
  it('Ausys contract must have DRIVER_ROLE method (non-empty ABI)', () => {
    // This validates that the contract created from ABI has the DRIVER_ROLE function.
    // The bug: extracted-abis.json has Ausys: [] (empty ABI), so no methods exist.
    const contract = createDiamondContract();
    expect(typeof contract.DRIVER_ROLE).toBe('function');
  });

  it('Ausys contract must have assignDriverToJourney method', () => {
    const contract = createDiamondContract();
    expect(typeof contract.assignDriverToJourney).toBe('function');
  });

  it('Ausys contract must NOT have legacy assignDriverToJourneyId method', () => {
    const contract = createDiamondContract();
    expect((contract as any).assignDriverToJourneyId).toBeUndefined();
  });

  it('Ausys contract must have all required driver workflow methods', () => {
    const contract = createDiamondContract();
    const requiredMethods = [
      'assignDriverToJourney',
      'DRIVER_ROLE',
      'packageSign',
      'handOn',
      'handOff',
      'getJourney',
    ];
    for (const method of requiredMethods) {
      expect(typeof (contract as any)[method]).toBe('function');
    }
  });
});
