# File: Dockerfile
# ------------------------------------------------
# Build stage
# ------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
# Install build dependencies
COPY package*.json ./
RUN npm ci
# Make sure we have critters package (missing dependency for optimizeCss)
RUN npm install critters
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
# Force Next.js to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Install curl for health checks
RUN apk --no-cache add curl

# Create necessary directories with proper permissions
# These directories will be mounted from the host in docker-compose.yml
RUN mkdir -p public/uploads data && \
    chmod -R 777 public/uploads data

# Install only production dependencies needed for SQLite
RUN npm init -y && \
    npm install better-sqlite3 drizzle-orm esbuild-register react-csv react-swipeable 

# Copy the standalone Next.js output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy migration scripts and schema
COPY --from=builder /app/app/lib/db ./app/lib/db
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/drizzle ./drizzle

# Create an improved health check script that uses 0.0.0.0 instead of localhost
RUN echo '#!/bin/sh' > ./healthcheck.sh && \
    echo 'curl -f http://0.0.0.0:3000/api/health || exit 1' >> ./healthcheck.sh && \
    chmod +x ./healthcheck.sh

# Create a start script with improved error handling
RUN echo '#!/bin/sh' > ./start.sh && \
    echo 'set -e' >> ./start.sh && \
    echo 'echo "Running database migrations..."' >> ./start.sh && \
    echo 'mkdir -p /app/data /app/public/uploads' >> ./start.sh && \
    echo 'chmod -R 777 /app/data /app/public/uploads' >> ./start.sh && \
    echo 'ls -la /app/public/' >> ./start.sh && \
    echo 'node -r esbuild-register ./app/lib/db/migrate.ts || { echo "Migration failed with status $?"; exit 1; }' >> ./start.sh && \
    echo 'echo "Starting Next.js application..."' >> ./start.sh && \
    echo 'exec node server.js' >> ./start.sh && \
    chmod +x ./start.sh

# Expose port
EXPOSE 3000

# Define health check (only defined once)
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 CMD ./healthcheck.sh

# Set the command to run the application
CMD ["./start.sh"]