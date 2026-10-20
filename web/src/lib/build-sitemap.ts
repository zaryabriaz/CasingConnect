import { fetchPublicApi, SITE_URL } from '@/lib/seo';

type SiteIndex = { slug: string; name: string; updatedAt: string };
type MarketBusiness = { slug: string; name: string; source?: string };
type MarketListing = { id: string; updatedAt?: string; createdAt?: string };

type SitemapEntry = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function entryXml(entry: SitemapEntry) {
  return `<url>
<loc>${escapeXml(entry.loc)}</loc>
<lastmod>${entry.lastmod}</lastmod>
<changefreq>${entry.changefreq}</changefreq>
<priority>${entry.priority}</priority>
</url>`;
}

export async function buildSitemapXml(): Promise<string> {
  const now = new Date().toISOString();
  const staticPaths: Array<{ path: string; priority: string; changefreq: string }> = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    { path: '/natural-casings', priority: '0.95', changefreq: 'monthly' },
    { path: '/marketplace', priority: '0.9', changefreq: 'daily' },
    { path: '/product-tour', priority: '0.8', changefreq: 'monthly' },
    { path: '/register', priority: '0.7', changefreq: 'monthly' },
    { path: '/tailored-setup', priority: '0.7', changefreq: 'monthly' },
  ];

  const entries: SitemapEntry[] = staticPaths.map((item) => ({
    loc: `${SITE_URL}${item.path}`,
    lastmod: now,
    changefreq: item.changefreq,
    priority: item.priority,
  }));

  const [sites, businesses, listings] = await Promise.all([
    fetchPublicApi<SiteIndex[]>('/public/sites'),
    fetchPublicApi<MarketBusiness[]>('/marketplace/businesses'),
    fetchPublicApi<MarketListing[]>('/marketplace/listings'),
  ]);

  for (const site of sites ?? []) {
    entries.push({
      loc: `${SITE_URL}/site/${site.slug}`,
      lastmod: site.updatedAt ? new Date(site.updatedAt).toISOString() : now,
      changefreq: 'weekly',
      priority: '0.8',
    });
  }

  for (const business of businesses ?? []) {
    if (!business.slug) continue;
    entries.push({
      loc: `${SITE_URL}/marketplace/b/${business.slug}`,
      lastmod: now,
      changefreq: 'weekly',
      priority: '0.6',
    });
  }

  for (const listing of listings ?? []) {
    if (!listing.id) continue;
    const stamp = listing.updatedAt || listing.createdAt;
    entries.push({
      loc: `${SITE_URL}/marketplace/listings/${listing.id}`,
      lastmod: stamp ? new Date(stamp).toISOString() : now,
      changefreq: 'daily',
      priority: '0.5',
    });
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(entryXml).join('\n')}
</urlset>
`;
}

export const sitemapResponseHeaders = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  'X-Content-Type-Options': 'nosniff',
};
