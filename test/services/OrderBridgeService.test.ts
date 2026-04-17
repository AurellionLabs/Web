import { describe, expect, it, vi } from 'vitest';

vi.mock('@/chain-constants', () => ({
  getIndexerUrl: () => 'http://localhost:42069',
  NEXT_PUBLIC_DIAMOND_ADDRESS: '0x0000000000000000000000000000000000000001',
  NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS: '0x0000000000000000000000000000000000000002',
}));

vi.mock('@/infrastructure/diamond', () => ({
  getDiamondProvider: () => ({
    getBlockNumber: vi.fn().mockResolvedValue(100),
  }),
  getDiamondSigner: () => ({
    getAddress: vi
      .fn()
      .mockResolvedValue('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD4c'),
  }),
}));

import {
  OrderBridgeService,
  UnifiedOrderStatus,
  type DeliveryLocation,
  type UnifiedOrder,
} from '@/infrastructure/services/order-bridge-service';

describe('OrderBridgeService', () => {
  const service = new OrderBridgeService();

  it('returns display text for Diamond bridge statuses', () => {
    expect(service.getStatusDisplayText(UnifiedOrderStatus.NONE)).toBe(
      'Unknown',
    );
    expect(service.getStatusDisplayText(UnifiedOrderStatus.PENDING_TRADE)).toBe(
      'Order Placed',
    );
    expect(service.getStatusDisplayText(UnifiedOrderStatus.TRADE_MATCHED)).toBe(
      'Trade Matched',
    );
    expect(
      service.getStatusDisplayText(UnifiedOrderStatus.LOGISTICS_CREATED),
    ).toBe('Preparing Delivery');
    expect(service.getStatusDisplayText(UnifiedOrderStatus.SETTLED)).toBe(
      'Settled',
    );
  });

  it('returns status colors', () => {
    expect(service.getStatusColor(UnifiedOrderStatus.PENDING_TRADE)).toBe(
      'text-blue-500',
    );
    expect(service.getStatusColor(UnifiedOrderStatus.TRADE_MATCHED)).toBe(
      'text-purple-500',
    );
    expect(service.getStatusColor(UnifiedOrderStatus.CANCELLED)).toBe(
      'text-red-500',
    );
  });

  it('keeps delivery location shape', () => {
    const deliveryData: DeliveryLocation = {
      lat: '40.7128',
      lng: '-74.0060',
      name: 'New York, NY',
    };

    expect(deliveryData).toEqual({
      lat: '40.7128',
      lng: '-74.0060',
      name: 'New York, NY',
    });
  });

  it('keeps unified order shape', () => {
    const validOrder: UnifiedOrder = {
      id: '0x1234',
      clobOrderId: '0x5678',
      clobTradeId: '',
      ausysOrderId: '',
      journeyIds: [],
      buyer: '0x1111111111111111111111111111111111111111',
      seller: '0x2222222222222222222222222222222222222222',
      sellerNode: '0x3333333333333333333333333333333333333333',
      token: '0x4444444444444444444444444444444444444444',
      tokenId: '123',
      tokenQuantity: '10',
      price: '1000',
      bounty: '20',
      deliveryData: {
        lat: '40.7128',
        lng: '-74.0060',
        name: 'NYC',
      },
      status: UnifiedOrderStatus.PENDING_TRADE,
      createdAt: Date.now(),
      matchedAt: 0,
      deliveredAt: 0,
      settledAt: 0,
    };

    expect(validOrder.status).toBe(UnifiedOrderStatus.PENDING_TRADE);
    expect(validOrder.journeyIds).toEqual([]);
  });
});
