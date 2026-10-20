import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { JsonLd } from '@/components/json-ld';
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '@/lib/seo';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const display = localFont({
  src: [
    { path: '../fonts/fraunces-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/fraunces-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/fraunces-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
});

const sans = localFont({
  src: [
    { path: '../fonts/plus-jakarta-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/plus-jakarta-600.woff2', weight: '600', style: 'normal' },
    { path: '../fonts/plus-jakarta-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

const defaultDescription =
  'Natural casing business software for buying, stock, production, sales, expenses, and party ledgers — plus a public company website and marketplace for sheep casing processors and traders.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Natural casing business software`,
    template: `${SITE_NAME} | %s`,
  },
  description: defaultDescription,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'business software',
  keywords: [
    'natural casings',
    'natural casing',
    'natural casing software',
    'sheep casings',
    'hog casings',
    'beef casings',
    'sheep casing business',
    'casing ERP',
    'casing stock management',
    'casing marketplace',
    'Sialkot casings',
    'casing exporters software',
    'CasingConnect',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Natural casing business software`,
    description: defaultDescription,
    images: [
      {
        url: absoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: 'CasingConnect — software for natural casing companies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Natural casing business software`,
    description: defaultDescription,
    images: [absoluteUrl(DEFAULT_OG_IMAGE)],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  icons: {
    icon: [{ url: '/favicon.png', type: 'image/png' }],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/casingconnect-logo.png'),
  email: 'info@casingconnect.com',
  description: defaultDescription,
  sameAs: [] as string[],
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description: defaultDescription,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Contact for tailored setup and company onboarding',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <JsonLd data={[organizationJsonLd, softwareJsonLd]} />
        {children}
      </body>
    </html>
  );
}
