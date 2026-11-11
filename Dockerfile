# ==============================================================================
# ApexRad Enterprise DICOM Web Viewer & PACS Gateway - Production Dockerfile
# Multi-stage production build for maximum security and minimal image footprint
# ==============================================================================

# Stage 1: Build Frontend Assets & Transpile
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests
COPY package*.json tsconfig.json vite.config.ts ./

# Install all dependencies including build devDependencies
RUN npm ci

# Copy full application source code
COPY . .

# Compile production React SPA bundle
RUN npm run build

# Prune devDependencies to reduce image weight
RUN npm prune --omit=dev

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runtime
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DICOM_CACHE_DIR=/data/dicom_cache

# Install curl for container health checks
RUN apk add --no-cache curl

# Create dedicated unprivileged healthcare service user
RUN addgroup -g 1001 -S apexrad && \
    adduser -u 1001 -S apexrad -G apexrad && \
    mkdir -p /data/dicom_cache && \
    chown -R apexrad:apexrad /app /data/dicom_cache

# Copy compiled assets and runtime dependencies from builder
COPY --from=builder --chown=apexrad:apexrad /app/package.json ./package.json
COPY --from=builder --chown=apexrad:apexrad /app/node_modules ./node_modules
COPY --from=builder --chown=apexrad:apexrad /app/dist ./dist
COPY --from=builder --chown=apexrad:apexrad /app/server.ts ./server.ts
COPY --from=builder --chown=apexrad:apexrad /app/src/types ./src/types

USER apexrad

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/system/metrics || exit 1

CMD ["npx", "tsx", "server.ts"]
