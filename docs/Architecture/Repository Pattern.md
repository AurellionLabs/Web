---
tags: [architecture, repository, domain, typescript, data-access]
---

# Repository Pattern

[[🏠 Home]] > [[Architecture/System Overview]] > Repository Pattern

Aurellion uses a strict **Repository Pattern** to separate business logic (domain) from data access (infrastructure). This allows the frontend to swap between data sources (Ponder indexer, direct RPC, mock) without changing UI code.

---

## Layer Map

```
UI Components (React)
      │ useTradeProvider(), useNodeProvider(), ...
      ▼
React Context Providers
      │ orderRepository.getBuyerOrders(address)
      ▼
Repository Interface (domain/)
      │ IOrderRepository, INodeRepository, ...
      ▼
Repository Implementation (infrastructure/repositories/)
      │ GraphQL query → Ponder indexer
      │ OR ethers.js call → RPC
      ▼
Data Source (Ponder GraphQL / Base Sepolia RPC)
```

---

## Domain Layer (`/domain/`)

The domain layer defines **what** operations are possible, using TypeScript interfaces and types. No implementation details.

```
domain/
├── orders/
│   ├── order.ts       ← Order type, OrderStatus enum, IOrderRepository interface
│   └── index.ts       ← Re-exports
├── node/
│   ├── node.ts        ← Node type, INodeRepository interface, NodeOrderService
│   └── index.ts
├── clob/
│   ├── clob.ts        ← CLOBOrder, Market, Trade types, ICLOBRepository
│   └── index.ts
├── rwy/
│   ├── rwy.ts         ← RWYOpportunity, StakerPosition, IRWYRepository
│   └── index.ts
├── pool/
│   ├── pool.ts        ← Pool, LPPosition, IPoolRepository
│   └── index.ts
├── driver/
│   ├── driver.ts      ← DriverInfo, IDriverRepository
│   └── index.ts
├── customer/
│   ├── customer.ts    ← ICustomerRepository
│   └── index.ts
├── platform/
│   ├── platform.ts    ← IPlatformRepository
│   └── index.ts
├── shared/
│   └── index.ts       ← Shared types: Journey, ParcelData, Asset, JourneyStatus
└── models/
    ├── wallet.ts      ← Wallet model
    └── user.ts        ← User model
```

### Example: Order Domain

```typescript
// domain/orders/order.ts

export enum OrderStatus {
  CREATED = 'created',
  PROCESSING = 'processing',
  SETTLED = 'settled',
  CANCELLED = 'cancelled',
}

export type Order = {
  id: string;
  token: string;
  tokenId: string;
  tokenQuantity: string;
  price: string;
  txFee: string;
  buyer: string;
  seller: string;
  journeyIds: string[];
  nodes: string[];
  locationData?: ParcelData;
  currentStatus: OrderStatus;
  isP2P?: boolean;
  journeyStatus?: number | null;
  createdAt?: number;
};

export interface IOrderRepository {
  getNodeOrders(address: string): Promise<Order[]>;
  getCustomerJourneys(address?: string): Promise<Journey[]>;
  getReceiverJourneys(address?: string): Promise<Journey[]>;
  fetchAllJourneys(): Promise<Journey[]>;
  getBuyerOrders(address: string): Promise<Order[]>;
  getSellerOrders(address: string): Promise<Order[]>;
  getOrderById(orderId: string): Promise<Order | null>;
}
```

---

## Infrastructure Layer (`/infrastructure/repositories/`)

Implements the interfaces. Contains all Ponder GraphQL queries and RPC calls.

```
infrastructure/repositories/
├── orders-repository.ts     ← IOrderRepository implementation
├── node-repository.ts       ← INodeRepository implementation
├── clob-repository.ts       ← ICLOBRepository implementation (V1)
├── clob-v2-repository.ts    ← ICLOBRepository implementation (V2)
├── rwy-repository.ts        ← IRWYRepository implementation
├── pool-repository.ts       ← IPoolRepository implementation
├── driver-repository.ts     ← IDriverRepository implementation
├── platform-repository.ts   ← IPlatformRepository implementation
├── privy-wallet-repository.ts ← Wallet management via Privy
└── shared/
    └── graphql-client.ts    ← Shared graphql-request client
```

### Example: Orders Repository Implementation

```typescript
// infrastructure/repositories/orders-repository.ts
import { request } from 'graphql-request';
import { IOrderRepository, Order, OrderStatus } from '@/domain/orders';
import { Journey } from '@/domain/shared';
import { INDEXER_URL } from '@/chain-constants';

const GET_BUYER_ORDERS = gql`
  query GetBuyerOrders($buyer: String!) {
    unifiedOrderCreatedEventss(
      where: { buyer: $buyer }
      orderBy: "block_timestamp"
      orderDirection: "desc"
    ) {
      items {
        unifiedOrderId
        buyer
        seller
        token
        tokenId
        quantity
        price
        block_timestamp
      }
    }
  }
`;

export class OrdersRepository implements IOrderRepository {
  async getBuyerOrders(address: string): Promise<Order[]> {
    const data = await request(INDEXER_URL, GET_BUYER_ORDERS, {
      buyer: address.toLowerCase(),
    });

    return data.unifiedOrderCreatedEventss.items.map(this.transformToOrder);
  }

  private transformToOrder(raw: any): Order {
    return {
      id: raw.unifiedOrderId,
      token: raw.token,
      tokenId: raw.tokenId?.toString() ?? '0',
      tokenQuantity: raw.quantity?.toString() ?? '0',
      price: raw.price?.toString() ?? '0',
      txFee: '0',
      buyer: raw.buyer,
      seller: raw.seller ?? '',
      journeyIds: [],
      nodes: [],
      currentStatus: OrderStatus.CREATED,
      createdAt: Number(raw.block_timestamp),
    };
  }

  // ... other interface methods
}
```

---

## Dependency Injection (`RepositoryProvider`)

Repositories are injected into the React tree via `RepositoryProvider`, making them available to all child components without prop drilling:

```typescript
// app/providers/RepositoryProvider.tsx
import { createContext, useContext } from 'react';
import { OrdersRepository } from '@/infrastructure/repositories/orders-repository';
import { NodeRepository } from '@/infrastructure/repositories/node-repository';
// ... other repositories

interface Repositories {
  orderRepository: IOrderRepository;
  nodeRepository: INodeRepository;
  clobRepository: ICLOBRepository;
  rwyRepository: IRWYRepository;
  poolRepository: IPoolRepository;
  driverRepository: IDriverRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  const repositories: Repositories = {
    orderRepository: new OrdersRepository(),
    nodeRepository: new NodeRepository(),
    clobRepository: new CLOBv2Repository(),
    rwyRepository: new RWYRepository(),
    poolRepository: new PoolRepository(),
    driverRepository: new DriverRepository(),
  };

  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}

export const useRepositories = () => {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('useRepositories must be used inside RepositoryProvider');
  return ctx;
};
```

---

## Benefits of This Architecture

| Benefit                    | How                                                              |
| -------------------------- | ---------------------------------------------------------------- |
| **Testability**            | Swap real repositories for mocks in tests                        |
| **Type safety**            | Domain types enforced across all layers                          |
| **Flexibility**            | Change data source (Ponder → subgraph → RPC) without touching UI |
| **Separation of concerns** | UI doesn't know how data is fetched                              |
| **Consistency**            | All data goes through the same transformation layer              |

### Testing with Mock Repositories

```typescript
// In tests: inject mock repository
const mockOrderRepo: IOrderRepository = {
  getBuyerOrders: jest.fn().mockResolvedValue([
    { id: '0x123', currentStatus: OrderStatus.CREATED, ... }
  ]),
  // ... mock other methods
};

render(
  <RepositoryContext.Provider value={{ orderRepository: mockOrderRepo, ... }}>
    <CustomerDashboard />
  </RepositoryContext.Provider>
);

expect(mockOrderRepo.getBuyerOrders).toHaveBeenCalledWith(walletAddress);
```

---

## CLOB V1 vs V2 Repository

Two CLOB repository implementations exist:

| File                    | Queries                  | Use Case           |
| ----------------------- | ------------------------ | ------------------ |
| `clob-repository.ts`    | V1 `CLOBOrder` storage   | Legacy data        |
| `clob-v2-repository.ts` | V2 `PackedOrder` storage | Current production |

The `RepositoryProvider` injects `CLOBv2Repository` by default. The V1 repository is kept for historical data queries.

---

## Related Pages

- [[Architecture/System Overview]]
- [[Architecture/Data Flow]]
- [[Frontend/Providers]]
- [[Indexer/Schema and Queries]]
