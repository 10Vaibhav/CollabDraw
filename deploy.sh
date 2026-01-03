#!/bin/bash
export PATH="/home/ubuntu/.nvm/versions/node/v24.12.0/bin:$PATH"

pnpm install
pnpm run build

pm2 restart fe-server
pm2 restart http-server
pm2 restart ws-server

echo "Deployment completed!, Done check ✅"
