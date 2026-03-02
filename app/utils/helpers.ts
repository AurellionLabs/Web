import { OrderStatus } from '@/domain/orders/order';

// Map bigint status to OrderStatus enum
export function getOrderStatus(status: bigint): OrderStatus {
  switch (Number(status)) {
    case 0:
      return OrderStatus.CREATED;
    case 1:
      return OrderStatus.PROCESSING;
    case 2:
      return OrderStatus.SETTLED;
    case 3:
      return OrderStatus.CANCELLED;
    default:
      console.warn(`Unknown order status: ${status}`);
      return OrderStatus.CREATED;
  }
}
