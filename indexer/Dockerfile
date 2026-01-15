# Build stage
# Cache-bust: force fresh build
ARG CACHE_BUST
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy all source code
COPY . .

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Debug: Verify OpenZeppelin contracts BEFORE compile

# Compile Solidity contracts
RUN npx hardhat compile

# Generate Ponder types
RUN npm run generate:indexer

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponder

# Copy built application
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/indexer/ponder.config.ts ./
COPY --from=builder /app/indexer/ponder.schema.ts ./
COPY --from=builder /app/indexer/generated-schema.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/indexer/src ./indexer/src
COPY --from=builder /app/indexer/abis ./indexer/abis
COPY --from=builder /app/indexer/chain-constants.ts ./
COPY --from=builder /app/indexer/diamond-constants.ts ./

# Set ownership
RUN chown -R ponder:nodejs /app

USER ponder

# Expose Ponder port
EXPOSE 42069

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:42069/health || exit 1

# Start command
CMD ["npm", "run", "start"]
