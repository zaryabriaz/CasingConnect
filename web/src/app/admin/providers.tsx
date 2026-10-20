'use client';

import type { ReactNode } from 'react';
import { AdminSessionProvider } from '@/components/admin-session';
import { AdminShell } from '@/components/admin-shell';

export function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <AdminSessionProvider>
      <AdminShell>{children}</AdminShell>
    </AdminSessionProvider>
  );
}
