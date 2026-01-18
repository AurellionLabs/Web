# Build stage for Ponder indexer
FROM node:22-alpine AS builder

WORKDIR /app

# Copy only what's needed for build
COPY pnpm-lock.yaml ./
COPY package*.json ./
COPY indexer/package*.json ./indexer/

# Install dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy indexer source
COPY indexer/ ./indexer/

# Install indexer dependencies
RUN cd indexer && pnpm install --no-frozen-lockfile

# Copy build dependencies
COPY scripts/ ./scripts/
COPY chain-constants.ts ./
COPY config/ ./config/
COPY hardhat.config.ts ./
COPY tsconfig.json ./
COPY remappings.txt ./
COPY contracts/ ./contracts/

# Compile contracts and generate indexer
RUN rm -rf ~/.cache/hardhat && \
    npx hardhat compile && \
    cd indexer && pnpm run generate:indexer

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Create non-root user with specific UID to avoid chown
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ponder

# Copy from builder (layer caching will help)
COPY --from=builder --chown=ponder:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ponder:nodejs /app/indexer ./indexer
COPY --from=builder --chown=ponder:nodejs /app/indexer/node_modules ./indexer/node_modules

USER ponder

EXPOSE 42069

CMD ["sh", "-c", "pnpm --filter aurellion-indexer run start"]
