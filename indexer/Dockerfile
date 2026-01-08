# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files from indexer directory
COPY indexer/package*.json ./

# Install dependencies
RUN npm ci

# Copy indexer source code
COPY indexer/ .

# Copy chain-constants from parent directory
COPY chain-constants.ts ./chain-constants.ts

# Generate Ponder types
RUN npm run codegen

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

