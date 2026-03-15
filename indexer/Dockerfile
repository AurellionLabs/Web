# Build stage for Ponder indexer
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy only what's needed for build
COPY bun.lock ./
COPY package*.json ./
COPY indexer/package*.json ./indexer/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy indexer source
COPY indexer/ ./indexer/

# Install indexer dependencies
RUN cd indexer && bun install

# Copy build dependencies
COPY scripts/ ./scripts/
COPY chain-constants.ts ./
COPY config/ ./config/
COPY hardhat.config.ts ./
COPY tsconfig.json ./
COPY remappings.txt ./
COPY contracts/ ./contracts/

# Compile contracts (needed for artifacts)
RUN bunx --bun hardhat compile

# Production stage
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy healthcheck script
COPY indexer/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /usr/local/bin/healthcheck.sh

# Create non-root user with specific UID to avoid chown
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ponder

# Copy from builder (layer caching will help)
COPY --from=builder --chown=ponder:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ponder:nodejs /app/indexer ./indexer
COPY --from=builder --chown=ponder:nodejs /app/indexer/node_modules ./indexer/node_modules

USER ponder

EXPOSE 8080


CMD ["bun", "run", "generate", "indexer"]
CMD ["bun", "run", "--cwd", "indexer", "start"]
