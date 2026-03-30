import { Interface, type TransactionReceipt } from 'ethers';

import {
  decodeTreasuryFeeUpdate,
  parseTreasuryFeeArgs,
  parseTreasuryFeeBps,
  updateTreasuryFeeBps,
} from '@/scripts/lib/ausys-treasury-fee';

const treasuryFeeInterface = new Interface([
  'event TreasuryFeeBpsUpdated(uint16 oldBps, uint16 newBps)',
]);

function createReceipt(
  oldBps: number,
  newBps: number,
): Pick<TransactionReceipt, 'logs'> {
  const encoded = treasuryFeeInterface.encodeEventLog(
    treasuryFeeInterface.getEvent('TreasuryFeeBpsUpdated'),
    [oldBps, newBps],
  );

  return {
    logs: [
      {
        data: encoded.data,
        topics: encoded.topics,
      },
    ],
  } as Pick<TransactionReceipt, 'logs'>;
}

describe('ausys treasury fee CLI parsing', () => {
  it('parses a valid bps value', () => {
    expect(parseTreasuryFeeBps('5')).toBe(5);
    expect(parseTreasuryFeeBps('0')).toBe(0);
    expect(parseTreasuryFeeBps('500')).toBe(500);
  });

  it('rejects invalid bps values', () => {
    expect(() => parseTreasuryFeeBps('')).toThrow('Missing value for --bps');
    expect(() => parseTreasuryFeeBps('-1')).toThrow(
      'Treasury fee bps must be an integer',
    );
    expect(() => parseTreasuryFeeBps('1.5')).toThrow(
      'Treasury fee bps must be an integer',
    );
    expect(() => parseTreasuryFeeBps('501')).toThrow(
      'Treasury fee bps must be between 0 and 500',
    );
  });

  it('parses CLI args including dry-run and diamond override', () => {
    expect(
      parseTreasuryFeeArgs(['--bps', '5', '--dry-run', '--diamond', '0x123'], {
        DIAMOND_ADDRESS: '0x456',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      bps: 5,
      dryRun: true,
      diamondAddress: '0x123',
    });
  });

  it('falls back to DIAMOND_ADDRESS from env', () => {
    expect(
      parseTreasuryFeeArgs(['--bps', '10'], {
        DIAMOND_ADDRESS: '0xabc',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      bps: 10,
      dryRun: false,
      diamondAddress: '0xabc',
    });
  });

  it('rejects missing required bps arg', () => {
    expect(() => parseTreasuryFeeArgs([], {} as NodeJS.ProcessEnv)).toThrow(
      'Missing required argument: --bps',
    );
  });

  it('rejects unknown args', () => {
    expect(() =>
      parseTreasuryFeeArgs(['--bps', '5', '--wat'], {} as NodeJS.ProcessEnv),
    ).toThrow('Unknown argument: --wat');
  });
});

describe('ausys treasury fee update flow', () => {
  it('returns a dry-run summary without sending a transaction', async () => {
    const contract = {
      setTreasuryFeeBps: vi.fn(),
    };
    const getPendingNonce = vi.fn().mockResolvedValue(12);

    await expect(
      updateTreasuryFeeBps({
        contract,
        chainId: 42161,
        network: 'arbitrumOne',
        diamondAddress: '0x1111111111111111111111111111111111111111',
        requestedBps: 5,
        dryRun: true,
        getPendingNonce,
      }),
    ).resolves.toEqual({
      chainId: 42161,
      network: 'arbitrumOne',
      diamondAddress: '0x1111111111111111111111111111111111111111',
      requestedBps: 5,
      dryRun: true,
      action: 'dry-run',
      previousBps: null,
      newBps: null,
    });

    expect(contract.setTreasuryFeeBps).not.toHaveBeenCalled();
    expect(getPendingNonce).not.toHaveBeenCalled();
  });

  it('sends the treasury fee update tx and decodes the emitted event', async () => {
    const wait = vi.fn().mockResolvedValue(createReceipt(0, 5));
    const contract = {
      setTreasuryFeeBps: vi.fn().mockResolvedValue({
        hash: '0xtxhash',
        wait,
      }),
    };

    await expect(
      updateTreasuryFeeBps({
        contract,
        chainId: 42161,
        network: 'arbitrumOne',
        diamondAddress: '0x1111111111111111111111111111111111111111',
        requestedBps: 5,
        dryRun: false,
        getPendingNonce: vi.fn().mockResolvedValue(9),
      }),
    ).resolves.toEqual({
      chainId: 42161,
      network: 'arbitrumOne',
      diamondAddress: '0x1111111111111111111111111111111111111111',
      requestedBps: 5,
      dryRun: false,
      action: 'updated',
      previousBps: 0,
      newBps: 5,
      txHash: '0xtxhash',
    });

    expect(contract.setTreasuryFeeBps).toHaveBeenCalledWith(5, undefined);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it('retries with the pending nonce on nonce conflicts', async () => {
    const wait = vi.fn().mockResolvedValue(createReceipt(5, 10));
    const contract = {
      setTreasuryFeeBps: vi
        .fn()
        .mockRejectedValueOnce(new Error('nonce too low'))
        .mockResolvedValueOnce({
          hash: '0xtxhash2',
          wait,
        }),
    };
    const getPendingNonce = vi.fn().mockResolvedValue(44);

    const result = await updateTreasuryFeeBps({
      contract,
      chainId: 84532,
      network: 'baseSepolia',
      diamondAddress: '0x2222222222222222222222222222222222222222',
      requestedBps: 10,
      dryRun: false,
      getPendingNonce,
      logger: console,
    });

    expect(contract.setTreasuryFeeBps).toHaveBeenNthCalledWith(
      1,
      10,
      undefined,
    );
    expect(contract.setTreasuryFeeBps).toHaveBeenNthCalledWith(2, 10, {
      nonce: 44,
    });
    expect(getPendingNonce).toHaveBeenCalledTimes(1);
    expect(result.previousBps).toBe(5);
    expect(result.newBps).toBe(10);
  });

  it('fails when the receipt does not include the treasury fee update event', async () => {
    const contract = {
      setTreasuryFeeBps: vi.fn().mockResolvedValue({
        hash: '0xmissingevent',
        wait: vi.fn().mockResolvedValue({ logs: [] }),
      }),
    };

    await expect(
      updateTreasuryFeeBps({
        contract,
        chainId: 42161,
        network: 'arbitrumOne',
        diamondAddress: '0x1111111111111111111111111111111111111111',
        requestedBps: 5,
        dryRun: false,
        getPendingNonce: vi.fn().mockResolvedValue(1),
      }),
    ).rejects.toThrow(
      'Treasury fee update transaction did not emit TreasuryFeeBpsUpdated.',
    );
  });

  it('can decode a treasury fee update receipt directly', () => {
    expect(decodeTreasuryFeeUpdate(createReceipt(0, 5))).toEqual({
      previousBps: 0,
      newBps: 5,
    });
  });
});
