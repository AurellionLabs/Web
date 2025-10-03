# 🔧 FRONTEND INTEGRATION STEPS

## ✅ COMPLETED SO FAR

### 1. **Backend Infrastructure Refactored**

- ✅ Domain models updated (`node-updated.ts`, `order-updated.ts`)
- ✅ Repositories refactored (`node-repository-updated.ts`, `orders-repository-updated.ts`)
- ✅ Services refactored (`node-asset-service-updated.ts`)
- ✅ GraphQL queries created (`graph-queries-updated.ts`)

### 2. **Deploy Script Fixed**

- ✅ Updated for refactored contract constructors
- ✅ Added support for new subgraphs (`aurum-base-sepolia`, `ausys-base-sepolia`)
- ✅ Fixed contract factory names (`Ausys` instead of `locationContract`)

### 3. **Subgraphs Created**

- ✅ `aurum-base-sepolia/` - Complete schema, mapping, and config
- ✅ `ausys-base-sepolia/` - Complete schema, mapping, and config
- ✅ ABIs copied to subgraph directories

### 4. **Frontend Providers Started**

- ✅ `node.provider-updated.tsx` - Updated for new domain models
- ✅ `repository-context-updated.ts` - Uses refactored repositories
- ✅ `service-context-updated.ts` - Uses refactored services

## 🚧 REMAINING STEPS

### **Step 1: Replace Domain Files (BREAKING CHANGE)**

```bash
# Backup current files
mv domain/node/node.ts domain/node/node-old.ts
mv domain/orders/order.ts domain/orders/order-old.ts

# Use refactored versions
mv domain/node/node-updated.ts domain/node/node.ts
mv domain/orders/order-updated.ts domain/orders/order.ts
```

### **Step 2: Replace Infrastructure Files**

```bash
# Backup current files
mv infrastructure/repositories/node-repository.ts infrastructure/repositories/node-repository-old.ts
mv infrastructure/repositories/orders-repository.ts infrastructure/repositories/orders-repository-old.ts
mv infrastructure/services/node-asset.service.ts infrastructure/services/node-asset.service-old.ts
mv infrastructure/shared/graph-queries.ts infrastructure/shared/graph-queries-old.ts
mv infrastructure/contexts/repository-context.ts infrastructure/contexts/repository-context-old.ts

# Use refactored versions
mv infrastructure/repositories/node-repository-updated.ts infrastructure/repositories/node-repository.ts
mv infrastructure/repositories/orders-repository-updated.ts infrastructure/repositories/orders-repository.ts
mv infrastructure/services/node-asset-service-updated.ts infrastructure/services/node-asset.service.ts
mv infrastructure/shared/graph-queries-updated.ts infrastructure/shared/graph-queries.ts
mv infrastructure/contexts/repository-context-updated.ts infrastructure/contexts/repository-context.ts
mv infrastructure/contexts/service-context-updated.ts infrastructure/contexts/service-context.ts
```

### **Step 3: Replace Provider Files**

```bash
# Backup current provider
mv app/providers/node.provider.tsx app/providers/node.provider-old.tsx

# Use refactored version
mv app/providers/node.provider-updated.tsx app/providers/node.provider.tsx
```

### **Step 4: Update Chain Constants**

Add the new subgraph URLs to `chain-constants.ts`:

```typescript
// Add these exports
export const NEXT_PUBLIC_AURUM_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID/aurum-base-sepolia/version/latest';
export const NEXT_PUBLIC_AUSYS_SUBGRAPH_URL =
  'https://api.studio.thegraph.com/query/YOUR_SUBGRAPH_ID/ausys-base-sepolia/version/latest';
```

### **Step 5: Update Frontend Components**

The following components need updates for new domain structure:

#### **`app/node/dashboard/page.tsx`**

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

#### **Asset editing components need updates:**

- `app/node/dashboard/assets/edit-price.tsx`
- `app/node/dashboard/assets/edit-capacity.tsx` (if exists)

#### **Order-related components:**

- `app/customer/dashboard/page.tsx` - Update for `buyer`/`seller` instead of `customer`
- Any component that displays order data

### **Step 6: Deploy Contracts and Subgraphs**

```bash
# Deploy contracts with updated script
npx hardhat run scripts/deploy.ts --network base-sepolia

# The deploy script will automatically:
# 1. Deploy Ausys with correct constructor (payToken)
# 2. Deploy AurumNodeManager with correct constructor (ausys only)
# 3. Set up subgraphs with correct addresses and start blocks
# 4. Deploy all 4 subgraphs (aura-asset, austake, aurum, ausys)
# 5. Update chain-constants.ts with subgraph URLs
```

### **Step 7: Test Integration**

```bash
# 1. Build and check for TypeScript errors
npm run build

# 2. Start development server
npm run dev

# 3. Test key flows:
# - Node registration (should use new Asset[] structure)
# - Asset minting (should use new signatures)
# - Asset capacity/price updates (should use new signatures)
# - Order viewing (should show buyer/seller correctly)
```

## 🔄 **MIGRATION STRATEGY**

### **Option A: Big Bang (Recommended)**

1. Do all file replacements at once
2. Fix TypeScript compilation errors
3. Test and deploy
4. **Estimated time: 3-4 hours**

### **Option B: Gradual Migration**

1. Create adapter layers to bridge old/new structures
2. Migrate components one by one
3. Remove adapters when complete
4. **Estimated time: 8-10 hours**

## 🚨 **CRITICAL BREAKING CHANGES**

| Component              | Current                                   | After Refactor                        | Impact          |
| ---------------------- | ----------------------------------------- | ------------------------------------- | --------------- |
| `Node.supportedAssets` | `string[]`                                | Removed                               | ❌ **BREAKING** |
| `Node.capacity`        | `number[]`                                | Removed                               | ❌ **BREAKING** |
| `Node.assetPrices`     | `number[]`                                | Removed                               | ❌ **BREAKING** |
| `Node.assets`          | Not exists                                | `NodeAsset[]`                         | ✅ **NEW**      |
| `Order.customer`       | `string`                                  | Removed                               | ❌ **BREAKING** |
| `Order.buyer`          | Not exists                                | `string`                              | ✅ **NEW**      |
| `Order.seller`         | Not exists                                | `string`                              | ✅ **NEW**      |
| `updateAssetCapacity`  | `(node, assetId, newCapacity, arrays...)` | `(node, token, tokenId, newCapacity)` | ❌ **BREAKING** |
| `updateAssetPrice`     | `(node, assetId, newPrice, arrays...)`    | `(node, token, tokenId, newPrice)`    | ❌ **BREAKING** |

## 🎯 **NEXT IMMEDIATE ACTION**

**Choose your approach and execute:**

1. **Quick Integration (3-4 hours)**: Replace all files and fix errors
2. **Gradual Migration (8-10 hours)**: Create adapters and migrate slowly

**I recommend the Quick Integration approach** since the refactored code is significantly better and the breaking changes are well-defined.

Would you like me to:

1. **Execute the file replacements now**?
2. **Create adapter layers for gradual migration**?
3. **Focus on specific components first**?

The infrastructure is ready - we just need to plug it into the frontend!
