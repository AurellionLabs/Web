FROM oven/bun:1 AS builder

WORKDIR /app

COPY bun.lock ./
COPY package.json ./
COPY aurellion-core/package.json ./aurellion-core/package.json
COPY indexer/package.json ./indexer/package.json

RUN bun install --frozen-lockfile

COPY . .

RUN bun run --cwd aurellion-core build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=builder /app/aurellion-core/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
