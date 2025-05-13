#!/bin/sh
set -e

# Create the uploads directory if it doesn't exist
mkdir -p /app/public/uploads
mkdir -p /app/data

# Fix ownership and permissions for the uploads directory
# This is critical for Docker to work properly with mounted volumes
chmod -R 777 /app/public/uploads /app/data

# List directories to verify permissions
echo "Uploads directory:"
ls -la /app/public/uploads
echo ""
echo "Data directory:"
ls -la /app/data
echo ""

# Run database migrations
echo "Running database migrations..."
node -r esbuild-register ./app/lib/db/migrate.ts || { echo "Migration failed with status $?"; exit 1; }

# Start the application
echo "Starting Next.js application..."
exec node server.js