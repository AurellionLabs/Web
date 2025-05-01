import { LocationContract } from '@/typechain-types';

export enum OrderStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface OrderRepositoryInterface {
  getNodeOrders(address: string): Promise<LocationContract.OrderStruct[]>;
}
