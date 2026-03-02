/**
 * ABI Type Definitions
 *
 * Shared type definitions for contract ABIs.
 * Used by both the generated Diamond ABI and deploy scripts.
 */

// ABI component type (recursive for nested tuples)
export interface ABIComponent {
  name: string;
  type: string;
  indexed?: boolean;
  internalType?: string;
  components?: ABIComponent[];
}

// ABI fragment type for function definitions
export interface ABIFunction {
  type: 'function';
  name: string;
  inputs: ABIComponent[];
  outputs: ABIComponent[];
  stateMutability: 'pure' | 'view' | 'nonpayable' | 'payable';
}

export interface ABIEvent {
  type: 'event';
  name: string;
  inputs: Array<{
    name: string;
    type: string;
    indexed?: boolean;
    internalType?: string;
    components?: ABIComponent[];
  }>;
}

export type ABIFragment = ABIFunction | ABIEvent;
