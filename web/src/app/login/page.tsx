'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Banner, Field } from '@/components/ui';
import { errorText, login, saveToken } from '@/lib/api';
import { isBuyerOnly } from '@/lib/labels';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const session = await login(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
      saveToken(session.accessToken);
      const next = searchParams.get('next');
      if (session.isSuperAdmin && !session.impersonating) {
        router.push('/admin');
      } else if (next?.startsWith('/')) {
        router.push(next);
      } else if (session.business && isBuyerOnly(session.business.activities)) {
        router.push('/marketplace');
      } else {
        router.push('/app');
      }
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      lead="Access your company’s private books — stock, sales, and ledgers in one place."
      footer={
        <>
          New business? <Link href="/register">Register here</Link>
        </>
      }
    >
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <form className="auth-form" onSubmit={onSubmit}>
        <Field label="Email">
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue="owner@casingconnect.demo"
          />
        </Field>
        <Field label="Password">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            defaultValue="demo1234"
          />
        </Field>
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Sign in" lead="Opening…" footer={null}>
          <p className="muted">Loading…</p>
        </AuthShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
