# Pinata Runtime Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove browser-direct Pinata reads so runtime metadata lookups use our server, Redis first, and Pinata only for server-side repopulation on cache miss.

**Architecture:** Client components keep calling platform helpers, but the helpers fetch metadata from a Next.js API route. The route owns Redis-first lookups and Pinata repopulation, then writes recovered metadata back to Redis for future reads.

**Tech Stack:** Next.js App Router, TypeScript, Pinata SDK, ioredis cache wrapper, Vitest, React Testing Library

---

### Task 1: Add failing tests for the new server metadata path

**Files:**

- Create: `/Users/aurellius/Documents/Web/test/app/api/platform-metadata-route.test.ts`
- Check: `/Users/aurellius/Documents/Web/infrastructure/cache/redis-cache.ts`
- Check: `/Users/aurellius/Documents/Web/infrastructure/repositories/shared/ipfs.ts`

**Step 1: Write the failing test**

Add tests that describe:

- returning token metadata from Redis without touching Pinata
- repopulating Redis from Pinata on a miss
- returning `404` or empty payload when Pinata also misses

**Step 2: Run test to verify it fails**

Run: `npx vitest run test/app/api/platform-metadata-route.test.ts`

Expected: FAIL because the route and/or shared server helper do not exist yet.

**Step 3: Write minimal implementation**

Create the route and helper needed to satisfy the tests with Redis-first behavior.

**Step 4: Run test to verify it passes**

Run: `npx vitest run test/app/api/platform-metadata-route.test.ts`

Expected: PASS

### Task 2: Add failing tests for client-side lookup cutover

**Files:**

- Modify: `/Users/aurellius/Documents/Web/__tests__/frontend/providers/platform.provider.test.tsx`
- Check: `/Users/aurellius/Documents/Web/app/providers/platform.provider.tsx`

**Step 1: Write the failing test**

Add tests that describe:

- `getAssetByTokenId()` using in-memory assets first
- uncached `getAssetByTokenId()` calling `fetch('/api/platform/metadata/token/...')`
- `getClassAssets()` using `fetch('/api/platform/metadata/class/...')` rather than repository Pinata access

**Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/frontend/providers/platform.provider.test.tsx`

Expected: FAIL because the provider still delegates uncached lookups to repository Pinata methods.

**Step 3: Write minimal implementation**

Update the provider to use the new server endpoint and preserve existing local caching/error handling behavior.

**Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/frontend/providers/platform.provider.test.tsx`

Expected: PASS

### Task 3: Remove browser Pinata initialization

**Files:**

- Modify: `/Users/aurellius/Documents/Web/app/providers/RepositoryProvider.tsx`
- Modify: `/Users/aurellius/Documents/Web/infrastructure/contexts/repository-context.ts`

**Step 1: Write the failing test**

Cover the setup path if necessary so repository initialization no longer requires a browser Pinata instance.

**Step 2: Run test to verify it fails**

Run the relevant provider or context tests.

**Step 3: Write minimal implementation**

Make Pinata optional for client-side repository initialization while preserving existing server-capable consumers.

**Step 4: Run test to verify it passes**

Run the affected tests again and confirm there is no client requirement for `NEXT_PUBLIC_PINATA_JWT`.

### Task 4: Verification

**Files:**

- Check: `/Users/aurellius/Documents/Web/app/providers/RepositoryProvider.tsx`
- Check: `/Users/aurellius/Documents/Web/app/providers/platform.provider.tsx`
- Check: `/Users/aurellius/Documents/Web/app/api/platform/**/*`
- Check: `/Users/aurellius/Documents/Web/infrastructure/repositories/shared/ipfs.ts`

**Step 1: Run targeted tests**

Run:

- `npx vitest run test/app/api/platform-metadata-route.test.ts`
- `npx vitest run __tests__/frontend/providers/platform.provider.test.tsx`

**Step 2: Run lint diagnostics**

Use workspace diagnostics for edited files and fix any introduced issues.

**Step 3: Spot-check for remaining browser Pinata runtime usage**

Run:

- `rg "NEXT_PUBLIC_PINATA_JWT|new PinataSDK" app infrastructure`

Expected:

- no client runtime `PinataSDK` initialization remains
- any remaining Pinata usage is server-only or script/admin scoped
