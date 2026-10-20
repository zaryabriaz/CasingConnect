'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAdminSession } from '@/components/admin-session';
import { api, errorText } from '@/lib/api';

type SetupRequest = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  country: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  notes: string | null;
  createdAt: string;
};

function statusClass(status: SetupRequest['status']) {
  if (status === 'CONTACTED') return 'reviewed';
  if (status === 'CLOSED') return 'dismissed';
  return '';
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminSetupRequestsPage() {
  useAdminSession();
  const [items, setItems] = useState<SetupRequest[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(nextStatus = status) {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (nextStatus) params.set('status', nextStatus);
      const data = await api<SetupRequest[]>(`/admin/setup-requests?${params}`);
      setItems(data);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const newCount = useMemo(() => items.filter((item) => item.status === 'NEW').length, [items]);

  async function setRequestStatus(id: string, next: SetupRequest['status']) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/admin/setup-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function removeRequest(id: string) {
    if (!confirm('Delete this request?')) return;
    setBusyId(id);
    setError(null);
    try {
      await api(`/admin/setup-requests/${id}`, { method: 'DELETE' });
      await load(status);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h1>Setup requests</h1>
          <p className="admin-lead">
            Queries from the public “Request a tailored setup” form — customise CasingConnect for
            businesses outside Pakistan or with special needs.
          </p>
        </div>
        <div className="admin-stats">
          <div className="admin-stat">
            <strong>{items.length}</strong>
            <span>total</span>
          </div>
          {!status && newCount ? (
            <div className="admin-stat brass">
              <strong>{newCount}</strong>
              <span>new</span>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="admin-flash bad">{error}</p> : null}

      <div className="admin-panel">
        <div className="admin-toolbar">
          <h2>Requests &amp; queries</h2>
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
                <option value="CONTACTED">Contacted</option>
                <option value="CLOSED">Closed</option>
              </select>
            </label>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="admin-empty">No setup requests yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>From</th>
                <th>Query</th>
                <th>When</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td data-label="From">
                    <strong>{row.name}</strong>
                    <div className="admin-contact">
                      <a href={`mailto:${row.email}`}>{row.email}</a>
                      {row.phone ? (
                        <a href={`tel:${row.phone.replace(/\s+/g, '')}`}>{row.phone}</a>
                      ) : null}
                    </div>
                    <div className="muted">
                      {[row.companyName, row.country].filter(Boolean).join(' · ') || row.country}
                    </div>
                  </td>
                  <td data-label="Query">
                    <div className="tiny" style={{ whiteSpace: 'pre-wrap', maxWidth: '28rem' }}>
                      {row.message}
                    </div>
                  </td>
                  <td data-label="When">
                    <div className="muted">{formatWhen(row.createdAt)}</div>
                  </td>
                  <td data-label="Status">
                    <span className={`admin-badge ${statusClass(row.status)}`}>{row.status}</span>
                  </td>
                  <td data-label="Actions">
                    <div className="admin-actions">
                      {row.status !== 'CONTACTED' ? (
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={busyId === row.id}
                          onClick={() => void setRequestStatus(row.id, 'CONTACTED')}
                        >
                          Mark contacted
                        </button>
                      ) : null}
                      {row.status !== 'CLOSED' ? (
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={busyId === row.id}
                          onClick={() => void setRequestStatus(row.id, 'CLOSED')}
                        >
                          Close
                        </button>
                      ) : null}
                      {row.status !== 'NEW' ? (
                        <button
                          type="button"
                          className="admin-btn ghost"
                          disabled={busyId === row.id}
                          onClick={() => void setRequestStatus(row.id, 'NEW')}
                        >
                          Reopen
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="admin-btn warn"
                        disabled={busyId === row.id}
                        onClick={() => void removeRequest(row.id)}
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
