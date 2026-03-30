import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  guardPublicApiRequest,
  resetPublicApiAccessState,
} from '@core/public-api/access';

describe('public-api-access', () => {
  beforeEach(() => {
    resetPublicApiAccessState();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    resetPublicApiAccessState();
    vi.unstubAllEnvs();
  });

  it('allows public requests without an API key by default', async () => {
    const result = await guardPublicApiRequest(
      {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      },
      { scope: 'test:public', requestsPerMinute: 5 },
    );

    expect(result.error).toBeUndefined();
    expect(result.headers['x-rate-limit-limit']).toBe('5');
    expect(result.headers['x-rate-limit-remaining']).toBe('4');
  });

  it('requires an API key when api_key mode is enabled', async () => {
    vi.stubEnv('PUBLIC_API_AUTH_MODE', 'api_key');
    vi.stubEnv('PUBLIC_API_KEYS', 'secret-key');

    const result = await guardPublicApiRequest(
      {
        headers: { 'x-forwarded-for': '127.0.0.1' },
      },
      { scope: 'test:api-key', requestsPerMinute: 5 },
    );

    expect(result.error?.statusCode).toBe(401);
  });

  it('accepts a valid API key when api_key mode is enabled', async () => {
    vi.stubEnv('PUBLIC_API_AUTH_MODE', 'api_key');
    vi.stubEnv('PUBLIC_API_KEYS', 'secret-key');

    const result = await guardPublicApiRequest(
      {
        headers: {
          'x-forwarded-for': '127.0.0.1',
          'x-api-key': 'secret-key',
        },
      },
      { scope: 'test:api-key-valid', requestsPerMinute: 5 },
    );

    expect(result.error).toBeUndefined();
    expect(result.headers['x-rate-limit-remaining']).toBe('4');
  });

  it('rate limits repeated requests from the same client', async () => {
    const request = {
      headers: { 'x-forwarded-for': '127.0.0.1' },
    };

    const first = await guardPublicApiRequest(request, {
      scope: 'test:limit',
      requestsPerMinute: 1,
    });
    const second = await guardPublicApiRequest(request, {
      scope: 'test:limit',
      requestsPerMinute: 1,
    });

    expect(first.error).toBeUndefined();
    expect(second.error?.statusCode).toBe(429);
  });
});
