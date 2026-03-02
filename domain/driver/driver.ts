import { ParcelData } from '@/domain/shared';

/**
 * Driver-specific delivery status enum
 * Maps to contract JourneyStatus but includes driver workflow states
 *
 * Mapping to contract:
 * - PENDING/ACCEPTED → JourneyStatus.Pending (driver hasn't picked up yet)
 * - PICKED_UP → JourneyStatus.InTransit (driver has package)
 * - COMPLETED → JourneyStatus.Delivered (package delivered)
 * - CANCELED → JourneyStatus.Canceled
 */
export enum DeliveryStatus {
  PENDING = 0, // Journey created, driver not assigned (contract: Pending)
  ACCEPTED = 1, // Driver accepted, waiting for pickup (contract: Pending)
  PICKED_UP = 2, // Driver has package, in transit (contract: InTransit)
  COMPLETED = 3, // Package delivered (contract: Delivered)
  CANCELED = 4, // Journey cancelled (contract: Canceled)
  AWAITING_SENDER = 5, // Driver signed for pickup, waiting for sender to sign
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
