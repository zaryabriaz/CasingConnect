# Deploy CasingConnect on AWS Lightsail

> If you are on the **AWS Free Tier (first 12 months)**, use [AWS-FREE-TIER.md](./AWS-FREE-TIER.md) instead — Lightsail is usually not free-tier eligible.

Cheapest simple **paid** path: one Lightsail Ubuntu server + Docker Compose (web + API + Postgres + Nginx), then point **casingconnect.com** at it.

Estimated cost: about **\$10–20/month** (2 GB or 4 GB plan).

## 0. AWS access you need

Your current CLI user `crashhub` cannot create Lightsail/EC2 instances. Sign in as the **account root** or an admin IAM user in the AWS Console, or attach these policies to `crashhub`:

- `AmazonLightsailFullAccess` (simplest), **or**
- EC2 + VPC + related permissions if you prefer plain EC2

## 1. Create the Lightsail instance

1. Open [Lightsail](https://lightsail.aws.amazon.com/) → **Create instance**
2. Region: pick one close to you (e.g. Mumbai `ap-south-1`, Frankfurt `eu-central-1`, or Ohio `us-east-2`)
3. Platform: **Linux/Unix**
4. Blueprint: **OS Only → Ubuntu 24.04**
5. Plan: **\$12/mo (2 GB)** minimum; **\$20 (4 GB)** is safer
6. Name: `casingconnect`
7. Create instance → wait until **Running**
8. Networking → create a **Static IP** → attach to `casingconnect`
9. Networking → open ports: **22 (SSH)**, **80 (HTTP)**, **443 (HTTPS)**

Copy the **static IP** (example: `3.x.x.x`).

## 2. Install Docker on the server

Connect with the Lightsail browser SSH, or:

```bash
ssh -i ~/Downloads/LightsailDefaultKey-*.pem ubuntu@YOUR_STATIC_IP
```

Then:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin git
sudo usermod -aG docker ubuntu
```

Log out and SSH back in so the `docker` group applies.

## 3. Copy the project and start it

On your laptop (from the project folder):

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .pgdata --exclude .git \
  "./" ubuntu@YOUR_STATIC_IP:~/casingconnect/
```

On the server:

```bash
cd ~/casingconnect
cp deploy/.env.production.example .env.production
nano .env.production   # set strong POSTGRES_PASSWORD and JWT_SECRET
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Optional demo data (only if you want sample login):

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production exec api \
  npx tsx prisma/seed.ts
```

(Use `docker compose` instead of `docker-compose` if your server has the newer plugin.)

Check:

```bash
curl -I http://YOUR_STATIC_IP
curl -s http://YOUR_STATIC_IP/api/v1 | head
```

## 4. Point casingconnect.com (Spaceship DNS)

In Spaceship → **casingconnect.com** → DNS:

| Type | Name | Value            |
|------|------|------------------|
| A    | @    | YOUR_STATIC_IP   |
| A    | www  | YOUR_STATIC_IP   |

Wait for DNS (often a few minutes to a few hours).

Keep **email forwarding** as-is so `info@casingconnect.com` still goes to Gmail.

## 5. HTTPS (Let's Encrypt)

On the server, after DNS works:

```bash
sudo apt-get install -y certbot
# Stop nginx container briefly, or use a Certbot webroot setup.
# Simplest first pass with Certbot standalone:
docker compose -f docker-compose.prod.yml --env-file .env.production stop nginx
sudo certbot certonly --standalone -d casingconnect.com -d www.casingconnect.com
```

Then extend Nginx to terminate TLS (certificates under `/etc/letsencrypt/live/casingconnect.com/`) and restart. Ask if you want the HTTPS Nginx config added next.

## 6. After deploy

- Site: `https://casingconnect.com` (or `http://` until SSL)
- API: `https://casingconnect.com/api/v1`
- Admin / login work the same as locally
- Uploads (logos, covers) persist in the Docker `uploads` volume

## Update later

```bash
rsync -avz --exclude node_modules --exclude .next --exclude .pgdata --exclude .git \
  "./" ubuntu@YOUR_STATIC_IP:~/casingconnect/
ssh ubuntu@YOUR_STATIC_IP 'cd ~/casingconnect && ./deploy/deploy.sh'
```
