import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Product tour',
  description:
    'See how CasingConnect runs buying, store, factory, production, sales, expenses, and ledgers for a natural casing business.',
  path: '/product-tour',
  keywords: ['casing software demo', 'casing ERP tour', 'CasingConnect walkthrough'],
});

export default function ProductTourLayout({ children }: { children: ReactNode }) {
  return children;
}
