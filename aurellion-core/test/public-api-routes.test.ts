import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '@core/app';
import type { PublicApiHandlers } from '@core/public-api/runtime';

function createHandlers(): PublicApiHandlers {
  return {
    guard: vi.fn().mockResolvedValue({
      headers: {
        'x-rate-limit-limit': '60',
        'x-rate-limit-remaining': '59',
        'x-rate-limit-reset': '1700000000',
      },
    }),
    getPublicOrderById: vi.fn(),
    getPublicNodeById: vi.fn(),
  };
}

describe('public api routes', () => {
  let handlers: PublicApiHandlers;

  beforeEach(() => {
    handlers = createHandlers();
  });

  it('returns an order with expanded journeys', async () => {
    vi.mocked(handlers.getPublicOrderById).mockResolvedValue({
      orderId:
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      orderSource: 'unified',
      token: '0x1111111111111111111111111111111111111111',
      tokenId: '123',
      tokenQuantity: '5',
      price: '1000',
      txFee: '10',
      buyer: '0x2222222222222222222222222222222222222222',
      seller: '0x3333333333333333333333333333333333333333',
      status: 'created',
      contractualAgreement: '',
      isP2P: false,
      createdAt: 1234567890,
      journeyIds: ['0x4444444444444444444444444444444444444444444444444444444444444444'],
      nodes: ['0x5555555555555555555555555555555555555555555555555555555555555555'],
      locationData: undefined,
      journeys: [
        {
          journeyId:
            '0x4444444444444444444444444444444444444444444444444444444444444444',
          status: 'pending',
          sender: '0x6666666666666666666666666666666666666666',
          receiver: '0x7777777777777777777777777777777777777777',
          driver: '0x8888888888888888888888888888888888888888',
          journeyStart: '0',
          journeyEnd: '0',
          bounty: '10',
          eta: '20',
          parcelData: {
            startLocation: { lat: '0', lng: '0' },
            endLocation: { lat: '1', lng: '1' },
            startName: 'A',
            endName: 'B',
          },
        },
      ],
    });

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('public');
    expect(response.json().data.journeys).toHaveLength(1);
    expect(response.json().data.journeys[0].eta).toBe('20');
  });

  it('returns 400 for an invalid orderId', async () => {
    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/not-an-order',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_ORDER_ID');
    expect(handlers.getPublicOrderById).not.toHaveBeenCalled();
  });

  it('returns 404 when the order is not found', async () => {
    vi.mocked(handlers.getPublicOrderById).mockResolvedValue(null);

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('ORDER_NOT_FOUND');
  });

  it('passes through the guard response when rate limited', async () => {
    vi.mocked(handlers.guard).mockResolvedValue({
      headers: {
        'x-rate-limit-limit': '60',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': '1700000000',
      },
      error: {
        statusCode: 429,
        body: {
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        },
      },
    });

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    });

    expect(response.statusCode).toBe(429);
    expect(handlers.getPublicOrderById).not.toHaveBeenCalled();
  });

  it('returns 500 when the order read throws', async () => {
    vi.mocked(handlers.getPublicOrderById).mockRejectedValue(new Error('boom'));

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/orders/0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('ORDER_FETCH_FAILED');
  });

  it('returns node data with quantities', async () => {
    vi.mocked(handlers.getPublicNodeById).mockResolvedValue({
      nodeId:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      owner: '0x1111111111111111111111111111111111111111',
      status: 'Active',
      validNode: true,
      location: {
        addressName: 'Warehouse A',
        lat: '12.34',
        lng: '56.78',
      },
      assets: [
        {
          token: '0x2222222222222222222222222222222222222222',
          tokenId: '12',
          price: '1000',
          capacity: '10',
          sellableQuantity: '7',
          custodyQuantity: '9',
        },
      ],
    });

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nodes/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toContain('public');
    expect(response.headers['x-rate-limit-limit']).toBe('60');
    expect(response.json().data.assets[0].sellableQuantity).toBe('7');
    expect(response.json().data.assets[0].custodyQuantity).toBe('9');
  });

  it('returns 400 for an invalid nodeId', async () => {
    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nodes/not-a-node',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('INVALID_NODE_ID');
    expect(handlers.getPublicNodeById).not.toHaveBeenCalled();
  });

  it('returns 404 when the node is not found', async () => {
    vi.mocked(handlers.getPublicNodeById).mockResolvedValue(null);

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nodes/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NODE_NOT_FOUND');
  });

  it('returns 500 when the node read throws', async () => {
    vi.mocked(handlers.getPublicNodeById).mockRejectedValue(new Error('boom'));

    const app = createApp(handlers);
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/nodes/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().error.code).toBe('NODE_FETCH_FAILED');
  });
});
