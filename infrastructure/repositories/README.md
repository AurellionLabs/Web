# Repository RPC Separation Pattern

## Overview

This document outlines the pattern for separating read and write operations in repositories to avoid user RPC rate limiting. The pattern uses dedicated RPC endpoints for data queries while maintaining user signers for transactions.

## Architecture

### Problem

- Users typically use public RPC endpoints (MetaMask default, wallet providers)
- Heavy data queries can hit rate limits on public RPCs
- All repository operations were using user's RPC provider

### Solution

- **Read Operations**: Use dedicated RPC endpoints (your own infrastructure)
- **Write Operations**: Continue using user's signer for transactions
- **Fallback**: If dedicated RPC fails, fall back to user's provider

## Implementation Pattern

### 1. RPC Provider Factory

The `RpcProviderFactory` creates read-only providers using your dedicated RPC endpoints:

```typescript
// infrastructure/providers/rpc-provider-factory.ts
export class RpcProviderFactory {
  static getReadOnlyProvider(chainId: number): JsonRpcProvider {
    // Returns dedicated RPC provider for the chain
  }
}
```

### 2. Repository Pattern

Each repository should implement this pattern:

```typescript
export class ExampleRepository implements IExampleRepository {
  private readContract: ContractType;
  private writeContract: ContractType;
  private userProvider: Provider;
  private readProvider: Provider;
  private signer: Signer;
  private contractAddress: string;
  private isInitialized = false;

  constructor(userProvider: Provider, signer: Signer, contractAddress: string) {
    this.userProvider = userProvider;
    this.signer = signer;
    this.contractAddress = contractAddress;

    // Initialize with user provider as fallback
    this.readProvider = userProvider;
    this.readContract = ContractFactory.connect(contractAddress, userProvider);
    this.writeContract = ContractFactory.connect(contractAddress, signer);

    // Asynchronously initialize read provider
    this.initializeReadProvider();
  }

  private async initializeReadProvider(): Promise<void> {
    try {
      const chainId = await RpcProviderFactory.getChainId(this.userProvider);
      this.readProvider = RpcProviderFactory.getReadOnlyProvider(chainId);
      this.readContract = ContractFactory.connect(
        this.contractAddress,
        this.readProvider,
      );
      this.isInitialized = true;
      console.log(
        `[Repository] Initialized with dedicated RPC for chain ${chainId}`,
      );
    } catch (error) {
      console.warn(
        '[Repository] Failed to initialize read provider, using user provider:',
        error,
      );
      this.isInitialized = true;
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeReadProvider();
    }
  }

  // Read operations use readContract
  async getSomeData(): Promise<Data> {
    await this.ensureInitialized();
    return await this.readContract.getData();
  }

  // Write operations use writeContract
  async performTransaction(): Promise<TransactionResponse> {
    return await this.writeContract.performAction();
  }
}
```

### 3. Key Implementation Steps

For each repository:

1. **Import the RPC Provider Factory**:

   ```typescript
   import { RpcProviderFactory } from '@/infrastructure/providers/rpc-provider-factory';
   ```

2. **Update Constructor**:

   - Add `readContract`, `writeContract`, `readProvider` properties
   - Initialize with user provider as fallback
   - Call `initializeReadProvider()` asynchronously

3. **Update All Read Operations**:

   - Add `await this.ensureInitialized()` at the beginning
   - Use `this.readContract` instead of `this.contract`
   - Include: `queryFilter`, `getData`, `getBalance`, etc.

4. **Update All Write Operations**:
   - Use `this.writeContract` for transactions
   - Include: `transfer`, `approve`, `stake`, etc.

## Environment Configuration

### Setting Up Dedicated RPC Endpoints

Add environment variables for your dedicated RPC endpoints:

```bash
# .env.local
NEXT_PUBLIC_RPC_URL_42161=https://your-arbitrum-rpc.com
NEXT_PUBLIC_RPC_URL_8453=https://your-base-rpc.com
NEXT_PUBLIC_RPC_URL_84532=https://your-base-sepolia-rpc.com
NEXT_PUBLIC_RPC_URL_11155111=https://your-sepolia-rpc.com
```

### Recommended RPC Providers

- **Alchemy**: High-performance, reliable
- **Infura**: Stable, well-supported
- **QuickNode**: Fast, scalable
- **Ankr**: Cost-effective
- **Your own node**: Maximum control

## Migration Checklist

### Completed

- ✅ `PoolRepository` - Updated with read/write separation
- ✅ `RpcProviderFactory` - Created provider factory
- ✅ Network configuration - Updated with environment variable support

### To Do

- [ ] `OrderRepository` - Apply the pattern (partially started)
- [ ] `DriverRepository` - Apply the pattern
- [ ] `NodeRepository` - Apply the pattern
- [ ] Update all contract references in OrderRepository
- [ ] Test all repositories with dedicated RPC
- [ ] Monitor RPC usage and performance

## Testing

### Unit Tests

```typescript
describe('ExampleRepository', () => {
  it('should use dedicated RPC for read operations', async () => {
    // Test that read operations use dedicated RPC
  });

  it('should use user signer for write operations', async () => {
    // Test that write operations use user signer
  });

  it('should fallback to user provider if dedicated RPC fails', async () => {
    // Test fallback mechanism
  });
});
```

### Integration Tests

- Test with real RPC endpoints
- Verify rate limiting is resolved
- Monitor performance improvements

## Performance Benefits

- **Reduced Rate Limiting**: Users no longer hit public RPC limits
- **Better Performance**: Dedicated RPCs typically faster than public ones
- **Reliability**: Your infrastructure vs. shared public RPCs
- **Scalability**: Can handle more concurrent users

## Monitoring

Track the following metrics:

- RPC request counts (read vs write)
- Response times
- Error rates
- Fallback usage

## Security Considerations

- **Read Operations**: Safe to use dedicated RPC (no private keys)
- **Write Operations**: Still use user's signer (maintains security)
- **Fallback**: Ensures system works even if dedicated RPC fails

## Next Steps

1. Complete the migration for all repositories
2. Set up monitoring for RPC usage
3. Configure dedicated RPC endpoints in production
4. Test thoroughly with real user scenarios
5. Document any repository-specific patterns
