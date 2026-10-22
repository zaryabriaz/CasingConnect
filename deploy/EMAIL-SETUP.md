# Email setup (From: info@casingconnect.com)

Keep **forwarding** `info@casingconnect.com` → your Gmail so you still *receive* mail.  
Use a free sender (**Resend**) so outbound mail shows **From: info@casingconnect.com** (no Spaceship mailbox required).

## Recommended free path: Resend

**Free plan:** 100 emails/day · 3,000/month — enough for setup alerts, listing confirmations, and small campaigns.

### 1. Create a Resend account

1. Sign up at [https://resend.com/signup](https://resend.com/signup) (free)
2. Open **Domains** → **Add Domain** → `casingconnect.com`
3. Resend shows DNS records (DKIM / SPF). Add them in **Spaceship** → your domain → **DNS**
4. Wait until the domain status is **Verified** (often ~15 minutes)

### 2. Create an API key

Resend → **API Keys** → Create → copy the key (`re_…`).

### 3. Put these values in server `.env.production`

```bash
MAIL_TO=info@casingconnect.com
MAIL_FROM=info@casingconnect.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=re_xxxxxxxx   # your Resend API key
```

Same keys work in local `api/.env`.

### 4. Restart / redeploy the API

```bash
cd ~/casingconnect
./deploy/deploy.sh
```

### 5. Test

Submit https://casingconnect.com/tailored-setup  
The customer confirmation should show **From: CasingConnect \<info@casingconnect.com\>**.  
Admin alerts still go to `info@` (forwarded to Gmail).

---

## Why not Gmail alone?

Gmail SMTP logs in as your personal Gmail and **rewrites** From to `zaryabriaz@gmail.com` unless you own a real mailbox / Send-as for `info@`. With only forwarding (no mailbox), Resend + DNS is the free fix.

## Optional: other free senders

| Service | Free limit | Notes |
|---------|------------|--------|
| **Resend** | 100/day, 3k/month | Best fit for this app (SMTP above) |
| Brevo | 300/day | Also free; different SMTP settings |
| SendGrid | 100/day | Also free; more setup |

Stick with Resend unless you already use another provider.
