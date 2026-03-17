import { sendWithNonceRetry } from '@/scripts/lib/nonce-retry';

describe('sendWithNonceRetry', () => {
  it('returns immediately when the first send succeeds', async () => {
    const send = vi.fn().mockResolvedValue('ok');
    const getPendingNonce = vi.fn().mockResolvedValue(12);

    await expect(
      sendWithNonceRetry({
        label: 'test send',
        send,
        getPendingNonce,
      }),
    ).resolves.toBe('ok');

    expect(send).toHaveBeenCalledTimes(1);
    expect(getPendingNonce).not.toHaveBeenCalled();
  });

  it('retries with the pending nonce after a nonce conflict', async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error('nonce too low: tx 1 state 2'))
      .mockResolvedValueOnce('ok');
    const getPendingNonce = vi.fn().mockResolvedValue(27);

    await expect(
      sendWithNonceRetry({
        label: 'diamondCut',
        send,
        getPendingNonce,
        retryDelayMs: 1,
      }),
    ).resolves.toBe('ok');

    expect(send).toHaveBeenNthCalledWith(1, undefined);
    expect(send).toHaveBeenNthCalledWith(2, { nonce: 27 });
    expect(getPendingNonce).toHaveBeenCalledTimes(1);
  });

  it('does not retry non-nonce errors', async () => {
    const send = vi.fn().mockRejectedValue(new Error('execution reverted'));
    const getPendingNonce = vi.fn().mockResolvedValue(99);

    await expect(
      sendWithNonceRetry({
        label: 'diamondCut',
        send,
        getPendingNonce,
        retryDelayMs: 1,
      }),
    ).rejects.toThrow('execution reverted');

    expect(send).toHaveBeenCalledTimes(1);
    expect(getPendingNonce).not.toHaveBeenCalled();
  });
});
