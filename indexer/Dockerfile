# Build stage
# Cache-bust: force fresh build
ARG CACHE_BUST
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Copy all source code
COPY . .

# Install dependencies with force to bypass any cached resolutions
RUN npm install --legacy-peer-deps --force

# Debug: Verify OpenZeppelin contracts
RUN ls -la node_modules/@openzeppelin/contracts/security/ || echo "security folder not found"
RUN cat node_modules/@openzeppelin/contracts/package.json | grep '"version"' | head -1

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
COPY --from=builder /app/indexer/src ./indexer/src
COPY --from=builder /app/indexer/abis ./indexer/abis
COPY --from=builder /app/chain-constants.ts ./
COPY --from=builder /app/diamond-constants.ts ./

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
