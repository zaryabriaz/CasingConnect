import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/json-ld';
import { LogoLockup } from '@/components/logo';
import { pageMetadata } from '@/lib/seo';
import '../home.css';

export const metadata: Metadata = pageMetadata({
  title: 'Natural casings — sheep, hog & beef casing trade',
  description:
    'What natural casings are, how sheep hog and beef casings move through buying stock production and export, and how CasingConnect software helps natural casing companies run private books and reach buyers.',
  path: '/natural-casings',
  keywords: [
    'natural casings',
    'natural casing',
    'sheep casings',
    'hog casings',
    'beef casings',
    'casing exporters',
    'Sialkot casings',
    'natural casing software',
    'casing trade',
  ],
});

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Natural casings for the sausage and meat trade',
  description:
    'Guide to natural casings — sheep, hog, and beef — and software for casing companies.',
  author: { '@type': 'Organization', name: 'CasingConnect' },
  publisher: {
    '@type': 'Organization',
    name: 'CasingConnect',
    logo: { '@type': 'ImageObject', url: 'https://casingconnect.com/casingconnect-logo.png' },
  },
  mainEntityOfPage: 'https://casingconnect.com/natural-casings',
};

export default function NaturalCasingsPage() {
  return (
    <div className="home home-guide is-ready">
      <JsonLd data={articleJsonLd} />

      <header className="home-bar home-guide-bar">
        <Link href="/" className="home-mark" aria-label="CasingConnect home">
          <LogoLockup height={64} className="home-mark-logo" />
        </Link>
        <nav className="home-nav" aria-label="Primary">
          <Link className="home-nav-link" href="/#features">
            Features
          </Link>
          <Link className="home-nav-link" href="/marketplace">
            Marketplace
          </Link>
          <Link className="home-nav-link home-nav-signin" href="/login">
            Sign in
          </Link>
          <Link className="home-nav-cta" href="/register">
            Get started
          </Link>
        </nav>
      </header>

      <main className="home-guide-main">
        <p className="home-faq-eyebrow">Industry guide</p>
        <h1>Natural casings for the sausage and meat trade</h1>
        <p className="home-guide-lead">
          Natural casings — sheep, hog, and beef — are the traditional tubes used for sausages and
          specialty meats. CasingConnect is built for the companies that buy, process, stock, and
          sell them.
        </p>

        <section className="home-guide-section">
          <h2>What are natural casings?</h2>
          <p>
            Natural casings are cleaned animal intestines prepared for food use. Buyers specify
            calibre, salt grade, packing, and origin. Exporters and processors in hubs such as
            Sialkot, Pakistan and other casing centres supply sheep casings, hog casings, and beef
            casings to sausage makers worldwide.
          </p>
        </section>

        <section className="home-guide-section">
          <h2>How a natural casing business runs</h2>
          <ul className="home-guide-list">
            <li>
              <h3>Buying &amp; intake</h3>
              <p>Purchases from suppliers, batches received, and material logged into private books.</p>
            </li>
            <li>
              <h3>Store &amp; factory stock</h3>
              <p>Packages, transfers, and what is ready to process or ship.</p>
            </li>
            <li>
              <h3>Production</h3>
              <p>Raw material converted into finished qualities with day-level records.</p>
            </li>
            <li>
              <h3>Sales, expenses &amp; party ledger</h3>
              <p>Invoices, daily costs, and balances with suppliers and customers.</p>
            </li>
          </ul>
        </section>

        <section className="home-guide-section">
          <h2>Software for natural casing companies</h2>
          <p>
            Spreadsheets break down when you juggle calibres, salt, export packing, and many
            parties. <strong>CasingConnect</strong> is B2B natural casing business software: one
            private system per firm, optional public company website for buyers, and a marketplace
            to list trade offers.
          </p>
          <p>
            Whether you trade sheep casings from Pakistan or run a tailored setup abroad,
            CasingConnect keeps buying, stock, production, sales, and ledgers in one place.
          </p>
        </section>

        <div className="home-guide-cta-row">
          <Link href="/register" className="home-features-cta">
            Register your casing company
          </Link>
          <Link href="/product-tour" className="home-guide-secondary">
            See the product tour
          </Link>
          <Link href="/marketplace" className="home-guide-secondary">
            Browse the marketplace
          </Link>
        </div>
      </main>

      <footer className="home-foot">
        <Link href="/">
          Casing<span>Connect</span>
        </Link>
        <nav className="home-foot-links" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/register">Register</Link>
        </nav>
        <span>Natural casing business software — Pakistan and worldwide.</span>
      </footer>
    </div>
  );
}
