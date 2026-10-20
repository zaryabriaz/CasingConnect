# Deploy CasingConnect on AWS Free Tier (first 12 months)

Use this instead of paid Lightsail while you are on the **AWS Free Tier**.

## What is free (typical new account, 12 months)

| Resource | Free allowance |
|----------|----------------|
| **EC2** | 750 hours/month of **t2.micro** or **t3.micro** (1 vCPU, **1 GB RAM**) |
| **EBS disk** | 30 GB general purpose |
| **Data transfer** | Limited outbound (check current Free Tier page) |

**Not free forever:** after 12 months, the same instance starts billing (~\$8–12/month for t3.micro, more for larger sizes).

**Lightsail** is usually **not** covered by this free tier (or only a short promo). Prefer **EC2 free tier** for year one.

## Honest limit: 1 GB RAM

CasingConnect runs **Next.js + Nest API + Postgres** on one box. On **1 GB** that is tight.

It can work for early testing if you add **swap** (steps below). If the server freezes or OOMs, upgrade later to **t3.small (2 GB)** — that leaves free tier and costs a few dollars/month.

## 0. AWS access

Your CLI user `crashhub` cannot create EC2 instances. Sign in as **root / admin** in the AWS Console to create the server, **or** attach `AmazonEC2FullAccess` (and VPC access) to `crashhub`.

## 1. Create a free-tier EC2 instance

1. Open [EC2 → Launch instance](https://console.aws.amazon.com/ec2/v2/home#LaunchInstances)
2. **Name:** `casingconnect`
3. **AMI:** Ubuntu Server 24.04 LTS
4. **Instance type:** `t2.micro` or `t3.micro` (look for “Free tier eligible”)
5. **Key pair:** create/download a `.pem` (keep it safe)
6. **Network / security group:** allow inbound:
   - SSH **22** (your IP only if possible)
   - HTTP **80**
   - HTTPS **443**
7. **Storage:** 20–30 GB gp3 (within free 30 GB)
8. Launch → wait until **Running**
9. Copy the **Public IPv4 address**

Optional but recommended: Allocate an **Elastic IP** and associate it so the IP does not change after stop/start.

## 2. SSH in and add swap (important on 1 GB)

```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_PUBLIC_IP
```

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

## 3. Install Docker

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
```

Log out and SSH back in.

## 4. Copy project and start

On your laptop (from the project folder):

```bash
rsync -avz -e "ssh -i /path/to/your-key.pem" \
  --exclude node_modules --exclude .next --exclude .pgdata --exclude .git \
  "./" ubuntu@YOUR_PUBLIC_IP:~/casingconnect/
```

On the server:

```bash
cd ~/casingconnect
cp deploy/.env.production.example .env.production
nano .env.production   # strong POSTGRES_PASSWORD and JWT_SECRET
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

Check:

```bash
curl -I http://YOUR_PUBLIC_IP
```

## 5. Point casingconnect.com (Spaceship)

| Type | Name | Value          |
|------|------|----------------|
| A    | @    | YOUR_PUBLIC_IP |
| A    | www  | YOUR_PUBLIC_IP |

Keep email forwarding to Gmail as already configured.

## 6. HTTPS later

After DNS works, add Let's Encrypt (same idea as in `AWS-LIGHTSAIL.md` section 5). Ask if you want the HTTPS Nginx config added next.

## Cost tips on free tier

- Prefer **one** always-on free micro instance (750 hours ≈ one instance 24/7)
- Stop the instance when not testing to be safe (Elastic IP stays; ephemeral public IP can change without Elastic IP)
- Watch [Billing → Free Tier](https://console.aws.amazon.com/billing/home#/freetier) so you do not accidentally use paid services (NAT Gateway, large RDS, etc.)
