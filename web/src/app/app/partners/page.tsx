'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field, RoleChecks } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canManage, labelOf, PARTNER_ROLES } from '@/lib/labels';
import { Partner, PartnerPage, PartnerRole } from '@/lib/types';

export default function PartnersPage() {
  const session = useSession();
  const [page, setPage] = useState<PartnerPage | null>(null);
  const [roles, setRoles] = useState<PartnerRole[]>(['SUPPLIER']);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const manage = canManage(session.role);

  function load(search = query, role = roleFilter) {
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (search.trim()) params.set('q', search.trim());
    if (role) params.set('role', role);
    return api<PartnerPage>(`/partners?${params.toString()}`)
      .then(setPage)
      .catch((caught) => setError(errorText(caught)));
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (roles.length === 0) {
      setError('Choose at least one role.');
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      await api('/partners', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          roles,
          phone: form.get('phone'),
          country: form.get('country'),
          paymentTerms: form.get('paymentTerms'),
        }),
      });
      formEl.reset();
      setRoles(['SUPPLIER']);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function setActive(partner: Partner, active: boolean) {
    setError(null);
    try {
      await api(`/partners/${partner.id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Partners</p>
        <h1>Outside companies</h1>
        <p className="muted">
          Suppliers, customers, and other trading companies — not your staff or workers. Add people who use CasingConnect under Users.
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <form
        className="split"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <Field label="Search by name">
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <Field label="Role">
          <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All roles</option>
            {PARTNER_ROLES.map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <button className="btn ghost" type="submit">
          Search
        </button>
      </form>
      <div className="two">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Partner</th>
                <th>Roles</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(page?.items ?? []).map((partner) => (
                <tr key={partner.id}>
                  <td>
                    {partner.name}
                    <div className="tiny">{[partner.country, partner.phone].filter(Boolean).join(' · ') || '—'}</div>
                  </td>
                  <td>
                    {partner.roles.map((role) => (
                      <span className={partner.active ? 'tag' : 'tag off'} key={role}>
                        {labelOf(PARTNER_ROLES, role)}
                      </span>
                    ))}
                  </td>
                  <td>
                    {manage ? (
                      <button className="btn ghost" type="button" onClick={() => void setActive(partner, !partner.active)}>
                        {partner.active ? 'Deactivate' : 'Restore'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {page && page.items.length === 0 ? (
                <tr>
                  <td colSpan={3}>No partners match this search.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {manage ? (
          <form className="card pad form" onSubmit={onSubmit}>
            <h2>Add a partner</h2>
            <Field label="Name">
              <input name="name" required minLength={2} />
            </Field>
            <Field label="Roles">
              <RoleChecks selected={roles} onChange={setRoles} />
            </Field>
            <div className="row-2">
              <Field label="Phone">
                <input name="phone" />
              </Field>
              <Field label="Country">
                <input name="country" />
              </Field>
            </div>
            <Field label="Payment terms">
              <input name="paymentTerms" />
            </Field>
            <button className="btn primary" type="submit">
              Save partner
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
