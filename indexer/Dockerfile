# Build stage for Ponder indexer
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace config and root package files
COPY pnpm-lock.yaml ./
COPY package*.json ./

# Copy indexer package
COPY indexer/package*.json ./indexer/

# Install dependencies (from workspace)
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy indexer source
COPY indexer/ ./indexer/

# Copy scripts needed for generate:indexer
COPY scripts/ ./scripts/

# Copy chain constants needed by indexer
COPY chain-constants.ts ./
COPY config/ ./config/
COPY hardhat.config.ts ./
COPY tsconfig.json ./
COPY remappings.txt ./

# Copy contracts source for compilation
COPY contracts/ ./contracts/

# Compile Solidity contracts (needed for generate:indexer)
RUN npx hardhat compile

# Generate indexer types
RUN cd indexer && pnpm run generate:indexer

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 ponder

# Copy only what's needed from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/indexer ./indexer
COPY --from=builder /app/indexer/node_modules ./indexer/node_modules

# Set ownership
RUN chown -R ponder:nodejs /app

USER ponder

EXPOSE 42069

CMD ["sh", "-c", "cd indexer && pnpm run start"]
