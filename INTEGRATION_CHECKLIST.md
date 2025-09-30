# 🚨 INTEGRATION CHECKLIST - REQUIRED BEFORE FRONTEND WORKS

## ❌ CURRENT STATUS: **WILL NOT WORK**

The refactored infrastructure is not compatible with the current frontend. Here's what needs to be done:

## 🔧 STEP 1: Replace Domain Model Files

```bash
# Replace the actual domain files (BREAKING CHANGE)
mv domain/node/node.ts domain/node/node-old.ts
mv domain/node/node-updated.ts domain/node/node.ts

mv domain/orders/order.ts domain/orders/order-old.ts  
mv domain/orders/order-updated.ts domain/orders/order.ts
```

## 🔧 STEP 2: Update Frontend Type Imports

**File: `app/providers/node.provider.tsx`**
```typescript
// CHANGE line 22-27:
export type Order = {
  id: string;
  buyer: string;        // ❌ Changed from 'customer'
  seller: string;       // ❌ Added
  asset: string;
  quantity: number;
  value: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
};
```

## 🔧 STEP 3: Update Repository Context

**File: `infrastructure/contexts/repository-context.ts`**
```typescript
// Replace repository imports:
import { BlockchainNodeRepository } from '../repositories/node-repository';
import { OrderRepository } from '../repositories/orders-repository';
import { NodeAssetService } from '../services/node-asset.service';

// Update createAllRepositories method to use new implementations
```

## 🔧 STEP 4: Update Frontend Components

**Files to update:**
- `app/node/dashboard/page.tsx` - Update Node structure usage
- `app/customer/dashboard/page.tsx` - Update Order structure usage  
- `app/providers/trade.provider.tsx` - Update asset handling
- All components using `Node` or `Order` types

**Example changes needed:**
```typescript
// OLD (will break):
const capacity = node.capacity[0];
const price = node.assetPrices[0];
const assetId = node.supportedAssets[0];

// NEW (after refactor):
const capacity = node.assets[0]?.capacity;
const price = node.assets[0]?.price;
const assetId = node.assets[0]?.tokenId;
```

## 🔧 STEP 5: Update Service Layer Integration

**File: `infrastructure/contexts/service-context.ts`**
```typescript
// Import updated service
import { NodeAssetService } from '../services/node-asset.service';

// Update service creation to use new signatures
```

## 🔧 STEP 6: Regenerate TypeChain Types

```bash
npx hardhat compile
npx hardhat typechain
```

## 🔧 STEP 7: Update GraphQL Endpoint Configuration

**Files to update:**
- `infrastructure/repositories/orders-repository.ts`
- `infrastructure/repositories/node-repository.ts`

```typescript
// Update GraphQL endpoints to point to your subgraph
private graphQLEndpoint = 'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID/ausys/version/latest';
```

## 🔧 STEP 8: Deploy Updated Subgraph

Your subgraph schema needs to be updated to include:
- `Node` entity with `assets: [Asset!]!` field
- `Journey` entity with all fields
- `Order` entity with `buyer` and `seller` fields
- Event handlers for new contract events

## ⚠️ BREAKING CHANGES SUMMARY

| Component | Current | After Refactor | Impact |
|-----------|---------|----------------|---------|
| `Node.supportedAssets` | `string[]` | Removed | ❌ **BREAKING** |
| `Node.capacity` | `number[]` | Removed | ❌ **BREAKING** |  
| `Node.assetPrices` | `number[]` | Removed | ❌ **BREAKING** |
| `Node.assets` | Not exists | `NodeAsset[]` | ❌ **BREAKING** |
| `Order.customer` | `string` | Removed | ❌ **BREAKING** |
| `Order.buyer` | Not exists | `string` | ❌ **BREAKING** |
| `Order.seller` | Not exists | `string` | ❌ **BREAKING** |

## 🧪 TESTING AFTER INTEGRATION

```bash
# 1. Test domain model imports
npm run build

# 2. Test repository functionality  
npm run test:repositories

# 3. Test frontend compilation
npm run dev

# 4. Test contract interactions
npm run test:integration
```

## 🚀 ALTERNATIVE: GRADUAL MIGRATION

If you want to avoid breaking changes, create **adapter layers**:

```typescript
// Create: infrastructure/adapters/legacy-node-adapter.ts
export class LegacyNodeAdapter {
  static adaptToLegacy(newNode: Node): LegacyNode {
    return {
      address: newNode.address,
      location: newNode.location,
      validNode: newNode.validNode.toString(),
      owner: newNode.owner,
      supportedAssets: newNode.assets.map(a => a.tokenId),
      capacity: newNode.assets.map(a => a.capacity),
      assetPrices: newNode.assets.map(a => Number(a.price)),
      status: newNode.status
    };
  }
}
```

## ⏱️ ESTIMATED INTEGRATION TIME

- **Breaking Change Approach**: 2-4 hours
- **Gradual Migration Approach**: 6-8 hours  
- **Full Testing**: 2-3 hours

## 🎯 RECOMMENDATION

**Option 1: Quick Fix (2 hours)**
1. Replace domain files
2. Update critical frontend components
3. Fix TypeScript errors
4. Test basic functionality

**Option 2: Proper Integration (8 hours)**  
1. All steps above
2. Deploy updated subgraph
3. Full GraphQL integration
4. Comprehensive testing
5. Performance optimization

**Current Status: Choose your approach and I'll help implement it!**














