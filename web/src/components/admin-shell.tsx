'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { useAdminSession } from '@/components/admin-session';
import { LogoMark } from '@/components/logo';
import '@/app/admin.css';

const NAV = [
  {
    href: '/admin',
    label: 'Businesses',
    match: (path: string) => path === '/admin',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M9 20v-6h6v6" />
      </svg>
    ),
  },
  {
    href: '/admin/prospects',
    label: 'Company finder',
    match: (path: string) => path.startsWith('/admin/prospects'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="6.5" />
        <path d="M16 16l4.5 4.5" />
      </svg>
    ),
  },
  {
    href: '/admin/mailbox',
    label: 'Mailbox',
    match: (path: string) => path.startsWith('/admin/mailbox'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v12H4z" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    ),
  },
  {
    href: '/admin/support',
    label: 'Support chat',
    match: (path: string) => path.startsWith('/admin/support'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16v10H8l-4 3V6z" />
        <path d="M8 10h8M8 13h5" />
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Users',
    match: (path: string) => path.startsWith('/admin/users'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.8-3 2.8-4.5 5.5-4.5S13.7 16 14.5 19" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M15 19c.4-1.8 1.6-2.8 3.4-2.8.6 0 1.1.1 1.6.3" />
      </svg>
    ),
  },
  {
    href: '/admin/requests',
    label: 'Setup requests',
    match: (path: string) => path.startsWith('/admin/requests'),
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 6h14v12H5z" />
        <path d="M8 10h8M8 14h5" />
      </svg>
    ),
  },
] as const;

function pageMeta(pathname: string) {
  if (pathname.startsWith('/admin/users')) {
    return { title: 'Users', kicker: 'Access' };
  }
  if (pathname.startsWith('/admin/prospects')) {
    return { title: 'Company finder', kicker: 'Outreach' };
  }
  if (pathname.startsWith('/admin/mailbox')) {
    return { title: 'Mailbox', kicker: 'Compose' };
  }
  if (pathname.startsWith('/admin/support')) {
    return { title: 'Support chat', kicker: 'Inbox' };
  }
  if (pathname.startsWith('/admin/requests')) {
    return { title: 'Setup requests', kicker: 'Inbox' };
  }
  return { title: 'Businesses', kicker: 'Platform' };
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useAdminSession();
  const { title, kicker } = pageMeta(pathname);
  const initial = (session.user.name || session.user.email || 'A').slice(0, 1).toUpperCase();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.title = `CasingConnect | Admin · ${title}`;
  }, [title]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <div className={`admin${menuOpen ? ' is-menu-open' : ''}`}>
      <header className="admin-mobile-bar">
        <Link href="/admin" className="admin-mobile-brand" aria-label="Admin home">
          <LogoMark size={28} />
          <span>Admin</span>
        </Link>
        <div className="admin-mobile-bar-actions">
          <button type="button" className="admin-mobile-logout" onClick={session.signOut}>
            Log out
          </button>
          <button
            type="button"
            className="admin-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="admin-side-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="admin-menu-toggle-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </header>

      <button
        type="button"
        className="admin-backdrop"
        aria-label="Close menu"
        tabIndex={menuOpen ? 0 : -1}
        onClick={() => setMenuOpen(false)}
      />

      <aside className="admin-side" id="admin-side-nav">
        <Link href="/admin" className="admin-brand">
          <span className="admin-brand-mark">
            <LogoMark size={34} />
          </span>
          <span className="admin-brand-copy">
            <strong>Admin</strong>
            <span>CasingConnect</span>
          </span>
        </Link>

        <nav className="admin-nav" aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={item.match(pathname) ? 'active' : undefined}
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-side-foot">
          <a href="https://casingconnect.com" target="_blank" rel="noreferrer">
            Open public site
          </a>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <p className="admin-kicker">{kicker}</p>
            <div className="admin-topbar-title">{title}</div>
          </div>
          <div className="admin-topbar-actions">
            <div className="admin-user-chip" title={session.user.email}>
              <span className="admin-user-avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="admin-topbar-user">{session.user.email}</span>
            </div>
            <button type="button" className="admin-logout" onClick={session.signOut}>
              Log out
            </button>
          </div>
        </header>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
