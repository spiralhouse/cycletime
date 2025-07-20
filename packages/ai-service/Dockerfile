# Multi-stage build for AI Service
FROM node:22-alpine AS base

# Set working directory
WORKDIR /app

# Install dependencies for all packages
FROM base AS deps
COPY package*.json ./
COPY packages/ai-service/package*.json ./packages/ai-service/
COPY packages/shared-utils/package*.json ./packages/shared-utils/
COPY packages/shared-config/package*.json ./packages/shared-config/

# Install dependencies
RUN npm ci --only=production --ignore-scripts

# Build stage
FROM base AS builder
COPY package*.json ./
COPY packages/ai-service/package*.json ./packages/ai-service/
COPY packages/shared-utils/package*.json ./packages/shared-utils/
COPY packages/shared-config/package*.json ./packages/shared-config/

# Install all dependencies including dev dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY packages/ai-service/ ./packages/ai-service/
COPY packages/shared-utils/ ./packages/shared-utils/
COPY packages/shared-config/ ./packages/shared-config/
COPY turbo.json ./

# Build the application
RUN npm run build --workspace=@cycletime/ai-service

# Production stage
FROM node:22-alpine AS runner

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 aiservice

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=deps --chown=aiservice:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=aiservice:nodejs /app/packages/ai-service/package*.json ./packages/ai-service/

# Copy built application
COPY --from=builder --chown=aiservice:nodejs /app/packages/ai-service/dist ./packages/ai-service/dist
COPY --from=builder --chown=aiservice:nodejs /app/packages/shared-utils/dist ./packages/shared-utils/dist
COPY --from=builder --chown=aiservice:nodejs /app/packages/shared-config/dist ./packages/shared-config/dist

# Copy contracts for documentation
COPY --from=builder --chown=aiservice:nodejs /app/packages/ai-service/contracts ./packages/ai-service/contracts

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8003
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8003

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); \
    const options = { hostname: 'localhost', port: 8003, path: '/health', timeout: 5000 }; \
    const req = http.request(options, (res) => { \
      if (res.statusCode === 200) process.exit(0); \
      else process.exit(1); \
    }); \
    req.on('error', () => process.exit(1)); \
    req.on('timeout', () => process.exit(1)); \
    req.end();"

# Switch to non-root user
USER aiservice

# Start the application
CMD ["node", "packages/ai-service/dist/index.js"]