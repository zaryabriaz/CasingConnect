'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/components/admin-session';
import { api, errorText } from '@/lib/api';

type Prospect = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  sourceUrl: string;
  sourceLabel: string | null;
  snippet: string | null;
  status: 'NEW' | 'REVIEWED' | 'DISMISSED' | 'IMPORTED';
  notes: string | null;
  createdAt: string;
};

type ScrapeResult = {
  found: number;
  saved: number;
  items: Prospect[];
};

function statusClass(status: Prospect['status']) {
  if (status === 'REVIEWED') return 'reviewed';
  if (status === 'DISMISSED') return 'dismissed';
  if (status === 'IMPORTED') return 'imported';
  return '';
}

export default function AdminProspectsPage() {
  useAdminSession();
  const [items, setItems] = useState<Prospect[]>([]);
  const [status, setStatus] = useState('');
  const [url, setUrl] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(nextStatus = status) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus) params.set('status', nextStatus);
      const data = await api<Prospect[]>(`/admin/prospects?${params}`);
      setItems(data);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const newCount = useMemo(
    () => items.filter((item) => item.status === 'NEW').length,
    [items],
  );

  async function onScrape(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<ScrapeResult>('/admin/prospects/scrape', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      setNote(`Scraped page: found ${result.found}, saved ${result.saved}.`);
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onDiscover(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<ScrapeResult>('/admin/prospects/discover', {
        method: 'POST',
        body: JSON.stringify(query.trim() ? { query: query.trim() } : {}),
      });
      setNote(`Industry search: found ${result.found}, saved ${result.saved}.`);
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function onSeedTradeCountries() {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<{
        saved: number;
        byCountry: Record<string, number>;
        note?: string;
      }>('/admin/prospects/seed-trade-countries', { method: 'POST' });
      const countrySummary = Object.entries(result.byCountry)
        .map(([country, count]) => `${country}: ${count}`)
        .join(' · ');
      setNote(`Loaded ${result.saved} natural casing companies. ${countrySummary}`);
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function setProspectStatus(id: string, next: Prospect['status']) {
    setError(null);
    try {
      await api(`/admin/prospects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function removeProspect(id: string) {
    if (!confirm('Delete this prospect?')) return;
    setError(null);
    try {
      await api(`/admin/prospects/${id}`, { method: 'DELETE' });
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Company finder</h1>
          <p className="admin-lead">
            Load and review natural-casing companies from public sources. Invite or publish only after
            you have a real contact.
          </p>
        </div>
        <div className="admin-stat">
          <strong>{items.length}</strong>
          <span>{status ? status.toLowerCase() : 'listed'}</span>
        </div>
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}
      {note ? <p className="admin-flash ok">{note}</p> : null}

      <div className="admin-tools">
        <section className="admin-tool">
          <div>
            <h2>Load directory</h2>
            <p>
              Verified firms from public industry sources. Replaces the previous seed — no placeholder
              names.
            </p>
          </div>
          <button
            className="admin-btn primary"
            type="button"
            disabled={busy}
            onClick={() => void onSeedTradeCountries()}
          >
            {busy ? 'Loading…' : 'Load companies'}
          </button>
        </section>

        <section className="admin-tool">
          <div>
            <h2>Scrape a page</h2>
            <p>Pull company names from a public members or directory page.</p>
          </div>
          <form className="admin-tool-form" onSubmit={onScrape}>
            <label className="admin-field">
              <span>Page URL</span>
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://example.com/members"
                required
              />
            </label>
            <button className="admin-btn primary" type="submit" disabled={busy}>
              {busy ? 'Working…' : 'Scrape URL'}
            </button>
          </form>
        </section>

        <section className="admin-tool">
          <div>
            <h2>Industry search</h2>
            <p>Run a public search for casing companies. Leave blank for defaults.</p>
          </div>
          <form className="admin-tool-form" onSubmit={onDiscover}>
            <label className="admin-field">
              <span>Query</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Optional search terms"
              />
            </label>
            <button className="admin-btn primary" type="submit" disabled={busy}>
              {busy ? 'Searching…' : 'Find companies'}
            </button>
          </form>
        </section>
      </div>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <h2>
            Prospects
            {newCount > 0 && !status ? ` · ${newCount} new` : ''}
          </h2>
          <div className="admin-toolbar-right">
            <label className="admin-field">
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  void load(event.target.value);
                }}
              >
                <option value="">All</option>
                <option value="NEW">New</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="DISMISSED">Dismissed</option>
                <option value="IMPORTED">Imported</option>
              </select>
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="admin-empty">No prospects yet. Load the directory or scrape a public page.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td data-label="Company">
                    <strong>{row.name}</strong>
                    <div className="muted">
                      {[row.city, row.country].filter(Boolean).join(', ') || '—'}
                    </div>
                    {row.snippet ? <div className="tiny">{row.snippet}</div> : null}
                  </td>
                  <td data-label="Contact">
                    <div className="admin-contact">
                      {row.website ? (
                        <a href={row.website} target="_blank" rel="noreferrer">
                          Website
                        </a>
                      ) : null}
                      {row.email ? (
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                      ) : null}
                      {row.phone ? <span>{row.phone}</span> : null}
                      {!row.website && !row.email && !row.phone ? (
                        <span>No contact yet</span>
                      ) : null}
                    </div>
                  </td>
                  <td data-label="Source">
                    <div className="muted">{row.sourceLabel || '—'}</div>
                    <a href={row.sourceUrl} target="_blank" rel="noreferrer">
                      Open source
                    </a>
                  </td>
                  <td data-label="Status">
                    <span className={`admin-badge ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-actions">
                      {row.status !== 'REVIEWED' ? (
                        <button
                          type="button"
                          className="admin-btn"
                          onClick={() => void setProspectStatus(row.id, 'REVIEWED')}
                        >
                          Review
                        </button>
                      ) : null}
                      {row.status !== 'DISMISSED' ? (
                        <button
                          type="button"
                          className="admin-btn warn"
                          onClick={() => void setProspectStatus(row.id, 'DISMISSED')}
                        >
                          Dismiss
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-btn ghost"
                        onClick={() => void removeProspect(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
