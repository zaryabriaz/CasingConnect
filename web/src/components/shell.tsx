'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { LogoLockup, LogoMark } from '@/components/logo';
import {
  IconBuying,
  IconCatalogue,
  IconDashboard,
  IconExpenses,
  IconFactory,
  IconFinance,
  IconInquiries,
  IconInventory,
  IconLedger,
  IconMarketplace,
  IconOperations,
  IconPartners,
  IconPlaces,
  IconProduction,
  IconProfile,
  IconSales,
  IconStore,
  IconUsers,
  IconWebsite,
} from '@/components/nav-icons';
import { isBuyerOnly, labelOf, ROLES } from '@/lib/labels';
import { useSession } from './session';
import '@/app/admin.css';

type NavItem = { href: string; label: string; Icon: ComponentType<{ className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

const opsNavGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ href: '/app', label: 'Dashboard', Icon: IconDashboard }],
  },
  {
    title: 'Marketplace',
    items: [
      { href: '/app/marketplace', label: 'Marketplace', Icon: IconMarketplace },
      { href: '/app/inquiries', label: 'Inquiries', Icon: IconInquiries },
      { href: '/app/site', label: 'Public site', Icon: IconWebsite },
    ],
  },
  {
    title: 'Trade',
    items: [
      { href: '/app/buying', label: 'Buying', Icon: IconBuying },
      { href: '/app/sales', label: 'Sales', Icon: IconSales },
      { href: '/app/ledger', label: 'Ledger', Icon: IconLedger },
      { href: '/app/finance', label: 'Finance', Icon: IconFinance },
      { href: '/app/expenses', label: 'Expenses', Icon: IconExpenses },
    ],
  },
  {
    title: 'Stock',
    items: [
      { href: '/app/store', label: 'Store', Icon: IconStore },
      { href: '/app/inventory', label: 'Inventory', Icon: IconInventory },
      { href: '/app/operations', label: 'Operations', Icon: IconOperations },
      { href: '/app/factory', label: 'Factory', Icon: IconFactory },
      { href: '/app/production', label: 'Production', Icon: IconProduction },
    ],
  },
  {
    title: 'Setup',
    items: [
      { href: '/app/partners', label: 'Partners', Icon: IconPartners },
      { href: '/app/users', label: 'Users', Icon: IconUsers },
      { href: '/app/catalogue', label: 'Catalogue', Icon: IconCatalogue },
      { href: '/app/places', label: 'Places', Icon: IconPlaces },
    ],
  },
];

const buyerNavGroups: NavGroup[] = [
  {
    title: 'Marketplace',
    items: [
      { href: '/marketplace', label: 'Browse', Icon: IconMarketplace },
      { href: '/app/inquiries', label: 'Inquiries', Icon: IconInquiries },
      { href: '/app/profile', label: 'Profile', Icon: IconProfile },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}

function HamburgerIcon({ active }: { active?: boolean }) {
  return (
    <span className={`burger${active ? ' is-active' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 120ms ease' }}
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function isActive(pathname: string, href: string) {
  return href === '/app' ? pathname === '/app' : pathname === href || pathname.startsWith(`${href}/`);
}

function pageTitleFor(pathname: string, groups: NavGroup[]) {
  if (pathname.startsWith('/app/profile')) return 'Profile';
  const match = groups
    .flatMap((group) => group.items)
    .filter((item) => isActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.label ?? 'App';
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const session = useSession();
  const buyerOnly = isBuyerOnly(session.business.activities);
  const navGroups = buyerOnly ? buyerNavGroups : opsNavGroups;
  const pageTitle = pageTitleFor(pathname, navGroups);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `CasingConnect | ${pageTitle}`;
  }, [pageTitle]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const sync = () => {
      setIsMobile(media.matches);
      if (media.matches) setMobileOpen(false);
    };
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!(isMobile && mobileOpen)) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMobile, mobileOpen]);

  const shellClass = [
    'shell',
    !isMobile && collapsed ? 'nav-collapsed' : '',
    isMobile && mobileOpen ? 'nav-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  function toggleNav() {
    if (isMobile) setMobileOpen((open) => !open);
    else setCollapsed((value) => !value);
  }

  return (
    <div className={shellClass}>
      <button
        type="button"
        className="rail-backdrop"
        aria-label="Close menu"
        tabIndex={isMobile && mobileOpen ? 0 : -1}
        onClick={() => setMobileOpen(false)}
      />

      <aside className="rail" id="app-rail">
        <div className="rail-top">
          <Link
            href="/app"
            className="brand"
            title="CasingConnect"
            onClick={() => {
              if (isMobile) setMobileOpen(false);
            }}
          >
            <LogoMark size={36} className="brand-mark" />
            <LogoLockup height={52} className="brand-lockup" />
          </Link>
          {isMobile ? (
            <button type="button" className="rail-close" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <span className="rail-close-x" aria-hidden="true">
                ×
              </span>
            </button>
          ) : null}
        </div>

        <nav className="rail-nav">
          {navGroups.map((group) => (
            <div className="rail-group" key={group.title}>
              <div className="rail-group-title">{group.title}</div>
              {group.items.map(({ href, label, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={isActive(pathname, href) ? 'active' : undefined}
                  title={label}
                  onClick={() => {
                    if (isMobile) setMobileOpen(false);
                  }}
                >
                  <Icon className="rail-icon" />
                  <span className="rail-label">{label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        {session.impersonating ? (
          <div className="impersonation-banner">
            <span>
              Support view: <strong>{session.business.name}</strong> as super admin
            </span>
            <button type="button" onClick={() => void session.returnToAdmin()}>
              Back to admin
            </button>
          </div>
        ) : null}
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-btn"
              aria-label={
                isMobile
                  ? mobileOpen
                    ? 'Close menu'
                    : 'Open menu'
                  : collapsed
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
              }
              aria-expanded={isMobile ? mobileOpen : !collapsed}
              aria-controls="app-rail"
              onClick={toggleNav}
            >
              <HamburgerIcon active={isMobile ? mobileOpen : !collapsed} />
            </button>
            <div className="topbar-brand">
              <strong>
                CasingConnect <span className="topbar-sep">|</span> {pageTitle}
              </strong>
              <span className="tiny">
                {session.business.name} · {labelOf(ROLES, session.role)}
              </span>
            </div>
            {session.memberships.length > 1 ? (
              <label className="topbar-biz">
                <span className="sr-only">Business</span>
                <select
                  value={session.business.id}
                  onChange={(event) => void session.changeBusiness(event.target.value)}
                >
                  {session.memberships.map((membership) => (
                    <option key={membership.businessId} value={membership.businessId}>
                      {membership.businessName}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="profile-menu" ref={menuRef}>
            <button
              type="button"
              className="profile-trigger"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="avatar-circle" aria-hidden="true">
                {initials(session.user.name)}
              </span>
              <span className="profile-meta">
                <strong>{session.user.name}</strong>
              </span>
              <ChevronIcon open={menuOpen} />
            </button>
            {menuOpen ? (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-head">
                  <span className="avatar-circle sm" aria-hidden="true">
                    {initials(session.user.name)}
                  </span>
                  <div>
                    <strong>{session.user.name}</strong>
                    <div className="tiny">{session.user.email}</div>
                  </div>
                </div>
                <Link href="/app/profile" role="menuitem" onClick={() => setMenuOpen(false)}>
                  Profile
                </Link>
                {session.impersonating ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void session.returnToAdmin();
                    }}
                  >
                    Back to admin
                  </button>
                ) : null}
                <button type="button" role="menuitem" className="danger" onClick={session.signOut}>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}
