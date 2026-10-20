# HTTPS + SEO for casingconnect.com

## Why Google does not show you on page 1 yet

A new domain almost never ranks on the first page immediately. Google needs time and signals:

1. **HTTPS** (padlock) — trust signal; set up below (free via Let’s Encrypt)
2. **Indexing** — submit the sitemap in [Google Search Console](https://search.google.com/search-console)
3. **Content & links** — marketplace listings, public company sites, and people linking to you
4. **Time** — often weeks to months for a new brand domain

CasingConnect SEO after redeploy includes:

- Unique titles/descriptions + Open Graph image on public pages
- JSON-LD (Organization + SoftwareApplication) on every page; LocalBusiness-style data on `/site/{slug}`
- Dynamic `sitemap.xml` (home, marketplace, product tour, published company sites, directory profiles, listings)
- `robots.txt` allowing public pages; blocking `/app`, `/admin`, `/login`
- Server-rendered metadata for company websites (`/site/{slug}`)

Public URLs to submit:
- https://casingconnect.com/sitemap.xml
- https://casingconnect.com/robots.txt

Private areas (`/app`, `/admin`) are noindex + disallowed from crawling.

## How HTTPS is managed (free)

We use **Let’s Encrypt** certificates (free, auto-renewable):

1. Certbot proves you own `casingconnect.com`
2. Nginx serves HTTPS on port **443**
3. HTTP (80) redirects to HTTPS
4. Renew every ~90 days (can be cron)

No paid SSL product required from Spaceship or AWS.

## Enable HTTPS on the server

After uploading the latest project files to the server:

```bash
cd ~/casingconnect
cp deploy/nginx/default.conf deploy/nginx/active.conf
chmod +x deploy/enable-https.sh
./deploy/enable-https.sh info@casingconnect.com
```

Then set in `.env.production`:

```bash
CORS_ORIGINS=https://casingconnect.com,https://www.casingconnect.com
NEXT_PUBLIC_API_URL=https://casingconnect.com/api/v1
NEXT_PUBLIC_SITE_URL=https://casingconnect.com
```

Rebuild:

```bash
./deploy/deploy.sh
```

Open: **https://casingconnect.com**

### Auto-renew (once a month check)

```bash
crontab -e
```

Add:

```cron
0 3 1 * * cd /home/ubuntu/casingconnect && docker compose -f docker-compose.prod.yml run --rm certbot renew && docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

## Google Search Console (recommended)

1. Go to https://search.google.com/search-console
2. Add property: `https://casingconnect.com`
3. Verify (DNS TXT on Spaceship, or HTML meta tag)
4. If using the meta tag, set in `.env.production`:
   `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_code_here`
5. Submit sitemap: `https://casingconnect.com/sitemap.xml`
6. Request indexing for `/` and `/natural-casings`

## Realistic ranking targets

| Query | Expectation |
| --- | --- |
| `casing` alone | Very hard (phones, oil pipe, Wikipedia). Do not expect page 1 soon. |
| `natural casing` / `natural casings` | Possible over time with `/natural-casings` + links. |
| `natural casing software` / `casing business software` | Best fit — own this niche. |
| `sheep casings software` / `Sialkot casings software` | Strong long-tail wins. |

Off-page that moves rankings: Google Business / Search Console, trade directory links, Facebook posts linking to casingconnect.com, published customer `/site/{slug}` pages, marketplace listings.
