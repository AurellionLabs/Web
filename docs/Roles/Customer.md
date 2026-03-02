---
tags: [roles, customer, buyer, trading]
---

# Customer Role

[[🏠 Home]] > Roles > Customer

A **Customer** in Aurellion is any wallet that buys, trades, or stakes assets on the platform. Customers don't need to be verified — they connect a wallet and can immediately access the marketplace.

---

## What Customers Can Do

| Action            | Description                                        | Contract                       |
| ----------------- | -------------------------------------------------- | ------------------------------ |
| **Buy on CLOB**   | Place limit/market buy orders for tokenised assets | `OrderRouterFacet`             |
| **Sell on CLOB**  | List purchased tokens for resale                   | `OrderRouterFacet`             |
| **P2P Trade**     | Create or accept direct offers                     | `AuSysFacet`                   |
| **Stake in RWY**  | Commit tokens to processing opportunities          | `RWYStakingFacet`              |
| **Add liquidity** | Provide liquidity to AMM pools                     | `CLOBFacet` / pools            |
| **Claim rewards** | Claim pool fees and RWY profits                    | `CLOBFacet`, `RWYStakingFacet` |
| **Use faucet**    | Get test tokens on testnet                         | `/customer/faucet`             |

---

## Customer Routes

| Route                                 | Description                                        |
| ------------------------------------- | -------------------------------------------------- |
| `/customer/dashboard`                 | Overview: portfolio, active orders, recent trades  |
| `/customer/trading`                   | Browse all tradeable asset classes                 |
| `/customer/trading/[id]`              | Market page for a specific asset token             |
| `/customer/trading/[id]/order`        | Place an order for a specific asset                |
| `/customer/trading/class/[className]` | All tokens in a class (e.g., all LIVESTOCK)        |
| `/customer/p2p`                       | P2P marketplace                                    |
| `/customer/p2p/create`                | Create a P2P offer                                 |
| `/customer/p2p/market/[className]`    | P2P offers for a specific class                    |
| `/customer/pools`                     | AMM liquidity pool browser                         |
| `/customer/pools/[id]`                | Individual pool — add/remove liquidity, view chart |
| `/customer/pools/[id]/add-liquidity`  | Add liquidity form                                 |
| `/customer/pools/create-pool`         | Create a new AMM pool                              |
| `/customer/rwy`                       | RWY opportunity browser                            |
| `/customer/rwy/[id]`                  | Stake into a specific RWY opportunity              |
| `/customer/rwy/my-stakes`             | View and manage your staking positions             |
| `/customer/faucet`                    | Testnet token faucet                               |

---

## Buying an Asset Step-by-Step

```
1. Connect wallet via Privy
2. Navigate to /customer/trading
3. Browse asset classes or search by name
4. Select a market (e.g., East African Goats)
5. View order book depth (bids and asks)
6. Click "Buy" → order form opens
7. Enter: price (limit) or select "Market", quantity
8. Approve quote token spend (USDC.approve(diamond, amount))
9. Call placeOrder(baseToken, baseTokenId, quoteToken, price, amount, isBuy=true, TIF=GTC, expiry=0)
10. Transaction confirmed → order in book
11. When matched:
    a. Simple trade (node already has tokens): tokens arrive in wallet
    b. Physical delivery: BridgeFacet creates UnifiedOrder → logistics flow begins
12. Dashboard shows order status
```

---

## Portfolio View

The customer dashboard (`/customer/dashboard`) aggregates:

- ERC-1155 token balances (assets held)
- Open CLOB orders (buy/sell)
- Active P2P offers
- RWY staking positions
- AMM LP positions
- Historical trades

Data comes from the Ponder indexer via GraphQL.

---

## Wallet Requirements

- Any EVM-compatible wallet (MetaMask, Coinbase Wallet, etc.)
- Or Privy embedded wallet (email/social login)
- On Base Sepolia testnet: test USDC from faucet
- On mainnet: USDC or configured quote token

---

## Order Management

Customers can manage their open orders:

- **Cancel:** `cancelOrder(orderId)` returns escrowed tokens
- **View fills:** Order history in dashboard
- **Monitor delivery:** UnifiedOrder status tracking for physical orders

---

## Fee Expectations

When trading:

| Action                              | Fee                                       |
| ----------------------------------- | ----------------------------------------- |
| Market order (taker)                | 0.1% of trade value                       |
| Limit order that matches (taker)    | 0.1%                                      |
| Limit order that is matched (maker) | 0.05%                                     |
| Physical delivery orders            | +2% logistics bounty, +0.25% protocol fee |

---

## Related Pages

- [[Core Concepts/CLOB Trading]]
- [[Core Concepts/Order Lifecycle]]
- [[Core Concepts/RWY Staking]]
- [[Frontend/Application Structure]]
