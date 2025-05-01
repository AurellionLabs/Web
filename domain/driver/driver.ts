export type Location = {
  lat: string;
  lng: string;
};

export type ParcelData = {
  startLocation: Location;
  endLocation: Location;
  startName: string;
  endName: string;
};

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

export interface DriverService {
  getAvailableDeliveries(): Promise<Delivery[]>;
  getMyDeliveries(driverId: string): Promise<Delivery[]>;
  acceptDelivery(jobId: string): Promise<void>;
  confirmPickup(jobId: string): Promise<void>;
  completeDelivery(jobId: string): Promise<void>;
}
