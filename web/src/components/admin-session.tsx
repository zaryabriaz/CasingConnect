'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearToken, currentSession, readToken } from '@/lib/api';
import { SessionProfile } from '@/lib/types';

type AdminSessionValue = SessionProfile & {
  reload: () => Promise<void>;
  signOut: () => void;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const next = await currentSession();
    if (!next.isSuperAdmin) {
      router.replace(next.business ? '/app' : '/login');
      return;
    }
    if (next.impersonating) {
      router.replace('/app');
      return;
    }
    setSession(next);
  }

  useEffect(() => {
    if (!readToken()) {
      router.replace('/login');
      return;
    }
    reload().catch(() => setError('Sign in again as super admin.'));
  }, [router]);

  if (error) {
    return (
      <div className="auth-wrap">
        <p className="banner">{error}</p>
      </div>
    );
  }
  if (!session) {
    return (
      <div className="auth-wrap">
        <p className="muted">Opening admin…</p>
      </div>
    );
  }

  return (
    <AdminSessionContext.Provider
      value={{
        ...session,
        reload,
        signOut: () => {
          clearToken();
          router.replace('/login');
        },
      }}
    >
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession() {
  const session = useContext(AdminSessionContext);
  if (!session) throw new Error('Admin session is only available inside /admin.');
  return session;
}
