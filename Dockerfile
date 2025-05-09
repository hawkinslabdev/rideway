# ------------------------------------------------
# Build stage
# ------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# ------------------------------------------------
# Runtime stage
# ------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production

# Create necessary directories
RUN mkdir -p public/uploads data

# Install only production dependencies needed for SQLite
RUN npm init -y && \
    npm install better-sqlite3 drizzle-orm esbuild-register

# Copy the standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration scripts and schema
COPY --from=builder /app/app/lib/db ./app/lib/db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle

# Set proper permissions for data directories
RUN chmod 777 public/uploads data

# Create a simple start script
RUN echo '#!/bin/sh' > ./start.sh && \
    echo 'set -e' >> ./start.sh && \
    echo 'echo "Running database migrations..."' >> ./start.sh && \
    echo 'mkdir -p /app/data' >> ./start.sh && \
    echo 'node -r esbuild-register ./app/lib/db/migrate.ts || echo "Migration completed with status $?"' >> ./start.sh && \
    echo 'echo "Starting Next.js application..."' >> ./start.sh && \
    echo 'exec node server.js' >> ./start.sh && \
    chmod +x ./start.sh

# Expose port
EXPOSE 3000

# Set the command to run the application
CMD ["./start.sh"]