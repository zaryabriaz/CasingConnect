import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Tailored setup',
  description:
    'Request a tailored CasingConnect setup for your casing company abroad — currency, workflow, and local practice.',
  path: '/tailored-setup',
  keywords: ['custom casing software', 'casing ERP setup', 'international casing business software'],
});

export default function TailoredSetupLayout({ children }: { children: ReactNode }) {
  return children;
}
