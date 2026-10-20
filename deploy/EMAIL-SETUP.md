# Email tailored-setup requests to info@casingconnect.com

When someone submits **Request a tailored setup**, the app:
1. Saves it in Admin → Requests
2. Emails the details to **info@casingconnect.com** (forwards to your Gmail)

## Free setup with Gmail SMTP

You already forward `info@casingconnect.com` → `zaryabriaz@gmail.com`.  
Use that Gmail account to **send** the notification emails.

### 1. Create a Gmail App Password

1. Google Account → **Security**
2. Turn on **2-Step Verification** (required)
3. **App passwords** → create one for “Mail”
4. Copy the 16-character password

### 2. Add to server `.env.production`

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

### 3. Redeploy API

```bash
cd ~/casingconnect
./deploy/deploy.sh
```

### 4. Test

Submit a request on https://casingconnect.com/tailored-setup  
You should get an email at `info@…` (in Gmail), and see the row in Admin → Requests.

Reply-To is set to the visitor’s email so you can reply directly.
