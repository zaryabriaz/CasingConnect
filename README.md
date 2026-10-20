# CasingConnect

Private business records for natural casing companies, beginning with sheep casings.

This first release is the foundation: a business account, places, team roles, casing qualities, units, and partners. The NestJS API is the contract for this web app and for a future mobile app.

## Run it here

PostgreSQL stays on this computer. There is no hosted database.

```bash
nvm use
npm install
npm run db:start
npm run db:setup
npm run dev
```

- Web: http://localhost:3011
- API: http://localhost:3010/api/v1
- API docs: http://localhost:3010/api/docs

Sample business after setup:

- `owner@casingconnect.demo` / `demo1234`
- `accountant@casingconnect.demo` / `demo1234` (can view, cannot change settings)

## Deploy on AWS

Production packaging lives in `docker-compose.prod.yml` and `deploy/`.

- **GitHub Actions CI/CD (auto deploy):** [deploy/GITHUB-ACTIONS.md](deploy/GITHUB-ACTIONS.md)
- **First-year Free Tier (recommended):** [deploy/AWS-FREE-TIER.md](deploy/AWS-FREE-TIER.md) — EC2 `t2.micro` / `t3.micro`
- **Paid fixed price later:** [deploy/AWS-LIGHTSAIL.md](deploy/AWS-LIGHTSAIL.md)
- **HTTPS + SEO:** [deploy/HTTPS-AND-SEO.md](deploy/HTTPS-AND-SEO.md)

## Mobile contract

Send `Authorization: Bearer <accessToken>`. The token is scoped to one business. `POST /api/v1/auth/switch-business` returns a token for another business the person belongs to.

Successful responses are `{ "data": ... }`. Errors are `{ "error": { "code", "message", "details" } }`.
