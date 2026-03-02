---
tags: [reference, developer, integration, quickstart, sdk]
---

# Developer Quickstart

[[🏠 Home]] > Technical Reference > Developer Quickstart

Everything you need to go from zero to a working Aurellion integration — read the order book, place orders, mint assets, and track deliveries.

---

## Prerequisites

```bash
node >= 22
bun
An RPC endpoint for Base Sepolia (Alchemy, Infura, QuickNode, etc.)
```

---

## Installation

```bash
bun add ethers viem graphql-request
# or
# or: bun add ethers viem graphql-request
```

---

## Contract Addresses (Base Sepolia)

```typescript
export const DIAMOND_ADDRESS = '0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7';
export const AURA_ASSET_ADDRESS = '0xb3090aBF81918FF50e921b166126aD6AB9a03944';
export const QUOTE_TOKEN_ADDRESS = '0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6'; // AURA testnet
export const INDEXER_URL = 'https://indexer.aurellionlabs.com/graphql';
export const CHAIN_ID = 84532;
```

---

## 1. Connect to the Diamond

All Aurellion functions are called through the single Diamond proxy address. You need the combined ABI from all facets.

```typescript
import { ethers } from 'ethers';
import DIAMOND_ABI from './abi/diamond.json'; // Combined ABI

// Read-only
const provider = new ethers.JsonRpcProvider(RPC_URL);
const diamond = new ethers.Contract(DIAMOND_ADDRESS, DIAMOND_ABI, provider);

// With signer (write operations)
const signer = await provider.getSigner(); // or from Privy/wallet
const diamondWithSigner = diamond.connect(signer);
```

---

## 2. Query the Order Book (via Indexer)

The fastest way to read market data is through the Ponder GraphQL API — no RPC calls needed.

```typescript
import { request, gql } from 'graphql-request';

const GET_RECENT_TRADES = gql`
  query GetTrades($limit: Int = 50) {
    tradeExecutedEventss(
      limit: $limit
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        tradeId
        taker
        maker
        price
        amount
        quoteAmount
        takerIsBuy
        block_timestamp
      }
    }
  }
`;

const data = await request(INDEXER_URL, GET_RECENT_TRADES, { limit: 50 });
const trades = data.tradeExecutedEventss.items;
```

---

## 3. Place a Buy Order

```typescript
// Step 1: Approve quote token spend
const quoteToken = new ethers.Contract(QUOTE_TOKEN_ADDRESS, ERC20_ABI, signer);
const price = ethers.parseUnits('500', 18); // 500 AURA per token
const amount = 10n; // Buy 10 tokens
const totalCost = (price * amount) / BigInt(1e18);

await quoteToken.approve(DIAMOND_ADDRESS, totalCost);
await (await quoteToken.approve(DIAMOND_ADDRESS, totalCost)).wait();

// Step 2: Place buy order via OrderRouterFacet
const tx = await diamondWithSigner.placeOrder(
  AURA_ASSET_ADDRESS, // baseToken (ERC-1155 contract)
  goatTokenId, // baseTokenId
  QUOTE_TOKEN_ADDRESS, // quoteToken (ERC-20)
  price, // price per token
  amount, // quantity
  true, // isBuy
  0, // timeInForce: 0=GTC
  0, // expiry: 0 for GTC
);

const receipt = await tx.wait();
console.log('Order placed in tx:', receipt.hash);

// Extract orderId from RouterOrderPlaced event
const event = receipt.logs
  .map((log) => {
    try {
      return diamond.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find((e) => e?.name === 'RouterOrderPlaced');
const orderId = event?.args.orderId;
```

---

## 4. Place a Sell Order (as Node Operator)

```typescript
// Approve ERC-1155 transfer
const auraAsset = new ethers.Contract(AURA_ASSET_ADDRESS, ERC1155_ABI, signer);
await auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true);
await (await auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true)).wait();

// Place node sell order
const sellTx = await diamondWithSigner.placeNodeSellOrder(
  await signer.getAddress(), // nodeOwner
  AURA_ASSET_ADDRESS, // baseToken
  goatTokenId, // baseTokenId
  QUOTE_TOKEN_ADDRESS, // quoteToken
  ethers.parseUnits('500', 18), // price
  10n, // amount
  0, // GTC
  0, // no expiry
);
await sellTx.wait();
```

---

## 5. Mint an Asset (as Node Operator)

```typescript
const assetDefinition = {
  name: 'East African Goat Grade A',
  assetClass: 'LIVESTOCK',
  attributes: [
    {
      name: 'breed',
      values: ['Boer'],
      description: 'Breed classification per FAO standards',
    },
    {
      name: 'weight_kg',
      values: ['35'],
      description: 'Live weight in kilograms',
    },
  ],
};

const mintTx = await diamondWithSigner.nodeMint(
  await signer.getAddress(), // account (must be node owner)
  assetDefinition, // AssetDefinition struct
  10n, // amount: mint 10 tokens
  'LIVESTOCK', // className
  '0x', // data
);

const mintReceipt = await mintTx.wait();
const mintEvent = mintReceipt.logs
  .map((log) => {
    try {
      return diamond.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find((e) => e?.name === 'MintedAsset');

console.log('Token ID:', mintEvent?.args.tokenId.toString());
console.log('Hash:', mintEvent?.args.hash);
```

---

## 6. Create a Unified Order (Physical Delivery)

After a CLOB match, initiate physical delivery:

```typescript
const deliveryData = {
  startLat: '-1.286389',
  startLng: '36.817223',
  endLat: '1.292066',
  endLng: '36.821945',
  startName: 'Nairobi Livestock Market',
  endName: 'Kampala Delivery Hub',
};

const unifiedTx = await diamondWithSigner.createUnifiedOrder(
  clobOrderId, // bytes32: the buyer's CLOB order ID
  sellerNodeAddress, // address: seller's node
  price, // uint256: price per unit
  quantity, // uint256: quantity
  deliveryData, // ParcelData struct
);
const unifiedReceipt = await unifiedTx.wait();
```

---

## 7. Driver: Sign and Complete a Journey

```typescript
// Pickup signature (called by driver)
const signTx = await diamondWithSigner.packageSign(journeyId);
await signTx.wait();

// Complete delivery and collect bounty
const handoffTx = await diamondWithSigner.handOff(journeyId);
const handoffReceipt = await handoffTx.wait();
// Bounty automatically transferred to driver's wallet
```

---

## 8. Register a Node

```typescript
const registerTx = await diamondWithSigner.registerNode(
  'WAREHOUSE', // nodeType
  1000n, // capacity (units)
  '-1.286389', // lat
  '36.817223', // lng
  'Nairobi Main Hub', // addressName
);
const registerReceipt = await registerTx.wait();

const registerEvent = registerReceipt.logs
  .map((log) => {
    try {
      return diamond.interface.parseLog(log);
    } catch {
      return null;
    }
  })
  .find((e) => e?.name === 'NodeRegistered');
console.log('Node Hash:', registerEvent?.args.nodeHash);
```

---

## 9. Stake in an RWY Opportunity

```typescript
// Approve ERC-1155 transfer
await auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true);

// Stake tokens
const stakeTx = await diamondWithSigner.stakeToOpportunity(
  opportunityId, // bytes32
  100n, // amount of tokens to stake
);
await stakeTx.wait();

// Later: claim profit
const claimTx = await diamondWithSigner.claimProfit(opportunityId);
await claimTx.wait();
```

---

## 10. Cancel an Order

```typescript
const cancelTx = await diamondWithSigner.cancelOrder(orderId);
await cancelTx.wait();
// Escrowed tokens returned to maker
```

---

## Event Listening

Listen to real-time events using ethers.js:

```typescript
// Listen for new trades
diamond.on(
  'TradeExecuted',
  (
    tradeId,
    takerOrderId,
    makerOrderId,
    taker,
    maker,
    marketId,
    price,
    amount,
  ) => {
    console.log(
      `Trade: ${amount} tokens at ${ethers.formatUnits(price, 18)} AURA`,
    );
  },
);

// Listen for journey completions
diamond.on('AuSysJourneyStatusUpdated', (journeyId, newStatus) => {
  if (newStatus === 2n) {
    // DELIVERED
    console.log(`Journey ${journeyId} delivered!`);
  }
});

// Listen for new mints
diamond.on(
  'MintedAsset',
  (account, hash, tokenId, name, assetClass, className) => {
    console.log(`New ${className} minted: ${name} (tokenId: ${tokenId})`);
  },
);

// Cleanup
diamond.removeAllListeners();
```

---

## Reading Token Balances

```typescript
// ERC-1155 balance (standard)
const balance = await diamond.balanceOf(walletAddress, tokenId);

// Node internal balance
const nodeBalance = await diamond.getNodeTokenBalance(nodeHash, tokenId);

// Batch balances
const balances = await diamond.balanceOfBatch(
  [addr1, addr2, addr3],
  [tokenId1, tokenId2, tokenId3],
);
```

---

## ABI

The combined Diamond ABI is available in the repo at:

```
typechain-types/     ← Auto-generated TypeScript types (recommended)
artifacts/           ← Hardhat artifacts with ABI
```

Using typechain-generated types gives you full autocomplete:

```typescript
import { Diamond__factory } from './typechain-types';
const diamond = Diamond__factory.connect(DIAMOND_ADDRESS, signer);
// Fully typed — intellisense on all functions and events
```

---

## Common Pitfalls

| Mistake                                                 | Fix                                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| Calling deprecated `CLOBFacet.placeOrder`               | Use `OrderRouterFacet.placeOrder` (same selector name, different facet) |
| Forgetting ERC-20 approval before `placeOrder` (buy)    | `quoteToken.approve(DIAMOND_ADDRESS, totalCost)`                        |
| Forgetting ERC-1155 approval before `placeOrder` (sell) | `auraAsset.setApprovalForAll(DIAMOND_ADDRESS, true)`                    |
| Using 6-decimal amounts for AURA                        | AURA is 18 decimals — use `ethers.parseUnits('500', 18)`                |
| Querying order book directly from chain                 | Use the Ponder GraphQL API for much better performance                  |
| Price as integer not scaled                             | Price is 18-decimal fixed point: 500 AURA = `500n * 10n**18n`           |

---

## Related Pages

- [[Smart Contracts/Facets/OrderRouterFacet]]
- [[Smart Contracts/Facets/AssetsFacet]]
- [[Indexer/Schema and Queries]]
- [[Technical Reference/Deployment]]
- [[Technical Reference/Events Reference]]
