'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';

type FactoryData = {
  balances: Array<{
    material: string;
    materialForm: string;
    available: string;
    atFactoryBags: string;
    boughtAtFactory: string;
    transferredIn: string;
    issued: string;
    withPeople?: string;
    note?: string | null;
  }>;
  packages: Array<{
    id: string;
    kind: 'BAG' | 'DRUM';
    packageNumber: string;
    quantity: string;
    batch: string;
    material: string;
    status: 'AT_FACTORY' | 'UTILIZED';
    issuedTo: string | null;
    usedQuantity: string | null;
  }>;
  withPeople: Array<{
    personName: string;
    materials: Array<{ material: string; quantity: string }>;
  }>;
  finishedQualities: Array<{
    qualityId: string;
    quality: string;
    produced: string;
    sold: string;
    available: string;
    people: string[];
  }>;
  recent: Array<{
    id: string;
    reference: string;
    date: string;
    type: 'STORE_TO_FACTORY' | 'ISSUE_TO_PERSON' | 'CONVERT';
    kind?: 'STOCK' | 'CONVERT';
    notes: string | null;
    detail?: string;
    lines: Array<{ personName: string; material: string; quantity: string }>;
    packages: Array<{ kind: string; packageNumber: string; quantity: string }>;
  }>;
};

function balanceHint(row: FactoryData['balances'][number]) {
  if (row.materialForm === 'EIGHTEEN_UP') {
    return `With people ${row.withPeople ?? '0'}`;
  }
  if (row.materialForm === 'QUALITY') {
    return 'From production';
  }
  return `In ${row.transferredIn} · Issued ${row.issued}`;
}

function movementLabel(type: FactoryData['recent'][number]['type']) {
  if (type === 'STORE_TO_FACTORY') return 'Store → factory';
  if (type === 'CONVERT') return 'Production';
  return 'Issued to people';
}

function movementDetail(op: FactoryData['recent'][number]) {
  if (op.detail) return op.detail;
  if (op.type === 'STORE_TO_FACTORY') {
    return op.packages
      .map((item) => `${item.kind === 'BAG' ? 'Bag' : 'Drum'} ${item.packageNumber} · ${item.quantity}`)
      .join(', ');
  }
  if (op.type === 'ISSUE_TO_PERSON') {
    return [
      op.lines.map((line) => `${line.personName}: ${line.material} ${line.quantity}`).join(', '),
      op.packages.length
        ? `Bags: ${op.packages
            .map((item) => `${item.kind === 'BAG' ? 'Bag' : 'Drum'} ${item.packageNumber} · ${item.quantity}`)
            .join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  return op.lines.map((line) => `${line.personName}: ${line.material} ${line.quantity}`).join(', ');
}

export default function FactoryPage() {
  const session = useSession();
  const [data, setData] = useState<FactoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<FactoryData>('/stock/factory')
      .then(setData)
      .catch((caught) => setError(errorText(caught)));
  }, [session.business.id]);

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Factory</p>
          <h1>Factory material</h1>
          <p className="muted">Bags on hand, material with people (including 18/UP from production), and finished qualities.</p>
        </div>
        <div className="nav-row">
          <Link className="btn primary" href="/app/operations">
            Transfer / issue
          </Link>
          <Link className="btn ghost" href="/app/production">
            Production
          </Link>
        </div>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}

      {!data ? (
        <div className="card pad muted">Loading factory stock…</div>
      ) : (
        <>
          <div className="stats">
            {data.balances.map((row) => (
              <div className="stat" key={row.materialForm}>
                <span className="tiny">{row.material} available</span>
                <strong>{row.available}</strong>
                <span className="tiny">{balanceHint(row)}</span>
              </div>
            ))}
          </div>

          <div className="two">
            <section className="card pad stack">
              <h2>With people</h2>
              {data.withPeople.length === 0 ? (
                <p className="muted">
                  Nobody is holding Roda or 18/UP. Issue on Operations, or convert on Production.
                </p>
              ) : (
                <div className="dash-list">
                  {data.withPeople.map((person) => (
                    <div className="dash-row" key={person.personName}>
                      <span>
                        <strong>{person.personName}</strong>
                        <div className="tiny">
                          {person.materials.map((item) => `${item.material} ${item.quantity}`).join(' · ')}
                        </div>
                      </span>
                      <strong>
                        {person.materials.reduce((sum, item) => sum + Number(item.quantity), 0)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="card pad stack">
              <div className="split">
                <h2>Finished qualities</h2>
                <span className="tag">{data.finishedQualities?.length ?? 0}</span>
              </div>
              {!data.finishedQualities?.length ? (
                <p className="muted">
                  No finished qualities yet. Record Quality work on <Link href="/app/production">Production</Link>.
                </p>
              ) : (
                <div className="dash-list">
                  {data.finishedQualities.map((row) => (
                    <div className="dash-row" key={row.qualityId}>
                      <span>
                        <strong>{row.quality}</strong>
                        <div className="tiny">
                          {row.people.length ? row.people.join(', ') : 'Factory'}
                          {Number(row.sold) > 0 ? ` · Sold ${row.sold}` : ''}
                        </div>
                      </span>
                      <strong>{row.available}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="card pad stack">
            <div className="split">
              <h2>Bags</h2>
              <span className="tag">{data.packages.length}</span>
            </div>
            {data.packages.length === 0 ? (
              <p className="muted">No bags or drums yet. Transfer them from the store, then issue to people.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Batch</th>
                      <th>Bag / drum</th>
                      <th>Material</th>
                      <th>Qty</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.packages.map((item) => (
                      <tr key={item.id}>
                        <td>{item.batch}</td>
                        <td>
                          {item.kind === 'BAG' ? 'Bag' : 'Drum'} {item.packageNumber}
                        </td>
                        <td>{item.material}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {item.status === 'UTILIZED' ? (
                            <>
                              Utilized
                              {item.issuedTo ? <div className="tiny">{item.issuedTo}</div> : null}
                            </>
                          ) : (
                            <>
                              At factory
                              {item.usedQuantity ? (
                                <div className="tiny">Used {item.usedQuantity} from this bag</div>
                              ) : null}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="stack">
            <h2>Recent movements</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((op) => (
                    <tr key={op.id}>
                      <td>{op.reference}</td>
                      <td>{op.date}</td>
                      <td>{movementLabel(op.type)}</td>
                      <td>
                        {movementDetail(op)}
                        {op.notes ? <div className="tiny">{op.notes}</div> : null}
                      </td>
                    </tr>
                  ))}
                  {data.recent.length === 0 ? (
                    <tr>
                      <td colSpan={4}>No transfers, issues, or production yet.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
