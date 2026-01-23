#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v24.12.0/bin:$PATH"

cd CollabDraw

pnpm install
pnpm run build

# Run database migrations
cd packages/db
npx prisma migrate deploy
npx prisma generate
cd ../..

pm2 restart fe-server
pm2 restart http-server
pm2 restart ws-server

echo "Deployment completed!, Done check sure"
