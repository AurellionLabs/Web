import { Order } from '@/domain/orders/order';
import { Asset } from '@/domain/shared';

// Extended Order type that includes asset details
export type OrderWithAsset = Order & {
  asset: Asset | null;
};

/**
 * P2P-specific order detail extending OrderWithAsset with
 * live flow metadata needed by the P2P order flow UI.
 */
export type P2POrderDetail = OrderWithAsset & {
  /** Whether buyer has signed for delivery via packageSign */
  buyerSigned: boolean;
  /** Whether driver has signed for delivery */
  driverDeliverySigned: boolean;
};
