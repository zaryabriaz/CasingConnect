'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell';
import { SessionProvider } from '@/components/session';
import { ToastProvider } from '@/components/toast';

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </SessionProvider>
  );
}
