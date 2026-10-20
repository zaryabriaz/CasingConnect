'use client';

import Link from 'next/link';
import { CSSProperties, useEffect, useMemo, useState } from 'react';
import { Banner } from '@/components/ui';
import { api, errorText, mediaUrl } from '@/lib/api';
import './site.css';

export type PublicSite = {
  name: string;
  slug: string;
  activities: string[];
  country: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  tagline: string | null;
  headline: string | null;
  about: string | null;
  products: string | null;
  markets: string | null;
  primaryColor: string;
  accentColor: string;
  coverUrl: string | null;
  logoUrl: string | null;
  gallery: string[];
  listings: Array<{
    qualityText: string;
    quantity: string;
    unitLabel: string;
    currency: string;
    pricePerUnit: string | null;
    destinationHint: string | null;
  }>;
};

function splitLines(text: string | null | undefined): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\n|·|\|/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

function excerpt(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trim()}…`;
}

export function PublicSiteView({
  slug,
  initialSite = null,
  initialError = null,
}: {
  slug: string;
  initialSite?: PublicSite | null;
  initialError?: string | null;
}) {
  const [site, setSite] = useState<PublicSite | null>(
    initialSite ? { ...initialSite, gallery: initialSite.gallery ?? [] } : null,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || initialSite) return;
    let cancelled = false;
    api<PublicSite>(`/public/sites/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        setSite({ ...data, gallery: data.gallery ?? [] });
      })
      .catch((caught) => {
        if (!cancelled) setError(errorText(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [slug, initialSite]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const theme = useMemo(() => {
    if (!site) return undefined;
    const primary = site.primaryColor || '#0b342b';
    const accent = site.accentColor || '#b8923f';
    const rgb = hexToRgb(primary);
    return {
      ['--ps-primary' as string]: primary,
      ['--ps-accent' as string]: accent,
      ['--ps-primary-rgb' as string]: rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : '11, 52, 43',
    } as CSSProperties;
  }, [site]);

  const productLines = splitLines(site?.products);
  const marketLines = splitLines(site?.markets);
  const location = [site?.city, site?.country].filter(Boolean).join(', ');
  const coverSrc = mediaUrl(site?.coverUrl) ?? '/site/default-cover.jpg';
  const logoSrc = mediaUrl(site?.logoUrl);
  const gallery = (site?.gallery ?? [])
    .map((url) => mediaUrl(url))
    .filter((url): url is string => Boolean(url));

  const aboutText =
    site?.about ||
    `${site?.name ?? 'This company'} supplies natural casings for sausage and meat processors. Quality control, clear packing, and export documentation come first.`;
  const productsBlurb =
    productLines.length > 0
      ? productLines.slice(0, 3).join(' · ')
      : 'Sheep, hog, and beef casings — calibrated, salted, and packed for export.';
  const marketsBlurb =
    marketLines.length > 0
      ? marketLines.slice(0, 4).join(' · ')
      : 'International buyers welcome — share destination port and packing needs.';

  return (
    <div className="psite" style={theme}>
      {error ? (
        <div className="psite-wrap">
          <Banner kind="bad">{error}</Banner>
          <p className="muted">This company website may be unpublished or unavailable.</p>
          <Link href="/marketplace">Browse Marketplace</Link>
        </div>
      ) : null}

      {!site && !error ? <p className="psite-loading">Loading website…</p> : null}

      {site ? (
        <>
          <header className="psite-header">
            <div className="psite-header-inner">
              <a href="#top" className="psite-brand">
                {logoSrc ? (
                  <img className="psite-logo-img" src={logoSrc} alt="" />
                ) : null}
                <span className="psite-brand-text">
                  <strong>{site.name}</strong>
                  <span>{site.tagline || 'Processors & exporters of natural casings'}</span>
                </span>
              </a>
              <nav className="psite-menu" aria-label="Site">
                <a href="#top">Home</a>
                <a href="#about">About Us</a>
                <a href="#products">Products</a>
                <a href="#markets">Markets</a>
                {gallery.length > 0 ? <a href="#gallery">Gallery</a> : null}
                {site.listings.length > 0 ? <a href="#offers">Offers</a> : null}
                <a href="#contact">Contact</a>
              </nav>
              <a className="psite-header-cta" href="#contact">
                Enquire
              </a>
            </div>
          </header>

          <section className="psite-hero" id="top">
            <div className="psite-hero-media" aria-hidden>
              <img src={coverSrc} alt="" />
              <div className="psite-hero-shade" />
            </div>
            <div className="psite-hero-inner">
              <p className="psite-kicker">Welcome</p>
              <h1>{site.name}</h1>
              <p className="psite-lead">
                {site.headline ||
                  'Export-ready natural casings with consistent quality and reliable packing.'}
              </p>
              <div className="psite-cta">
                <a className="psite-btn primary" href="#about">
                  About Us
                </a>
                <a className="psite-btn" href="#contact">
                  Contact
                </a>
              </div>
            </div>
          </section>

          <section className="psite-cards" aria-label="Company highlights">
            <article>
              <h2>About Us</h2>
              <p>{excerpt(aboutText)}</p>
              <a href="#about">Read more</a>
            </article>
            <article>
              <h2>Our Products</h2>
              <p>{excerpt(productsBlurb)}</p>
              <a href="#products">Read more</a>
            </article>
            <article>
              <h2>Markets</h2>
              <p>{excerpt(marketsBlurb)}</p>
              <a href="#markets">Read more</a>
            </article>
          </section>

          <section className="psite-band" id="about">
            <div className="psite-band-grid">
              <div>
                <p className="psite-section-kicker">About Us</p>
                <h2>Who we are</h2>
              </div>
              <p className="psite-prose">{aboutText}</p>
            </div>
          </section>

          <section className="psite-section" id="products">
            <p className="psite-section-kicker">Products</p>
            <h2>Our products</h2>
            {productLines.length > 0 ? (
              <ul className="psite-list">
                {productLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="psite-prose">
                Sheep, hog, and beef casings — calibrated, salted, and packed for export. Ask for
                current calibres and salt grades.
              </p>
            )}
          </section>

          <section className="psite-section psite-section-alt" id="markets">
            <p className="psite-section-kicker">Exports</p>
            <h2>Markets we serve</h2>
            {marketLines.length > 0 ? (
              <div className="psite-chips">
                {marketLines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            ) : (
              <p className="psite-prose">
                International buyers welcome. Share your destination port and preferred packing —
                we respond with availability and lead times.
              </p>
            )}
          </section>

          {gallery.length > 0 ? (
            <section className="psite-section" id="gallery">
              <p className="psite-section-kicker">Gallery</p>
              <h2>Our facility</h2>
              <div className="psite-gallery">
                {gallery.map((src) => (
                  <button
                    key={src}
                    type="button"
                    className="psite-gallery-item"
                    onClick={() => setLightbox(src)}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {site.listings.length > 0 ? (
            <section className="psite-section" id="offers">
              <p className="psite-section-kicker">Trade</p>
              <h2>Current offers</h2>
              <div className="psite-offers">
                {site.listings.map((listing, index) => (
                  <article key={`${listing.qualityText}-${index}`}>
                    <strong>{listing.qualityText}</strong>
                    <p>
                      {listing.quantity} {listing.unitLabel}
                      {listing.pricePerUnit
                        ? ` · ${listing.currency} ${listing.pricePerUnit}`
                        : ` · ${listing.currency}`}
                    </p>
                    {listing.destinationHint ? <em>{listing.destinationHint}</em> : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="psite-contact" id="contact">
            <div className="psite-contact-grid">
              <div>
                <p className="psite-section-kicker">Contact</p>
                <h2>Get in touch</h2>
                <p className="psite-prose light">
                  Tell us the quality, volume, and destination. We reply with what we can offer.
                </p>
                <div className="psite-cta">
                  {site.email ? (
                    <a className="psite-btn primary invert" href={`mailto:${site.email}`}>
                      Send enquiry
                    </a>
                  ) : null}
                  <Link className="psite-btn ghost" href={`/marketplace/b/${site.slug}`}>
                    Marketplace profile
                  </Link>
                </div>
              </div>
              <div className="psite-contact-panel">
                {location ? (
                  <div>
                    <span>Address</span>
                    <strong>{location}</strong>
                  </div>
                ) : null}
                {site.phone ? (
                  <div>
                    <span>Phone</span>
                    <a href={`tel:${site.phone.replace(/\s+/g, '')}`}>{site.phone}</a>
                  </div>
                ) : null}
                {site.email ? (
                  <div>
                    <span>Email</span>
                    <a href={`mailto:${site.email}`}>{site.email}</a>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <footer className="psite-foot">
            <div>
              <strong>{site.name}</strong>
              <span>{location || site.country}</span>
            </div>
            <span className="psite-powered">
              Site on Casing<span>Connect</span>
            </span>
          </footer>

          {lightbox ? (
            <div
              className="psite-lightbox"
              role="dialog"
              aria-modal="true"
              onClick={() => setLightbox(null)}
            >
              <button
                type="button"
                className="psite-lightbox-close"
                onClick={() => setLightbox(null)}
              >
                Close
              </button>
              <img src={lightbox} alt="" onClick={(event) => event.stopPropagation()} />
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
