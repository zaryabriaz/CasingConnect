'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { useToast } from '@/components/toast';
import { api, errorText } from '@/lib/api';
import { canManage } from '@/lib/labels';
import { CasingType, MaterialCategory, Quality, Unit } from '@/lib/types';

function diameterOf(name: string) {
  const match = name.trim().match(/^(\d+\/\d+|\d+\/\+)/);
  return match?.[1] ?? 'Other';
}

function chipLabel(name: string) {
  const parts = name.trim().split(/\s+/);
  // Diameter band is shown on the row; chip shows grade when present, else full name.
  return parts.length > 1 ? parts.slice(1).join(' ') : name.trim();
}

function groupQualities(qualities: Quality[]) {
  const bands = new Map<string, Quality[]>();
  for (const quality of qualities) {
    const key = diameterOf(quality.name);
    const row = bands.get(key) ?? [];
    row.push(quality);
    bands.set(key, row);
  }
  return [...bands.entries()].map(([diameter, items]) => ({
    diameter,
    items: items.sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export default function CataloguePage() {
  const session = useSession();
  const toast = useToast();
  const [types, setTypes] = useState<CasingType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const manage = canManage(session.role);

  const orderedTypes = useMemo(
    () => [...types].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name)),
    [types],
  );

  const orderedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) => Number(b.active) - Number(a.active) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
      ),
    [categories],
  );

  function load() {
    return Promise.all([
      api<CasingType[]>('/casing-types'),
      api<Unit[]>('/units'),
      api<MaterialCategory[]>('/material-categories'),
    ])
      .then(([nextTypes, nextUnits, nextCategories]) => {
        setTypes(nextTypes);
        setUnits(nextUnits);
        setCategories(nextCategories);
      })
      .catch((caught) => setError(errorText(caught)));
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  async function addQuality(event: FormEvent<HTMLFormElement>, casingTypeId: string) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get('name') ?? '').trim();
    setError(null);
    try {
      await api(`/casing-types/${casingTypeId}/qualities`, {
        method: 'POST',
        body: JSON.stringify({ code: name, name }),
      });
      formEl.reset();
      await load();
      toast.ok(
        /^\d+\/\d+$|^\d+\/\+$/i.test(name) || /,\s*[A-Za-z]/i.test(name)
          ? `Added grades for ${name.split(/\s+/)[0]}`
          : `Added quality ${name}`,
      );
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function toggleQuality(id: string, active: boolean) {
    setError(null);
    try {
      await api(`/qualities/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
      toast.ok(active ? 'Quality turned on' : 'Quality turned off');
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function removeQuality(id: string, name: string) {
    setError(null);
    try {
      await api(`/qualities/${id}`, { method: 'DELETE' });
      await load();
      toast.ok(`Deleted ${name}`);
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function toggleType(id: string, active: boolean) {
    setError(null);
    try {
      await api(`/casing-types/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function saveGroup(event: FormEvent<HTMLFormElement>, unit: Unit) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await api(`/units/${unit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ comparableGroup: form.get('comparableGroup') }),
      });
      await load();
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const name = String(form.get('name') ?? '').trim();
    setError(null);
    try {
      await api('/material-categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
      formEl.reset();
      await load();
      toast.ok(`Added material category ${name}`);
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function toggleCategory(id: string, active: boolean) {
    setError(null);
    try {
      await api(`/material-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
      });
      await load();
      toast.ok(active ? 'Category turned on' : 'Category turned off');
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function renameCategory(id: string, name: string) {
    const next = name.trim();
    if (!next) return;
    setError(null);
    try {
      await api(`/material-categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: next }),
      });
      await load();
      toast.ok('Category renamed');
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  async function removeCategory(id: string, name: string) {
    setError(null);
    try {
      await api(`/material-categories/${id}`, { method: 'DELETE' });
      await load();
      toast.ok(`Deleted ${name}`);
    } catch (caught) {
      const message = errorText(caught);
      setError(message);
      toast.bad(message);
    }
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Catalogue</p>
        <h1>Casings, qualities, and units</h1>
        <p className="muted">
          Each casing type has diameter + grade qualities (AB, A, C). Material categories power Buying (Roda, 18/UP,
          Quality, or your own). Units are shared — hanks are for finished output.
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}

      <section className="card pad stack">
        <div>
          <h2>Material categories</h2>
          <p className="muted tiny">
            Shown on Buying as what was bought. Built-in Roda, 18/UP, and Quality keep production rules; add custom
            categories for other intake forms.
          </p>
        </div>
        {orderedCategories.length === 0 ? (
          <p className="muted">No categories yet.</p>
        ) : (
          <div className="unit-rows">
            {orderedCategories.map((category) => (
              <div className="unit-row" key={category.id}>
                <div>
                  <strong>{category.name}</strong>
                  <div className="tiny">
                    {category.code}
                    {category.system ? ' · built-in' : ' · custom'}
                    {category.requiresQuality ? ' · needs quality' : ''}
                    {!category.active ? ' · off' : ''}
                  </div>
                </div>
                {manage ? (
                  <div className="inline" style={{ gap: '0.45rem', flexWrap: 'wrap' }}>
                    <input
                      defaultValue={category.name}
                      aria-label={`Rename ${category.name}`}
                      onBlur={(event) => {
                        if (event.target.value.trim() !== category.name) {
                          void renameCategory(category.id, event.target.value);
                        }
                      }}
                    />
                    <button
                      className="btn ghost"
                      type="button"
                      onClick={() => void toggleCategory(category.id, !category.active)}
                    >
                      {category.active ? 'Off' : 'On'}
                    </button>
                    {!category.system ? (
                      <button
                        className="btn ghost"
                        type="button"
                        onClick={() => void removeCategory(category.id, category.name)}
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <span className={`status-pill${category.active ? ' on' : ''}`}>
                    {category.active ? 'Active' : 'Inactive'}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
        {manage ? (
          <form className="catalogue-add" onSubmit={(event) => void addCategory(event)}>
            <Field label="New material category">
              <input name="name" placeholder="e.g. Salted, Green" required />
            </Field>
            <button className="btn primary" type="submit">
              Add
            </button>
          </form>
        ) : null}
      </section>

      {orderedTypes.map((type) => {
        const bands = groupQualities(type.qualities);
        const activeCount = type.qualities.filter((item) => item.active).length;
        return (
          <section className={`card pad stack catalogue-card${type.active ? '' : ' inactive'}`} key={type.id}>
            <div className="split">
              <div>
                <h2>
                  {type.name}
                  <span className={`status-pill${type.active ? ' on' : ''}`}>
                    {type.active ? 'Active' : 'Inactive'}
                  </span>
                </h2>
                <p className="tiny">
                  {activeCount} of {type.qualities.length} qualities on
                </p>
              </div>
              {manage ? (
                <button className="btn ghost" type="button" onClick={() => void toggleType(type.id, !type.active)}>
                  {type.active ? 'Disable type' : 'Enable type'}
                </button>
              ) : null}
            </div>

            {bands.length === 0 ? (
              <p className="muted tiny">No qualities yet.</p>
            ) : (
              <div className="quality-board">
                {bands.map((band) => (
                  <div className="quality-band" key={band.diameter}>
                    <div className="quality-band-label">{band.diameter}</div>
                    <div className="quality-chips">
                      {band.items.map((quality) => (
                        <span className={quality.active ? 'tag' : 'tag off'} key={quality.id}>
                          <span>{chipLabel(quality.name)}</span>
                          {manage ? (
                            <>
                              <button
                                type="button"
                                onClick={() => void toggleQuality(quality.id, !quality.active)}
                                aria-label={`${quality.active ? 'Turn off' : 'Turn on'} ${quality.name}`}
                                title={quality.active ? 'Turn off' : 'Turn on'}
                              >
                                {quality.active ? 'Off' : 'On'}
                              </button>
                              <button
                                type="button"
                                className="tag-delete"
                                onClick={() => void removeQuality(quality.id, quality.name)}
                                aria-label={`Delete ${quality.name}`}
                                title="Delete"
                              >
                                Delete
                              </button>
                            </>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {manage && type.active ? (
              <form className="catalogue-add" onSubmit={(event) => void addQuality(event, type.id)}>
                <Field label="New diameter or quality">
                  <input name="name" placeholder="26/28 or 26/28 A,AB,C" required />
                </Field>
                <button className="btn primary" type="submit">
                  Add
                </button>
              </form>
            ) : null}
          </section>
        );
      })}

      <section className="card pad stack">
        <div>
          <h2>Units</h2>
          <p className="muted tiny">Shared measures. Hanks are used for finished qualities on Sales and Inventory.</p>
        </div>
        {units.length === 0 ? (
          <p className="muted">No units yet.</p>
        ) : (
          <div className="unit-rows">
            {units.map((unit) => (
              <div className="unit-row" key={unit.id}>
                <div>
                  <strong>{unit.name}</strong>
                  <div className="tiny">{unit.code}</div>
                </div>
                {manage ? (
                  <form className="inline" onSubmit={(event) => void saveGroup(event, unit)}>
                    <input name="comparableGroup" defaultValue={unit.comparableGroup} required aria-label={`${unit.name} comparison group`} />
                    <button className="btn ghost" type="submit">
                      Save
                    </button>
                  </form>
                ) : (
                  <span className="muted">{unit.comparableGroup}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
