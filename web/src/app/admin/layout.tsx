import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AdminProviders } from './providers';

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: '/admin' },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminProviders>{children}</AdminProviders>;
}
