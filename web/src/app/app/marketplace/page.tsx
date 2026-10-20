'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useSession } from '@/components/session';
import { Banner, Field } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { canManage, isBuyerOnly } from '@/lib/labels';
import { MarketplaceListing, SellerMarketplaceProfile } from '@/lib/types';

export default function AppMarketplacePage() {
  const session = useSession();
  const manage = canManage(session.role) || session.role === 'SALES';
  const [profile, setProfile] = useState<SellerMarketplaceProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await api<SellerMarketplaceProfile>('/marketplace/profile');
      setProfile(data);
      setEnabled(data.marketplaceEnabled);
      setHeadline(data.marketplaceHeadline ?? '');
      setBio(data.marketplaceBio ?? '');
      setLanguages(data.marketplaceLanguages.join(', '));
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    if (isBuyerOnly(session.business.activities)) return;
    void load();
  }, [session.business.id, session.business.activities]);

  if (isBuyerOnly(session.business.activities)) {
    return (
      <div className="stack">
        <h1>Marketplace</h1>
        <p className="muted">
          Buyer accounts browse the public directory.{' '}
          <Link href="/marketplace">Open Marketplace</Link>
        </p>
      </div>
    );
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api('/marketplace/profile', {
        method: 'PUT',
        body: JSON.stringify({
          marketplaceEnabled: enabled,
          marketplaceHeadline: headline,
          marketplaceBio: bio,
          marketplaceLanguages: languages
            .split(/[,/]/)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      // Publishing the business is required for listings to appear on the public Marketplace.
      if (!enabled) {
        await api('/marketplace/profile', {
          method: 'PUT',
          body: JSON.stringify({
            marketplaceEnabled: true,
            marketplaceHeadline: headline,
            marketplaceBio: bio,
            marketplaceLanguages: languages
              .split(/[,/]/)
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        });
        setEnabled(true);
      }
      await api('/marketplace/listings', {
        method: 'POST',
        body: JSON.stringify({
          qualityText: form.get('qualityText'),
          quantity: String(form.get('quantity') ?? ''),
          unitLabel: form.get('unitLabel'),
          currency: String(form.get('currency') ?? profile?.currency ?? 'USD').toUpperCase(),
          pricePerUnit: String(form.get('pricePerUnit') ?? '') || undefined,
          destinationHint: String(form.get('destinationHint') ?? '') || undefined,
        }),
      });
      formEl.reset();
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function setListingActive(listing: MarketplaceListing, active: boolean) {
    setError(null);
    try {
      await api(`/marketplace/listings/${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function removeListing(listing: MarketplaceListing) {
    if (!confirm(`Delete listing ${listing.qualityText}?`)) return;
    setError(null);
    try {
      await api(`/marketplace/listings/${listing.id}`, { method: 'DELETE' });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Marketplace</p>
        <h1>Public profile & listings</h1>
        <p className="muted">
          Opt in to appear in the global directory. Listings are informational — quantity is not locked to stock.
          {profile?.slug ? (
            <>
              {' '}
              Public page:{' '}
              <Link href={`/marketplace/b/${profile.slug}`} target="_blank">
                /marketplace/b/{profile.slug}
              </Link>
            </>
          ) : null}
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      {profile && !enabled ? (
        <Banner kind="bad">
          Your business is not published yet — listings stay private. Tick{' '}
          <strong>Publish this business on the Marketplace</strong> below, then click{' '}
          <strong>Save profile</strong>. After that, check the public{' '}
          <Link href="/marketplace">Marketplace</Link> (Companies + Trade offers).
        </Banner>
      ) : null}
      {profile && enabled ? (
        <Banner kind="note">
          You are live on the directory.{' '}
          <Link href={`/marketplace/b/${profile.slug}`} target="_blank">
            View public page
          </Link>
          {' · '}
          <Link href="/marketplace" target="_blank">
            Open Marketplace
          </Link>
          {' '}
          and switch to <strong>Trade offers</strong> to see your listings.
        </Banner>
      ) : null}

      <form className="card pad form" onSubmit={saveProfile}>
        <h2>Profile</h2>
        <label className="checks">
          <input type="checkbox" checked={enabled} disabled={!manage} onChange={(e) => setEnabled(e.target.checked)} />
          Publish this business on the Marketplace (required to appear in the public directory)
        </label>
        <Field label="Headline">
          <input value={headline} disabled={!manage} onChange={(e) => setHeadline(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Bio">
          <textarea value={bio} disabled={!manage} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={4000} />
        </Field>
        <Field label="Languages (comma-separated)">
          <input value={languages} disabled={!manage} onChange={(e) => setLanguages(e.target.value)} placeholder="en, ur" />
        </Field>
        {manage ? (
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        ) : null}
      </form>

      {manage ? (
        <form className="card pad form" onSubmit={createListing}>
          <h2>New listing</h2>
          <div className="row-2">
            <Field label="Quality">
              <input name="qualityText" required placeholder="18/20" />
            </Field>
            <Field label="Unit">
              <input name="unitLabel" required defaultValue="hanks" />
            </Field>
            <Field label="Quantity">
              <input name="quantity" required inputMode="decimal" placeholder="500" />
            </Field>
            <Field label="Currency">
              <input name="currency" defaultValue={profile?.currency ?? 'USD'} maxLength={3} required />
            </Field>
            <Field label="Price / unit (optional)">
              <input name="pricePerUnit" inputMode="decimal" />
            </Field>
            <Field label="Destination hint">
              <input name="destinationHint" placeholder="EU / Middle East" />
            </Field>
          </div>
          <button className="btn primary" type="submit">
            Add listing
          </button>
        </form>
      ) : null}

      <div className="card pad stack">
        <h2>Your listings</h2>
        {!profile ? <p className="muted">Loading…</p> : null}
        {profile && profile.listings.length === 0 ? <p className="muted">No listings yet.</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quality</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {profile?.listings.map((listing) => (
                <tr key={listing.id}>
                  <td>
                    {listing.qualityText}
                    {listing.destinationHint ? <div className="tiny">{listing.destinationHint}</div> : null}
                  </td>
                  <td>
                    {listing.quantity} {listing.unitLabel}
                  </td>
                  <td>
                    {listing.currency}
                    {listing.pricePerUnit ? ` ${listing.pricePerUnit}` : ''}
                  </td>
                  <td>{listing.active ? 'Active' : 'Inactive'}</td>
                  <td>
                    {manage ? (
                      <div className="split">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() => void setListingActive(listing, !listing.active)}
                        >
                          {listing.active ? 'Unpublish' : 'Publish'}
                        </button>
                        <button className="btn ghost" type="button" onClick={() => void removeListing(listing)}>
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
