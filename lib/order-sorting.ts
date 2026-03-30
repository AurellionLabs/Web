import { OrderStatus, type Order } from '@/domain/orders/order';

type SortableOrderFields = Pick<
  Order,
  'currentStatus' | 'createdAt' | 'updatedAt'
>;

export function isOrderActive(order: Pick<Order, 'currentStatus'>): boolean {
  return (
    order.currentStatus === OrderStatus.CREATED ||
    order.currentStatus === OrderStatus.PROCESSING
  );
}

export function getOrderUpdatedAt(
  order: Pick<Order, 'createdAt' | 'updatedAt'>,
): number {
  const updatedAt = Number(order.updatedAt ?? 0);
  if (Number.isFinite(updatedAt) && updatedAt > 0) {
    return updatedAt;
  }

  const createdAt = Number(order.createdAt ?? 0);
  return Number.isFinite(createdAt) ? createdAt : 0;
}

export function compareOrdersByRecencyDesc(
  a: Pick<Order, 'createdAt' | 'updatedAt'>,
  b: Pick<Order, 'createdAt' | 'updatedAt'>,
): number {
  const updatedDiff = getOrderUpdatedAt(b) - getOrderUpdatedAt(a);
  if (updatedDiff !== 0) return updatedDiff;

  return Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0);
}

export function sortOrdersWithPinnedActivity<T extends SortableOrderFields>(
  orders: T[],
  compareWithinGroup?: (a: T, b: T) => number,
): T[] {
  return [...orders].sort((a, b) => {
    const activeDiff = Number(isOrderActive(b)) - Number(isOrderActive(a));
    if (activeDiff !== 0) return activeDiff;

    if (compareWithinGroup) {
      const withinGroupDiff = compareWithinGroup(a, b);
      if (withinGroupDiff !== 0) return withinGroupDiff;
    }

    return compareOrdersByRecencyDesc(a, b);
  });
}
