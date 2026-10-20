'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canManage, labelOf, LOCATION_KINDS } from '@/lib/labels';
import { Location, LocationKind } from '@/lib/types';

export default function PlacesPage() {
  const session = useSession();
  const [places, setPlaces] = useState<Location[]>([]);
  const [error, setError] = useState<string | null>(null);
  const manage = canManage(session.role);

  function load() {
    return api<Location[]>('/locations')
      .then(setPlaces)
      .catch((caught) => setError(errorText(caught)));
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setError(null);
    try {
      await api('/locations', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          kind: form.get('kind'),
          city: form.get('city'),
          country: form.get('country'),
        }),
      });
      formEl.reset();
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function setActive(place: Location, active: boolean) {
    setError(null);
    try {
      await api(`/locations/${place.id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Places</p>
        <h1>Where the work happens</h1>
        <p className="muted">Processing yards, branches, warehouses, and cold stores owned by the business.</p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <div className="two">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Place</th>
                <th>Kind</th>
                <th>City</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {places.map((place) => (
                <tr key={place.id}>
                  <td>
                    {place.name}
                    {!place.active ? <div className="tiny">Inactive</div> : null}
                  </td>
                  <td>{labelOf(LOCATION_KINDS, place.kind)}</td>
                  <td>{place.city ?? '—'}</td>
                  <td>
                    {manage ? (
                      <button className="btn ghost" type="button" onClick={() => void setActive(place, !place.active)}>
                        {place.active ? 'Deactivate' : 'Restore'}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {places.length === 0 ? (
                <tr>
                  <td colSpan={4}>No places yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {manage ? (
          <form className="card pad form" onSubmit={onSubmit}>
            <h2>Add a place</h2>
            <Field label="Name">
              <input name="name" required minLength={2} />
            </Field>
            <Field label="Kind">
              <select name="kind" defaultValue={'PROCESSING' satisfies LocationKind}>
                {LOCATION_KINDS.map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="row-2">
              <Field label="City">
                <input name="city" />
              </Field>
              <Field label="Country">
                <input name="country" defaultValue="Pakistan" />
              </Field>
            </div>
            <button className="btn primary" type="submit">
              Add place
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
