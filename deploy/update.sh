#!/usr/bin/env bash
# Deploy the latest main: pull, install, build the client, restart the API.
# Usage (on the server): bash ~/sugarloop/deploy/update.sh
set -euo pipefail

APP_DIR=~/sugarloop
cd "$APP_DIR"

git fetch origin
git checkout main
git reset --hard origin/main

npm ci --prefix server --omit=dev
npm ci --prefix client
npm run build --prefix client
rsync -a --delete client/dist/ /var/www/sugarloop/

cd server
# Always delete and re-start so PM2 runs from this directory, not a stale path.
pm2 delete sugarloop-api 2>/dev/null || true
pm2 start src/index.js --name sugarloop-api
pm2 save

sleep 3
curl -fsS http://127.0.0.1:5000/api/health && echo " — API is up"
