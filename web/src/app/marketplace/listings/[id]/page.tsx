'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { MarketplaceShell } from '@/components/marketplace-shell';
import { Banner } from '@/components/ui';
import { api, errorText, readToken } from '@/lib/api';
import { MarketplaceListing } from '@/lib/types';

export default function MarketplaceListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setSignedIn(Boolean(readToken()));
  }, []);

  useEffect(() => {
    if (!id) return;
    api<MarketplaceListing>(`/marketplace/listings/${id}`)
      .then(setListing)
      .catch((caught) => setError(errorText(caught)));
  }, [id]);

  async function onInquire(event: FormEvent) {
    event.preventDefault();
    if (!listing) return;
    if (!readToken()) {
      router.push(`/login?next=/marketplace/listings/${listing.id}`);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api('/marketplace/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          listingId: listing.id,
          message,
        }),
      });
      setSent(true);
      setMessage('');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

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
      {!listing && !error ? <p className="market-empty">Loading…</p> : null}
      {listing ? (
        <div className="market-detail">
          <div className="market-panel">
            <p className="market-eyebrow">Listing</p>
            <h2>{listing.qualityText}</h2>
            <dl>
              <dt>Quantity</dt>
              <dd>
                {listing.quantity} {listing.unitLabel}
              </dd>
              <dt>Currency</dt>
              <dd>{listing.currency}</dd>
              {listing.pricePerUnit ? (
                <>
                  <dt>Price / unit</dt>
                  <dd>
                    {listing.currency} {listing.pricePerUnit}
                  </dd>
                </>
              ) : null}
              {listing.destinationHint ? (
                <>
                  <dt>Destination</dt>
                  <dd>{listing.destinationHint}</dd>
                </>
              ) : null}
              <dt>Seller</dt>
              <dd>
                <Link href={`/marketplace/b/${listing.businessSlug}`}>{listing.businessName}</Link>
                {' · '}
                {[listing.city, listing.country].filter(Boolean).join(', ')}
              </dd>
            </dl>
          </div>

          <div className="market-panel market-inquire">
            <h2>Inquire</h2>
            {sent ? (
              <Banner kind="note">Inquiry sent. Track replies under Inquiries in your account.</Banner>
            ) : (
              <form onSubmit={onInquire}>
                <textarea
                  required
                  minLength={10}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Introduce your company and what you need…"
                />
                {!signedIn ? (
                  <p className="hint">
                    <Link href={`/login?next=/marketplace/listings/${listing.id}`}>Sign in</Link> or{' '}
                    <Link href="/register">register as a buyer</Link> to send an inquiry.
                  </p>
                ) : null}
                <button type="submit" disabled={pending}>
                  {pending ? 'Sending…' : signedIn ? 'Send inquiry' : 'Sign in to inquire'}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
      </div>
    </MarketplaceShell>
  );
}
