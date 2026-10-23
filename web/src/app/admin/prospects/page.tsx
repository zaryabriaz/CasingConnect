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
  lastCampaignAt: string | null;
  lastCampaignTemplate: string | null;
  campaignSendCount: number;
  createdAt: string;
};

type CampaignTemplate = {
  id:
    | 'WELCOME'
    | 'PUBLIC_SITE'
    | 'CHAT'
    | 'INTERNATIONAL'
    | 'PAKISTAN'
    | 'MARKETPLACE'
    | 'TAILORED'
    | 'COMBINED';
  label: string;
  description: string;
  subject: string;
  smtpConfigured: boolean;
};

type ScrapeResult = {
  found: number;
  saved: number;
  items: Prospect[];
};

type SendResult = {
  template: string;
  requested: number;
  sent: number;
  failed: number;
  results: Array<{
    prospectId: string;
    name: string;
    email: string | null;
    ok: boolean;
    reason?: string;
  }>;
};

function statusClass(status: Prospect['status']) {
  if (status === 'REVIEWED') return 'reviewed';
  if (status === 'DISMISSED') return 'dismissed';
  if (status === 'IMPORTED') return 'imported';
  return '';
}

function hasEmail(row: Prospect) {
  return Boolean(row.email?.includes('@'));
}

function parseEmailList(value: string) {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of value.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (!email.includes('@') || !email.includes('.') || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
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
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [template, setTemplate] = useState<CampaignTemplate['id']>('INTERNATIONAL');
  const [skipAlreadySent, setSkipAlreadySent] = useState(true);
  const [customEmailsText, setCustomEmailsText] = useState('');
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewText, setPreviewText] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [previewCompany, setPreviewCompany] = useState('Sample Company');
  const [demoUrl, setDemoUrl] = useState('https://casingconnect.com/site/');

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

  async function loadTemplates() {
    try {
      const data = await api<CampaignTemplate[]>('/admin/campaigns/templates');
      setTemplates(data);
    } catch {
      /* ignore — page still works without templates until API is up */
    }
  }

  async function loadPreview(
    nextTemplate = template,
    companyName = previewCompany,
    nextDemoUrl = demoUrl,
  ) {
    const name = companyName.trim() || 'Sample Company';
    try {
      const params = new URLSearchParams({
        template: nextTemplate,
        companyName: name,
      });
      if (nextDemoUrl.trim()) params.set('demoUrl', nextDemoUrl.trim());
      const data = await api<{ subject: string; text: string; html: string }>(
        `/admin/campaigns/preview?${params}`,
      );
      setPreviewSubject(data.subject);
      setPreviewText(data.text);
      setPreviewHtml(data.html);
    } catch {
      setPreviewSubject('');
      setPreviewText('');
      setPreviewHtml('');
    }
  }

  useEffect(() => {
    void load();
    void loadTemplates();
  }, []);

  useEffect(() => {
    void loadPreview(template, previewCompany, demoUrl);
  }, [template, previewCompany, demoUrl]);

  const newCount = useMemo(
    () => items.filter((item) => item.status === 'NEW').length,
    [items],
  );

  const withEmail = useMemo(() => items.filter(hasEmail), [items]);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, on]) => on).map(([id]) => id),
    [selected],
  );
  const selectedWithEmail = useMemo(
    () => selectedIds.filter((id) => items.some((row) => row.id === id && hasEmail(row))),
    [selectedIds, items],
  );
  const customEmails = useMemo(() => parseEmailList(customEmailsText), [customEmailsText]);
  const recipientCount = selectedWithEmail.length + customEmails.length;

  const smtpConfigured = templates[0]?.smtpConfigured ?? false;
  const activeTemplate = templates.find((item) => item.id === template);
  const previewToEmail =
    customEmails[0] ??
    selectedWithEmail
      .map((id) => items.find((row) => row.id === id))
      .find((row) => row?.email)?.email ??
    'prospect@example.com';

  function applySelectedCompanyToPreview() {
    const first = selectedWithEmail
      .map((id) => items.find((row) => row.id === id))
      .find(Boolean);
    if (first?.name) setPreviewCompany(first.name);
  }

  function toggleOne(id: string, on: boolean) {
    setSelected((prev) => ({ ...prev, [id]: on }));
  }

  function selectAllWithEmail() {
    const next: Record<string, boolean> = {};
    for (const row of withEmail.slice(0, 25)) next[row.id] = true;
    setSelected(next);
  }

  function clearSelection() {
    setSelected({});
  }

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

  async function sendCampaign() {
    if (recipientCount === 0) {
      setError('Select a prospect with email, or paste at least one custom email.');
      return;
    }
    if (recipientCount > 25) {
      setError('Send at most 25 emails per batch (selected + custom).');
      return;
    }
    const parts = [
      selectedWithEmail.length ? `${selectedWithEmail.length} prospect(s)` : null,
      customEmails.length ? `${customEmails.length} custom email(s)` : null,
    ].filter(Boolean);
    if (template === 'PUBLIC_SITE' && !demoUrl.trim()) {
      setError('Paste a public company-site demo URL for this template.');
      return;
    }
    if (!confirm(`Send “${template}” campaign to ${parts.join(' + ')}?`)) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<SendResult>('/admin/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({
          prospectIds: selectedWithEmail,
          customEmails,
          companyName: previewCompany.trim() || undefined,
          demoUrl: demoUrl.trim() || undefined,
          template,
          skipAlreadySent,
        }),
      });
      const fails = result.results.filter((row) => !row.ok);
      setNote(
        `Campaign sent: ${result.sent} ok, ${result.failed} skipped/failed` +
          (fails.length
            ? ` (${fails
                .slice(0, 5)
                .map((row) => `${row.name}: ${row.reason ?? 'failed'}`)
                .join('; ')})`
            : ''),
      );
      clearSelection();
      setCustomEmailsText('');
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Company finder</h1>
          <p className="admin-lead">
            Load natural-casing companies, then email marketplace or tailored-setup invitations from
            here.
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

      <section className="admin-tool admin-campaign">
        <div>
          <h2>Email campaign</h2>
          <p>
            Select companies below and/or paste any custom emails, choose a template, preview, then
            send. Max 25 recipients per batch.
            {!smtpConfigured ? (
              <>
                {' '}
                <strong>SMTP is not configured</strong> — add SMTP_* to server `.env.production`
                first.
              </>
            ) : null}
          </p>
        </div>

        <div className="admin-campaign-layout">
          <div className="admin-campaign-controls">
            <label className="admin-field">
              <span>Template</span>
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value as CampaignTemplate['id'])}
              >
                {(templates.length
                  ? templates
                  : [
                      {
                        id: 'WELCOME' as const,
                        label: 'Welcome / thank you (signup)',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'PUBLIC_SITE' as const,
                        label: 'Public company site demo',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'CHAT' as const,
                        label: 'Support chat + global chat (coming soon)',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'INTERNATIONAL' as const,
                        label: 'International clients',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'PAKISTAN' as const,
                        label: 'Pakistan exporters / manufacturers',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'COMBINED' as const,
                        label: 'Marketplace + system (short)',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'MARKETPLACE' as const,
                        label: 'Marketplace invite only',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                      {
                        id: 'TAILORED' as const,
                        label: 'Tailored system only',
                        description: '',
                        subject: '',
                        smtpConfigured: false,
                      },
                    ]
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            {activeTemplate?.description ? (
              <p className="admin-campaign-desc">{activeTemplate.description}</p>
            ) : null}
            <label className="admin-field">
              <span>Custom emails (optional)</span>
              <textarea
                value={customEmailsText}
                onChange={(event) => setCustomEmailsText(event.target.value)}
                placeholder={'one@company.com\ntwo@exporter.com'}
                rows={3}
              />
              <span className="admin-campaign-desc">
                Paste any addresses (comma or new line). {customEmails.length} parsed
                {customEmails.length ? ` · ${customEmails.slice(0, 3).join(', ')}${customEmails.length > 3 ? '…' : ''}` : ''}.
              </span>
            </label>
            <label className="admin-field">
              <span>Company name in greeting</span>
              <div className="admin-campaign-company-row">
                <input
                  value={previewCompany}
                  onChange={(event) => setPreviewCompany(event.target.value)}
                  placeholder="Used for preview + custom emails"
                />
                <button
                  type="button"
                  className="admin-btn ghost"
                  disabled={selectedWithEmail.length === 0}
                  onClick={applySelectedCompanyToPreview}
                >
                  Use selected
                </button>
              </div>
            </label>
            {template === 'PUBLIC_SITE' ? (
              <label className="admin-field">
                <span>Demo site URL</span>
                <input
                  value={demoUrl}
                  onChange={(event) => setDemoUrl(event.target.value)}
                  placeholder="https://casingconnect.com/site/your-company"
                />
                <span className="admin-campaign-desc">
                  Paste the public company site customers can open freely for demo (required).
                </span>
              </label>
            ) : null}
            <label className="admin-check">
              <input
                type="checkbox"
                checked={skipAlreadySent}
                onChange={(event) => setSkipAlreadySent(event.target.checked)}
              />
              <span>Skip already sent this template (prospects only)</span>
            </label>
            <div className="admin-campaign-actions">
              <button
                type="button"
                className="admin-btn"
                disabled={busy || withEmail.length === 0}
                onClick={selectAllWithEmail}
              >
                Select with email (max 25)
              </button>
              <button
                type="button"
                className="admin-btn ghost"
                disabled={busy}
                onClick={() => {
                  clearSelection();
                  setCustomEmailsText('');
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="admin-btn primary"
                disabled={busy || !smtpConfigured || recipientCount === 0 || recipientCount > 25}
                onClick={() => void sendCampaign()}
              >
                {busy ? 'Sending…' : `Send to ${recipientCount}`}
              </button>
            </div>
          </div>

          <div className="admin-mail-preview" aria-label="Email preview">
            <div className="admin-mail-preview-head">
              <strong>Inbox preview</strong>
              <div className="admin-mail-preview-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === 'html'}
                  className={previewMode === 'html' ? 'is-active' : undefined}
                  onClick={() => setPreviewMode('html')}
                >
                  HTML
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={previewMode === 'text'}
                  className={previewMode === 'text' ? 'is-active' : undefined}
                  onClick={() => setPreviewMode('text')}
                >
                  Plain text
                </button>
              </div>
            </div>
            <dl className="admin-mail-meta">
              <div>
                <dt>From</dt>
                <dd>CasingConnect &lt;info@casingconnect.com&gt;</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>{previewToEmail}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{previewSubject || '—'}</dd>
              </div>
            </dl>
            <div className="admin-mail-preview-body">
              {previewMode === 'html' && previewHtml ? (
                <iframe
                  title="Campaign email HTML preview"
                  className="admin-mail-frame"
                  sandbox=""
                  srcDoc={previewHtml}
                />
              ) : previewText ? (
                <pre className="admin-mail-text">{previewText}</pre>
              ) : (
                <p className="admin-empty">Preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="admin-panel">
        <div className="admin-toolbar">
          <h2>
            Prospects
            {newCount > 0 && !status ? ` · ${newCount} new` : ''}
            {withEmail.length ? ` · ${withEmail.length} with email` : ''}
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
                <th className="admin-check-col">
                  <span className="sr-only">Select</span>
                </th>
                <th>Company</th>
                <th>Contact</th>
                <th>Campaign</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td data-label="Select" className="admin-check-col">
                    <input
                      type="checkbox"
                      disabled={!hasEmail(row)}
                      checked={Boolean(selected[row.id])}
                      onChange={(event) => toggleOne(row.id, event.target.checked)}
                      aria-label={`Select ${row.name}`}
                    />
                  </td>
                  <td data-label="Company">
                    <strong>{row.name}</strong>
                    <div className="muted">
                      {[row.city, row.country].filter(Boolean).join(', ') || '—'}
                      {row.sourceLabel === 'Self-submitted' ? ' · Self-submitted' : null}
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
                  <td data-label="Campaign">
                    {row.campaignSendCount > 0 ? (
                      <div className="muted">
                        <div>
                          {row.campaignSendCount} send{row.campaignSendCount === 1 ? '' : 's'}
                        </div>
                        <div className="tiny">
                          {row.lastCampaignTemplate || '—'}
                          {row.lastCampaignAt
                            ? ` · ${new Date(row.lastCampaignAt).toLocaleDateString()}`
                            : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="muted">Not sent</span>
                    )}
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
