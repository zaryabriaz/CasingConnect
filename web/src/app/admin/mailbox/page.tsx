'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/components/admin-session';
import { api, errorText } from '@/lib/api';

type OutboundEmail = {
  id: string;
  toEmails: string[];
  subject: string;
  bodyText: string;
  sentCount: number;
  failedCount: number;
  createdBy: { id: string; name: string; email: string } | null;
  createdAt: string;
};

type PreviewResult = {
  subject: string;
  text: string;
  html: string;
  smtpConfigured: boolean;
};

type SendResult = OutboundEmail & {
  requested: number;
  sent: number;
  failed: number;
  results: Array<{ email: string; ok: boolean; reason?: string }>;
};

function parseEmailList(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.includes('@')),
    ),
  ];
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminMailboxPage() {
  useAdminSession();
  const [history, setHistory] = useState<OutboundEmail[]>([]);
  const [toText, setToText] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toEmails = useMemo(() => parseEmailList(toText), [toText]);

  async function loadHistory() {
    try {
      const data = await api<OutboundEmail[]>('/admin/mailbox');
      setHistory(data);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const data = await api<PreviewResult>('/admin/mailbox/preview', {
            method: 'POST',
            body: JSON.stringify({ subject, body }),
          });
          setPreviewHtml(data.html);
          setSmtpConfigured(data.smtpConfigured);
        } catch {
          /* preview is best-effort */
        }
      })();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [subject, body]);

  async function onSend(event: FormEvent) {
    event.preventDefault();
    if (toEmails.length === 0) {
      setError('Add at least one recipient email.');
      return;
    }
    if (toEmails.length > 25) {
      setError('Send at most 25 emails per batch.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setError('Subject and message are required.');
      return;
    }
    if (!confirm(`Send this message to ${toEmails.length} recipient(s)?`)) return;

    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<SendResult>('/admin/mailbox/send', {
        method: 'POST',
        body: JSON.stringify({
          toEmails,
          subject: subject.trim(),
          body: body.trim(),
        }),
      });
      setNote(`Sent ${result.sent} of ${result.requested}${result.failed ? ` · ${result.failed} failed` : ''}.`);
      setToText('');
      setSubject('');
      setBody('');
      await loadHistory();
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
          <h1>Mailbox</h1>
          <p className="admin-lead">
            Compose and send your own emails. Messages use the CasingConnect branded layout. Replies
            go to info@casingconnect.com.
          </p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <strong>{history.length}</strong>
            <span>recent sends</span>
          </div>
          <div className={`admin-stat${smtpConfigured ? ' brass' : ''}`}>
            <strong>{smtpConfigured ? 'On' : 'Off'}</strong>
            <span>SMTP</span>
          </div>
        </div>
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}
      {note ? <p className="admin-flash">{note}</p> : null}

      <section className="admin-tool admin-campaign">
        <div className="admin-campaign-layout">
          <form className="admin-campaign-controls" onSubmit={(event) => void onSend(event)}>
            <label className="admin-field">
              <span>To</span>
              <textarea
                rows={3}
                value={toText}
                onChange={(event) => setToText(event.target.value)}
                placeholder={'one@company.com\ntwo@exporter.com'}
                required
              />
              <p className="admin-campaign-desc">
                Paste addresses (comma or new line). {toEmails.length} parsed
                {toEmails.length
                  ? ` · ${toEmails.slice(0, 3).join(', ')}${toEmails.length > 3 ? '…' : ''}`
                  : ''}
                . Max 25.
              </p>
            </label>

            <label className="admin-field">
              <span>Subject</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Welcome to CasingConnect"
                maxLength={300}
                required
              />
            </label>

            <label className="admin-field">
              <span>Message</span>
              <textarea
                rows={12}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="Write your message in plain text. Blank lines become paragraphs."
                required
              />
            </label>

            <div className="admin-campaign-actions">
              <button
                type="submit"
                className="admin-btn primary"
                disabled={busy || !smtpConfigured || toEmails.length === 0 || toEmails.length > 25}
              >
                {busy ? 'Sending…' : `Send to ${toEmails.length || 0}`}
              </button>
            </div>
            {!smtpConfigured ? (
              <p className="admin-campaign-desc">SMTP is not configured on this API — emails cannot send.</p>
            ) : null}
          </form>

          <div className="admin-mail-preview" aria-label="Email preview">
            <div className="admin-mail-preview-head">
              <strong>Preview</strong>
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
                <dd>CasingConnect</dd>
              </div>
              <div>
                <dt>To</dt>
                <dd>{toEmails[0] ?? 'recipient@example.com'}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{subject.trim() || '—'}</dd>
              </div>
            </dl>
            <div className="admin-mail-preview-body">
              {previewMode === 'html' && previewHtml ? (
                <iframe
                  title="Mailbox email HTML preview"
                  className="admin-mail-frame"
                  srcDoc={previewHtml}
                />
              ) : (
                <pre className="admin-mail-text">{body.trim() || '—'}</pre>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="admin-panel" style={{ marginTop: 24 }}>
        <div className="admin-toolbar">
          <strong>Sent history</strong>
        </div>
        {history.length === 0 ? (
          <p className="admin-empty">No mailbox sends yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Subject</th>
                <th>Recipients</th>
                <th>Result</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{formatWhen(row.createdAt)}</td>
                  <td>
                    <strong>{row.subject}</strong>
                    <div className="tiny" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>
                      {row.bodyText.slice(0, 140)}
                      {row.bodyText.length > 140 ? '…' : ''}
                    </div>
                  </td>
                  <td>
                    <div className="admin-contact">
                      {row.toEmails.slice(0, 3).map((email) => (
                        <div key={email}>{email}</div>
                      ))}
                      {row.toEmails.length > 3 ? (
                        <div className="tiny">+{row.toEmails.length - 3} more</div>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className="admin-badge">{row.sentCount} sent</span>
                    {row.failedCount ? (
                      <span className="admin-badge dismissed" style={{ marginLeft: 6 }}>
                        {row.failedCount} failed
                      </span>
                    ) : null}
                  </td>
                  <td>{row.createdBy?.name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
