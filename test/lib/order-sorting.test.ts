import { describe, expect, it } from 'vitest';
import { OrderStatus, type Order } from '@/domain/orders/order';
import {
  getOrderUpdatedAt,
  isOrderActive,
  sortOrdersWithPinnedActivity,
} from '@/lib/order-sorting';

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
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  };
}

describe('order sorting helpers', () => {
  it('treats created and processing orders as active', () => {
    expect(
      isOrderActive(
        makeOrder({ id: 'created', currentStatus: OrderStatus.CREATED }),
      ),
    ).toBe(true);
    expect(
      isOrderActive(
        makeOrder({ id: 'processing', currentStatus: OrderStatus.PROCESSING }),
      ),
    ).toBe(true);
    expect(
      isOrderActive(
        makeOrder({ id: 'settled', currentStatus: OrderStatus.SETTLED }),
      ),
    ).toBe(false);
  });

  it('falls back to createdAt when updatedAt is missing', () => {
    expect(
      getOrderUpdatedAt(
        makeOrder({
          id: 'fallback',
          currentStatus: OrderStatus.CREATED,
          createdAt: 123,
          updatedAt: undefined,
        }),
      ),
    ).toBe(123);
  });

  it('pins active orders above inactive orders and sorts by updatedAt desc', () => {
    const sorted = sortOrdersWithPinnedActivity([
      makeOrder({
        id: 'settled-newer',
        currentStatus: OrderStatus.SETTLED,
        createdAt: 100,
        updatedAt: 500,
      }),
      makeOrder({
        id: 'active-older',
        currentStatus: OrderStatus.CREATED,
        createdAt: 100,
        updatedAt: 200,
      }),
      makeOrder({
        id: 'active-newer',
        currentStatus: OrderStatus.PROCESSING,
        createdAt: 100,
        updatedAt: 300,
      }),
    ]);

    expect(sorted.map((order) => order.id)).toEqual([
      'active-newer',
      'active-older',
      'settled-newer',
    ]);
  });

  it('keeps active orders pinned when sorting within groups', () => {
    const sorted = sortOrdersWithPinnedActivity(
      [
        makeOrder({
          id: 'inactive-high-price',
          currentStatus: OrderStatus.SETTLED,
          price: '500',
        }),
        makeOrder({
          id: 'active-low-price',
          currentStatus: OrderStatus.CREATED,
          price: '100',
        }),
        makeOrder({
          id: 'active-high-price',
          currentStatus: OrderStatus.PROCESSING,
          price: '300',
        }),
      ],
      (a, b) => Number(b.price) - Number(a.price),
    );

    expect(sorted.map((order) => order.id)).toEqual([
      'active-high-price',
      'active-low-price',
      'inactive-high-price',
    ]);
  });
});
