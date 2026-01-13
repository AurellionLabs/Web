# Build stage
# Cache-bust: indexer package.json updated with correct script path
ARG CACHE_BUST=1
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy source code
COPY . .

# Install dependencies (including devDependencies for Hardhat + OpenZeppelin)
RUN npm install --legacy-peer-deps

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
COPY --from=builder /app/ponder.config.ts ./
COPY --from=builder /app/ponder.schema.ts ./
COPY --from=builder /app/generated-schema.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/abis ./abis
COPY --from=builder /app/chain-constants.ts ./chain-constants.ts
COPY --from=builder /app/diamond-constants.ts ./diamond-constants.ts

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
