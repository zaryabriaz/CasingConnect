import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fetchPublicApi, pageMetadata, trimDescription } from '@/lib/seo';

type Props = { params: Promise<{ slug: string }>; children: ReactNode };

type MarketProfile = {
  name: string;
  slug: string;
  country: string;
  city: string | null;
  marketplaceHeadline?: string | null;
  source?: string;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchPublicApi<MarketProfile>(
    `/marketplace/businesses/${encodeURIComponent(slug)}`,
  );
  if (!profile) {
    return pageMetadata({
      title: 'Company profile',
      description: 'Marketplace company profile on CasingConnect.',
      path: `/marketplace/b/${slug}`,
      noIndex: true,
    });
  }

  const place = [profile.city, profile.country].filter(Boolean).join(', ');
  return pageMetadata({
    title: profile.name,
    description: trimDescription(
      profile.marketplaceHeadline ||
        `${profile.name} — natural casing company${place ? ` in ${place}` : ''} on the CasingConnect marketplace.`,
    ),
    path: `/marketplace/b/${profile.slug}`,
    keywords: [profile.name, 'natural casings', place, 'casing marketplace'].filter(Boolean) as string[],
  });
}

export default function MarketplaceBusinessLayout({ children }: Props) {
  return children;
}
