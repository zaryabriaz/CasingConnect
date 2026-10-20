'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/components/session';
import { Banner } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { canManage } from '@/lib/labels';
import { MarketplaceInquiry } from '@/lib/types';

export default function InquiriesPage() {
  const session = useSession();
  const manage = canManage(session.role) || session.role === 'SALES';
  const [items, setItems] = useState<MarketplaceInquiry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'INBOX' | 'SENT'>('ALL');

  async function load() {
    try {
      const data = await api<MarketplaceInquiry[]>('/marketplace/inquiries');
      setItems(data);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function setStatus(inquiry: MarketplaceInquiry, status: MarketplaceInquiry['status']) {
    setError(null);
    try {
      await api(`/marketplace/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  const visible = items.filter((item) => filter === 'ALL' || item.direction === filter);

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Marketplace</p>
        <h1>Inquiries</h1>
        <p className="muted">Messages you received about your listings, and inquiries you sent.</p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}

      <div className="split">
        {(['ALL', 'INBOX', 'SENT'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`btn ${filter === value ? 'primary' : 'ghost'}`}
            onClick={() => setFilter(value)}
          >
            {value === 'ALL' ? 'All' : value === 'INBOX' ? 'Inbox' : 'Sent'}
          </button>
        ))}
      </div>

      {visible.length === 0 ? <p className="muted">No inquiries yet.</p> : null}

      {visible.map((inquiry) => (
        <article key={inquiry.id} className="card pad stack">
          <div>
            <strong>
              {inquiry.direction === 'INBOX' ? 'From' : 'To'}{' '}
              {inquiry.direction === 'INBOX'
                ? inquiry.fromBusinessName || inquiry.fromUserName
                : inquiry.toBusinessName}
            </strong>
            <div className="tiny">
              {inquiry.listingQualityText ? `${inquiry.listingQualityText} · ` : ''}
              {inquiry.status} · {new Date(inquiry.createdAt).toLocaleString()} · {inquiry.contactEmail}
            </div>
          </div>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{inquiry.message}</p>
          {inquiry.direction === 'INBOX' && manage ? (
            <div className="split">
              {inquiry.status !== 'REPLIED' ? (
                <button className="btn ghost" type="button" onClick={() => void setStatus(inquiry, 'REPLIED')}>
                  Mark replied
                </button>
              ) : null}
              {inquiry.status !== 'CLOSED' ? (
                <button className="btn ghost" type="button" onClick={() => void setStatus(inquiry, 'CLOSED')}>
                  Close
                </button>
              ) : null}
              {inquiry.status !== 'OPEN' ? (
                <button className="btn ghost" type="button" onClick={() => void setStatus(inquiry, 'OPEN')}>
                  Reopen
                </button>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
