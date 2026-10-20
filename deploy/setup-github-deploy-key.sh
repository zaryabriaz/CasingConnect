#!/usr/bin/env bash
# Generate a GitHub Actions deploy key and install the public key on EC2.
# Usage:
#   ./deploy/setup-github-deploy-key.sh
#   ./deploy/setup-github-deploy-key.sh ~/Downloads/casingconnect.pem ubuntu@54.66.41.237
set -euo pipefail

ADMIN_KEY="${1:-$HOME/Downloads/casingconnect.pem}"
TARGET="${2:-ubuntu@54.66.41.237}"
KEY_PATH="${HOME}/.ssh/casingconnect_gha"

if [[ ! -f "$ADMIN_KEY" ]]; then
  echo "Admin PEM not found: $ADMIN_KEY" >&2
  exit 1
fi

if [[ ! -f "$KEY_PATH" ]]; then
  ssh-keygen -t ed25519 -C "github-actions-casingconnect" -f "$KEY_PATH" -N ""
  echo "Created $KEY_PATH"
else
  echo "Using existing $KEY_PATH"
fi

PUB=$(cat "${KEY_PATH}.pub")
ssh -i "$ADMIN_KEY" -o StrictHostKeyChecking=accept-new "$TARGET" bash -s <<EOF
set -euo pipefail
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if ! grep -qxF '$PUB' ~/.ssh/authorized_keys; then
  echo '$PUB' >> ~/.ssh/authorized_keys
fi
EOF

ssh -i "$KEY_PATH" -o StrictHostKeyChecking=accept-new "$TARGET" 'echo "GitHub deploy key OK on $(hostname)"'

cat <<EOF

Next — add GitHub Actions secrets (Settings → Secrets → Actions):

  DEPLOY_HOST = ${TARGET#*@}
  DEPLOY_USER = ${TARGET%@*}
  DEPLOY_PATH = /home/ubuntu/casingconnect
  DEPLOY_SSH_KEY = (paste full private key from: $KEY_PATH)

Also create Environment named: production

Private key to copy:
  cat $KEY_PATH

EOF
