// Auto-generated deployment constants for upgradeable contracts
// This file contains addresses for the upgradeable proxy contracts
// These addresses NEVER change - only implementations change on upgrades
// Generated: 2026-01-03T12:00:00.000Z

// =============================================================================
// PROXY ADDRESSES (Constant forever - use these in frontend)
// =============================================================================

export const NEXT_PUBLIC_AURUM_NODE_MANAGER_PROXY_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AURA_ASSET_PROXY_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AUSYS_PROXY_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AUSTAKE_PROXY_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_ORDER_BRIDGE_PROXY_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address

// =============================================================================
// IMPLEMENTATION ADDRESSES (Change on upgrades)
// =============================================================================

export const NEXT_PUBLIC_AURUM_NODE_MANAGER_IMPLEMENTATION_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AURA_ASSET_IMPLEMENTATION_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AUSYS_IMPLEMENTATION_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_AUSTAKE_IMPLEMENTATION_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address
export const NEXT_PUBLIC_ORDER_BRIDGE_IMLEMENTATION_ADDRESS =
  '0x...'; // TODO: Deploy upgradeable contracts to get actual address

// =============================================================================
// PROXY ADMIN (Manages all upgrades)
// =============================================================================

export const NEXT_PUBLIC_PROXY_ADMIN_ADDRESS =
  '0x...'; // TODO: Deploy ProxyAdmin to get actual address

// =============================================================================
// CONTRACT VERSIONS (For frontend display)
// =============================================================================

export const CONTRACT_VERSIONS = {
  aurumNodeManager: 'V1',
  auraAsset: 'V1',
  auSys: 'V1',
  auStake: 'V1',
  orderBridge: 'V1',
};

// =============================================================================
// DEPLOYMENT BLOCKS (For indexer configuration)
// =============================================================================

export const DEPLOYMENT_BLOCKS = {
  aurumNodeManager: 0, // TODO: Update with actual deployment block
  auraAsset: 0, // TODO: Update with actual deployment block
  auSys: 0, // TODO: Update with actual deployment block
  auStake: 0, // TODO: Update with actual deployment block
  orderBridge: 0, // TODO: Update with actual deployment block
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the current implementation address for a contract
 * In production, this could query the ProxyAdmin contract
 */
export function getCurrentImplementation(contractName: string): string {
  const implementations: { [key: string]: string } = {
    aurumNodeManager: NEXT_PUBLIC_AURUM_NODE_MANAGER_IMPLEMENTATION_ADDRESS,
    auraAsset: NEXT_PUBLIC_AURA_ASSET_IMPLEMENTATION_ADDRESS,
    auSys: NEXT_PUBLIC_AUSYS_IMPLEMENTATION_ADDRESS,
    auStake: NEXT_PUBLIC_AUSTAKE_IMPLEMENTATION_ADDRESS,
    orderBridge: NEXT_PUBLIC_ORDER_BRIDGE_IMLEMENTATION_ADDRESS,
  };

  return implementations[contractName] || '';
}

/**
 * Check if a contract is upgradeable
 */
export function isUpgradeableContract(contractName: string): boolean {
  const upgradeableContracts = [
    'aurumNodeManager',
    'auraAsset',
    'auSys',
    'auStake',
    'orderBridge',
  ];

  return upgradeableContracts.includes(contractName);
}

/**
 * Get contract version
 */
export function getContractVersion(contractName: string): string {
  return CONTRACT_VERSIONS[contractName as keyof typeof CONTRACT_VERSIONS] || 'Unknown';
}
