import type { Order } from '@/domain/orders/order';
import { isOrderActive } from '@/lib/order-sorting';

export type P2PExpansionOverrides = Record<string, boolean>;
export type P2PActivitySnapshot = Record<string, boolean>;

type ExpandableOrder = Pick<Order, 'id' | 'currentStatus' | 'isP2P'>;

export function isExpandableP2POrder(order: Pick<Order, 'isP2P'>): boolean {
  return Boolean(order.isP2P);
}

export function getP2PActivitySnapshot<T extends ExpandableOrder>(
  orders: T[],
): P2PActivitySnapshot {
  return orders.reduce<P2PActivitySnapshot>((snapshot, order) => {
    if (!isExpandableP2POrder(order)) return snapshot;

    snapshot[order.id] = isOrderActive(order);
    return snapshot;
  }, {});
}

export function isP2POrderExpanded<T extends ExpandableOrder>(
  order: T,
  overrides: P2PExpansionOverrides,
): boolean {
  if (!isExpandableP2POrder(order)) return false;

  const override = overrides[order.id];
  return override ?? isOrderActive(order);
}

export function toggleP2POrderExpansion<T extends ExpandableOrder>(
  order: T,
  overrides: P2PExpansionOverrides,
): P2PExpansionOverrides {
  if (!isExpandableP2POrder(order)) return overrides;

  return {
    ...overrides,
    [order.id]: !isP2POrderExpanded(order, overrides),
  };
}

export function reconcileP2PExpansionOverrides(
  overrides: P2PExpansionOverrides,
  previousActivity: P2PActivitySnapshot,
  nextActivity: P2PActivitySnapshot,
): P2PExpansionOverrides {
  let changed = false;
  const nextOverrides: P2PExpansionOverrides = {};

  for (const [orderId, expanded] of Object.entries(overrides)) {
    if (!(orderId in nextActivity)) {
      changed = true;
      continue;
    }

    if (previousActivity[orderId] !== nextActivity[orderId]) {
      changed = true;
      continue;
    }

    nextOverrides[orderId] = expanded;
  }

  return changed ? nextOverrides : overrides;
}
