'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui';
import { api, errorText } from '@/lib/api';

type PackageLine = {
  kind: 'BAG' | 'DRUM';
  packageNumber: string;
  quantity: string;
};

type StoreBatch = {
  batch: string;
  date: string;
  supplier: string;
  material: string;
  quantity: string;
  packages: PackageLine[];
};

function packageLabel(batch: StoreBatch) {
  const drums = batch.packages.filter((item) => item.kind === 'DRUM').length;
  const bags = batch.packages.filter((item) => item.kind === 'BAG').length;
  const parts: string[] = [];
  if (bags) parts.push(`${bags} bag${bags === 1 ? '' : 's'}`);
  if (drums) parts.push(`${drums} drum${drums === 1 ? '' : 's'}`);
  return parts.join(' · ') || 'No packages';
}

function formatQty(value: number) {
  return value.toFixed(3).replace(/\.?0+$/, '') || '0';
}

export default function StorePage() {
  const [batches, setBatches] = useState<StoreBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [material, setMaterial] = useState('');
  const [supplier, setSupplier] = useState('');
  const [packKind, setPackKind] = useState('');

  useEffect(() => {
    api<StoreBatch[]>('/receipts/store')
      .then(setBatches)
      .catch((caught) => setError(errorText(caught)));
  }, []);

  const materials = [...new Set(batches.map((batch) => batch.material))].sort((a, b) => a.localeCompare(b));
  const suppliers = [...new Set(batches.map((batch) => batch.supplier))].sort((a, b) => a.localeCompare(b));
  const needle = query.trim().toLowerCase();
  const filtered = batches.filter((batch) => {
    if (material && batch.material !== material) return false;
    if (supplier && batch.supplier !== supplier) return false;
    if (packKind === 'BAG' && !batch.packages.some((item) => item.kind === 'BAG')) return false;
    if (packKind === 'DRUM' && !batch.packages.some((item) => item.kind === 'DRUM')) return false;
    if (!needle) return true;
    return (
      batch.batch.toLowerCase().includes(needle) ||
      batch.supplier.toLowerCase().includes(needle) ||
      batch.material.toLowerCase().includes(needle) ||
      batch.date.includes(needle)
    );
  });

  const totals = new Map<string, number>();
  for (const batch of filtered) {
    totals.set(batch.material, (totals.get(batch.material) ?? 0) + Number(batch.quantity));
  }
  const totalStock = [...totals.values()].reduce((sum, value) => sum + value, 0);
  const packageCount = filtered.reduce((sum, batch) => sum + batch.packages.length, 0);

  const hasFilters = Boolean(query.trim() || material || supplier || packKind);

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Store</p>
        <h1>Store by batch</h1>
        <p className="muted">Bags and drums still in the store. Filter batches, then open one for package detail.</p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}

      {batches.length > 0 ? (
        <form className="filters" onSubmit={(event) => event.preventDefault()}>
          <label className="field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Batch, supplier, material, date"
            />
          </label>
          <label className="field">
            <span>Material</span>
            <select value={material} onChange={(event) => setMaterial(event.target.value)}>
              <option value="">All materials</option>
              {materials.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Supplier</span>
            <select value={supplier} onChange={(event) => setSupplier(event.target.value)}>
              <option value="">All suppliers</option>
              {suppliers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Package</span>
            <select value={packKind} onChange={(event) => setPackKind(event.target.value)}>
              <option value="">Bags and drums</option>
              <option value="BAG">Bags</option>
              <option value="DRUM">Drums</option>
            </select>
          </label>
          {hasFilters ? (
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setQuery('');
                setMaterial('');
                setSupplier('');
                setPackKind('');
              }}
            >
              Clear
            </button>
          ) : null}
        </form>
      ) : null}

      <div className="stats">
        <div className="stat">
          <span className="tiny">{hasFilters ? 'Filtered total' : 'Total in store'}</span>
          <strong>{formatQty(totalStock)}</strong>
          <span className="tiny">
            {filtered.length} batch{filtered.length === 1 ? '' : 'es'} · {packageCount} package
            {packageCount === 1 ? '' : 's'}
          </span>
        </div>
        {[...totals.entries()].map(([name, quantity]) => (
          <div className="stat" key={name}>
            <span className="tiny">{name}</span>
            <strong>{formatQty(quantity)}</strong>
          </div>
        ))}
      </div>

      {batches.length === 0 ? (
        <div className="card pad">
          Nothing is in the store yet. Record a purchase on <Link href="/app/buying">Buying</Link> and send it to the store.
        </div>
      ) : filtered.length === 0 ? (
        <div className="card pad">No batches match these filters.</div>
      ) : (
        <div className="batch-grid">
          {filtered.map((batch) => (
            <Link className="batch-card" href={`/app/store/${encodeURIComponent(batch.batch)}`} key={batch.batch}>
              <div className="split">
                <h2>{batch.batch}</h2>
                <span className="tag">{packageLabel(batch)}</span>
              </div>
              <p className="batch-card-title">
                {batch.material} · {batch.quantity}
              </p>
              <p className="muted">
                {batch.supplier} · {batch.date}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
