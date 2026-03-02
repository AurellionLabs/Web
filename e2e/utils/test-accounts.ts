/**
 * Test Accounts - Pre-configured test wallets with roles
 *
 * Provides consistent test account configuration across all E2E tests.
 */

import { ethers } from 'ethers';

// =============================================================================
// TYPES
// =============================================================================

export type AccountRole =
  | 'deployer'
  | 'admin'
  | 'operator'
  | 'customer'
  | 'driver'
  | 'node'
  | 'investor'
  | 'provider'
  | 'attacker';

export interface AccountConfig {
  name: string;
  index: number;
  role: AccountRole;
  description: string;
}

// =============================================================================
// ACCOUNT CONFIGURATIONS
// =============================================================================

/**
 * Standard test account configurations
 */
export const ACCOUNT_CONFIGS: AccountConfig[] = [
  // Admin accounts
  {
    name: 'deployer',
    index: 0,
    role: 'deployer',
    description: 'Contract deployer and owner',
  },
  {
    name: 'admin',
    index: 1,
    role: 'admin',
    description: 'System administrator',
  },

  // Operators (for RWY)
  {
    name: 'operator1',
    index: 2,
    role: 'operator',
    description: 'RWY Operator 1',
  },
  {
    name: 'operator2',
    index: 3,
    role: 'operator',
    description: 'RWY Operator 2',
  },

  // Customers
  {
    name: 'customer1',
    index: 4,
    role: 'customer',
    description: 'Customer/Buyer 1',
  },
  {
    name: 'customer2',
    index: 5,
    role: 'customer',
    description: 'Customer/Buyer 2',
  },
  {
    name: 'customer3',
    index: 6,
    role: 'customer',
    description: 'Customer/Buyer 3',
  },

  // Drivers
  {
    name: 'driver1',
    index: 7,
    role: 'driver',
    description: 'Delivery Driver 1',
  },
  {
    name: 'driver2',
    index: 8,
    role: 'driver',
    description: 'Delivery Driver 2',
  },

  // Nodes
  { name: 'node1', index: 9, role: 'node', description: 'Node Operator 1' },
  { name: 'node2', index: 10, role: 'node', description: 'Node Operator 2' },

  // Investors (for pools)
  {
    name: 'investor1',
    index: 11,
    role: 'investor',
    description: 'Pool Investor 1',
  },
  {
    name: 'investor2',
    index: 12,
    role: 'investor',
    description: 'Pool Investor 2',
  },
  {
    name: 'investor3',
    index: 13,
    role: 'investor',
    description: 'Pool Investor 3',
  },

  // Providers (for pools)
  {
    name: 'provider1',
    index: 14,
    role: 'provider',
    description: 'Pool Provider 1',
  },
  {
    name: 'provider2',
    index: 15,
    role: 'provider',
    description: 'Pool Provider 2',
  },

  // Attackers (for security tests)
  {
    name: 'attacker',
    index: 16,
    role: 'attacker',
    description: 'Malicious actor',
  },
  {
    name: 'attacker2',
    index: 17,
    role: 'attacker',
    description: 'Second malicious actor',
  },
];

// =============================================================================
// MNEMONIC & DERIVATION
// =============================================================================

/**
 * Standard test mnemonic (same as Hardhat/Anvil default)
 */
export const TEST_MNEMONIC =
  'test test test test test test test test test test test junk';

/**
 * Derivation path template
 */
export const DERIVATION_PATH = "m/44'/60'/0'/0/";

/**
 * Get a deterministic private key for an account index
 */
export function getPrivateKey(index: number): string {
  const hdNode = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(TEST_MNEMONIC),
  );
  const wallet = hdNode.deriveChild(index);
  return wallet.privateKey;
}

/**
 * Get a deterministic address for an account index
 */
export function getAddress(index: number): string {
  const hdNode = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(TEST_MNEMONIC),
  );
  const wallet = hdNode.deriveChild(index);
  return wallet.address;
}

/**
 * Get all addresses for configured accounts
 */
export function getAllAddresses(): Map<string, string> {
  const addresses = new Map<string, string>();
  for (const config of ACCOUNT_CONFIGS) {
    addresses.set(config.name, getAddress(config.index));
  }
  return addresses;
}

// =============================================================================
// ROLE HELPERS
// =============================================================================

/**
 * Get account configs by role
 */
export function getAccountsByRole(role: AccountRole): AccountConfig[] {
  return ACCOUNT_CONFIGS.filter((c) => c.role === role);
}

/**
 * Get account config by name
 */
export function getAccountByName(name: string): AccountConfig | undefined {
  return ACCOUNT_CONFIGS.find((c) => c.name === name);
}

/**
 * Get first account with a specific role
 */
export function getFirstAccountByRole(
  role: AccountRole,
): AccountConfig | undefined {
  return ACCOUNT_CONFIGS.find((c) => c.role === role);
}

// =============================================================================
// BALANCE HELPERS
// =============================================================================

/**
 * Default initial balance for test accounts (in ETH)
 */
export const DEFAULT_BALANCE = '10000';

/**
 * Parse ETH string to wei
 */
export function parseEth(value: string): bigint {
  return ethers.parseEther(value);
}

/**
 * Format wei to ETH string
 */
export function formatEth(value: bigint): string {
  return ethers.formatEther(value);
}

// =============================================================================
// WELL-KNOWN ADDRESSES
// =============================================================================

/**
 * Well-known addresses for testing
 */
export const WELL_KNOWN = {
  ZERO_ADDRESS: ethers.ZeroAddress,
  DEAD_ADDRESS: '0x000000000000000000000000000000000000dEaD',
  BURN_ADDRESS: '0x0000000000000000000000000000000000000001',
};

/**
 * Generate a random address
 */
export function randomAddress(): string {
  return ethers.Wallet.createRandom().address;
}

/**
 * Generate multiple random addresses
 */
export function randomAddresses(count: number): string[] {
  return Array.from({ length: count }, () => randomAddress());
}
