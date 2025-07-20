# Multi-stage build for Document Indexing Service
FROM node:22-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY packages/document-indexing-service/package*.json ./packages/document-indexing-service/

# Install dependencies
FROM base AS deps
RUN npm ci --only=production && npm cache clean --force

# Build stage
FROM base AS build
COPY . .
RUN npm ci
RUN npm run build --workspace=@cycletime/document-indexing-service

# Production stage
FROM node:22-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    && addgroup -g 1001 -S nodejs \
    && adduser -S cycletime -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=build --chown=cycletime:nodejs /app/packages/document-indexing-service/dist ./dist
COPY --from=build --chown=cycletime:nodejs /app/packages/document-indexing-service/package.json ./package.json
COPY --from=deps --chown=cycletime:nodejs /app/node_modules ./node_modules

# Copy OpenAPI and AsyncAPI specifications
COPY --from=build --chown=cycletime:nodejs /app/packages/document-indexing-service/openapi.yaml ./openapi.yaml
COPY --from=build --chown=cycletime:nodejs /app/packages/document-indexing-service/asyncapi.yaml ./asyncapi.yaml

# Create data directory for vector databases
RUN mkdir -p /app/data && chown cycletime:nodejs /app/data

USER cycletime

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3003/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

# Start the service
CMD ["node", "dist/index.js"]