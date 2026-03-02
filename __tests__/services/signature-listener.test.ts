import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ethers } from 'ethers';
import { listenForSignature } from '@/infrastructure/services/signature-listener.service';

/**
 * Minimal mock of the ethers Contract API used by listenForSignature.
 */
function makeContract(
  handlers: Record<string, Array<(...args: unknown[]) => void>> = {},
) {
  return {
    filters: {
      emitSig: () => 'emitSig-filter',
    },
    on: vi.fn((filter: string, handler: (...args: unknown[]) => void) => {
      if (!handlers[filter]) handlers[filter] = [];
      handlers[filter].push(handler);
    }),
    off: vi.fn((filter: string, handler: (...args: unknown[]) => void) => {
      if (handlers[filter]) {
        handlers[filter] = handlers[filter].filter((h) => h !== handler);
      }
    }),
    _emit: (filter: string, ...args: unknown[]) => {
      (handlers[filter] ?? []).forEach((h) => h(...args));
    },
  };
}

describe('listenForSignature', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('resolves when two distinct addresses sign for a bytes32 hex job ID', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const jobID = ethers.keccak256(ethers.toUtf8Bytes('JOB_001'));

    const promise = listenForSignature(contract, jobID, 5000);

    // Emit two distinct signers
    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      jobID,
    );
    contract._emit(
      'emitSig-filter',
      '0xBBBB000000000000000000000000000000000002',
      jobID,
    );

    await expect(promise).resolves.toBe(true);
  });

  it('resolves when job ID is a short ASCII string (encodeBytes32String)', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const shortId = 'SHIPMENT-42';
    const bytes32Hex = ethers.encodeBytes32String(shortId);

    const promise = listenForSignature(contract, shortId, 5000);

    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      bytes32Hex,
    );
    contract._emit(
      'emitSig-filter',
      '0xBBBB000000000000000000000000000000000002',
      bytes32Hex,
    );

    await expect(promise).resolves.toBe(true);
  });

  it('ignores duplicate signatures from the same address', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const jobID = ethers.keccak256(ethers.toUtf8Bytes('JOB_DUP'));

    const promise = listenForSignature(contract, jobID, 500);

    // Same address twice — should not resolve, expect timeout
    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      jobID,
    );
    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      jobID,
    );

    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('Timeout');
  });

  it('ignores events for a different job ID', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const jobID = ethers.keccak256(ethers.toUtf8Bytes('JOB_TARGET'));
    const otherID = ethers.keccak256(ethers.toUtf8Bytes('JOB_OTHER'));

    const promise = listenForSignature(contract, jobID, 500);

    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      otherID,
    );
    contract._emit(
      'emitSig-filter',
      '0xBBBB000000000000000000000000000000000002',
      otherID,
    );

    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('Timeout');
  });

  it('rejects after timeout if fewer than 2 signatures received', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const jobID = ethers.keccak256(ethers.toUtf8Bytes('JOB_SLOW'));

    const promise = listenForSignature(contract, jobID, 1000);

    // Only one signer
    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      jobID,
    );

    vi.advanceTimersByTime(1100);

    await expect(promise).rejects.toThrow('Timeout');
  });

  it('throws immediately if contract is not provided', async () => {
    await expect(
      listenForSignature(null as any, 'JOB_NULL', 5000),
    ).rejects.toThrow('Contract instance must be provided');
  });

  it('is case-insensitive for address deduplication', async () => {
    const handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const contract = makeContract(handlers) as any;
    const jobID = ethers.keccak256(ethers.toUtf8Bytes('JOB_CASE'));

    const promise = listenForSignature(contract, jobID, 500);

    // Same address in different cases — should be treated as duplicate
    contract._emit(
      'emitSig-filter',
      '0xaaaa000000000000000000000000000000000001',
      jobID,
    );
    contract._emit(
      'emitSig-filter',
      '0xAAAA000000000000000000000000000000000001',
      jobID,
    );

    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('Timeout');
  });
});
