import type { Journey } from '@/domain/shared';

// Driver domain refactored to use Journey directly
export enum DeliveryStatus {
  AVAILABLE = 'available',
  ASSIGNED = 'assigned', 
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}
export interface IDriverRepository {
  getAvailableDeliveries(): Promise<Journey[]>;
  getMyDeliveries(driverWalletAddress: string): Promise<Journey[]>;
}

export interface IDriverService {
  acceptDelivery(journeyId: string): Promise<void>;
  confirmPickup(journeyId: string): Promise<void>;
  packageSign(journeyId: string): Promise<void>;
  completeDelivery(journeyId: string): Promise<void>;
}
