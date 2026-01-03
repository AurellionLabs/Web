# Upgradeable Contracts Architecture

This document describes the upgradeable contract architecture for the Aurellion protocol using OpenZeppelin's proxy pattern.

## Overview

All core contracts have been converted to use upgradeable proxy patterns, allowing for:
- **Seamless upgrades** without changing contract addresses
- **State preservation** during upgrades
- **Gradual feature addition** without data loss
- **Rollback capability** if issues arise

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UPGRADEABLE CONTRACT ARCHITECTURE         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐     ┌─────────────────────────────┐   │
│  │   ProxyAdmin    │────▶│   Implementation V1         │   │
│  │   (Ownable)     │     │   (Initial logic)           │   │
│  └─────────────────┘     └─────────────────────────────┘   │
│         │                         │                         │
│         │ upgrade()               │                         │
│         ▼                         │                         │
│  ┌─────────────────┐              │                         │
│  │   NEW Proxy     │──────────────┘                         │
│  │   Admin (optional)│                                    │
│  └─────────────────┘                                      │
│         │                                                 │
│         │ upgradeTo(newImplementation)                     │
│         ▼                                                 │
│  ┌─────────────────────────────┐                          │
│  │   Implementation V2         │                          │
│  │   (New logic, same storage) │                          │
│  └─────────────────────────────┘                          │
│                                                             │
│  KEY BENEFITS:                                             │
│  ✓ Contract address never changes                          │
│  ✓ All state preserved automatically                       │
│  ✓ Ponder indexer keeps working without changes            │
│  ✓ Can add new features while keeping old data             │
└─────────────────────────────────────────────────────────────┘
```

## Contracts

| Contract | Proxy Address | Implementation | Status |
|----------|---------------|----------------|--------|
| AurumNodeManager | `NEXT_PUBLIC_AURUM_NODE_MANAGER_PROXY_ADDRESS` | V1 | Upgradeable |
| AuraAsset | `NEXT_PUBLIC_AURA_ASSET_PROXY_ADDRESS` | V1 | Upgradeable |
| AuSys | `NEXT_PUBLIC_AUSYS_PROXY_ADDRESS` | V1 | Upgradeable |
| AuStake | `NEXT_PUBLIC_AUSTAKE_PROXY_ADDRESS` | V1 | Upgradeable |
| OrderBridge | `NEXT_PUBLIC_ORDER_BRIDGE_PROXY_ADDRESS` | V1 | Upgradeable |

## Deployment Commands

### Initial Deployment

```bash
# 1. Deploy ProxyAdmin (run once)
npm run deploy:proxy-admin

# 2. Deploy all upgradeable contracts with proxies
npm run deploy:upgradeable

# This will:
# - Deploy implementation contracts (V1)
# - Create proxies pointing to V1
# - Initialize all proxies
# - Update configuration files
```

### Upgrading Contracts

```bash
# Upgrade all contracts
npm run upgrade

# Upgrade specific contract
npm run upgrade:aurumNodeManager
npm run upgrade:auraAsset
npm run upgrade:auSys
npm run upgrade:auStake
npm run upgrade:orderBridge
```

### Direct Hardhat Commands

```bash
# Deploy ProxyAdmin
npx hardhat run scripts/deploy-proxy-admin.ts --network baseSepolia

# Deploy upgradeable contracts
npx hardhat run scripts/deploy-upgradeable.ts --network baseSepolia

# Upgrade contracts
npx hardhat run scripts/upgrade-contracts.ts --network baseSepolia
```

## File Structure

```
contracts/
├── upgradeable/
│   ├── AurumNodeManager.sol
│   ├── AuraAsset.sol
│   ├── AuSys.sol
│   ├── AuStake.sol
│   └── OrderBridge.sol
├── mocks/
└── libraries/

scripts/
├── deploy-proxy-admin.ts    # Deploy ProxyAdmin
├── deploy-upgradeable.ts    # Deploy all upgradeable contracts
└── upgrade-contracts.ts     # Upgrade existing contracts

test/
└── upgradeable/
    └── upgradeable-contracts.test.ts  # Comprehensive tests

proxy-admin.json           # ProxyAdmin configuration
upgradeable-deployments.json # Deployment addresses and blocks
```

## Configuration Files

### chain-constants.ts
Frontend constants for all proxy and implementation addresses:
- `NEXT_PUBLIC_*_PROXY_ADDRESS` - Proxy addresses (constant forever)
- `NEXT_PUBLIC_*_IMPLEMENTATION_ADDRESS` - Implementation addresses (change on upgrades)
- `DEPLOYMENT_BLOCKS` - Block numbers for indexer

### indexer/ponder.config.ts
Ponder indexer configuration using proxy addresses and deployment blocks.

### proxy-admin.json
ProxyAdmin configuration including owner and deployment info.

### upgradeable-deployments.json
Complete deployment record with all addresses and block numbers.

## Best Practices

### 1. Storage Layout
Never change the order or type of existing state variables when upgrading. New variables must be added at the end.

```solidity
// V1 Storage - DO NOT CHANGE
uint256 public value1;
address public owner;
uint256[50] private __gap; // Reserved space

// V2 Storage - Add new variables here
uint256 public newValue; // NEW
```

### 2. Initialization
Use `initialize()` instead of constructors. The function must be called once through the proxy.

```solidity
function initialize(address _param1, address _param2) public initializer {
    __Ownable_init();
    __ReentrancyGuard_init();
    __UUPSUpgradeable_init();
    // Set initial state
}
```

### 3. Upgrade Authorization
Only the contract owner (or ProxyAdmin owner) can authorize upgrades.

```solidity
function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
```

### 4. Testing
Always test:
- Initial deployment
- State preservation after upgrade
- Functionality after upgrade
- Access control for upgrades

## Security Considerations

1. **ProxyAdmin Ownership**: Consider using a multisig (Gnosis Safe) for ProxyAdmin ownership
2. **Upgrade Delay**: Implement a timelock for critical upgrades
3. **Testing**: Comprehensive testing before any upgrade
4. **Audits**: Professional audit before mainnet deployment
5. **Rollback**: Keep previous implementation deployable for emergency rollback

## Emergency Procedures

### Rollback to Previous Version

```bash
# If issues arise after upgrade, you can downgrade:
npx hardhat run scripts/upgrade-contracts.ts --network baseSepolia
```

This will deploy the old implementation and upgrade proxies to it, restoring previous functionality.

### Pause Functionality

Consider adding pause functionality to implementations for emergency situations:

```solidity
import '@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol';

contract MyContract is Initializable, PausableUpgradeable {
    function initialize() public initializer {
        __Pausable_init();
        // ...
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
```

## Monitoring

### Track Upgrades

The indexer can track upgrades by listening for upgrade events:

```solidity
event Upgraded(address indexed newImplementation, uint256 version);

function _upgradeTo(address newImplementation) internal {
    // Existing upgrade logic
    emit Upgraded(newImplementation, ++version);
}
```

### Frontend Version Display

```typescript
import { getContractVersion } from '@/chain-constants';

function ContractVersion({ contractName }: { contractName: string }) {
  const version = getContractVersion(contractName);
  return <span>Version: {version}</span>;
}
```

## Troubleshooting

### Common Issues

1. **Reinitialization Error**: Ensure `initializer` modifier is used and called only once
2. **Storage Collision**: Never reorder existing state variables
3. **Upgrade Failures**: Check ProxyAdmin ownership and implementation compatibility
4. **Gas Costs**: Upgrades cost more gas than initial deployment

### Debug Commands

```bash
# Check ProxyAdmin owner
npx hardhat console --network baseSepolia
> const pm = await ethers.getContractAt('ProxyAdmin', PROXY_ADMIN_ADDRESS)
> await pm.owner()

# Check current implementation
> const impl = await pm.getImplementation(PROXY_ADDRESS)
> impl
```

## Resources

- [OpenZeppelin Upgradeable Contracts](https://docs.openzeppelin.com/contracts/4.x/upgradeable)
- [OpenZeppelin Proxy Pattern](https://docs.openzeppelin.com/contracts/4.x/api/proxy)
- [UUPS Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSProxy)
- [Transparent Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#TransparentProxy)

