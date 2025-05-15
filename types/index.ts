export type CustomerOrder = {
  id: string;
  asset: string;
  quantity: number;
  value: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  timestamp: number;
  deliveryLocation?: string;
};
