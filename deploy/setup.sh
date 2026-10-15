#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu EC2 instance for Sugarloop.
# Usage (on the server): bash setup.sh <git-repo-url>
# Afterwards create ~/sugarloop/server/.env, then run deploy/update.sh.
set -euo pipefail

REPO_URL=${1:?Usage: bash setup.sh <git-repo-url>}
APP_DIR=~/sugarloop

sudo apt-get update -y
sudo apt-get install -y git nginx curl

# Node.js 22 LTS + PM2
if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo npm install -g pm2

[ -d "$APP_DIR/.git" ] || git clone "$REPO_URL" "$APP_DIR"

sudo mkdir -p /var/www/sugarloop
sudo chown "$USER" /var/www/sugarloop
sudo cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/sugarloop
sudo ln -sf /etc/nginx/sites-available/sugarloop /etc/nginx/sites-enabled/sugarloop
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Start the API again after a reboot.
pm2 startup systemd -u "$USER" --hp "$HOME" | tail -1 | sudo bash || true

echo "Setup done. Next: create $APP_DIR/server/.env, then run: bash $APP_DIR/deploy/update.sh"
