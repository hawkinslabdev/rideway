# File: Dockerfile.slim

# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source files
COPY . .

# Build the application
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# ---- Production Stage ----
FROM node:20-alpine AS runner

# Set working directory
WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Create necessary directories with correct permissions
RUN mkdir -p public/uploads data && \
    chmod 755 public/uploads data

# Install only the minimal runtime dependencies
RUN apk add --no-cache dumb-init

# Copy only necessary files from build stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy database migration scripts
COPY --from=builder /app/app/lib/db/schema.ts ./app/lib/db/schema.ts
COPY --from=builder /app/app/lib/db/db.ts ./app/lib/db/db.ts
COPY --from=builder /app/app/lib/db/migrate.ts ./app/lib/db/migrate.ts
COPY --from=builder /app/drizzle ./drizzle

# Create a startup script
RUN echo '#!/bin/sh' > ./start.sh && \
    echo 'set -e' >> ./start.sh && \
    echo 'node -r ./node_modules/esbuild-register/dist/node.js ./app/lib/db/migrate.ts || echo "Migration completed with status $?"' >> ./start.sh && \
    echo 'exec dumb-init -- node server.js' >> ./start.sh && \
    chmod +x ./start.sh

# Use non-root user for better security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

# Expose port
EXPOSE 3000

# Use dumb-init as PID 1
ENTRYPOINT ["/app/start.sh"]