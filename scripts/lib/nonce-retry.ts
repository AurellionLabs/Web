interface NonceRetryOptions<T> {
  label: string;
  send: (overrides?: { nonce?: number }) => Promise<T>;
  getPendingNonce: () => Promise<number>;
  maxAttempts?: number;
  retryDelayMs?: number;
  logger?: Pick<typeof console, 'warn'>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function isNonceConflictError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes('nonce too low') ||
    message.includes('nonce has already been used') ||
    message.includes('already known') ||
    message.includes('replacement transaction underpriced') ||
    message.includes("the tx doesn't have the correct nonce")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendWithNonceRetry<T>(
  options: NonceRetryOptions<T>,
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const retryDelayMs = options.retryDelayMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const overrides =
      attempt === 1 ? undefined : { nonce: await options.getPendingNonce() };

    try {
      return await options.send(overrides);
    } catch (error) {
      lastError = error;

      if (!isNonceConflictError(error) || attempt === maxAttempts) {
        throw error;
      }

      options.logger?.warn(
        `   Warning: ${options.label} hit a nonce conflict on attempt ${attempt}/${maxAttempts}. Refreshing nonce and retrying...`,
      );
      await sleep(retryDelayMs * attempt);
    }
  }

  throw lastError;
}
