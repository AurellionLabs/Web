# Altura Integration Guide

## How Aurellion Actually Works

This document maps Altura's gold trading flow to Aurellion's **existing** smart contract system.

---

## 1. Aurellion's Core Concepts

Aurellion has **two parallel systems** that work together:

### System 1: RWY (Real World Yield) - Capital Pooling

- **Purpose**: Pool investor capital, track opportunity lifecycle, distribute profits
- **Contract**: `RWYStakingFacet` on Diamond (`0xc52Fc...29f58`)
- **Key entity**: `Opportunity` (funding pool with status tracking)

### System 2: AuSys - Physical Logistics & Custody

- **Purpose**: Track physical asset movement, custody handoffs, driver signatures
- **Contract**: `AuSysFacet` on Diamond
- **Key entities**: `Order` (commercial agreement) + `Journey` (physical transport leg)

**The connection**: `RWYStakingFacet.startDelivery(opportunityId, journeyId)` links a funded opportunity to an AuSys journey for physical tracking.

---

## 2. Wallets Altura Needs

| Wallet                     | Role in Aurellion | What It Does                                                      |
| -------------------------- | ----------------- | ----------------------------------------------------------------- |
| **Operator Wallet**        | Approved Operator | Creates opportunities, submits attestations, triggers settlements |
| **Driver Wallet**          | Registered Driver | Signs for physical custody handoffs (`packageSign`)               |
| **Node Wallet** (optional) | Node Operator     | Represents physical locations (warehouse, vault)                  |

### Why Multiple Wallets?

The signature system requires **different parties** to sign at each handoff:

```
Sender signs → Driver signs → handOn() succeeds (pickup complete)
Driver signs → Receiver signs → handOff() succeeds (delivery complete)
```

If Altura controls all parties (as the only cooperative on-chain entity), you need separate wallets to represent each role.

---

## 3. Complete Flow: Gold Trade on Aurellion

### Phase 1: Capital Pooling (RWY)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Create Opportunity                                     │
│  Function: createOpportunity(...)                               │
│  Signer: Altura Operator Wallet                                 │
│  Status: FUNDING                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Investors Stake                                        │
│  Function: stake(opportunityId, amount)                         │
│  Signer: Each investor                                          │
│  Status: FUNDING → FUNDED (when target reached)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 2: Physical Logistics (AuSys)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Create Order (Commercial Agreement)                    │
│  Function: createAuSysOrder(order)                              │
│  Signer: Buyer (Altura representing gold buyer)                 │
│                                                                 │
│  Order contains:                                                │
│  - buyer: Gold buyer address                                    │
│  - seller: Altura (holding tokenised gold)                      │
│  - token: Gold token contract (ERC1155)                         │
│  - tokenId: Specific gold token ID                              │
│  - tokenQuantity: Amount of gold                                │
│  - price: Settlement amount in AURA                             │
│  - nodes[]: Array of node addresses involved                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Create Journey (Physical Transport Leg)                │
│  Function: createOrderJourney(orderId, sender, receiver, ...)   │
│  Signer: Admin or Node Operator                                 │
│                                                                 │
│  Journey contains:                                              │
│  - sender: Current custodian (e.g., Altura vault)               │
│  - receiver: Next custodian (e.g., gold buyer)                  │
│  - parcelData: Start/end locations                              │
│  - bounty: Driver payment                                       │
│  - ETA: Expected delivery time                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Link Opportunity to Journey                            │
│  Function: startDelivery(opportunityId, journeyId)              │
│  Signer: Altura Operator Wallet                                 │
│  Status: FUNDED → IN_TRANSIT                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Assign Driver                                          │
│  Function: assignDriverToJourney(driver, journeyId)             │
│  Signer: Driver, Dispatcher, or Sender                          │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 3: Custody Handoffs (Signatures)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Pickup Signatures                                      │
│                                                                 │
│  7a. Sender signs:                                              │
│      Function: packageSign(journeyId)                           │
│      Signer: Sender wallet (Altura vault)                       │
│      Effect: customerHandOff[sender][journeyId] = true          │
│                                                                 │
│  7b. Driver signs:                                              │
│      Function: packageSign(journeyId)                           │
│      Signer: Driver wallet                                      │
│      Effect: driverPickupSigned[driver][journeyId] = true       │
│                                                                 │
│  7c. Execute pickup:                                            │
│      Function: handOn(journeyId)                                │
│      Signer: Any participant                                    │
│      Requires: Both signatures above                            │
│      Effect: Journey status → InTransit                         │
│              Tokens transferred to escrow                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 8: Delivery Signatures                                    │
│                                                                 │
│  8a. Driver signs:                                              │
│      Function: packageSign(journeyId)                           │
│      Signer: Driver wallet                                      │
│      Effect: driverDeliverySigned[driver][journeyId] = true     │
│                                                                 │
│  8b. Receiver signs:                                            │
│      Function: packageSign(journeyId)                           │
│      Signer: Receiver wallet (gold buyer)                       │
│      Effect: customerHandOff[receiver][journeyId] = true        │
│                                                                 │
│  8c. Execute delivery:                                          │
│      Function: handOff(journeyId)                               │
│      Signer: Any participant                                    │
│      Requires: Both signatures above                            │
│      Effect: Journey status → Delivered                         │
│              Driver paid bounty                                 │
│              If receiver == order.buyer: Order settled          │
└─────────────────────────────────────────────────────────────────┘
```

### Phase 4: Settlement (RWY)

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 9: Confirm Delivery to RWY                                │
│  Function: confirmDelivery(opportunityId, deliveredAmount)      │
│  Signer: Altura Operator Wallet                                 │
│  Status: IN_TRANSIT → PROCESSING                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 10: Complete Processing (Mint Output Tokens)              │
│  Function: completeProcessing(opportunityId, outputTokenId,     │
│                               actualOutputAmount)               │
│  Signer: Altura Operator Wallet                                 │
│  Status: PROCESSING → SELLING                                   │
│  Effect: Output tokens transferred to contract                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 11: Record Sale Proceeds                                  │
│  Function: recordSaleProceeds(opportunityId, proceeds)          │
│  Signer: Contract owner or internal call                        │
│  Status: SELLING → DISTRIBUTING                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 12: Investors Claim Profits                               │
│  Function: claimProfits(opportunityId)                          │
│  Signer: Each investor                                          │
│  Effect: Pro-rata share of proceeds transferred                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Signature Matrix: Who Signs What

| Step | Function                 | Altura Operator   | Altura Driver | Altura Vault (Sender) | Gold Buyer (Receiver) |
| ---- | ------------------------ | ----------------- | ------------- | --------------------- | --------------------- |
| 1    | `createOpportunity`      | ✅                |               |                       |                       |
| 3    | `createAuSysOrder`       | ✅ (as buyer rep) |               |                       |                       |
| 4    | `createOrderJourney`     | ✅                |               |                       |                       |
| 5    | `startDelivery`          | ✅                |               |                       |                       |
| 6    | `assignDriverToJourney`  |                   | ✅            |                       |                       |
| 7a   | `packageSign` (pickup)   |                   |               | ✅                    |                       |
| 7b   | `packageSign` (pickup)   |                   | ✅            |                       |                       |
| 7c   | `handOn`                 | any               | any           | any                   |                       |
| 8a   | `packageSign` (delivery) |                   | ✅            |                       |                       |
| 8b   | `packageSign` (delivery) |                   |               |                       | ✅                    |
| 8c   | `handOff`                | any               | any           |                       | any                   |
| 9    | `confirmDelivery`        | ✅                |               |                       |                       |
| 10   | `completeProcessing`     | ✅                |               |                       |                       |
| 11   | `recordSaleProceeds`     | ✅ (owner)        |               |                       |                       |

---

## 5. Money & Token Flow

### Investor Capital Flow

```
Investors ──stake()──► Opportunity Escrow (Diamond)
                              │
                              │ (Altura withdraws after FUNDED)
                              ▼
                        Altura Treasury
                              │
                              │ (Off-chain: Buy gold)
                              ▼
                        Physical Gold
                              │
                              │ (Tokenise)
                              ▼
                        Gold Tokens (ERC1155)
```

### Order Settlement Flow

```
Gold Buyer ──createAuSysOrder()──► Order Created
     │                                   │
     │ price + txFee escrowed            │
     ▼                                   │
Diamond Escrow                           │
     │                                   │
     │ (After handOff to buyer)          │
     ▼                                   ▼
┌────────────────────────────────────────────┐
│  _settleOrder() triggered automatically    │
│  - Gold tokens → Buyer                     │
│  - Payment → Seller (Altura)               │
│  - Tx fees → Nodes (proportional)          │
└────────────────────────────────────────────┘
```

### Profit Distribution Flow

```
recordSaleProceeds(opportunityId, proceeds)
                    │
                    ▼
           ┌───────────────────┐
           │  Total Proceeds   │
           └───────────────────┘
                    │
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   Protocol Fee  Operator Fee  Investor Pool
   (1% default)  (set by op)   (remainder)
        │           │           │
        ▼           ▼           ▼
   Fee Recipient  Operator    claimProfits()
                  Wallet      per staker
```

---

## 6. What's Already Built vs What Needs Work

### ✅ Fully Implemented

| Component            | Contract Function         | UI                                   |
| -------------------- | ------------------------- | ------------------------------------ |
| Opportunity Creation | `createOpportunity()`     | `/customer/pools/create-pool`        |
| Investor Staking     | `stake()`                 | `/customer/pools/[id]/add-liquidity` |
| Unstaking            | `unstake()`               | ✅                                   |
| Operator Approval    | `approveOperator()`       | Admin script                         |
| Order Creation       | `createAuSysOrder()`      | `/customer/trading/[id]/order`       |
| Journey Creation     | `createOrderJourney()`    | Node dashboard                       |
| Driver Assignment    | `assignDriverToJourney()` | `/driver/dashboard`                  |
| Package Signing      | `packageSign()`           | `/driver/dashboard`                  |
| Pickup Handoff       | `handOn()`                | `/driver/dashboard`                  |
| Delivery Handoff     | `handOff()`               | `/driver/dashboard`                  |
| Profit Claims        | `claimProfits()`          | `/customer/rwy/my-stakes`            |

### 🔶 Partially Implemented

| Component              | Issue                              | Fix Needed                |
| ---------------------- | ---------------------------------- | ------------------------- |
| `startDelivery()`      | Contract exists, no UI             | Add to operator dashboard |
| `confirmDelivery()`    | Contract exists, no UI             | Add to operator dashboard |
| `completeProcessing()` | Contract exists, no UI             | Add to operator dashboard |
| `recordSaleProceeds()` | Owner-only, needs CLOB integration | Connect to CLOB sales     |

### ❌ Not Implemented

| Component                       | Description                               |
| ------------------------------- | ----------------------------------------- |
| **Custody Proof Storage**       | Store IPFS hash of custody certificates   |
| **Multi-journey Opportunities** | Link multiple journeys to one opportunity |
| **Automatic CLOB Listing**      | Auto-list processed goods on CLOB         |
| **Slashing Mechanism**          | Slash operator collateral on failure      |

---

## 7. Altura-Specific Implementation

### Wallet Setup

```
1. Operator Wallet (EOA)
   - Fund with: 0.1 ETH (gas) + AURA (collateral)
   - Approve as operator via: approveOperator(address)
   - Creates opportunities, submits attestations

2. Driver Wallet (EOA)
   - Fund with: 0.1 ETH (gas)
   - Register as driver via: setDriver(address, true)
   - Signs for custody handoffs

3. Vault Wallet (EOA or Multisig)
   - Represents Altura's gold custody
   - Acts as "sender" in journeys
   - Signs packageSign() at pickup
```

### Transaction Sequence for $100k Gold Trade

```javascript
// Day 0: Create opportunity
const oppId = await diamond.createOpportunity(
  'Gold Arbitrage Week 12',
  'Dubai to Singapore physical gold',
  AURA_TOKEN, // inputToken
  0, // inputTokenId (ERC20 mode)
  parseEther('100000'), // targetAmount
  GOLD_TOKEN, // outputToken (ERC1155)
  0, // expectedOutputAmount (set later)
  150, // promisedYieldBps (1.5%)
  50, // operatorFeeBps (0.5%)
  parseEther('2800'), // minSalePrice
  3, // fundingDays
  7, // processingDays
  AURA_TOKEN, // collateralToken
  0, // collateralTokenId
  parseEther('20000'), // collateralAmount (20%)
);

// Day 0-3: Investors stake
await diamond.stake(oppId, parseEther('50000')); // Investor A
await diamond.stake(oppId, parseEther('50000')); // Investor B
// Status auto-transitions to FUNDED

// Day 3: Create order for gold delivery
const orderId = await diamond.createAuSysOrder({
  buyer: GOLD_BUYER_ADDRESS,
  seller: ALTURA_VAULT_ADDRESS,
  token: GOLD_TOKEN,
  tokenId: 1,
  tokenQuantity: parseUnits('35', 18), // 35 oz gold
  price: parseEther('101500'),
  txFee: 0, // Auto-calculated
  nodes: [NODE_1, NODE_2],
  // ... other fields
});

// Day 3: Create journey
const journeyId = await diamond.createOrderJourney(
  orderId,
  ALTURA_VAULT_ADDRESS, // sender (vault)
  GOLD_BUYER_ADDRESS, // receiver (buyer)
  parcelData, // locations
  parseEther('100'), // bounty
  futureTimestamp, // ETA
  parseUnits('35', 18), // tokenQuantity
  1, // assetId
);

// Day 3: Link opportunity to journey
await diamond.startDelivery(oppId, journeyId);
// Status: FUNDED → IN_TRANSIT

// Day 3: Assign driver
await diamond.assignDriverToJourney(DRIVER_ADDRESS, journeyId);

// Day 4: Pickup signatures (SENDER + DRIVER)
await diamond.connect(vaultWallet).packageSign(journeyId);
await diamond.connect(driverWallet).packageSign(journeyId);
await diamond.handOn(journeyId);
// Journey: Pending → InTransit
// Tokens moved to escrow

// Day 5: Delivery signatures (DRIVER + RECEIVER)
await diamond.connect(driverWallet).packageSign(journeyId);
await diamond.connect(buyerWallet).packageSign(journeyId);
await diamond.handOff(journeyId);
// Journey: InTransit → Delivered
// Order settled: tokens → buyer, payment → seller

// Day 5: Confirm delivery to RWY
await diamond.confirmDelivery(oppId, parseEther('100000'));
// Status: IN_TRANSIT → PROCESSING

// Day 6: Complete processing (mint output or mark done)
await diamond.completeProcessing(oppId, 1, parseUnits('35', 18));
// Status: PROCESSING → SELLING

// Day 7: Record sale proceeds
await diamond.recordSaleProceeds(oppId, parseEther('101500'));
// Status: SELLING → DISTRIBUTING

// Day 7+: Investors claim
await diamond.connect(investorA).claimProfits(oppId);
await diamond.connect(investorB).claimProfits(oppId);
```

---

## 8. Contract Addresses (Base Sepolia)

| Contract                    | Address                                      |
| --------------------------- | -------------------------------------------- |
| Diamond (all calls go here) | `0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58` |
| AURA Token (ERC20)          | `0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6` |
| AuraAsset (ERC1155)         | `0xb3090aBF81918FF50e921b166126aD6AB9a03944` |

---

## 9. Summary: What Altura Needs to Do

1. **Set up 3 wallets**: Operator, Driver, Vault
2. **Get wallets approved**: Operator approval + Driver role
3. **Use existing UI**:
   - Create pools at `/customer/pools/create-pool`
   - Driver actions at `/driver/dashboard`
4. **Use scripts for operator actions**:
   - `startDelivery()`, `confirmDelivery()`, `completeProcessing()`, `recordSaleProceeds()`
5. **Sign at each custody handoff**:
   - Vault signs pickup, Driver signs pickup → `handOn()`
   - Driver signs delivery, Buyer signs delivery → `handOff()`

---

## 10. What We Need to Build for Full Altura Support

| Priority  | Item                                                                            | Effort   |
| --------- | ------------------------------------------------------------------------------- | -------- |
| 🔴 High   | Operator dashboard for `startDelivery`, `confirmDelivery`, `completeProcessing` | 3-5 days |
| 🔴 High   | IPFS custody proof storage                                                      | 2-3 days |
| 🟡 Medium | CLOB integration for auto-selling                                               | 1 week   |
| 🟡 Medium | Multi-journey opportunity support                                               | 3-5 days |
| 🟢 Low    | Slashing mechanism                                                              | 1 week   |
