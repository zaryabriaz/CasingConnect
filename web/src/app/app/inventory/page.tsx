'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';

type MaterialQty = { material: string; materialForm: string; quantity: string };

type RawMaterialRow = {
  material: string;
  materialForm: string;
  store: string;
  factory: string;
  withWorkers: string;
  total: string;
};

type FinishedRow = {
  qualityId: string;
  quality: string;
  casingType: string;
  produced: string;
  sold: string;
  available: string;
};

type InventoryOverview = {
  store: { total: string; materials: MaterialQty[] };
  factory: { total: string; materials: MaterialQty[] };
  withWorkers: {
    total: string;
    materials: MaterialQty[];
    people: Array<{ personName: string; total: string; materials: MaterialQty[] }>;
  };
  rawMaterials: RawMaterialRow[];
  finished: {
    totalProduced: string;
    totalSold: string;
    totalAvailable: string;
    qualities: FinishedRow[];
  };
  totals: {
    raw: string;
    store: string;
    factory: string;
    withWorkers: string;
    produced: string;
    sold: string;
    available: string;
  };
};

export default function InventoryPage() {
  const session = useSession();
  const [data, setData] = useState<InventoryOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<InventoryOverview>('/stock/overview')
      .then(setData)
      .catch((caught) => setError(errorText(caught)));
  }, [session.business.id]);

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Inventory</p>
          <h1>Company inventory</h1>
          <p className="muted">
            Raw material by location, and finished hanks produced, sold, and still available.
          </p>
        </div>
        <div className="nav-row">
          <Link className="btn ghost" href="/app/store">
            Store
          </Link>
          <Link className="btn ghost" href="/app/factory">
            Factory
          </Link>
          <Link className="btn ghost" href="/app/sales">
            Sales
          </Link>
        </div>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}

      {!data ? (
        <div className="card pad muted">Loading inventory…</div>
      ) : (
        <>
          <div className="stats">
            <div className="stat">
              <span className="tiny">Raw on hand</span>
              <strong>{data.totals.raw}</strong>
              <span className="tiny">Store + factory + workers</span>
            </div>
            <div className="stat">
              <span className="tiny">Hanks available</span>
              <strong>{data.totals.available}</strong>
              <span className="tiny">Hanks − sold</span>
            </div>
            <div className="stat">
              <span className="tiny">Hanks</span>
              <strong>{data.totals.produced}</strong>
            </div>
            <div className="stat">
              <span className="tiny">Sold</span>
              <strong>{data.totals.sold}</strong>
            </div>
          </div>

          <section className="stack">
            <div>
              <h2>Raw material</h2>
              <p className="muted tiny">Where incoming material sits right now.</p>
            </div>
            {data.rawMaterials.length === 0 ? (
              <div className="card pad muted">No raw material on hand.</div>
            ) : (
              <div className="sheet-wrap">
                <table className="sheet">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th className="sheet-num">Store</th>
                      <th className="sheet-num">Factory</th>
                      <th className="sheet-num">With workers</th>
                      <th className="sheet-num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rawMaterials.map((row) => (
                      <tr key={row.materialForm}>
                        <td>{row.material}</td>
                        <td className="sheet-num">{row.store}</td>
                        <td className="sheet-num">{row.factory}</td>
                        <td className="sheet-num">{row.withWorkers}</td>
                        <td className="sheet-num">
                          <strong>{row.total}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td>Total</td>
                      <td className="sheet-num">{data.totals.store}</td>
                      <td className="sheet-num">{data.totals.factory}</td>
                      <td className="sheet-num">{data.totals.withWorkers}</td>
                      <td className="sheet-num">{data.totals.raw}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <section className="stack">
            <div>
              <h2>Finished hanks</h2>
              <p className="muted tiny">Hanks made, sold, and still available to sell.</p>
            </div>
            {data.finished.qualities.length === 0 ? (
              <div className="card pad muted">No hanks recorded yet.</div>
            ) : (
              <div className="sheet-wrap">
                <table className="sheet">
                  <thead>
                    <tr>
                      <th>Casing</th>
                      <th>Quality</th>
                      <th className="sheet-num">Hanks</th>
                      <th className="sheet-num">Sold</th>
                      <th className="sheet-num">Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.finished.qualities.map((row) => (
                      <tr key={row.qualityId}>
                        <td>{row.casingType}</td>
                        <td>{row.quality}</td>
                        <td className="sheet-num">{row.produced}</td>
                        <td className="sheet-num">{row.sold}</td>
                        <td className="sheet-num">
                          <strong>{row.available}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2}>Total</td>
                      <td className="sheet-num">{data.finished.totalProduced}</td>
                      <td className="sheet-num">{data.finished.totalSold}</td>
                      <td className="sheet-num">{data.finished.totalAvailable}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          {data.withWorkers.people.length > 0 ? (
            <section className="stack">
              <div className="split">
                <div>
                  <h2>With workers</h2>
                  <p className="muted tiny">Material issued to people (included in raw totals above).</p>
                </div>
                <Link className="btn ghost" href="/app/operations">
                  Issue
                </Link>
              </div>
              <div className="sheet-wrap">
                <table className="sheet">
                  <thead>
                    <tr>
                      <th>Person</th>
                      <th>Materials</th>
                      <th className="sheet-num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.withWorkers.people.map((person) => (
                      <tr key={person.personName}>
                        <td>{person.personName}</td>
                        <td>
                          {person.materials.map((item) => `${item.material} ${item.quantity}`).join(' · ')}
                        </td>
                        <td className="sheet-num">
                          <strong>{person.total}</strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
