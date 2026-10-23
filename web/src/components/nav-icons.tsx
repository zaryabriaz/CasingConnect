import type { ReactNode } from 'react';

type IconProps = { className?: string };

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconDashboard({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Svg>
  );
}

export function IconBuying({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6 5 3H2" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
    </Svg>
  );
}

export function IconSales({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </Svg>
  );
}

export function IconStore({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 9 5 4h14l2 5" />
      <path d="M3 9v11h18V9" />
      <path d="M9 20v-6h6v6" />
    </Svg>
  );
}

export function IconInventory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7 12 12l8.7-5M12 22V12" />
    </Svg>
  );
}

export function IconOperations({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 17h6M14 17h6M7 14v6M17 14v6" />
      <path d="M4 7h6M14 7h6M7 4v6M17 4v6" />
    </Svg>
  );
}

export function IconFactory({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 21V10l6 4V10l6 4V8l6 3v10H3z" />
      <path d="M7 21v-3M12 21v-3M17 21v-3" />
    </Svg>
  );
}

export function IconProduction({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Svg>
  );
}

export function IconExpenses({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 15h4" />
    </Svg>
  );
}

export function IconPartners({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 19c0-3 2.5-5 6-5s6 2 6 5" />
      <path d="M14.5 19c.3-1.8 1.7-3 3.5-3 1.5 0 2.7.8 3.2 2" />
    </Svg>
  );
}

export function IconCatalogue({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
      <path d="M7 9h1M16 9h1M7 13h1M16 13h1" />
    </Svg>
  );
}

export function IconPlaces({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  );
}

export function IconUsers({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </Svg>
  );
}

export function IconProfile({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5c1.4-2 3.3-3 5.5-3s4.1 1 5.5 3" />
    </Svg>
  );
}

export function IconPdf({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </Svg>
  );
}

export function IconLedger({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 0-2 2V4z" />
      <path d="M18 20a2 2 0 0 0 2-2V6" />
      <path d="M8 9h6M8 13h6M8 17h4" />
    </Svg>
  );
}

export function IconFinance({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3v18" />
      <path d="M16.5 7.5c-.8-1.2-2-2-4.5-2-2.8 0-4.5 1.4-4.5 3.4 0 4.6 9 2.2 9 6.8 0 2-1.8 3.8-4.5 3.8-2.3 0-3.8-.9-4.7-2.3" />
    </Svg>
  );
}

export function IconMarketplace({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </Svg>
  );
}

export function IconInquiries({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 5h16v11H8l-4 3V5z" />
      <path d="M8 10h8M8 13h5" />
    </Svg>
  );
}

export function IconWebsite({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 14h3M13 14h3" />
    </Svg>
  );
}

export function IconSupport({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 6h16v10H8l-4 3V6z" />
      <path d="M8 10h8M8 13h5" />
    </Svg>
  );
}
