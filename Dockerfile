# Multi-stage build for POS System
# Stage 1: Build backend and frontend
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy all packages
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build everything
RUN pnpm run build

# Stage 2: Build frontend (React)
FROM node:24-alpine AS frontend-builder

WORKDIR /app

RUN npm install -g pnpm@9

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./
COPY artifacts/pos-system ./artifacts/pos-system
COPY lib ./lib

RUN pnpm install --frozen-lockfile

WORKDIR /app/artifacts/pos-system

RUN pnpm run build

# Stage 3: Production image
FROM node:24-alpine

WORKDIR /app

# Install pnpm in production image
RUN npm install -g pnpm@9

# Copy workspace files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy built artifacts and sources
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/lib/db/dist ./lib/db/dist
COPY --from=builder /app/lib/api-zod/dist ./lib/api-zod/dist
COPY --from=builder /app/lib/api-client-react/dist ./lib/api-client-react/dist

# Copy frontend build
COPY --from=frontend-builder /app/artifacts/pos-system/dist ./artifacts/pos-system/dist

# Copy package.json files for runtime dependencies resolution
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start API server with frontend static files
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
