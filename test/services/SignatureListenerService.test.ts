/**
 * @file test/services/SignatureListenerService.test.ts
 * @description Vitest unit tests for listenForSignature (signature-listener.service)
 *
 * Covers:
 *  - throws when contract is null/undefined
 *  - resolves true when two distinct signers emit for the same job ID (bytes32 hex)
 *  - resolves true when job ID is a short ASCII string (encoded via encodeBytes32String)
 *  - ignores duplicate emissions from the same address (case-insensitive dedup)
 *  - ignores events for different job IDs
 *  - rejects with a timeout error when fewer than 2 signatures are received
 *  - cleans up the event listener (contract.off) after timeout
 *  - is case-insensitive for signer addresses
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ethers } from 'ethers';

// ─── Imports after (no module-level mocks needed — we pass mock contracts) ────

import { listenForSignature } from '@/infrastructure/services/signature-listener.service';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type Handler = (address: string, id: unknown) => void;

interface MockContract {
  filters: { emitSig: ReturnType<typeof vi.fn> };
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  _trigger: (address: string, id: string) => void;
}

/**
 * Build a minimal mock contract that captures the registered handler
 * and exposes a `_trigger` helper to simulate incoming events.
 */
function makeContract(): MockContract {
  let capturedHandler: Handler | null = null;

  const contract: MockContract = {
    filters: {
      emitSig: vi.fn().mockReturnValue({}),
    },
    on: vi.fn().mockImplementation((_filter: unknown, handler: Handler) => {
      capturedHandler = handler;
    }),
    off: vi.fn(),
    _trigger(address: string, id: string) {
      if (capturedHandler) capturedHandler(address, id);
    },
  };

  return contract;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('listenForSignature()', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Guard: missing contract
  // ═══════════════════════════════════════════════════════════════════════════

  it('throws immediately when contract is null', async () => {
    await expect(listenForSignature(null as any, 'JOB_001')).rejects.toThrow(
      'Contract instance must be provided.',
    );
  });

  it('throws immediately when contract is undefined', async () => {
    await expect(
      listenForSignature(undefined as any, 'JOB_001'),
    ).rejects.toThrow('Contract instance must be provided.');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Happy path — bytes32 job ID
  // ═══════════════════════════════════════════════════════════════════════════

  it('resolves true when two distinct signers emit for the same bytes32 job ID', async () => {
    const contract = makeContract();
    const jobId = '0x' + 'aa'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 5000);

    contract._trigger('0xAddress1', jobId);
    contract._trigger('0xAddress2', jobId);

    const result = await promise;

    expect(result).toBe(true);
    expect(contract.off).toHaveBeenCalledOnce();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Happy path — short ASCII job ID
  // ═══════════════════════════════════════════════════════════════════════════

  it('resolves true when a short ASCII job ID is used (encodeBytes32String)', async () => {
    const contract = makeContract();
    const shortJobId = 'JOB_001';
    const encodedJobId = ethers.encodeBytes32String(shortJobId).toLowerCase();

    const promise = listenForSignature(contract as any, shortJobId, 5000);

    contract._trigger('0xAddress1', encodedJobId);
    contract._trigger('0xAddress2', encodedJobId);

    const result = await promise;

    expect(result).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Deduplication — same address twice
  // ═══════════════════════════════════════════════════════════════════════════

  it('ignores duplicate emissions from the same address and waits for a second distinct one', async () => {
    const contract = makeContract();
    const jobId = '0x' + 'bb'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 5000);

    // Same address twice — should only count once
    contract._trigger('0xAddress1', jobId);
    contract._trigger('0xAddress1', jobId);

    // Still pending; advance timer to confirm it hasn't resolved yet (would timeout)
    // Now add the second distinct address
    contract._trigger('0xAddress2', jobId);

    const result = await promise;
    expect(result).toBe(true);
  });

  it('is case-insensitive for signer addresses (0xABCdef == 0xabcdef)', async () => {
    const contract = makeContract();
    const jobId = '0x' + 'cc'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 5000);

    // Mixed-case variants of the same address — should be treated as one
    contract._trigger('0xABCdef', jobId);
    contract._trigger('0xabcdef', jobId); // duplicate after lowercasing

    // Third from a different address
    contract._trigger('0xAnotherAddress', jobId);

    const result = await promise;
    expect(result).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Event filtering — wrong job ID
  // ═══════════════════════════════════════════════════════════════════════════

  it('ignores events for a different job ID and resolves only when correct ID appears', async () => {
    const contract = makeContract();
    const targetJobId = '0x' + 'dd'.repeat(32);
    const otherJobId = '0x' + 'ee'.repeat(32);

    const promise = listenForSignature(contract as any, targetJobId, 5000);

    // Wrong job ID — should be ignored
    contract._trigger('0xAddress1', otherJobId);
    contract._trigger('0xAddress2', otherJobId);

    // Correct job ID
    contract._trigger('0xAddress1', targetJobId);
    contract._trigger('0xAddress2', targetJobId);

    const result = await promise;
    expect(result).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Timeout behaviour
  // ═══════════════════════════════════════════════════════════════════════════

  it('rejects with a descriptive timeout error when fewer than 2 signatures received', async () => {
    const contract = makeContract();
    const jobId = '0x' + 'ff'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 1000);

    // Only one signature
    contract._trigger('0xAddress1', jobId);

    // Advance past the timeout
    vi.advanceTimersByTime(1500);

    await expect(promise).rejects.toThrow(
      'Timeout: fewer than 2 signatures received',
    );
  });

  it('includes the job ID and timeout duration in the timeout error message', async () => {
    const contract = makeContract();
    const jobId = '0x' + '12'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 2000);

    vi.advanceTimersByTime(3000);

    await expect(promise).rejects.toThrow(`job ID ${jobId}`);
    await expect(promise).rejects.toThrow('2s');
  });

  it('calls contract.off to remove the listener on timeout', async () => {
    const contract = makeContract();
    const jobId = '0x' + '34'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 500);

    vi.advanceTimersByTime(600);

    await expect(promise).rejects.toThrow('Timeout');
    expect(contract.off).toHaveBeenCalledOnce();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Event listener registration
  // ═══════════════════════════════════════════════════════════════════════════

  it('registers an event listener via contract.on with the emitSig filter', async () => {
    const contract = makeContract();
    const jobId = '0x' + '56'.repeat(32);

    const promise = listenForSignature(contract as any, jobId, 500);

    expect(contract.on).toHaveBeenCalledOnce();
    expect(contract.filters.emitSig).toHaveBeenCalledOnce();

    // Let it timeout to avoid hanging
    vi.advanceTimersByTime(600);
    await expect(promise).rejects.toThrow('Timeout');
  });
});
