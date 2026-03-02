---
tags: [concepts, p2p, trading, direct]
---

# P2P Trading

[[🏠 Home]] > Core Concepts > P2P Trading

**Peer-to-Peer (P2P) Trading** allows two parties to negotiate and settle trades directly — without going through the CLOB order book. It is ideal for large block trades, private deals, or situations where both parties already have a price agreement.

---

## P2P vs CLOB

| Feature               | CLOB                       | P2P                              |
| --------------------- | -------------------------- | -------------------------------- |
| Price discovery       | Yes — market-driven        | No — pre-agreed                  |
| Counterparty          | Any market participant     | Specific address or open         |
| Order book visibility | Public                     | Private (offer details on-chain) |
| Minimum viable size   | Any                        | Any                              |
| Best for              | Price discovery, liquidity | Large trades, OTC deals          |

---

## Offer Types

### Seller-Initiated Offer

Seller has physical goods (tokens) and wants a specific price:

```
Seller → createP2POffer(
  token, tokenId, tokenQuantity=50,
  price=480 USDC/unit,
  isSellerInitiated=true,
  targetCounterparty=address(0),  // Open to anyone
  expiresAt=block.timestamp + 7 days
)
```

Buyer accepts and pays. Seller delivers tokens + triggers logistics.

### Buyer-Initiated Offer

Buyer wants to source specific goods at a specific price:

```
Buyer → createP2POffer(
  token, tokenId, tokenQuantity=50,
  price=490 USDC/unit,
  isSellerInitiated=false,
  targetCounterparty=knownSellerAddress,  // Directed at specific seller
  expiresAt=block.timestamp + 3 days
)
```

Targeted seller accepts. Buyer's payment escrowed. Seller delivers.

---

## Directed vs Open Offers

| `targetCounterparty` | Effect                              |
| -------------------- | ----------------------------------- |
| `address(0)`         | Open offer — any address can accept |
| Specific address     | Only that address can accept        |

Directed offers are useful for OTC block trades where both parties have already negotiated off-chain.

---

## Offer Lifecycle

```
createP2POffer()
       │ Escrow:
       │ Seller-init: seller's tokens escrowed
       │ Buyer-init: buyer's payment escrowed
       ▼
  OFFER_OPEN
       │
       ├── acceptP2POffer() by counterparty
       │         ▼
       │   OFFER_ACCEPTED
       │         │ Triggers AuSys order creation
       │         │ Follows standard logistics flow
       │         ▼
       │   [Journey lifecycle] → Settlement
       │
       └── cancelP2POffer() by creator
             OR expiresAt reached
                   ▼
             OFFER_CANCELLED
             Escrow refunded
```

---

## Open Offers List

Open P2P offers are tracked in `openP2POfferIds` (a global array) and `userP2POffers[creator]`.

The frontend's P2P marketplace page queries these to display available offers:

**Route:** `/customer/p2p`
**Create:** `/customer/p2p/create`
**Browse by class:** `/customer/p2p/market/[className]`

---

## P2P Events

| Event                                                                                            | When            |
| ------------------------------------------------------------------------------------------------ | --------------- |
| `P2POfferCreated(orderId, creator, isSellerInit, token, tokenId, qty, price, target, expiresAt)` | Offer created   |
| `P2POfferAccepted(orderId, acceptor, isSellerInitiated)`                                         | Offer accepted  |
| `P2POfferCanceled(orderId, creator)`                                                             | Offer cancelled |

---

## After Acceptance

Once a P2P offer is accepted:

1. An `AuSysOrder` is created (same as a CLOB-triggered order)
2. Journeys are created for physical delivery
3. The full logistics flow applies — driver assignment, signatures, handoff
4. Settlement happens identically to CLOB orders

P2P trades do **not** use the BridgeFacet's UnifiedOrder system — they go directly through AuSysFacet.

---

## Related Pages

- [[Smart Contracts/Facets/AuSysFacet]]
- [[Core Concepts/CLOB Trading]]
- [[Core Concepts/Order Lifecycle]]
- [[Frontend/Pages Reference]]
