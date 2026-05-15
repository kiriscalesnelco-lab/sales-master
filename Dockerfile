# Multi-stage build for POS System
# Stage 1: Build all packages (backend + frontend)
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@9

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy all source files
COPY artifacts ./artifacts
COPY lib ./lib
COPY scripts ./scripts

# Install all dependencies (including dev)
# Use non-frozen lockfile to allow pnpm to auto-sync overrides configuration
RUN pnpm install

# Build all packages (backend + frontend)
RUN pnpm run build

# Stage 2: Production image
FROM node:24-alpine

WORKDIR /app

# Install pnpm in production image for production dependency installation
RUN npm install -g pnpm@9

# Copy workspace configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json tsconfig.json ./

# Copy built artifacts from builder stage
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/artifacts/api-server/src/lib ./artifacts/api-server/src/lib
COPY --from=builder /app/artifacts/pos-system/dist ./artifacts/pos-system/dist
COPY --from=builder /app/lib/db/dist ./lib/db/dist
COPY --from=builder /app/lib/api-zod/dist ./lib/api-zod/dist
COPY --from=builder /app/lib/api-client-react/dist ./lib/api-client-react/dist

# Copy package.json files for dependency resolution
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/

# Install production dependencies only (no dev dependencies)
RUN pnpm install --production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start API server with frontend static files
CMD ["node", "--enable-source-maps", "artifacts/api-server/dist/index.mjs"]
