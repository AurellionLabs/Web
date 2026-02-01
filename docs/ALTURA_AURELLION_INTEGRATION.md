# Aurellion × Altura Integration

## RWA Gold Trading: On-Chain Coordination Layer

> **Reference**: [Altura RWA Gold Strategy](https://docs.altura.trade/strategies#strategy-pillar-3-real-world-asset-rwa-gold-strategy)

---

## 1. End-to-End Flow Diagram

```
INVESTORS
    │
    │ ① Capital Deposits
    ▼
┌─────────────────────────────────────────────────────────┐
│  AURELLION YIELD POOL (Smart Contract Escrow)           │
│  [On-Chain: RWYStakingFacet]                            │
└─────────────────────────────────────────────────────────┘
    │
    │ ② Capital Allocation (Weekly Tranche)
    │ 🔐 ATTESTATION: Altura confirms capital receipt
    ▼
┌─────────────────────────────────────────────────────────┐
│  ALTURA / INESSA (Node Operator)                        │
│  [On-Chain: Approved Operator in OperatorFacet]         │
└─────────────────────────────────────────────────────────┘
    │
    │ ③ Physical Gold Purchase (Off-Chain)
    │ 🔐 ATTESTATION: Purchase confirmation + custody proof
    ▼
┌─────────────────────────────────────────────────────────┐
│  TOKENISATION PROVIDER / CUSTODIAN                      │
│  [Off-Chain: Inessa Holdings / Partner Custodian]       │
│  Physical Gold Purchased & Tokenised                    │
└─────────────────────────────────────────────────────────┘
    │
    │ ④ Tokenised Gold Minted (1:1 Backed)
    │ 🔐 ATTESTATION: Custody certificate hash on-chain
    ▼
┌─────────────────────────────────────────────────────────┐
│  AURELLION TOKEN REGISTRY                               │
│  [On-Chain: ERC1155 Asset Token]                        │
└─────────────────────────────────────────────────────────┘
    │
    │ ⑤ Delivery vs Payment (DvP)
    │ 🔐 ATTESTATION: Buyer confirms receipt
    ▼
┌─────────────────────────────────────────────────────────┐
│  GOLD BUYER (Onboarded Counterparty)                    │
│  [On-Chain: Verified address OR Altura-represented]     │
└─────────────────────────────────────────────────────────┘
    │
    │ ⑥ Settlement Payment
    │ 🔐 ATTESTATION: Payment received confirmation
    ▼
┌─────────────────────────────────────────────────────────┐
│  AURELLION YIELD POOL (Smart Contract)                  │
│  [On-Chain: RWYStakingFacet.recordSaleProceeds]         │
├─────────────────────────────────────────────────────────┤
│  ├─ Node Operator Fee → ALTURA                          │
│  └─ Profit Distribution → INVESTORS                     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Attestation Points (Driver Signatures)

Since **Altura is the only cooperative on-chain party**, they act as the representative for all off-chain participants. Each attestation is a signed transaction that advances the opportunity state.

| Stage | Attestation           | Signer            | On-Chain Action                                       | Purpose                                             |
| ----- | --------------------- | ----------------- | ----------------------------------------------------- | --------------------------------------------------- |
| **②** | Capital Receipt       | Altura (Operator) | `confirmCapitalReceipt(opportunityId)`                | Confirms funds received, triggers FUNDED status     |
| **③** | Purchase Confirmation | Altura (Operator) | `confirmPurchase(opportunityId, custodyProofHash)`    | Records gold acquisition, links custody certificate |
| **④** | Tokenisation Complete | Altura (Operator) | `mintAssetTokens(opportunityId, amount, metadataURI)` | Mints 1:1 backed gold tokens                        |
| **⑤** | Delivery Confirmed    | Altura (Operator) | `confirmDelivery(opportunityId, buyerAddress)`        | Records DvP completion                              |
| **⑥** | Settlement Received   | Altura (Operator) | `recordSaleProceeds(opportunityId, amount)`           | Triggers profit distribution                        |

### Altura as Universal Representative

```
┌────────────────────────────────────────────────────────────────┐
│                    ALTURA (ON-CHAIN PERSONA)                   │
│                                                                │
│  Represents:                                                   │
│  ├─ Inessa Holdings (Asset Manager)                            │
│  ├─ Tokenisation Provider                                      │
│  ├─ Custodian                                                  │
│  ├─ Logistics Provider                                         │
│  └─ Gold Buyer (if not on-chain)                               │
│                                                                │
│  Responsibilities:                                             │
│  ├─ Submit all attestations on behalf of off-chain parties     │
│  ├─ Maintain operator collateral (slashable)                   │
│  ├─ Provide custody proofs and documentation hashes            │
│  └─ Execute settlement and trigger distributions               │
└────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Workflow with Attestations

### Step 1: Yield Pool Creation

**Actor**: Altura (as Approved Operator)

```solidity
createOpportunity(
    name: "Gold Arbitrage Week 12",
    description: "Physical gold arbitrage - Dubai to Singapore",
    inputToken: AURA_ADDRESS,      // Staking token (ERC20)
    inputTokenId: 0,               // 0 = ERC20 mode
    targetAmount: 100000e18,       // $100k funding target
    promisedYieldBps: 150,         // 1.5% weekly yield
    operatorFeeBps: 50,            // 0.5% operator fee
    fundingDays: 3,                // 3-day funding window
    processingDays: 7,             // 7-day trade cycle
    collateralToken: AURA_ADDRESS,
    collateralAmount: 20000e18     // 20% operator collateral
)
```

**Alignment with Altura**: Mirrors their tranche-based capital deployment with no leverage or rehypothecation.

---

### Step 2: Investor Capital Ingress

**Actor**: Investors

```solidity
stake(opportunityId, amount)
```

- Funds escrowed in Diamond contract
- Segregated per opportunity
- Locked for trade duration
- Proportional exposure tracked

**Status Change**: `FUNDING` → (when target reached) → `FUNDED`

---

### Step 3: Capital Deployment

**Actor**: Altura (Operator)

**Off-Chain**: Capital released to Altura/Inessa for physical gold purchase

**🔐 ATTESTATION #1**: Capital Receipt

```solidity
// Altura signs to confirm they received the capital
confirmCapitalReceipt(opportunityId)
// Status: FUNDED → IN_TRANSIT
```

---

### Step 4: Physical Gold Purchase & Tokenisation

**Actor**: Altura (representing Inessa + Custodian)

**Off-Chain Actions**:

1. Inessa executes physical gold purchase
2. Gold placed in insured custody
3. Custody certificate issued
4. Tokenisation provider mints tokens

**🔐 ATTESTATION #2**: Purchase Confirmation

```solidity
// Altura submits custody proof hash
confirmPurchase(
    opportunityId,
    custodyProofHash: keccak256(custodyCertificatePDF)
)
// Status: IN_TRANSIT → PROCESSING
```

**🔐 ATTESTATION #3**: Tokenisation Complete

```solidity
// Gold tokens minted to opportunity's escrow
mintAssetTokens(
    opportunityId,
    amount: goldOunces * 1e18,
    metadataURI: "ipfs://Qm.../custody-certificate.json"
)
// Status: PROCESSING → SELLING
```

---

### Step 5: Delivery vs Payment (DvP)

**Actor**: Altura (representing Buyer if off-chain)

**🔐 ATTESTATION #4**: Delivery Confirmed

```solidity
// Altura confirms gold tokens delivered to buyer
confirmDelivery(
    opportunityId,
    buyerAddress: 0x... // or Altura's address if buyer is off-chain
)
// Tokens transferred, awaiting payment
```

**DvP Guarantee**: Tokens only move when Altura attests delivery conditions met.

---

### Step 6: Settlement & Distribution

**Actor**: Altura (Operator)

**🔐 ATTESTATION #5**: Settlement Received

```solidity
// Altura records sale proceeds (triggers automatic distribution)
recordSaleProceeds(
    opportunityId,
    proceedsAmount: 101500e18  // $101,500 (1.5% profit)
)
// Status: SELLING → DISTRIBUTING
```

**Automatic Distribution**:

```
Proceeds: $101,500
├─ Protocol Fee (1%):     $1,015  → Treasury
├─ Operator Fee (0.5%):   $507.50 → Altura
└─ Investor Returns:      $99,977.50 → Pro-rata to stakers
    ├─ Original Capital:  $100,000
    └─ Net Yield:         -$22.50 (fees absorbed from gross yield)
```

Investors call `claimProfits(opportunityId)` to withdraw.

---

## 4. Token & Money Flow

### Token Flow (Gold)

```
Physical Gold (Dubai)
        │
        ▼ Purchase
Insured Custody (Brinks/Loomis)
        │
        ▼ Verification
Tokenisation Provider
        │
        ▼ Mint
ERC1155 Gold Tokens → Aurellion Diamond Contract
        │
        ▼ DvP Transfer
Gold Buyer Wallet (or Altura-controlled)
```

### Money Flow (Capital & Settlement)

```
Investors ──stake()──► Yield Pool (Escrow)
                              │
                              ▼ Release on FUNDED
                        Altura Wallet
                              │
                              ▼ Off-chain
                        Physical Gold Purchase

Gold Buyer ──payment──► Yield Pool (via recordSaleProceeds)
                              │
                              ├──► Altura (Operator Fee)
                              ├──► Protocol Treasury
                              └──► Investors (claimProfits)
```

---

## 5. What Aurellion Changes vs What It Doesn't

| Unchanged (Altura's Domain)          | Added by Aurellion              |
| ------------------------------------ | ------------------------------- |
| Physical gold arbitrage strategy     | On-chain capital pooling        |
| Short-duration settlement cycles     | Tokenised delivery abstraction  |
| Institutional counterparties         | Smart-contract enforced DvP     |
| Insured custody and logistics        | Automatic yield distribution    |
| Risk controls and capital discipline | Transparent audit trail         |
| Trade structuring and execution      | Operator collateral (slashable) |
| Counterparty selection               | Permissionless investor access  |

---

## 6. Gap Analysis: Current State vs Required

### ✅ Currently Implemented

| Component                   | Contract/Code                           | Status                    |
| --------------------------- | --------------------------------------- | ------------------------- |
| Yield Pool Creation         | `RWYStakingFacet.createOpportunity()`   | ✅ Live                   |
| Investor Staking            | `RWYStakingFacet.stake()`               | ✅ Live (ERC20 + ERC1155) |
| Unstaking (during funding)  | `RWYStakingFacet.unstake()`             | ✅ Live                   |
| Operator Approval           | `OperatorFacet.approveOperator()`       | ✅ Live                   |
| Operator Collateral         | `createOpportunity()` collateral params | ✅ Live                   |
| Profit Distribution         | `RWYStakingFacet.claimProfits()`        | ✅ Live                   |
| Sale Proceeds Recording     | `RWYStakingFacet.recordSaleProceeds()`  | ✅ Live                   |
| Opportunity Status Tracking | `RWYStorage.OpportunityStatus` enum     | ✅ Live                   |
| Diamond Proxy Architecture  | `DiamondCutFacet`, `DiamondLoupeFacet`  | ✅ Live                   |
| Frontend Pool Creation      | `create-pool/page.tsx`                  | ✅ Live                   |
| Frontend Staking UI         | `add-liquidity/page.tsx`                | ✅ Live                   |

### 🔶 Partially Implemented (Needs Enhancement)

| Component                 | Current State                                  | Required Enhancement                               |
| ------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| **Attestation System**    | Status changes are operator-only               | Add explicit attestation events with proof hashes  |
| **Custody Proof Storage** | Not implemented                                | Add `custodyProofHash` field to Opportunity struct |
| **Asset Token Minting**   | ERC1155 exists but not linked to opportunities | Link `AuraAsset` minting to opportunity lifecycle  |
| **DvP Enforcement**       | Manual token transfers                         | Atomic swap: tokens ↔ payment in single tx        |
| **Operator Dashboard**    | Basic pool management                          | Add attestation submission UI                      |

### ❌ Not Yet Implemented

| Component                     | Description                                | Priority  |
| ----------------------------- | ------------------------------------------ | --------- |
| **`confirmCapitalReceipt()`** | Operator attests capital received          | 🔴 High   |
| **`confirmPurchase()`**       | Operator submits custody proof hash        | 🔴 High   |
| **`confirmDelivery()`**       | Operator attests DvP completion            | 🔴 High   |
| **Custody Certificate IPFS**  | Store/retrieve custody docs                | 🟡 Medium |
| **Atomic DvP Contract**       | Escrow-based token-for-payment swap        | 🟡 Medium |
| **Operator Slashing**         | Slash collateral on failed attestation     | 🟡 Medium |
| **Multi-sig Attestations**    | Require N-of-M signatures for large trades | 🟢 Low    |
| **Buyer Onboarding**          | KYC/whitelist for gold buyers              | 🟢 Low    |
| **Insurance Integration**     | On-chain insurance proof verification      | 🟢 Low    |

---

## 7. Implementation Roadmap

### Phase 1: Attestation Layer (1-2 weeks)

```solidity
// Add to RWYStakingFacet.sol

event CapitalReceiptConfirmed(bytes32 indexed opportunityId, uint256 timestamp);
event PurchaseConfirmed(bytes32 indexed opportunityId, bytes32 custodyProofHash);
event DeliveryConfirmed(bytes32 indexed opportunityId, address buyer);

function confirmCapitalReceipt(bytes32 opportunityId) external onlyOperator(opportunityId);
function confirmPurchase(bytes32 opportunityId, bytes32 custodyProofHash) external onlyOperator(opportunityId);
function confirmDelivery(bytes32 opportunityId, address buyer) external onlyOperator(opportunityId);
```

### Phase 2: Asset Token Integration (1 week)

- Link `AuraAsset` (ERC1155) minting to opportunity lifecycle
- Store `outputTokenId` when gold tokens minted
- Track token ownership in opportunity struct

### Phase 3: DvP Enhancement (2 weeks)

- Implement atomic swap escrow
- Buyer deposits payment → tokens released
- OR operator attests off-chain payment → tokens released

### Phase 4: Operator Dashboard (1 week)

- Attestation submission UI
- Custody document upload (IPFS)
- Trade lifecycle visualization

---

## 8. Summary

| Aspect                          | Status                  |
| ------------------------------- | ----------------------- |
| **Core Staking Infrastructure** | ✅ Complete             |
| **Operator Management**         | ✅ Complete             |
| **Profit Distribution**         | ✅ Complete             |
| **Attestation System**          | ❌ Needs Implementation |
| **DvP Enforcement**             | 🔶 Partial (manual)     |
| **Altura Integration Ready**    | 🔶 ~70% Complete        |

### One-Line Summary

> **Aurellion does not change how Altura trades gold — it changes how capital, delivery, and settlement are coordinated, making them programmable, transparent, and trust-minimised.**

---

## Appendix: Contract Addresses (Base Sepolia)

| Contract            | Address                                      |
| ------------------- | -------------------------------------------- |
| Diamond Proxy       | `0xc52Fc65C8F6435c1Ef885e091EBE72AF09D29f58` |
| RWYStakingFacet     | `0xaEC49e4662c640dd00aDAD6a5856092a9BbBCD75` |
| OperatorFacet       | `0xE3d4Ed044EcC0bFFD03eCD0d8ed9144063516019` |
| AURA Token          | `0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6` |
| AuraAsset (ERC1155) | `0xb3090aBF81918FF50e921b166126aD6AB9a03944` |
