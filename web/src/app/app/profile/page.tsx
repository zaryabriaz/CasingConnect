'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ActivityChecks, Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { ACTIVITIES, canManage, labelOf } from '@/lib/labels';
import { Activity, BusinessDetail } from '@/lib/types';

export default function OverviewPage() {
  const session = useSession();
  const [detail, setDetail] = useState<BusinessDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>(session.business.activities);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const manage = canManage(session.role);

  useEffect(() => {
    api<BusinessDetail>('/business')
      .then((next) => {
        setDetail(next);
        setActivities(next.activities);
      })
      .catch((caught) => setError(errorText(caught)));
  }, [session.business.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (activities.length === 0) {
      setError('Keep at least one activity.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);
    try {
      await api('/business', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.get('name'),
          legalName: form.get('legalName'),
          city: form.get('city'),
          country: form.get('country'),
          phone: form.get('phone'),
          email: form.get('email'),
          currency: form.get('currency'),
          address: form.get('address'),
          description: form.get('description'),
          activities,
        }),
      });
      await session.reload();
      setDetail(await api<BusinessDetail>('/business'));
      setMessage('Profile saved.');
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Overview</p>
        <h1>{session.business.name}</h1>
        <p className="muted">{session.business.activities.map((item) => labelOf(ACTIVITIES, item)).join(' · ')}</p>
      </div>
      <div className="stats">
        {[
          ['Places', detail?.counts.locations],
          ['People', detail?.counts.members],
          ['Partners', detail?.counts.partners],
          ['Active qualities', detail?.counts.qualities],
        ].map(([label, value]) => (
          <div className="stat" key={String(label)}>
            <span className="tiny">{label}</span>
            <strong>{value ?? '—'}</strong>
          </div>
        ))}
      </div>
      <form className="card pad form" key={detail?.updatedAt ?? 'profile'} onSubmit={onSubmit}>
        <h2>Business profile</h2>
        {error ? <Banner kind="bad">{error}</Banner> : null}
        {message ? <Banner kind="note">{message}</Banner> : null}
        <div className="row-2">
          <Field label="Name">
            <input name="name" defaultValue={detail?.name ?? session.business.name} disabled={!manage} required />
          </Field>
          <Field label="Legal name">
            <input name="legalName" defaultValue={detail?.legalName ?? ''} disabled={!manage} />
          </Field>
        </div>
        <div className="row-2">
          <Field label="City">
            <input name="city" defaultValue={detail?.city ?? ''} disabled={!manage} />
          </Field>
          <Field label="Country">
            <input name="country" defaultValue={detail?.country ?? 'Pakistan'} disabled={!manage} />
          </Field>
        </div>
        <div className="row-2">
          <Field label="Phone">
            <input name="phone" defaultValue={detail?.phone ?? ''} disabled={!manage} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" defaultValue={detail?.email ?? ''} disabled={!manage} />
          </Field>
        </div>
        <div className="row-2">
          <Field label="Currency">
            <input name="currency" defaultValue={detail?.currency ?? 'PKR'} maxLength={3} disabled={!manage} />
          </Field>
          <Field label="Address">
            <input name="address" defaultValue={detail?.address ?? ''} disabled={!manage} />
          </Field>
        </div>
        <Field label="Description">
          <textarea name="description" rows={3} defaultValue={detail?.description ?? ''} disabled={!manage} />
        </Field>
        <Field label="Activities">
          <ActivityChecks selected={activities} onChange={setActivities} disabled={!manage} />
        </Field>
        {manage ? (
          <button className="btn primary" type="submit">
            Save profile
          </button>
        ) : (
          <p className="tiny">Your role can view this business, but cannot change it.</p>
        )}
      </form>
    </div>
  );
}
