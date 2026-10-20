import Link from 'next/link';
import type { ReactNode } from 'react';
import { LogoLockup } from '@/components/logo';
import '@/app/marketplace.css';

export function MarketplaceShell({
  children,
  immersive = false,
}: {
  children: ReactNode;
  immersive?: boolean;
}) {
  return (
    <div className={immersive ? 'market market-immersive' : 'market market-simple'}>
      <header className="market-bar">
        <Link href="/" aria-label="CasingConnect home" className={immersive ? 'market-logo' : undefined}>
          <LogoLockup height={48} />
        </Link>
        <div className="market-bar-meta">Natural casings trade</div>
        <nav>
          <Link href="/marketplace">Directory</Link>
          <Link href="/login">Member login</Link>
          <Link className="market-cta" href="/register">
            Join
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}

export function companyInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
}
