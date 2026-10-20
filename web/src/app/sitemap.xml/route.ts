import { buildSitemapXml, sitemapResponseHeaders } from '@/lib/build-sitemap';

export const revalidate = 3600;

export async function GET() {
  const xml = await buildSitemapXml();
  return new Response(xml, { headers: sitemapResponseHeaders });
}
