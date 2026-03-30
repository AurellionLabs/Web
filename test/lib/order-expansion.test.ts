import { describe, expect, it } from 'vitest';
import { OrderStatus, type Order } from '@/domain/orders/order';
import {
  getP2PActivitySnapshot,
  isP2POrderExpanded,
  reconcileP2PExpansionOverrides,
  toggleP2POrderExpansion,
} from '@/lib/order-expansion';

function makeOrder(
  overrides: Partial<Order> & Pick<Order, 'id' | 'currentStatus'>,
): Order {
  return {
    id: overrides.id,
    token: '0xtoken',
    tokenId: '1',
    tokenQuantity: '10',
    price: '100',
    txFee: '0',
    buyer: '0xbuyer',
    seller: '0xseller',
    journeyIds: [],
    nodes: [],
    currentStatus: overrides.currentStatus,
    contractualAgreement: '',
    isP2P: true,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe('order expansion helpers', () => {
  it('defaults active P2P orders to expanded', () => {
    const order = makeOrder({
      id: 'active',
      currentStatus: OrderStatus.PROCESSING,
    });

    expect(isP2POrderExpanded(order, {})).toBe(true);
  });

  it('defaults inactive P2P orders to collapsed', () => {
    const order = makeOrder({
      id: 'inactive',
      currentStatus: OrderStatus.SETTLED,
    });

    expect(isP2POrderExpanded(order, {})).toBe(false);
  });

  it('allows manual collapse of an active row', () => {
    const order = makeOrder({
      id: 'active',
      currentStatus: OrderStatus.CREATED,
    });

    const overrides = toggleP2POrderExpansion(order, {});
    expect(isP2POrderExpanded(order, overrides)).toBe(false);
  });

  it('drops overrides when an order activity state changes', () => {
    const previousActivity = { order1: true };
    const nextActivity = { order1: false };

    expect(
      reconcileP2PExpansionOverrides(
        { order1: false },
        previousActivity,
        nextActivity,
      ),
    ).toEqual({});
  });

  it('captures activity only for expandable P2P rows', () => {
    const snapshot = getP2PActivitySnapshot([
      makeOrder({ id: 'p2p', currentStatus: OrderStatus.PROCESSING }),
      makeOrder({
        id: 'standard',
        currentStatus: OrderStatus.PROCESSING,
        isP2P: false,
      }),
    ]);

    expect(snapshot).toEqual({ p2p: true });
  });
});
