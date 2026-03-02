---
tags: [frontend, nextjs, architecture, bun]
---

# Frontend Application Structure

[[🏠 Home]] > Frontend > Application Structure

The Aurellion frontend is a **Next.js 14+ App Router** application written in TypeScript with Tailwind CSS. The monorepo uses **Bun** as package manager and runtime.

---

## Tech Stack

| Technology          | Purpose                                    | Version |
| ------------------- | ------------------------------------------ | ------- |
| **Next.js 14**      | React framework with App Router            | 14+     |
| **TypeScript**      | Full type safety across frontend           | 5+      |
| **Tailwind CSS**    | Utility-first styling                      | 3+      |
| **shadcn/ui**       | Component library (Radix UI primitives)    | Latest  |
| **Privy**           | Wallet connection + embedded wallets       | Latest  |
| **ethers.js**       | Blockchain interaction (+ typechain types) | 6+      |
| **graphql-request** | Ponder indexer queries                     | Latest  |
| **Bun**             | Package manager and runtime                | 1.2.8   |

---

## Directory Structure

```
app/
├── layout.tsx                   ← Root layout (Privy, global providers)
├── page.tsx                     ← Landing page
├── globals.css                  ← Global styles
├── (app)/                       ← Authenticated app routes
│   ├── layout.tsx               ← Auth guard + shared layout
│   ├── customer/                ← Customer sub-app
│   │   ├── dashboard/
│   │   ├── trading/
│   │   ├── p2p/
│   │   ├── pools/
│   │   ├── rwy/
│   │   └── faucet/
│   ├── node/                    ← Node operator sub-app
│   │   ├── dashboard/
│   │   ├── register/
│   │   ├── explorer/
│   │   ├── overview/
│   │   ├── rwy/
│   │   └── [nodeId]/orders/
│   └── driver/                  ← Driver sub-app
│       └── dashboard/
├── providers/                   ← React context providers
│   ├── main.provider.tsx        ← Root provider composition
│   ├── privy.provider.tsx
│   ├── diamond.provider.tsx
│   ├── nodes.provider.tsx
│   ├── pools.provider.tsx
│   ├── trade.provider.tsx
│   ├── driver.provider.tsx
│   ├── customer.provider.tsx
│   ├── platform.provider.tsx
│   ├── orders.provider.tsx
│   └── RepositoryProvider.tsx
├── types/
│   └── shared.tsx               ← Shared TypeScript types
└── utils/
    ├── helpers.ts
    └── maps.ts
```

---

## Route Groups

### `(app)/` — Authenticated Routes

The `(app)` route group wraps all authenticated pages with:

- Wallet connection guard (redirect to connect if no wallet)
- Shared navigation and layout
- Full provider context tree

### Role-Based Sub-Apps

| Sub-app  | Base Route   | Audience                         |
| -------- | ------------ | -------------------------------- |
| Customer | `/customer/` | Asset buyers, traders, stakers   |
| Node     | `/node/`     | Node operators, asset minters    |
| Driver   | `/driver/`   | Couriers and logistics providers |

---

## Wallet Connection (Privy)

```typescript
// app/providers/privy.provider.tsx
import { PrivyProvider } from '@privy-io/react-auth';

export function AurellionPrivyProvider({ children }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet', 'google'],
        embeddedWallets: { createOnLogin: 'users-without-wallets' },
        defaultChain: baseSepolia,
        supportedChains: [baseSepolia, base],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

---

## Contract Interaction

The `diamond.provider.tsx` creates ethers contract instances for the Diamond proxy:

```typescript
const diamondWithSigner = new ethers.Contract(
  NEXT_PUBLIC_DIAMOND_ADDRESS, // from chain-constants.ts
  DIAMOND_ABI,
  signer,
) as Diamond; // TypeChain type
```

All interactions go through the Diamond proxy — facets are transparent.

---

## State Management

React Context (no Redux/Zustand). Each domain has a provider:

| Provider             | Manages                                                |
| -------------------- | ------------------------------------------------------ |
| `DiamondProvider`    | Contract instances (Diamond, quote token, asset token) |
| `NodesProvider`      | All registered nodes, owner's nodes                    |
| `PoolsProvider`      | AMM pool data, LP positions                            |
| `TradeProvider`      | Order book, active orders, trade history               |
| `DriverProvider`     | Driver's assigned journeys, earnings                   |
| `CustomerProvider`   | Portfolio, orders, P2P offers, stakes                  |
| `PlatformProvider`   | Active classes, system status, fee config              |
| `RepositoryProvider` | Injected repository implementations                    |

---

## Data Fetching Strategy

| Data Type            | Source                                             | Method                        |
| -------------------- | -------------------------------------------------- | ----------------------------- |
| Historical events    | Ponder (https://indexer.aurellionlabs.com/graphql) | GraphQL via `graphql-request` |
| Real-time order book | CLOBViewFacet                                      | Direct `ethers.js` read       |
| Wallet state         | Privy                                              | `usePrivy()`, `useWallets()`  |
| Contract reads       | Base Sepolia RPC                                   | `diamond.readFunction()`      |
| Asset metadata       | IPFS gateway                                       | `fetch(tokenURI)`             |

---

## Environment Variables

```env
# Blockchain (auto-generated in chain-constants.ts from deployment)
NEXT_PUBLIC_DIAMOND_ADDRESS=0x8ed92Ff64dC6e833182a4743124FE3e48E2966A7
NEXT_PUBLIC_CHAIN_ID=84532

# Tokens
NEXT_PUBLIC_QUOTE_TOKEN_ADDRESS=0xe727f09fd8Eb3CaFa730493614df1528Ba69B1e6
NEXT_PUBLIC_QUOTE_TOKEN_SYMBOL=AURA
NEXT_PUBLIC_QUOTE_TOKEN_DECIMALS=18
NEXT_PUBLIC_AURA_ASSET_ADDRESS=0xb3090aBF81918FF50e921b166126aD6AB9a03944

# Indexer (hardcoded in chain-constants.ts)
NEXT_PUBLIC_INDEXER_URL=https://indexer.aurellionlabs.com/graphql

# Auth
NEXT_PUBLIC_PRIVY_APP_ID=<your-privy-app-id>

# RPC (never hardcode API keys)
NEXT_PUBLIC_RPC_URL_84532=https://base-sepolia.rpc.provider/<api-key>
```

Most contract addresses are auto-generated into `chain-constants.ts` by the deployment scripts — do not manually set them as env vars; import from `@/chain-constants` instead.

---

## Build & Dev Commands

```bash
# Install dependencies
bun install

# Development server
bun run dev   # or: next dev

# Production build
bun run build            # type-check + next build
bun run build:full       # compile contracts + gen + type-check + build

# Type check only
bun run typecheck

# Lint
bun run lint

# Contract operations
bun run contract:compile   # bunx --bun hardhat compile
bun run contract:gen       # gen-all.ts + generate-indexer.ts
bun run contract:update    # compile + gen
bun run contract:validate  # validate-abis.ts
bun run contract:deploy    # update + deploy to baseSepolia
```

---

## Testing

```bash
# Vitest unit/integration tests
bunx vitest run
# or: bun run test

# Coverage
bunx vitest run --coverage
# or: bun run test:coverage

# Hardhat contract tests
bunx --bun hardhat test
# or: bun run test:hardhat

# Service tests (bun test runner)
bun run test:service

# Repository tests
bun run test:repo:clob
```

---

## TypeChain Generated Types

Contract types are generated from ABI artifacts:

```bash
bun run contract:compile   # generates artifacts/
bun scripts/gen-all.ts     # generates typechain-types/
```

```typescript
// Use generated types for full type safety:
import { Diamond__factory } from '@/typechain-types';

const diamond = Diamond__factory.connect(NEXT_PUBLIC_DIAMOND_ADDRESS, signer);
// Full intellisense on all Diamond functions and events
```

---

## Related Pages

- [[Frontend/Providers]]
- [[Frontend/Pages Reference]]
- [[Technical Reference/Developer Quickstart]]
- [[Indexer/Schema and Queries]]
