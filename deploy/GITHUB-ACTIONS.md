# GitHub Actions CI/CD → AWS EC2

Push to `main` (or `master`) builds in CI and deploys to the EC2 box at `casingconnect.com`.

## What runs

| Workflow | When | What |
|----------|------|------|
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) | PR + push | `npm ci` + build API + Web |
| [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | push to `main`/`master`, or manual | rsync → `./deploy/deploy.sh` → health check |

Secrets stay on the server in `~/casingconnect/.env.production` (never in GitHub).

## 1. Create the GitHub repo

If the project is not on GitHub yet:

```bash
cd "/path/to/Casing business"
git branch -M main
git add .
git commit -m "Initial commit with GitHub Actions deploy"
# Create empty private repo on github.com, then:
git remote add origin git@github.com:YOUR_USER/casingconnect.git
git push -u origin main
```

## 2. Deploy SSH key (for Actions only)

On your laptop, generate a **separate** key (do not commit it):

```bash
ssh-keygen -t ed25519 -C "github-actions-casingconnect" -f ~/.ssh/casingconnect_gha -N ""
```

Copy the **public** key onto the EC2 server:

```bash
ssh -i ~/Downloads/casingconnect.pem ubuntu@54.66.41.237 \
  'mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys' \
  < ~/.ssh/casingconnect_gha.pub
```

Test:

```bash
ssh -i ~/.ssh/casingconnect_gha ubuntu@54.66.41.237 'echo ok && hostname'
```

## 3. GitHub secrets + environment

Repo → **Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|--------|
| `DEPLOY_HOST` | `54.66.41.237` (or your Elastic IP) |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_PATH` | `/home/ubuntu/casingconnect` |
| `DEPLOY_SSH_KEY` | Full contents of `~/.ssh/casingconnect_gha` (private key, including `BEGIN`/`END` lines) |

Also create environment **production** (Settings → Environments → New):

- Name: `production`
- Optional: require reviewers before deploy

The deploy workflow uses `environment: production`.

## 4. EC2 security group

Inbound **SSH (22)** must allow GitHub Actions runners. Easiest for a key-only setup:

- Type: SSH  
- Source: `0.0.0.0/0` (or your IP + GitHub meta ranges later)  
- Auth: SSH key only (no password)

HTTP/HTTPS stay open as today.

## 5. First deploy from GitHub

1. Confirm server already has `~/casingconnect/.env.production` and HTTPS (`deploy/nginx/active.conf` from SSL).
2. Push to `main`, or run **Actions → Deploy production → Run workflow**.
3. Watch the job until health check passes on `https://casingconnect.com/`.

## What rsync does **not** overwrite

- `.env.production`
- `deploy/certbot/` (Let's Encrypt certs)
- `deploy/nginx/active.conf` (live nginx)
- `api/uploads/`
- local `.env` files

## Manual deploy (same as CI)

```bash
rsync -az --delete -e "ssh -i ~/.ssh/casingconnect_gha" \
  --exclude '.git/' --exclude 'node_modules/' --exclude '.next/' \
  --exclude '.env.production' --exclude 'deploy/certbot/' \
  --exclude 'deploy/nginx/active.conf' --exclude 'api/uploads/' \
  ./ ubuntu@54.66.41.237:~/casingconnect/

ssh -i ~/.ssh/casingconnect_gha ubuntu@54.66.41.237 \
  'cd ~/casingconnect && ./deploy/deploy.sh'
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Permission denied (publickey)` | Wrong `DEPLOY_SSH_KEY`, or public key not in `~/.ssh/authorized_keys` |
| `Host key verification failed` | Re-run; workflow uses `ssh-keyscan` |
| Health check fails | SSH to server: `docker compose -f docker-compose.prod.yml --env-file .env.production ps` and `logs web` |
| Build OOM on micro | Deploy already builds on the server; add swap (see AWS-FREE-TIER.md) |
