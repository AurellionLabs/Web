export type UserRole = 'customer' | 'node' | 'driver' | 'guest';

export interface User {
  role: UserRole;
  address: string;
  isConnected: boolean;
}
