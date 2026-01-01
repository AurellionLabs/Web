# Deprecation Notice: The Graph Integration

## Status: DEPRECATED

The Graph-based data access layer (`graph.ts`, `graph-queries.ts`) is deprecated in favor of the new Ponder indexer system.

## Migration Timeline

- **Phase 1 (Current)**: Both systems run in parallel. Use `USE_PONDER_DATABASE=true` env var to switch to Ponder.
- **Phase 2**: Ponder becomes the default data source.
- **Phase 3**: Remove Graph dependencies and subgraph directories.

## Affected Files

### To Be Deprecated

- `infrastructure/repositories/shared/graph.ts` - GraphQL request utility
- `infrastructure/shared/graph-queries.ts` - GraphQL query definitions
- `aura-asset-base-sepolia/` - AuraAsset subgraph (replaced by Ponder handlers)
- `aurum-base-sepolia/` - Aurum subgraph (replaced by Ponder handlers)
- `ausys-base-sepolia/` - AuSys subgraph (replaced by Ponder handlers)
- `austake-base-sepolia/` - AuStake subgraph (replaced by Ponder handlers)

### Replacement

- `indexer/` - Ponder indexer with TypeScript handlers
- `infrastructure/repositories/shared/ponder-db.ts` - Direct PostgreSQL access

## Migration Steps

1. **Deploy Ponder Indexer**

   ```bash
   cd indexer
   docker-compose up -d  # Start PostgreSQL
   npm install
   npm run dev           # Start Ponder in development
   ```

2. **Configure Environment**

   ```bash
   # In your .env file
   USE_PONDER_DATABASE=true
   PONDER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ponder_indexer
   ```

3. **Update Repository Imports**
   Repositories will automatically use Ponder when `USE_PONDER_DATABASE=true`.

4. **Remove Graph Dependencies (Phase 3)**
   ```bash
   npm uninstall graphql graphql-request
   rm -rf aura-asset-base-sepolia aurum-base-sepolia ausys-base-sepolia austake-base-sepolia
   ```

## Benefits of Ponder

- **Performance**: Direct PostgreSQL queries vs GraphQL over HTTP
- **Self-hosted**: No dependency on The Graph hosted service
- **TypeScript**: Native TypeScript handlers instead of AssemblyScript
- **CLOB Support**: Pre-built schema and handlers for Central Limit Order Book
- **Real-time**: Lower latency for event indexing

## Questions?

Refer to the [Ponder documentation](https://ponder.sh/docs) or the `indexer/README.md` for setup instructions.
