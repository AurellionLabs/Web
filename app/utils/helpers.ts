import { OrderStatus } from '@/domain/orders/order';

// Map bigint status to OrderStatus enum
export function getOrderStatus(status: bigint): OrderStatus {
  switch (Number(status)) {
    case 0:
      return OrderStatus.PENDING;
    case 1:
      return OrderStatus.ACTIVE;
    case 2:
      return OrderStatus.COMPLETED;
    case 3:
      return OrderStatus.CANCELLED;
    default:
      console.warn(`Unknown order status: ${status}`);
      return OrderStatus.PENDING;
  }
}
