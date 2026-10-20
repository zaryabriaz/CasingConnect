import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Register',
  description:
    'Create a CasingConnect account for your natural casing company — private books and optional public website.',
  path: '/register',
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
