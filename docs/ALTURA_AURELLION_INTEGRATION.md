# Altura Integration Guide

## What Altura Needs to Do

This document tells you exactly:

1. What wallets to create
2. How money flows through the system
3. What you sign and when

---

## 1. Wallets Altura Must Set Up

| Wallet              | Purpose                                                       | Funding Required                                                           |
| ------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Operator Wallet** | Signs all attestations, creates pools, triggers distributions | Gas fees (~0.1 ETH on Base) + Collateral (20% of pool size in AURA tokens) |
| **Treasury Wallet** | Receives operator fees from completed trades                  | None (receives funds)                                                      |

### Operator Wallet Setup

```
1. Create new EOA wallet (MetaMask, Ledger, etc.)
2. Fund with:
   - 0.1 ETH (Base Sepolia for testing / Base Mainnet for production)
   - AURA tokens for collateral (minimum 20% of your largest pool)
3. Send wallet address to Aurellion team for operator approval
```

**After approval, your wallet can:**

- Create yield pools
- Submit attestations at each stage
- Trigger profit distributions

---

## 2. Flow of Funds

### Money In (Investor Capital)

```
Investors
    │
    │ stake(poolId, amount)
    │ [AURA tokens]
    ▼
┌─────────────────────────────────┐
│  AURELLION SMART CONTRACT       │
│  (Diamond: 0xc52Fc...29f58)     │
│                                 │
│  Funds locked in escrow         │
│  Segregated per pool            │
│  Cannot be withdrawn by anyone  │
│  until pool is funded           │
└─────────────────────────────────┘
```

### Money Out (After Altura Confirms Capital Receipt)

```
┌─────────────────────────────────┐
│  AURELLION SMART CONTRACT       │
└─────────────────────────────────┘
    │
    │ Altura calls: confirmCapitalReceipt(poolId)
    │
    ▼
┌─────────────────────────────────┐
│  ALTURA TREASURY WALLET         │
│  (Your wallet receives capital) │
│                                 │
│  You now have the funds to      │
│  execute the gold trade         │
└─────────────────────────────────┘
    │
    │ Off-chain: Buy physical gold
    │
    ▼
┌─────────────────────────────────┐
│  GOLD TRADE EXECUTION           │
│  (Your existing process)        │
└─────────────────────────────────┘
```

### Money Back (Settlement)

```
Gold Buyer pays you (off-chain)
    │
    │ You receive settlement
    │
    ▼
┌─────────────────────────────────┐
│  ALTURA TREASURY WALLET         │
│  (You hold the proceeds)        │
└─────────────────────────────────┘
    │
    │ Altura calls: recordSaleProceeds(poolId, totalAmount)
    │ [You send AURA tokens back to contract]
    │
    ▼
┌─────────────────────────────────┐
│  AURELLION SMART CONTRACT       │
│  Automatic split:               │
│  ├─ 0.5% → Altura (your fee)    │
│  ├─ 1.0% → Protocol Treasury    │
│  └─ Rest → Investors can claim  │
└─────────────────────────────────┘
```

---

## 3. Attestations (What You Sign & When)

You sign **5 transactions** per trade cycle. Each one moves the pool to the next stage.

### Timeline View

```
Day 0-3: Pool Funding (investors deposit)
         ↓
Day 3:   YOU SIGN → confirmCapitalReceipt()
         ↓
Day 3-5: You buy gold (off-chain)
         ↓
Day 5:   YOU SIGN → confirmPurchase(custodyProofHash)
         ↓
Day 5:   YOU SIGN → mintAssetTokens() [if tokenising]
         ↓
Day 5-7: Gold delivered to buyer (off-chain)
         ↓
Day 7:   YOU SIGN → confirmDelivery(buyerAddress)
         ↓
Day 7:   Buyer pays you (off-chain)
         ↓
Day 7:   YOU SIGN → recordSaleProceeds(amount)
         ↓
         Investors can now claim profits
```

### Attestation Details

#### ATTESTATION 1: Capital Receipt

**When**: Pool reaches funding target
**What you're confirming**: "I have received the capital and am ready to execute the trade"

```
Function: confirmCapitalReceipt(bytes32 poolId)
Gas: ~50,000
```

**What happens after you sign:**

- Pool status changes to `IN_TRANSIT`
- Capital is released to your wallet
- Investors cannot withdraw

---

#### ATTESTATION 2: Purchase Confirmation

**When**: Gold purchased and in custody
**What you're confirming**: "Gold has been purchased and is in insured custody"

```
Function: confirmPurchase(bytes32 poolId, bytes32 custodyProofHash)
Gas: ~60,000

custodyProofHash = keccak256(custody certificate PDF)
```

**How to create custodyProofHash:**

```javascript
// In browser console or Node.js
const ethers = require('ethers');
const fs = require('fs');
const certificate = fs.readFileSync('custody-certificate.pdf');
const hash = ethers.keccak256(certificate);
// Use this hash in the transaction
```

**What happens after you sign:**

- Pool status changes to `PROCESSING`
- Custody proof permanently recorded on-chain

---

#### ATTESTATION 3: Tokenisation (Optional)

**When**: Gold tokens minted
**What you're confirming**: "Tokenised gold has been minted 1:1 against physical"

```
Function: mintAssetTokens(bytes32 poolId, uint256 amount, string metadataURI)
Gas: ~150,000

amount = gold ounces × 10^18
metadataURI = "ipfs://Qm.../metadata.json"
```

**What happens after you sign:**

- ERC1155 tokens minted to contract escrow
- Pool status changes to `SELLING`

---

#### ATTESTATION 4: Delivery Confirmed

**When**: Gold (or gold tokens) delivered to buyer
**What you're confirming**: "Buyer has received the gold/tokens"

```
Function: confirmDelivery(bytes32 poolId, address buyerAddress)
Gas: ~70,000

buyerAddress = buyer's wallet (or your wallet if buyer is off-chain)
```

**What happens after you sign:**

- Tokens transferred to buyer (if tokenised)
- Pool status changes to `AWAITING_SETTLEMENT`

---

#### ATTESTATION 5: Settlement Received

**When**: Buyer has paid you
**What you're confirming**: "I have received payment and am returning proceeds to the pool"

```
Function: recordSaleProceeds(bytes32 poolId, uint256 proceedsAmount)
Gas: ~200,000

proceedsAmount = total received in AURA tokens (wei)
```

**IMPORTANT**: Before calling this, you must:

1. Convert fiat proceeds to AURA tokens
2. Approve the Diamond contract to spend your AURA
3. Have AURA balance ≥ proceedsAmount in your wallet

**What happens after you sign:**

- AURA transferred from your wallet to contract
- Automatic fee split executed
- Pool status changes to `DISTRIBUTING`
- Investors can now call `claimProfits()`

---

## 4. Example: $100,000 Gold Trade

### Pool Creation (You do this)

```javascript
// Using ethers.js
const poolTx = await diamond.createOpportunity(
  'Gold Arbitrage Week 12', // name
  'Dubai to Singapore physical gold', // description
  AURA_TOKEN_ADDRESS, // inputToken (what investors stake)
  0, // inputTokenId (0 = ERC20)
  ethers.parseEther('100000'), // targetAmount ($100k)
  ethers.ZeroAddress, // outputToken (set later)
  0, // expectedOutputAmount
  150, // promisedYieldBps (1.5%)
  50, // operatorFeeBps (0.5%)
  ethers.parseEther('2800'), // minSalePrice
  3, // fundingDays
  7, // processingDays
  AURA_TOKEN_ADDRESS, // collateralToken
  0, // collateralTokenId
  ethers.parseEther('20000'), // collateralAmount (20%)
);
```

### Trade Execution Flow

| Day | Action                           | Who       | On-Chain?                    |
| --- | -------------------------------- | --------- | ---------------------------- |
| 0   | Create pool                      | Altura    | ✅ `createOpportunity()`     |
| 0-3 | Investors stake                  | Investors | ✅ `stake()`                 |
| 3   | Pool funded ($100k reached)      | Automatic | ✅ Status → FUNDED           |
| 3   | Confirm capital receipt          | Altura    | ✅ `confirmCapitalReceipt()` |
| 3   | Receive $100k in AURA            | Altura    | ✅ Automatic transfer        |
| 3-4 | Buy physical gold                | Altura    | ❌ Off-chain                 |
| 4   | Gold in custody                  | Custodian | ❌ Off-chain                 |
| 4   | Confirm purchase + custody hash  | Altura    | ✅ `confirmPurchase()`       |
| 5   | Deliver to buyer                 | Altura    | ❌ Off-chain                 |
| 5   | Confirm delivery                 | Altura    | ✅ `confirmDelivery()`       |
| 6   | Buyer pays $101,500              | Buyer     | ❌ Off-chain                 |
| 6   | Convert to AURA, record proceeds | Altura    | ✅ `recordSaleProceeds()`    |
| 7+  | Investors claim profits          | Investors | ✅ `claimProfits()`          |

### Final Distribution

```
Proceeds Received: $101,500 (in AURA)

Distribution:
├─ Protocol Fee (1%):    $1,015.00  → Aurellion Treasury
├─ Operator Fee (0.5%):  $507.50    → Altura Wallet
└─ Investor Pool:        $99,977.50 → Available for claims

Investor Returns:
├─ Original Stake:       $100,000.00
├─ Gross Yield:          $1,500.00 (1.5%)
├─ Fees Deducted:        -$1,522.50
└─ Net to Investors:     $99,977.50 (-0.02%)
```

_Note: In this example, fees exceed yield. Adjust `promisedYieldBps` based on actual expected returns._

---

## 5. Contract Addresses (Base Sepolia Testnet)

| Contract       | Address                                      | Purpose                  |
| -------------- | -------------------------------------------- | ------------------------ |
| Diamond (Main) | `0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58` | All interactions go here |
| AURA Token     | `0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6` | Staking/collateral token |
| AuraAsset      | `0xb3090aBF81918FF50e921b166126aD6AB9a03944` | Gold token (ERC1155)     |

**You only interact with the Diamond address.** All functions are called on this single contract.

---

## 6. Quick Reference: Function Signatures

```solidity
// Pool Creation
function createOpportunity(
    string name,
    string description,
    address inputToken,
    uint256 inputTokenId,
    uint256 targetAmount,
    address outputToken,
    uint256 expectedOutputAmount,
    uint256 promisedYieldBps,
    uint256 operatorFeeBps,
    uint256 minSalePrice,
    uint256 fundingDays,
    uint256 processingDays,
    address collateralToken,
    uint256 collateralTokenId,
    uint256 collateralAmount
) external returns (bytes32 opportunityId);

// Attestations (Operator Only)
function confirmCapitalReceipt(bytes32 opportunityId) external;
function confirmPurchase(bytes32 opportunityId, bytes32 custodyProofHash) external;
function mintAssetTokens(bytes32 opportunityId, uint256 amount, string metadataURI) external;
function confirmDelivery(bytes32 opportunityId, address buyerAddress) external;
function recordSaleProceeds(bytes32 opportunityId, uint256 proceedsAmount) external;

// Investor Functions
function stake(bytes32 opportunityId, uint256 amount) external;
function unstake(bytes32 opportunityId, uint256 amount) external;
function claimProfits(bytes32 opportunityId) external;
```

---

## 7. What's Not Built Yet

These attestation functions are **not yet deployed**. Current status:

| Function                  | Status             |
| ------------------------- | ------------------ |
| `createOpportunity()`     | ✅ Live            |
| `stake()` / `unstake()`   | ✅ Live            |
| `recordSaleProceeds()`    | ✅ Live            |
| `claimProfits()`          | ✅ Live            |
| `confirmCapitalReceipt()` | ❌ Not implemented |
| `confirmPurchase()`       | ❌ Not implemented |
| `mintAssetTokens()`       | ❌ Not implemented |
| `confirmDelivery()`       | ❌ Not implemented |

**Timeline to complete:** 1-2 weeks for attestation layer.

---

## 8. Next Steps for Altura

1. **Create Operator Wallet** - New EOA, fund with gas + AURA for collateral
2. **Send Wallet Address** - We'll approve it as an operator
3. **Test on Sepolia** - Create a test pool, go through the flow
4. **Provide Feedback** - What's missing? What's unclear?
5. **Go Live** - Deploy to Base Mainnet when ready

---

## Questions?

Contact the Aurellion team with your operator wallet address to get started.
