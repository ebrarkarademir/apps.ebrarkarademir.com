#!/bin/bash
# Sets up the Sunny Square world server once: Node 22, the server as a service, Caddy for HTTPS.
set -e
[ -f /var/lib/world/.setup-done ] && exit 0
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y curl gnupg debian-keyring debian-archive-keyring apt-transport-https
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y nodejs caddy
# 1 GB of memory is tight; a swap file keeps installs and spikes from crashing
if [ ! -f /swapfile ]; then fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile && echo '/swapfile none swap sw 0 0' >> /etc/fstab; fi
id world >/dev/null 2>&1 || useradd --system --home /opt/world --shell /usr/sbin/nologin world
mkdir -p /opt/world /var/lib/world
chown -R world:world /opt/world /var/lib/world
IP=$(curl -s -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip)
HOST="$(echo "$IP" | tr . -).sslip.io"
cat > /etc/systemd/system/world.service <<UNIT
[Unit]
Description=Sunny Square world server
After=network.target

[Service]
User=world
WorkingDirectory=/opt/world
Environment=PORT=8787
Environment=DB_FILE=/var/lib/world/world.db
Environment=ORIGINS=https://apps-76619.web.app,https://apps-76619-dev.web.app,https://apps-76619.firebaseapp.com,https://apps-76619-dev.firebaseapp.com
ExecStart=/usr/bin/node --experimental-sqlite --disable-warning=ExperimentalWarning src/main.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<CADDY
$HOST {
  reverse_proxy localhost:8787
}
CADDY
systemctl daemon-reload
systemctl enable world
systemctl restart caddy
echo "$HOST" > /var/lib/world/host
touch /var/lib/world/.setup-done
