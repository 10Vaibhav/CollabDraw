#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v24.12.0/bin:$PATH"

echo "Starting deployment..."

# Install dependencies and build
pnpm install
pnpm run build

# Stop existing PM2 processes
pm2 stop ecosystem.config.js || true

# Start services using ecosystem config
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

echo "Deployment completed! ✅"
echo ""
echo "Services status:"
pm2 status
