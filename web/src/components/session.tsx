'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearToken,
  currentSession,
  exitImpersonation,
  readToken,
  saveToken,
  switchBusiness,
} from '@/lib/api';
import { Business, Role, SessionProfile } from '@/lib/types';

type AppSession = SessionProfile & {
  business: Business;
  role: Role;
};

type SessionValue = AppSession & {
  reload: () => Promise<void>;
  signOut: () => void;
  changeBusiness: (businessId: string) => Promise<void>;
  returnToAdmin: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    const next = await currentSession();
    if (next.isSuperAdmin && !next.impersonating) {
      router.replace('/admin');
      return;
    }
    if (!next.business || !next.role) {
      setError('Sign in again to open this business.');
      return;
    }
    setSession({ ...next, business: next.business, role: next.role });
  }

  useEffect(() => {
    if (!readToken()) {
      router.replace('/login');
      return;
    }
    reload().catch(() => setError('Sign in again to open this business.'));
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
        <p className="muted">Opening your business…</p>
      </div>
    );
  }

  const value: SessionValue = {
    ...session,
    reload,
    signOut: () => {
      clearToken();
      router.replace('/login');
    },
    changeBusiness: async (businessId: string) => {
      const next = await switchBusiness(businessId);
      saveToken(next.accessToken);
      await reload();
      router.refresh();
    },
    returnToAdmin: async () => {
      const next = await exitImpersonation();
      saveToken(next.accessToken);
      router.replace('/admin');
    },
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Session is only available inside the workspace.');
  return session;
}
