import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fetchPublicApi, pageMetadata, trimDescription } from '@/lib/seo';

type Props = { params: Promise<{ id: string }>; children: ReactNode };

type Listing = {
  id: string;
  qualityText: string;
  quantity: string;
  unitLabel: string;
  currency: string;
  destinationHint: string | null;
  business?: { name: string; slug: string } | null;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchPublicApi<Listing>(`/marketplace/listings/${id}`);
  if (!listing) {
    return pageMetadata({
      title: 'Trade listing',
      description: 'Natural casing trade listing on CasingConnect Marketplace.',
      path: `/marketplace/listings/${id}`,
      noIndex: true,
    });
  }

  const seller = listing.business?.name;
  return pageMetadata({
    title: listing.qualityText,
    description: trimDescription(
      `${listing.qualityText} — ${listing.quantity} ${listing.unitLabel}` +
        (seller ? ` from ${seller}` : '') +
        (listing.destinationHint ? `. ${listing.destinationHint}` : '') +
        ' · CasingConnect Marketplace',
    ),
    path: `/marketplace/listings/${listing.id}`,
    keywords: [listing.qualityText, 'natural casings', 'casing listing', seller].filter(
      Boolean,
    ) as string[],
  });
}

export default function MarketplaceListingLayout({ children }: Props) {
  return children;
}
