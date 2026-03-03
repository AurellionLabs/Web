/**
 * @file test/services/RWYService.test.ts
 * @description Vitest unit tests for RWYService
 *
 * Covers:
 *  - constructor (instantiation)
 *  - createOpportunity (success, passes collateralAmount as value, no matching event, contract error)
 *  - stake (success, propagates errors)
 *  - unstake (success, propagates errors)
 *  - startDelivery (success, propagates errors)
 *  - confirmDelivery (success, propagates errors)
 *  - completeProcessing (success, propagates errors)
 *  - claimProfits (success, propagates errors)
 *  - emergencyClaim (success, propagates errors)
 *  - cancelOpportunity (success with reason, propagates errors)
 *  - approveTokensForStaking (success, propagates errors)
 *  - isApprovedForStaking (true, false, returns false on error)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock objects ─────────────────────────────────────────────────────

const mocks = vi.hoisted(() => {
  const vaultContract = {
    createOpportunity: vi.fn(),
    stake: vi.fn(),
    unstake: vi.fn(),
    startDelivery: vi.fn(),
    confirmDelivery: vi.fn(),
    completeProcessing: vi.fn(),
    claimProfits: vi.fn(),
    emergencyClaim: vi.fn(),
    cancelOpportunity: vi.fn(),
    interface: {
      parseLog: vi.fn(),
    },
  };

  const erc1155Contract = {
    setApprovalForAll: vi.fn(),
    isApprovedForAll: vi.fn(),
  };

  const mockSigner = {};

  return { vaultContract, erc1155Contract, mockSigner };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('ethers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ethers')>();

  const MockContract = vi
    .fn()
    .mockImplementation((_addr: string, abi: unknown[]) => {
      if (
        Array.isArray(abi) &&
        abi.some(
          (f) => typeof f === 'string' && f.includes('setApprovalForAll'),
        )
      ) {
        return mocks.erc1155Contract;
      }
      return mocks.vaultContract;
    });

  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: MockContract,
    },
  };
});

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { RWYService } from '@/infrastructure/services/rwy-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONTRACT_ADDR = '0x1234567890123456789012345678901234567890';
const OPPORTUNITY_ID = '0x' + 'ab'.repeat(32);
const JOURNEY_ID = '0x' + 'cd'.repeat(32);
const TOKEN_ADDRESS = '0x' + 'ef'.repeat(20);
const STAKER_ADDR = ('0x' + '11'.repeat(20)) as `0x${string}`;
const OPERATOR_ADDR = ('0x' + '22'.repeat(20)) as `0x${string}`;
const TX_HASH = '0xTxHash';

const validCreationData = {
  name: 'RWY Opportunity',
  description: 'A real-world asset opportunity',
  inputToken: TOKEN_ADDRESS as `0x${string}`,
  inputTokenId: 0,
  targetAmount: '1000000000000000000000',
  outputToken: TOKEN_ADDRESS as `0x${string}`,
  expectedOutputAmount: '1100000000000000000000',
  promisedYieldBps: 1000,
  operatorFeeBps: 500,
  minSalePrice: '900000000000000000000',
  fundingDays: 30,
  processingDays: 60,
  collateralAmount: '100000000000000000000',
};

function makeReceipt() {
  return { hash: TX_HASH, logs: [] as unknown[] };
}

function makeReceiptWithEvent(opportunityId: string) {
  return {
    hash: TX_HASH,
    logs: [{ topics: ['0xSomeTopic'], data: '0x' }],
    _opportunityId: opportunityId,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RWYService', () => {
  let service: RWYService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RWYService(CONTRACT_ADDR, mocks.mockSigner as any);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // constructor
  // ═══════════════════════════════════════════════════════════════════════════

  describe('constructor', () => {
    it('creates a RWYService instance', () => {
      expect(service).toBeInstanceOf(RWYService);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // createOpportunity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createOpportunity()', () => {
    it('returns transactionHash from receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.createOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.createOpportunity(
        validCreationData,
        OPERATOR_ADDR,
      );

      expect(result.transactionHash).toBe(TX_HASH);
      expect(mocks.vaultContract.createOpportunity).toHaveBeenCalledOnce();
    });

    it('passes collateralAmount as msg.value', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.createOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      await service.createOpportunity(validCreationData, OPERATOR_ADDR);

      expect(mocks.vaultContract.createOpportunity).toHaveBeenCalledWith(
        validCreationData.name,
        validCreationData.description,
        validCreationData.inputToken,
        validCreationData.inputTokenId,
        validCreationData.targetAmount,
        validCreationData.outputToken,
        validCreationData.expectedOutputAmount,
        validCreationData.promisedYieldBps,
        validCreationData.operatorFeeBps,
        validCreationData.minSalePrice,
        validCreationData.fundingDays,
        validCreationData.processingDays,
        { value: validCreationData.collateralAmount },
      );
    });

    it('extracts opportunityId from OpportunityCreated event log', async () => {
      const receipt = makeReceiptWithEvent(OPPORTUNITY_ID);
      mocks.vaultContract.createOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });
      mocks.vaultContract.interface.parseLog.mockReturnValue({
        name: 'OpportunityCreated',
        args: { opportunityId: OPPORTUNITY_ID },
      });

      const result = await service.createOpportunity(
        validCreationData,
        OPERATOR_ADDR,
      );

      expect(result.opportunityId).toBe(OPPORTUNITY_ID);
    });

    it('returns empty opportunityId when no matching event log', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.createOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.createOpportunity(
        validCreationData,
        OPERATOR_ADDR,
      );

      expect(result.opportunityId).toBe('');
      expect(result.transactionHash).toBe(TX_HASH);
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.createOpportunity.mockRejectedValue(
        new Error('execution reverted'),
      );

      await expect(
        service.createOpportunity(validCreationData, OPERATOR_ADDR),
      ).rejects.toThrow('execution reverted');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // stake
  // ═══════════════════════════════════════════════════════════════════════════

  describe('stake()', () => {
    it('calls contract.stake with opportunityId and amount, returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.stake.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.stake(OPPORTUNITY_ID, '1000', STAKER_ADDR);

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.stake).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        '1000',
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.stake.mockRejectedValue(new Error('InvalidStatus'));

      await expect(
        service.stake(OPPORTUNITY_ID, '1000', STAKER_ADDR),
      ).rejects.toThrow('InvalidStatus');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // unstake
  // ═══════════════════════════════════════════════════════════════════════════

  describe('unstake()', () => {
    it('calls contract.unstake with opportunityId and amount, returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.unstake.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.unstake(OPPORTUNITY_ID, '500', STAKER_ADDR);

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.unstake).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        '500',
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.unstake.mockRejectedValue(new Error('NotInFunding'));

      await expect(
        service.unstake(OPPORTUNITY_ID, '500', STAKER_ADDR),
      ).rejects.toThrow('NotInFunding');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // startDelivery
  // ═══════════════════════════════════════════════════════════════════════════

  describe('startDelivery()', () => {
    it('calls contract.startDelivery and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.startDelivery.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.startDelivery(
        OPPORTUNITY_ID,
        JOURNEY_ID,
        OPERATOR_ADDR,
      );

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.startDelivery).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        JOURNEY_ID,
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.startDelivery.mockRejectedValue(
        new Error('NotFunded'),
      );

      await expect(
        service.startDelivery(OPPORTUNITY_ID, JOURNEY_ID, OPERATOR_ADDR),
      ).rejects.toThrow('NotFunded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // confirmDelivery
  // ═══════════════════════════════════════════════════════════════════════════

  describe('confirmDelivery()', () => {
    it('calls contract.confirmDelivery with amount and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.confirmDelivery.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.confirmDelivery(
        OPPORTUNITY_ID,
        '1000',
        OPERATOR_ADDR,
      );

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.confirmDelivery).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        '1000',
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.confirmDelivery.mockRejectedValue(
        new Error('NotInTransit'),
      );

      await expect(
        service.confirmDelivery(OPPORTUNITY_ID, '1000', OPERATOR_ADDR),
      ).rejects.toThrow('NotInTransit');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // completeProcessing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('completeProcessing()', () => {
    it('calls contract.completeProcessing with all args and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.completeProcessing.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.completeProcessing(
        OPPORTUNITY_ID,
        '42',
        '900000',
        OPERATOR_ADDR,
      );

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.completeProcessing).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        '42',
        '900000',
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.completeProcessing.mockRejectedValue(
        new Error('NotProcessing'),
      );

      await expect(
        service.completeProcessing(
          OPPORTUNITY_ID,
          '42',
          '900000',
          OPERATOR_ADDR,
        ),
      ).rejects.toThrow('NotProcessing');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // claimProfits
  // ═══════════════════════════════════════════════════════════════════════════

  describe('claimProfits()', () => {
    it('calls contract.claimProfits with opportunityId and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.claimProfits.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.claimProfits(OPPORTUNITY_ID, STAKER_ADDR);

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.claimProfits).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.claimProfits.mockRejectedValue(
        new Error('NothingToClaim'),
      );

      await expect(
        service.claimProfits(OPPORTUNITY_ID, STAKER_ADDR),
      ).rejects.toThrow('NothingToClaim');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // emergencyClaim
  // ═══════════════════════════════════════════════════════════════════════════

  describe('emergencyClaim()', () => {
    it('calls contract.emergencyClaim with opportunityId and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.emergencyClaim.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.emergencyClaim(OPPORTUNITY_ID, STAKER_ADDR);

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.emergencyClaim).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.emergencyClaim.mockRejectedValue(
        new Error('NotCancelled'),
      );

      await expect(
        service.emergencyClaim(OPPORTUNITY_ID, STAKER_ADDR),
      ).rejects.toThrow('NotCancelled');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // cancelOpportunity
  // ═══════════════════════════════════════════════════════════════════════════

  describe('cancelOpportunity()', () => {
    it('calls contract.cancelOpportunity with opportunityId and reason', async () => {
      const receipt = makeReceipt();
      mocks.vaultContract.cancelOpportunity.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.cancelOpportunity(
        OPPORTUNITY_ID,
        'Market conditions changed',
        OPERATOR_ADDR,
      );

      expect(result).toEqual(receipt);
      expect(mocks.vaultContract.cancelOpportunity).toHaveBeenCalledWith(
        OPPORTUNITY_ID,
        'Market conditions changed',
      );
    });

    it('propagates contract errors', async () => {
      mocks.vaultContract.cancelOpportunity.mockRejectedValue(
        new Error('AlreadyFunded'),
      );

      await expect(
        service.cancelOpportunity(OPPORTUNITY_ID, 'test reason', OPERATOR_ADDR),
      ).rejects.toThrow('AlreadyFunded');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // approveTokensForStaking
  // ═══════════════════════════════════════════════════════════════════════════

  describe('approveTokensForStaking()', () => {
    it('calls setApprovalForAll on the ERC1155 contract and returns receipt', async () => {
      const receipt = makeReceipt();
      mocks.erc1155Contract.setApprovalForAll.mockResolvedValue({
        wait: vi.fn().mockResolvedValue(receipt),
      });

      const result = await service.approveTokensForStaking(
        TOKEN_ADDRESS as `0x${string}`,
        STAKER_ADDR,
      );

      expect(result).toEqual(receipt);
      expect(mocks.erc1155Contract.setApprovalForAll).toHaveBeenCalledWith(
        CONTRACT_ADDR,
        true,
      );
    });

    it('propagates errors from the ERC1155 contract', async () => {
      mocks.erc1155Contract.setApprovalForAll.mockRejectedValue(
        new Error('user rejected'),
      );

      await expect(
        service.approveTokensForStaking(
          TOKEN_ADDRESS as `0x${string}`,
          STAKER_ADDR,
        ),
      ).rejects.toThrow('user rejected');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // isApprovedForStaking
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isApprovedForStaking()', () => {
    it('returns true when tokens are approved', async () => {
      mocks.erc1155Contract.isApprovedForAll.mockResolvedValue(true);

      const result = await service.isApprovedForStaking(
        TOKEN_ADDRESS as `0x${string}`,
        STAKER_ADDR,
      );

      expect(result).toBe(true);
      expect(mocks.erc1155Contract.isApprovedForAll).toHaveBeenCalledWith(
        STAKER_ADDR,
        CONTRACT_ADDR,
      );
    });

    it('returns false when tokens are not approved', async () => {
      mocks.erc1155Contract.isApprovedForAll.mockResolvedValue(false);

      const result = await service.isApprovedForStaking(
        TOKEN_ADDRESS as `0x${string}`,
        STAKER_ADDR,
      );

      expect(result).toBe(false);
    });

    it('returns false on contract error (graceful degradation)', async () => {
      mocks.erc1155Contract.isApprovedForAll.mockRejectedValue(
        new Error('network error'),
      );

      const result = await service.isApprovedForStaking(
        TOKEN_ADDRESS as `0x${string}`,
        STAKER_ADDR,
      );

      expect(result).toBe(false);
    });
  });
});
