'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { companyInitials, MarketplaceShell } from '@/components/marketplace-shell';
import { Banner } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { COUNTRIES, flagOf } from '@/lib/countries';
import { MarketplaceBusiness, MarketplaceListing } from '@/lib/types';

type Tab = 'directory' | 'listings';

function countryLabel(name: string) {
  const needle = name.trim().toLowerCase();
  const match = COUNTRIES.find((item) => item.name.toLowerCase() === needle);
  return match ? match.name : name;
}

function markTone(name: string) {
  const tones = ['#0b342b', '#145544', '#1a4738', '#234a2f', '#16382f'];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i) * (i + 1)) % 997;
  return tones[hash % tones.length];
}

export default function MarketplacePage() {
  const [tab, setTab] = useState<Tab>('directory');
  const [businesses, setBusinesses] = useState<MarketplaceBusiness[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [country, setCountry] = useState('');
  const [quality, setQuality] = useState('');
  const [currency, setCurrency] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  /** Countries that actually have directory companies (not the full world list). */
  const [directoryCountries, setDirectoryCountries] = useState<string[]>([]);
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({});

  const countryOptions = useMemo(() => {
    return directoryCountries
      .map((name) => {
        const match = COUNTRIES.find((item) => item.name.toLowerCase() === name.toLowerCase());
        return { code: match?.code ?? name.slice(0, 2).toUpperCase(), name };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [directoryCountries]);

  const countryCount = directoryCountries.length;

  const topCountries = useMemo(() => {
    return [...directoryCountries]
      .sort(
        (a, b) =>
          (countryCounts[b] ?? 0) - (countryCounts[a] ?? 0) || a.localeCompare(b),
      )
      .slice(0, 12);
  }, [directoryCountries, countryCounts]);

  function refreshCountryCatalog(rows: MarketplaceBusiness[]) {
    const counts = new Map<string, number>();
    for (const item of rows) {
      const key = item.country?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const names = [...counts.keys()].sort((a, b) => a.localeCompare(b));
    setDirectoryCountries(names);
    setCountryCounts(Object.fromEntries(counts));
  }

  const grouped = useMemo(() => {
    const map = new Map<string, MarketplaceBusiness[]>();
    for (const item of businesses) {
      const key = item.country?.trim() || 'Unknown';
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [businesses]);

  async function load(nextTab = tab) {
    setLoading(true);
    setError(null);
    try {
      if (nextTab === 'directory') {
        const params = new URLSearchParams();
        if (country) params.set('country', country);
        if (q.trim()) params.set('q', q.trim());
        const data = await api<MarketplaceBusiness[]>(`/marketplace/businesses?${params}`);
        setBusinesses(data);
        // Keep full country catalog even when a country filter is active.
        if (!country && !q.trim()) {
          refreshCountryCatalog(data);
        }
      } else {
        const params = new URLSearchParams();
        if (country) params.set('country', country);
        if (quality.trim()) params.set('quality', quality.trim());
        if (currency.trim()) params.set('currency', currency.trim().toUpperCase());
        if (q.trim()) params.set('q', q.trim());
        const data = await api<MarketplaceListing[]>(`/marketplace/listings?${params}`);
        setListings(data);
      }
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        const all = await api<MarketplaceBusiness[]>('/marketplace/businesses');
        refreshCountryCatalog(all);
      } catch {
        /* ignore — load() will surface errors */
      }
      void load('directory');
    }
    void bootstrap();
  }, []);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    void load(tab);
  }

  function scrollToDirectory() {
    document.getElementById('market-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function pickCountry(next: string) {
    setCountry(next);
    setTab('directory');
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (next) params.set('country', next);
      if (q.trim()) params.set('q', q.trim());
      const data = await api<MarketplaceBusiness[]>(`/marketplace/businesses?${params}`);
      setBusinesses(data);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <MarketplaceShell immersive>
      <div className="market-top">
        <section className="market-stage" aria-label="Marketplace">
          <div className="market-stage-media" aria-hidden="true">
            <picture>
              <source srcSet="/home-hero.webp?v=7" type="image/webp" />
              <img src="/home-hero.jpg?v=7" alt="" width={1280} height={720} decoding="async" />
            </picture>
          </div>
          <div className="market-stage-veil" aria-hidden="true" />
          <div className="market-stage-glow" aria-hidden="true" />
          <div className="market-stage-copy">
            <p className="market-product">Marketplace</p>
            <h1 className="market-brand">
              Casing<em>Connect</em>
            </h1>
            <p className="market-lead">
              The global directory for natural casing producers, exporters and dealers.
            </p>
            <div className="market-stage-cta">
              <button type="button" className="is-primary" onClick={scrollToDirectory}>
                Browse companies
              </button>
              <Link className="is-ghost" href="/marketplace/list-company">
                List your company
              </Link>
            </div>
          </div>
          <svg className="market-stage-wave" viewBox="0 0 1440 96" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,48 C240,96 480,0 720,32 C960,64 1200,96 1440,40 L1440,96 L0,96 Z" />
          </svg>
        </section>

        <div className="market-wrap market-wrap-overlap" id="market-directory">
          <div className="market-panel-block">
            <div className="market-tabs">
              <button
                type="button"
                className={tab === 'directory' ? 'is-active' : undefined}
                onClick={() => {
                  setTab('directory');
                  void load('directory');
                }}
              >
                Companies
              </button>
              <button
                type="button"
                className={tab === 'listings' ? 'is-active' : undefined}
                onClick={() => {
                  setTab('listings');
                  void load('listings');
                }}
              >
                Trade offers
              </button>
            </div>

            <form className="market-filters" onSubmit={onSearch}>
              <label>
                Country
                <select value={country} onChange={(event) => setCountry(event.target.value)}>
                  <option value="">All countries</option>
                  {countryOptions.map((item) => (
                    <option key={item.name} value={item.name}>
                      {flagOf(item.code)} {item.name}
                      {countryCounts[item.name] ? ` (${countryCounts[item.name]})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              {tab === 'listings' ? (
                <>
                  <label>
                    Quality / calibre
                    <input
                      value={quality}
                      onChange={(event) => setQuality(event.target.value)}
                      placeholder="e.g. 18/20"
                    />
                  </label>
                  <label>
                    Currency
                    <input
                      value={currency}
                      onChange={(event) => setCurrency(event.target.value)}
                      placeholder="USD"
                      maxLength={3}
                    />
                  </label>
                </>
              ) : null}
              <label>
                Search
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Company name"
                />
              </label>
              <button type="submit">Search</button>
            </form>

            {tab === 'directory' && topCountries.length > 0 ? (
              <div className="market-rail" aria-label="Popular countries">
                <button
                  type="button"
                  className={!country ? 'is-active' : undefined}
                  onClick={() => void pickCountry('')}
                >
                  All
                </button>
                {topCountries.map((name) => (
                  <button
                    key={name}
                    type="button"
                    className={country === name ? 'is-active' : undefined}
                    onClick={() => void pickCountry(name)}
                  >
                    {countryLabel(name)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="market-wrap">

        {error ? <Banner kind="bad">{error}</Banner> : null}

        {!loading && tab === 'directory' ? (
          <>
            <div className="market-section-head">
              <h2>Company directory</h2>
              <p>
                {businesses.length} companies
                {!country ? ` · ${countryCount} countries` : ` · ${country}`}
                {' · '}
                <Link href="/marketplace/list-company">Can&apos;t find your firm? List it</Link>
              </p>
            </div>
            {businesses.length === 0 ? (
              <p className="market-empty">
                No companies match these filters.{' '}
                <Link href="/marketplace/list-company">List your company on the Marketplace</Link>
              </p>
            ) : (
              grouped.map(([groupCountry, rows]) => (
                <section key={groupCountry} className="market-group">
                  <div className="market-group-head">
                    <h3>{countryLabel(groupCountry)}</h3>
                    <span>
                      {rows.length} compan{rows.length === 1 ? 'y' : 'ies'}
                    </span>
                  </div>
                  <div className="market-list">
                    {rows.map((business) => (
                      <Link
                        key={`${business.source ?? 'MEMBER'}-${business.id}`}
                        href={`/marketplace/b/${business.slug}`}
                        className="market-row"
                      >
                        <span
                          className="market-mark"
                          style={{ background: markTone(business.name) }}
                          aria-hidden="true"
                        >
                          {companyInitials(business.name)}
                        </span>
                        <div className="market-row-main">
                          <h2>{business.name}</h2>
                          <p>
                            {business.marketplaceHeadline ||
                              (business.source === 'DIRECTORY'
                                ? 'Natural casing company from public industry sources.'
                                : 'Marketplace member.')}
                          </p>
                        </div>
                        <div className="market-row-place">
                          {business.city || countryLabel(business.country)}
                          {business.city ? <span>{countryLabel(business.country)}</span> : null}
                        </div>
                        <span className="market-row-go">
                          View
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))
            )}
          </>
        ) : null}

        {!loading && tab === 'listings' ? (
          <>
            <div className="market-section-head">
              <h2>Trade offers</h2>
              <p>{listings.length} active</p>
            </div>
            {listings.length === 0 ? (
              <p className="market-empty">No active trade offers match these filters yet.</p>
            ) : (
              <div className="market-grid">
                {listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/marketplace/listings/${listing.id}`}
                    className="market-card"
                  >
                    <div className="market-card-body">
                      <h3>{listing.qualityText}</h3>
                      <p className="meta">
                        {listing.quantity} {listing.unitLabel}
                        {listing.pricePerUnit
                          ? ` · ${listing.currency} ${listing.pricePerUnit}`
                          : ` · ${listing.currency}`}
                      </p>
                      <p className="country">{listing.businessName}</p>
                      <p className="meta">{countryLabel(listing.country)}</p>
                      {listing.destinationHint ? (
                        <p className="headline">{listing.destinationHint}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : null}

        {loading ? <p className="market-empty">Loading…</p> : null}
      </div>
    </MarketplaceShell>
  );
}
