import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { WorkspaceProviders } from './providers';

export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: '/app' },
};

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceProviders>{children}</WorkspaceProviders>;
}
