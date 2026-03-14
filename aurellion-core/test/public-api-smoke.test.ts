import { describe, expect, it, vi } from 'vitest';

import type {
  ApiResponse,
  ParsedArgs,
  SmokeDependencies,
} from '@core/testing/public-api-smoke';
import {
  UsageError,
  checkErrorResponse,
  checkNodeSuccess,
  checkOrderSuccess,
  parseArgs,
  runCommand,
} from '@core/testing/public-api-smoke';

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): ApiResponse {
  return {
    status,
    body: body as any,
    headers,
    text: JSON.stringify(body),
  };
}

function createDependencies(
  overrides: Partial<SmokeDependencies> = {},
): SmokeDependencies {
  return {
    httpJsonRequest: vi.fn(async (_method, url) => {
      if (url.endsWith('/health')) {
        return jsonResponse(200, { status: 'ok' });
      }
      if (url.endsWith('/ready')) {
        return jsonResponse(200, { status: 'ready' });
      }
      return jsonResponse(
        404,
        { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
        {
          'x-rate-limit-limit': '60',
          'x-rate-limit-remaining': '59',
          vary: 'x-api-key',
        },
      );
    }),
    discoverNodes: vi.fn(async () => []),
    discoverOrders: vi.fn(async () => []),
    log: vi.fn(),
    ...overrides,
  };
}

describe('public-api-smoke parseArgs', () => {
  it('parses the health command with json output', () => {
    const args = parseArgs(['health', '--base-url', 'http://localhost:3001', '--json']);

    expect(args).toMatchObject({
      command: 'health',
      baseUrl: 'http://localhost:3001',
      json: true,
    });
  });

  it('parses the smoke command with discover mode', () => {
    const args = parseArgs([
      'smoke',
      '--discover',
      '--node-id',
      '0x123',
      '--order-id',
      '0x456',
    ]);

    expect(args).toMatchObject({
      command: 'smoke',
      discover: true,
      nodeId: '0x123',
      orderId: '0x456',
    });
  });

  it('throws a usage error when no command is supplied', () => {
    expect(() => parseArgs([])).toThrow(UsageError);
  });
});

describe('public-api-smoke checks', () => {
  it('validates node success responses', () => {
    const [ok] = checkNodeSuccess(
      jsonResponse(
        200,
        {
          data: {
            nodeId: '0x1',
            assets: [{ sellableQuantity: '1', custodyQuantity: '2' }],
          },
        },
        {
          'cache-control': 'public, max-age=15',
          'x-rate-limit-limit': '60',
          'x-rate-limit-remaining': '59',
          vary: 'x-api-key',
        },
      ),
      '0x1',
    );

    expect(ok).toBe(true);
  });

  it('validates order success responses', () => {
    const [ok] = checkOrderSuccess(
      jsonResponse(
        200,
        {
          data: {
            orderId: '0x1',
            orderSource: 'unified',
            journeys: [],
          },
        },
        {
          'cache-control': 'public, max-age=10',
          'x-rate-limit-limit': '60',
          'x-rate-limit-remaining': '59',
          vary: 'x-api-key',
        },
      ),
      '0x1',
    );

    expect(ok).toBe(true);
  });

  it('validates error responses', () => {
    const [ok] = checkErrorResponse(
      jsonResponse(
        400,
        { error: { code: 'INVALID_ORDER_ID', message: 'bad id' } },
        {
          'x-rate-limit-limit': '60',
          'x-rate-limit-remaining': '59',
          vary: 'x-api-key',
        },
      ),
      400,
      'INVALID_ORDER_ID',
    );

    expect(ok).toBe(true);
  });
});

describe('public-api-smoke runCommand', () => {
  it('runs health checks successfully', async () => {
    const deps = createDependencies();
    const args = parseArgs(['health']) as ParsedArgs;

    const result = await runCommand(args, deps);

    expect(result.exitCode).toBe(0);
    expect(result.summary.checks).toHaveLength(2);
    expect(result.summary.checks.every((check) => check.ok)).toBe(true);
  });

  it('fails smoke when discover mode cannot find live ids', async () => {
    const deps = createDependencies({
      httpJsonRequest: vi.fn(async (_method, url) => {
        if (url.endsWith('/health')) {
          return jsonResponse(200, { status: 'ok' });
        }
        if (url.endsWith('/ready')) {
          return jsonResponse(200, { status: 'ready' });
        }
        if (url.includes('/not-a-node')) {
          return jsonResponse(
            400,
            { error: { code: 'INVALID_NODE_ID', message: 'invalid' } },
            {
              'x-rate-limit-limit': '60',
              'x-rate-limit-remaining': '59',
              vary: 'x-api-key',
            },
          );
        }
        if (url.includes('/not-an-order')) {
          return jsonResponse(
            400,
            { error: { code: 'INVALID_ORDER_ID', message: 'invalid' } },
            {
              'x-rate-limit-limit': '60',
              'x-rate-limit-remaining': '59',
              vary: 'x-api-key',
            },
          );
        }

        return jsonResponse(
          404,
          { error: { code: 'ORDER_NOT_FOUND', message: 'missing' } },
          {
            'x-rate-limit-limit': '60',
            'x-rate-limit-remaining': '59',
            vary: 'x-api-key',
          },
        );
      }),
    });
    const args = parseArgs(['smoke', '--discover']) as ParsedArgs;

    const result = await runCommand(args, deps);

    expect(result.exitCode).toBe(1);
    expect(
      result.summary.checks.some(
        (check) =>
          check.name === 'discover ids for smoke' && check.ok === false,
      ),
    ).toBe(true);
  });

  it('marks missing valid auth api key as skipped rather than failed', async () => {
    const deps = createDependencies({
      httpJsonRequest: vi.fn(async (_method, url, options) => {
        if (url.endsWith('/health')) {
          return jsonResponse(200, { status: 'ok' });
        }
        if (url.endsWith('/ready')) {
          return jsonResponse(200, { status: 'ready' });
        }

        if (!options.headers?.['x-api-key']) {
          return jsonResponse(
            401,
            { error: { code: 'API_KEY_REQUIRED', message: 'Missing API key' } },
            {
              'x-rate-limit-limit': '60',
              'x-rate-limit-remaining': '59',
            },
          );
        }

        return jsonResponse(
          403,
          { error: { code: 'API_KEY_INVALID', message: 'Invalid API key' } },
          {
            'x-rate-limit-limit': '60',
            'x-rate-limit-remaining': '58',
          },
        );
      }),
    });
    const args = parseArgs(['auth']) as ParsedArgs;

    const result = await runCommand(args, deps);

    expect(result.exitCode).toBe(0);
    expect(
      result.summary.checks.some(
        (check) => check.name === 'valid x-api-key' && check.skipped === true,
      ),
    ).toBe(true);
  });
});
