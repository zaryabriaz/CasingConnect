'use client';

import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { LogoLockup } from '@/components/logo';
import '@/app/auth.css';

export function AuthShell({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  useEffect(() => {
    document.title = `CasingConnect | ${title}`;
  }, [title]);

  return (
    <div className="auth">
      <aside className="auth-visual">
        <div className="auth-visual-media" aria-hidden="true">
          <picture>
            <source srcSet="/home-hero.webp?v=7" type="image/webp" />
            <img src="/home-hero.jpg?v=7" alt="" width={1280} height={720} decoding="async" />
          </picture>
        </div>
        <div className="auth-visual-veil" aria-hidden="true" />
        <div className="auth-visual-copy">
          <Link href="/" className="auth-visual-logo-link" aria-label="CasingConnect home">
            <LogoLockup height={80} className="auth-visual-logo" />
          </Link>
          <div className="auth-visual-text" aria-hidden="true">
            <p className="auth-visual-tag">Built for the casing trade.</p>
            <p className="auth-visual-lead">
              Purchases, stock, sales, and ledgers — private to your company.
            </p>
          </div>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-panel-inner">
          <Link href="/" className="auth-home-logo" aria-label="CasingConnect home">
            <LogoLockup height={72} />
          </Link>
          <h1>{title}</h1>
          <p className="auth-lead">{lead}</p>
          {children}
          <div className="auth-footer">{footer}</div>
        </div>
      </main>
    </div>
  );
}
