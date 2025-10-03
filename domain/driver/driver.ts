import { ParcelData } from '@/domain/shared';

// Driver domain - numerical enum matching contract Status values
export enum DeliveryStatus {
  PENDING = 0,
  ACCEPTED = 1,
  PICKED_UP = 2,
  COMPLETED = 3,
  CANCELED = 4,
}

export interface Delivery {
  jobId: string;
  customer: string;
  fee: number;
  ETA: number;
  deliveryETA: number;
  currentStatus: DeliveryStatus;
  parcelData: ParcelData;
}

export interface IDriverRepository {
  getAvailableDeliveries(): Promise<Delivery[]>;
  getMyDeliveries(driverWalletAddress: string): Promise<Delivery[]>;
}

export interface IDriverService {
  acceptDelivery(journeyId: string): Promise<void>;
  confirmPickup(journeyId: string): Promise<void>;
  packageSign(journeyId: string): Promise<void>;
  completeDelivery(journeyId: string): Promise<void>;
}
