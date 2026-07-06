#!/usr/bin/env bash
# Shared VPS base setup (skip if Fast Rental already configured the host)
set -euo pipefail

sudo apt update
sudo apt install -y curl git ufw debian-keyring debian-archive-keyring apt-transport-https
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status

if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE 'v2[0-9]'; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  # shellcheck disable=SC1090
  source ~/.bashrc
  nvm install --lts
  nvm use --lts
fi

if ! command -v caddy >/dev/null 2>&1; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
  sudo apt update
  sudo apt install -y caddy
fi

npm install -g pm2
sudo timedatectl set-timezone America/Toronto

sudo mkdir -p /var/www
sudo chown "$USER":"$USER" /var/www

echo "✓ VPS base setup complete"
echo "Next: git clone YOUR_GITHUB_REPO_URL /var/www/union-rental && ./scripts/deploy-vps.sh"
