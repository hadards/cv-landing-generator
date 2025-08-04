# Multi-stage build for production deployment
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the frontend
FROM base AS frontend-builder
WORKDIR /app
COPY package*.json ./
COPY frontend/ ./frontend/
RUN npm ci && npm run build

# Build the application
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=frontend-builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --chown=nodejs:nodejs . .

# Create required directories
RUN mkdir -p uploads generated temp && chown nodejs:nodejs uploads generated temp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

USER nodejs

EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]