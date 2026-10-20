import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';
import {
  absoluteUrl,
  fetchPublicApi,
  mediaUrlFromApi,
  pageMetadata,
  trimDescription,
} from '@/lib/seo';
import { PublicSite, PublicSiteView } from './public-site-view';

type Props = { params: Promise<{ slug: string }> };

async function loadSite(slug: string) {
  return fetchPublicApi<PublicSite>(`/public/sites/${encodeURIComponent(slug)}`);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await loadSite(slug);
  if (!site) {
    return pageMetadata({
      title: 'Company website',
      description: 'This company website is unavailable or unpublished.',
      path: `/site/${slug}`,
      noIndex: true,
    });
  }

  const place = [site.city, site.country].filter(Boolean).join(', ');
  const description = trimDescription(
    site.headline ||
      site.tagline ||
      site.about ||
      `${site.name} — natural casing company${place ? ` in ${place}` : ''}.`,
  );
  const image = site.coverUrl || site.logoUrl || undefined;

  return pageMetadata({
    title: site.name,
    description,
    path: `/site/${site.slug}`,
    image: image ? mediaUrlFromApi(image) : undefined,
    keywords: [
      site.name,
      'natural casings',
      'sheep casings',
      place,
      'casing exporter',
    ].filter(Boolean) as string[],
  });
}

export default async function PublicCompanySitePage({ params }: Props) {
  const { slug } = await params;
  const site = await loadSite(slug);
  const place = site ? [site.city, site.country].filter(Boolean).join(', ') : '';

  const localBusiness = site
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.name,
        url: absoluteUrl(`/site/${site.slug}`),
        description: trimDescription(site.headline || site.tagline || site.about, 300),
        email: site.email || undefined,
        telephone: site.phone || undefined,
        address: place
          ? {
              '@type': 'PostalAddress',
              addressLocality: site.city || undefined,
              addressCountry: site.country || undefined,
            }
          : undefined,
        image: site.coverUrl
          ? mediaUrlFromApi(site.coverUrl)
          : site.logoUrl
            ? mediaUrlFromApi(site.logoUrl)
            : undefined,
      }
    : null;

  return (
    <>
      {localBusiness ? <JsonLd data={localBusiness} /> : null}
      <PublicSiteView
        slug={slug}
        initialSite={site}
        initialError={site ? null : 'This company website is not available.'}
      />
    </>
  );
}
