import { buildSitemapXml, sitemapResponseHeaders } from '@/lib/build-sitemap';

export const revalidate = 3600;

/** Fresh sitemap URL for Search Console (avoids cached "Couldn't fetch" on /sitemap.xml). */
export async function GET() {
  const xml = await buildSitemapXml();
  return new Response(xml, { headers: sitemapResponseHeaders });
}
