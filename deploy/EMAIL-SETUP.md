# Email setup (Gmail SMTP)

When someone submits **Request a tailored setup** / listing / campaigns, the app emails via SMTP.

Keep **forwarding** `info@casingconnect.com` → your Gmail so you still *receive* mail at `info@`.  
Outbound uses **Gmail SMTP** (App Password) — works without verifying a custom domain on Resend.

## Free setup with Gmail SMTP

### 1. Create a Gmail App Password

1. Google Account → **Security**
2. Turn on **2-Step Verification** (required)
3. **App passwords** → create one for “Mail”
4. Copy the 16-character password

### 2. Add to local `api/.env` and server `.env.production`

```bash
MAIL_TO=info@casingconnect.com
MAIL_FROM=zaryabriaz@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=zaryabriaz@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
```

(Use your real Gmail + App Password. Spaces in the app password are OK.)

Gmail will show **From** as your Gmail address (it rewrites custom From). Reply-To can still be `info@casingconnect.com`.

### 3. Restart API (local)

```bash
# kill and restart Nest
cd api && npm run start:dev
```

### 4. Restart API (production)

```bash
cd ~/casingconnect
docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
```

### 5. Test

Admin → Prospects → send a campaign, or submit https://casingconnect.com/tailored-setup.

---

## Optional later: Resend (From: info@casingconnect.com)

Only after you verify `casingconnect.com` in Resend (DNS SPF/DKIM):

```bash
MAIL_FROM=info@casingconnect.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx
```
