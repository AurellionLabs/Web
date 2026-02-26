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
- **Three user roles** — The app has Customer, Node Operator, and Driver roles selectable via dropdown in the header. Each role has its own dashboard and navigation (e.g., Customer: Dashboard/Yield/Trading/P2P/Faucet; Node: Overview/Explorer; Driver: Dashboard).
- **Active development branch is `dev`** — The `dev` branch has significantly more features (Diamond pattern contracts, E2E test mode, CLOB trading, faucet) compared to `main`.
- **Contracts are deployed on Base Sepolia** (chain ID 84532) and Arbitrum. Contract addresses are in `chain-constants.ts`. The faucet mints AURA test tokens on Base Sepolia.
- **Google login is the easiest auth method for testing** — Privy Google OAuth works without needing a wallet extension. Privy creates an embedded wallet automatically for social-login users.

### CLOB Testing with cast

- **Install Foundry** (`curl -L https://foundry.paradigm.xyz | bash && foundryup`) to get the `cast` CLI for direct smart contract calls on Base Sepolia.
- **Two Diamond contracts on `dev` branch:**
  - Main Diamond (`NEXT_PUBLIC_DIAMOND_ADDRESS` in `chain-constants.ts`): Handles ERC1155 assets (mint, transfer), nodes, staking.
  - CLOB V2 Diamond (`0x2516CAdb7b3d4E94094bC4580C271B8559902e3f`, from `deployments/clob-v2-baseSepolia-*.json`): Handles all CLOB trading (placeLimitOrder, cancelOrder, matching).
- **CLOB initialization required**: Call `initializeCLOBV2(25, 10, 1000, 300, 3600)` as owner to set rate limits and fees before any orders work. Without this, all orders fail with `RateLimitExceeded`.
- **Gas limit for CLOB orders must be >= 1M** — sell orders use ~810k gas, buy orders with matching use ~490k gas.
- **Use `SEP_PRIVATE_KEY` (deployer)** for admin operations (minting assets, initializing CLOB). Create fresh wallets via `cast wallet new` for buyer/driver roles.
- **Multi-wallet CLOB test flow**: (1) Mint ERC1155 via Main Diamond `mintBatch`, (2) Approve CLOB Diamond for ERC1155 + AURA, (3) Place sell order on CLOB Diamond, (4) Fund buyer with ETH + AURA, (5) Buyer approves + places buy order → auto-matches.
