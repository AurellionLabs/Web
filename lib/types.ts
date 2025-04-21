export type DeliveryStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  pickupAddress: string;
  deliveryAddress: string;
  customerName: string;
  customerPhone: string;
  createdAt: string;
  updatedAt: string;
}
