'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { MarketplaceShell } from '@/components/marketplace-shell';
import { Banner } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { COUNTRIES, flagOf } from '@/lib/countries';
import { ACTIVITIES, labelOf } from '@/lib/labels';
import { MarketplaceProfile } from '@/lib/types';

function countryLabel(name: string) {
  const needle = name.trim().toLowerCase();
  const match = COUNTRIES.find((item) => item.name.toLowerCase() === needle);
  return match ? `${flagOf(match.code)} ${match.name}` : name;
}

export default function MarketplaceBusinessPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [profile, setProfile] = useState<MarketplaceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api<MarketplaceProfile>(`/marketplace/businesses/${encodeURIComponent(slug)}`)
      .then(setProfile)
      .catch((caught) => setError(errorText(caught)));
  }, [slug]);

  return (
    <MarketplaceShell>
      <div className="market-wrap">
        <Link href="/marketplace" className="market-back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 6L9 12l6 6" />
          </svg>
          Directory
        </Link>
        {error ? <Banner kind="bad">{error}</Banner> : null}
        {!profile && !error ? <p className="market-empty">Loading company…</p> : null}
        {profile ? (
          <>
            <div className="market-profile-head">
              <p className="market-eyebrow">
                {profile.source === 'DIRECTORY' ? 'Industry directory' : 'Member company'}
              </p>
              <h1>{profile.name}</h1>
              <p className="meta" style={{ margin: 0, color: 'var(--muted)' }}>
                {[profile.city, countryLabel(profile.country)].filter(Boolean).join(' · ')}
              </p>
              <div className="market-tags">
                {profile.activities
                  .filter((code) => code !== 'BUYER')
                  .map((code) => (
                    <span key={code}>{labelOf(ACTIVITIES, code)}</span>
                  ))}
                {profile.marketplaceLanguages.map((lang) => (
                  <span key={lang}>{lang}</span>
                ))}
              </div>
              {profile.marketplaceHeadline ? (
                <p className="market-bio" style={{ marginTop: '0.75rem' }}>
                  {profile.marketplaceHeadline}
                </p>
              ) : null}
              {profile.marketplaceBio && profile.marketplaceBio !== profile.marketplaceHeadline ? (
                <p className="market-bio">{profile.marketplaceBio}</p>
              ) : null}
              {profile.website || profile.email || profile.phone ? (
                <ul className="market-contact">
                  {profile.website ? (
                    <li>
                      <span>Website</span>
                      <a href={profile.website} target="_blank" rel="noreferrer">
                        {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </li>
                  ) : null}
                  {profile.email ? (
                    <li>
                      <span>Email</span>
                      <a href={`mailto:${profile.email}`}>{profile.email}</a>
                    </li>
                  ) : null}
                  {profile.phone ? (
                    <li>
                      <span>Phone</span>
                      <a href={`tel:${profile.phone.replace(/\s+/g, '')}`}>{profile.phone}</a>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>

            <div className="market-section-head">
              <h2>Trade opportunities</h2>
              <p>{profile.listings.length} open</p>
            </div>
            {profile.listings.length === 0 ? (
              <p className="market-empty">
                {profile.source === 'DIRECTORY'
                  ? 'Listed from public industry sources. Offers appear after they join and publish.'
                  : 'No open offers from this company yet.'}
              </p>
            ) : (
              <div className="market-grid">
                {profile.listings.map((listing) => (
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
      </div>
    </MarketplaceShell>
  );
}
