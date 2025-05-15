import { BigNumberish } from 'ethers';

export interface NodeAsset {
  id: string;
  name: string;
  description: string;
  price: BigNumberish;
  isAvailable: boolean;
}

export interface NodeOrder {
  id: string;
  nodeId: string;
  assetId: string;
  quantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface NodeStatus {
  isActive: boolean;
  lastUpdate: Date;
  health: number;
}

export interface NodeInfo {
  id: string;
  owner: string;
  name: string;
  status: NodeStatus;
  assets: NodeAsset[];
  orders: NodeOrder[];
}
