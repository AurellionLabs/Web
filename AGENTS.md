# AGENTS.md

## Cursor Cloud specific instructions

### Project Overview

Aurellion Labs is a Web3 dApp (Next.js 14 + Hardhat) for tokenized real-world asset management, delivery logistics, and staking. It uses Privy for wallet authentication.

### Key Commands

| Task               | Command                               |
| ------------------ | ------------------------------------- |
| Dev server         | `npm run dev` (http://localhost:3000) |
| Lint               | `npm run lint`                        |
| Hardhat compile    | `npx hardhat compile`                 |
| Hardhat tests      | `npm run test:hardhat`                |
| Service unit tests | `npm run test:service:unit`           |
| All tests          | `npm run test`                        |
| Format             | `npm run format`                      |

### Non-obvious Notes

- **`npm install` requires `--legacy-peer-deps`** due to a peer dependency conflict between `@privy-io/react-auth@^2` and `@privy-io/wagmi-connector` (which expects `@privy-io/react-auth@^1`).
- **ESLint is not bundled in `package.json`** — you must install `eslint@8` and `eslint-config-next@14.2.16` (matching the Next.js version) and create `.eslintrc.json` with `{ "extends": "next/core-web-vitals" }`. ESLint 9+ is incompatible with Next.js 14.
- **Hardhat contracts must be compiled before `next build`** — the build script already chains `npx hardhat compile && next build`, but for dev you should run `npx hardhat compile` once after install to generate `typechain-types/`.
- **Service unit tests (`test:service:unit`) fail on Node.js 22** due to `chai-as-promised` ESM/CJS incompatibility. This is a pre-existing issue. Hardhat tests (`test:hardhat`) work fine (33 passing, 3 pre-existing failures).
- **Dashboard routes require Privy authentication** — the landing page and dashboard routes (`/customer/dashboard`, `/node/dashboard`, `/driver/dashboard`) show a loading animation until a wallet is connected via Privy. Set `NEXT_PUBLIC_PRIVY_APP_ID` env var for auth to work.
- **Husky pre-commit hook** runs `lint-staged` which applies `prettier` formatting to staged files.
