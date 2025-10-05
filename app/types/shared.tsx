import { Order } from '@/domain/orders/order';
import { Asset } from '@/domain/shared';

// Extended Order type that includes asset details
export type OrderWithAsset = Order & {
  asset: Asset | null;
};
