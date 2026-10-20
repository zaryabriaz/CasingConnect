import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Marketplace',
  description:
    'Browse natural casing companies and trade listings — sheep, hog, and beef casings from processors and exporters worldwide.',
  path: '/marketplace',
  keywords: [
    'casing marketplace',
    'sheep casings for sale',
    'natural casing suppliers',
    'casing exporters directory',
  ],
});

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return children;
}
