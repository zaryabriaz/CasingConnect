# Free captcha (built-in)

No Cloudflare, Google, or paid service.

Public forms show a short math question (e.g. “What is 4 + 7?”).  
The API signs the challenge; wrong/expired answers are rejected.

Protected:
- `/register`
- `/tailored-setup`

Also includes a hidden honeypot field.

## Deploy

Redeploy the app as usual — no extra keys needed.

Optional (defaults to `JWT_SECRET` if unset):

```bash
CAPTCHA_SECRET=another-long-random-string
```

## Note

This blocks most simple bots. Advanced AI bots can still solve math; for stronger protection later you can add Cloudflare Turnstile (also free) on top.
