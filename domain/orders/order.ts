export interface Order {
  id: string;
  customer: string;
  asset: string;
  quantity: number;
  value: string;
  status: OrderStatus;
  timestamp: number;
  deliveryLocation: string;
}

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}
