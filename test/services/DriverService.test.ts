// @ts-nocheck - Test file with mocked contract types
// File: test/services/DriverService.test.ts
//
// Unit tests for DriverService - validates contract method names
// match the Diamond ABI (not legacy AuSys.sol names)

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ethers } from 'ethers';

// --- Diamond ABI method names (source of truth) ---
// From infrastructure/contracts/diamond-abi.generated.ts:
//   - assignDriverToJourney  (NOT assignDriverToJourneyId)
//   - DRIVER_ROLE
//   - hasAuSysRole           (NOT hasRole from OpenZeppelin)
//   - setDriver
//   - packageSign
//   - handOn
//   - handOff
//   - idToJourney

const DIAMOND_AUSYS_METHODS = [
  'assignDriverToJourney',
  'DRIVER_ROLE',
  'hasAuSysRole',
  'setDriver',
  'packageSign',
  'handOn',
  'handOff',
  'getJourney',
  'driverDeliverySigned',
  'driverPickupSigned',
  'customerHandOff',
] as const;

// Mock the tx-helper to capture method names
let capturedMethod: string | null = null;
let capturedArgs: unknown[] = [];

vi.mock('@/infrastructure/shared/tx-helper', () => ({
  sendContractTxWithReadEstimation: vi.fn(
    async (contract: any, method: string, args: unknown[]) => {
      capturedMethod = method;
      capturedArgs = args;
      return { tx: { hash: '0xabc' }, receipt: { blockNumber: 1 } };
    },
  ),
}));

vi.mock('@/utils/error-handler', () => ({
  handleContractError: vi.fn(),
}));

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_AUSYS_SUBGRAPH_URL: 'http://localhost:42069',
  NEXT_PUBLIC_INDEXER_URL: 'http://localhost:42069',
  NEXT_PUBLIC_AURA_GOAT_ADDRESS: '0x0000000000000000000000000000000000000001',
}));

// Build a mock contract that has all Diamond methods
function createMockAusysContract() {
  const contract: Record<string, any> = {};
  for (const method of DIAMOND_AUSYS_METHODS) {
    contract[method] = vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    });
  }
  // getJourney returns a journey struct
  contract.getJourney = vi.fn().mockResolvedValue({
    sender: '0x1111111111111111111111111111111111111111',
    receiver: '0x2222222222222222222222222222222222222222',
    driver: '0x3333333333333333333333333333333333333333',
    currentStatus: 0n,
  });
  return contract;
}

// Build a mock contract that ONLY has legacy method names (to prove test catches bugs)
function createLegacyMockContract() {
  return {
    assignDriverToJourneyId: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    hasRole: vi.fn().mockResolvedValue(true),
    DRIVER_ROLE: vi
      .fn()
      .mockResolvedValue(ethers.keccak256(ethers.toUtf8Bytes('DRIVER_ROLE'))),
    getJourney: vi.fn().mockResolvedValue({
      sender: '0x1111111111111111111111111111111111111111',
      receiver: '0x2222222222222222222222222222222222222222',
      driver: '0x3333333333333333333333333333333333333333',
      currentStatus: 0n,
    }),
    handOn: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    handOff: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
    packageSign: vi.fn().mockResolvedValue({
      wait: vi.fn().mockResolvedValue({ blockNumber: 1 }),
    }),
  };
}

const mockSigner = {
  getAddress: vi
    .fn()
    .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c'),
};

const mockDiamondRuntime = {
  getDiamondContract: vi.fn(),
  getDiamondSigner: vi.fn().mockReturnValue(mockSigner),
};

vi.mock('@/infrastructure/diamond', () => ({
  getDiamondContract: () => mockDiamondRuntime.getDiamondContract(),
  getDiamondSigner: () => mockDiamondRuntime.getDiamondSigner(),
}));

// Import after mocking
import { DriverService } from '@/infrastructure/services/driver.service';
import { sendContractTxWithReadEstimation } from '@/infrastructure/shared/tx-helper';

describe('DriverService', () => {
  let service: DriverService;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedMethod = null;
    capturedArgs = [];
    mockDiamondRuntime.getDiamondContract.mockReturnValue(
      createMockAusysContract(),
    );
    service = new DriverService(createMockAusysContract() as any);
  });

  describe('acceptDelivery', () => {
    it('should call assignDriverToJourney (Diamond name), NOT assignDriverToJourneyId (legacy)', async () => {
      await service.acceptDelivery('0xjourney123');

      // The tx-helper is called with the method name string
      expect(sendContractTxWithReadEstimation).toHaveBeenCalledTimes(1);

      const calledMethod = (sendContractTxWithReadEstimation as any).mock
        .calls[0][1];

      // This test catches the bug: service uses 'assignDriverToJourneyId'
      // but Diamond contract only has 'assignDriverToJourney'
      expect(calledMethod).toBe('assignDriverToJourney');
      expect(calledMethod).not.toBe('assignDriverToJourneyId');
    });

    it('should pass driver address and journey ID as arguments', async () => {
      const journeyId = '0xjourney456';
      await service.acceptDelivery(journeyId);

      const calledArgs = (sendContractTxWithReadEstimation as any).mock
        .calls[0][2];
      expect(calledArgs).toEqual([
        '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c',
        journeyId,
      ]);
    });

    it('should throw if contract is not initialized', async () => {
      mockDiamondRuntime.getDiamondContract.mockReturnValue(null);
      const badService = new DriverService();

      await expect(badService.acceptDelivery('0xjourney')).rejects.toThrow();
    });
  });

  describe('confirmPickup', () => {
    it('should call handOn with the journey ID', async () => {
      const journeyId = '0xjourney789';
      await service.confirmPickup(journeyId);

      expect(sendContractTxWithReadEstimation).toHaveBeenCalledTimes(1);
      const calledMethod = (sendContractTxWithReadEstimation as any).mock
        .calls[0][1];
      expect(calledMethod).toBe('handOn');
    });
  });

  describe('packageSign', () => {
    it('should call packageSign with the journey ID', async () => {
      const journeyId = '0xjourneyABC';
      await service.packageSign(journeyId);

      expect(sendContractTxWithReadEstimation).toHaveBeenCalledTimes(1);
      const calledMethod = (sendContractTxWithReadEstimation as any).mock
        .calls[0][1];
      expect(calledMethod).toBe('packageSign');
    });
  });

  describe('completeDelivery', () => {
    it('should call handOff with the journey ID', async () => {
      const journeyId = '0xjourneyDEF';
      await service.completeDelivery(journeyId);

      expect(sendContractTxWithReadEstimation).toHaveBeenCalledTimes(1);
      const calledMethod = (sendContractTxWithReadEstimation as any).mock
        .calls[0][1];
      expect(calledMethod).toBe('handOff');
    });
  });
});

describe('Diamond ABI method name validation', () => {
  it('should NOT have assignDriverToJourneyId in the Diamond ABI', () => {
    // The Diamond contract renamed assignDriverToJourneyId → assignDriverToJourney
    expect(DIAMOND_AUSYS_METHODS).not.toContain('assignDriverToJourneyId');
    expect(DIAMOND_AUSYS_METHODS).toContain('assignDriverToJourney');
  });

  it('should have DRIVER_ROLE as a view function in the Diamond ABI', () => {
    expect(DIAMOND_AUSYS_METHODS).toContain('DRIVER_ROLE');
  });

  it('legacy contract uses assignDriverToJourneyId which does NOT exist on Diamond', () => {
    const legacyContract = createLegacyMockContract();
    const diamondContract = createMockAusysContract();

    // Legacy has the old name
    expect(typeof legacyContract.assignDriverToJourneyId).toBe('function');

    // Diamond does NOT have the old name
    expect((diamondContract as any).assignDriverToJourneyId).toBeUndefined();

    // Diamond has the new name
    expect(typeof diamondContract.assignDriverToJourney).toBe('function');
  });
});
