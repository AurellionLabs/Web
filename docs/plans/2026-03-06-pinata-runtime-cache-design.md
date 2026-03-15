# Pinata Runtime Cache Design

**Date:** 2026-03-06

## Goal

Make runtime metadata reads Redis-first and remove direct browser access to Pinata. Pinata remains available only as a server-side repopulation source when Redis misses occur.

## Problem

The current frontend runtime still instantiates `PinataSDK` in the browser and calls repository methods that can query Pinata directly. That breaks the intended cache architecture, leaks Pinata access to the client bundle, and makes rate limiting and observability harder to control.

## Desired Invariant

- Normal runtime reads use Redis-backed metadata.
- A Redis miss is anomalous but recoverable.
- Only server-side code may query Pinata to repopulate Redis.
- Browser code never requires `NEXT_PUBLIC_PINATA_JWT`.

## Chosen Approach

Use a server metadata API owned by the Next.js app for runtime lookups that currently fall through to Pinata. The client keeps the same high-level `getAssetByTokenId()` and `getClassAssets()` behavior, but those calls are routed to our own server endpoints instead of the browser-resident Pinata client.

The server metadata route uses a shared helper that:

1. Normalizes the incoming lookup key.
2. Checks Redis first.
3. If Redis misses, queries Pinata.
4. Writes the recovered metadata back to Redis.
5. Returns the metadata to the caller.

## Scope

### Client runtime

- Remove `PinataSDK` creation from `app/providers/RepositoryProvider.tsx`.
- Keep `RepositoryContext` initialization intact for contract/indexer-backed repositories.
- Update `app/providers/platform.provider.tsx` so cache-miss metadata lookups go through an internal HTTP endpoint instead of calling repository Pinata methods directly from the browser.

### Server runtime

- Add a dedicated metadata route under `app/api`.
- Centralize Redis-first, Pinata-repopulate logic in a shared server-safe helper.
- Reuse existing Redis key conventions for token metadata and CID content where possible.

### Repository behavior

- Preserve `PlatformRepository` for indexer-backed reads and any server-only Pinata use that remains necessary.
- Remove client runtime dependence on `PlatformRepository` methods that currently hit Pinata directly.

## Error Handling

- If Redis has the metadata, return it immediately.
- If Redis misses and Pinata succeeds, write-through to Redis and return the hydrated result.
- If both Redis and Pinata fail, return `null` or `[]` rather than throwing in UI-facing paths.
- Log Redis misses so they can be treated as repair events rather than normal traffic.

## Testing Strategy

- Add route tests covering Redis hit, Redis miss plus Pinata repopulation, and Pinata failure.
- Update provider tests so `getAssetByTokenId()` no longer depends on repository Pinata access for uncached assets.
- Verify the client build path no longer imports `PinataSDK` or depends on `NEXT_PUBLIC_PINATA_JWT`.

## Non-Goals

- Replacing all Pinata usage across scripts or admin tooling.
- Removing legitimate server-side Pinata writes during tokenization or metadata repair.
- Refactoring every repository into separate client and server implementations in this change.
