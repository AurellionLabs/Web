---
tags: [reference, abi, integration, typechain]
---

# Contract ABIs

[[🏠 Home]] > Technical Reference > Contract ABIs

How to access and use Aurellion's contract ABIs for integration.

---

## ABI Sources

The Diamond ABI is the **union of all facet ABIs**. There are three ways to access it:

### 1. TypeChain-Generated Types (Recommended)

The repo generates fully typed TypeScript bindings from the ABIs using TypeChain:

```bash
npx hardhat compile  # Generates typechain-types/
```

```typescript
import { Diamond__factory } from './typechain-types';
import { ethers } from 'ethers';

const signer = provider.getSigner();
const diamond = Diamond__factory.connect(DIAMOND_ADDRESS, signer);

// Fully typed — intellisense on all functions
const tx = await diamond.placeOrder(
  baseToken, // ✅ Type: string (address)
  baseTokenId, // ✅ Type: BigNumberish
  quoteToken, // ✅ Type: string
  price, // ✅ Type: BigNumberish (uint96)
  amount, // ✅ Type: BigNumberish (uint96)
  true, // ✅ Type: boolean
  0, // ✅ Type: BigNumberish (uint8)
  0, // ✅ Type: BigNumberish (uint40)
);
```

### 2. Hardhat Artifacts

Raw ABI JSON files are in `artifacts/contracts/`:

```
artifacts/
├── contracts/diamond/
│   ├── Diamond.sol/
│   │   └── Diamond.json           ← { abi: [...], bytecode: "0x..." }
│   └── facets/
│       ├── AssetsFacet.sol/
│       │   └── AssetsFacet.json
│       ├── CLOBCoreFacet.sol/
│       │   └── CLOBCoreFacet.json
│       └── ...
```

```typescript
import AssetsFacetArtifact from './artifacts/contracts/diamond/facets/AssetsFacet.sol/AssetsFacet.json';
const assetsFacetAbi = AssetsFacetArtifact.abi;
```

### 3. Indexer ABIs

The Ponder indexer maintains concatenated ABI files:

```
indexer/abis/
├── diamond.json      ← All facets combined (for indexer use)
└── *.json            ← Individual facet ABIs
```

---

## Combining Facet ABIs

For a full Diamond ABI, concatenate all facet ABIs (removing duplicates):

```typescript
import AssetsFacet from './artifacts/.../AssetsFacet.json';
import CLOBCoreFacet from './artifacts/.../CLOBCoreFacet.json';
import NodesFacet from './artifacts/.../NodesFacet.json';
import AuSysFacet from './artifacts/.../AuSysFacet.json';
import BridgeFacet from './artifacts/.../BridgeFacet.json';
import OrderRouterFacet from './artifacts/.../OrderRouterFacet.json';
import RWYStakingFacet from './artifacts/.../RWYStakingFacet.json';
// ... all other facets

const DIAMOND_ABI = [
  ...AssetsFacet.abi,
  ...CLOBCoreFacet.abi,
  ...NodesFacet.abi,
  ...AuSysFacet.abi,
  ...BridgeFacet.abi,
  ...OrderRouterFacet.abi,
  ...RWYStakingFacet.abi,
  // DiamondLoupe functions (for introspection)
  'function facets() view returns (tuple(address facetAddress, bytes4[] functionSelectors)[])',
  'function facetAddress(bytes4 _functionSelector) view returns (address)',
];
```

---

## Key Function Selectors

Useful for debugging and verifying facet routing:

| Function                                                              | Selector | Facet            |
| --------------------------------------------------------------------- | -------- | ---------------- |
| `placeOrder(address,uint256,address,uint96,uint96,bool,uint8,uint40)` | `0x...`  | OrderRouterFacet |
| `cancelOrder(bytes32)`                                                | `0x...`  | OrderRouterFacet |
| `nodeMint(address,tuple,uint256,string,bytes)`                        | `0x...`  | AssetsFacet      |
| `registerNode(string,uint256,string,string,string)`                   | `0x...`  | NodesFacet       |
| `createUnifiedOrder(bytes32,address,uint256,uint256,tuple)`           | `0x...`  | BridgeFacet      |
| `packageSign(bytes32)`                                                | `0x...`  | AuSysFacet       |
| `handOff(bytes32)`                                                    | `0x...`  | AuSysFacet       |
| `stakeToOpportunity(bytes32,uint256)`                                 | `0x...`  | RWYStakingFacet  |
| `claimProfit(bytes32)`                                                | `0x...`  | RWYStakingFacet  |

To get the live selector-to-facet mapping:

```typescript
// Uses DiamondLoupeFacet
const facets = await diamond.facets();
facets.forEach(({ facetAddress, functionSelectors }) => {
  console.log(`Facet: ${facetAddress}`);
  functionSelectors.forEach((sel) => console.log(`  ${sel}`));
});
```

---

## ABI Encoding Examples

### Encoding `AssetDefinition` struct

```typescript
import { ethers } from 'ethers';

const assetDef = {
  name: 'East African Goat Grade A',
  assetClass: 'LIVESTOCK',
  attributes: [{ name: 'breed', values: ['Boer'], description: 'Breed type' }],
};

// ABI encode for manual keccak (to predict tokenId)
const abiCoder = ethers.AbiCoder.defaultAbiCoder();
const encoded = abiCoder.encode(
  [
    'tuple(string name, string assetClass, tuple(string name, string[] values, string description)[] attributes)',
  ],
  [assetDef],
);
const tokenId = BigInt(ethers.keccak256(encoded));
console.log('Predicted tokenId:', tokenId.toString());
```

### Encoding `ParcelData` struct

```typescript
const parcelData = {
  startLat: '-1.286389',
  startLng: '36.817223',
  endLat: '1.292066',
  endLng: '36.821945',
  startName: 'Nairobi Market',
  endName: 'Kampala Hub',
};

// Pass directly to contract function — ethers handles struct encoding
await diamond.createUnifiedOrder(
  clobOrderId,
  sellerNode,
  price,
  qty,
  parcelData,
);
```

---

## Verifying on Basescan

All facet implementations are verified on Base Sepolia Basescan. To verify a newly deployed facet:

```bash
npx hardhat verify \
  --network baseSepolia \
  <FACET_ADDRESS> \
  [constructor args if any]
```

View verified source at: `https://sepolia.basescan.org/address/<FACET_ADDRESS>#code`

---

## Related Pages

- [[Technical Reference/Deployment]]
- [[Technical Reference/Developer Quickstart]]
- [[Smart Contracts/Overview]]
