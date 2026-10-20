'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
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

export default function StoreBatchPage() {
  const params = useParams<{ batch: string }>();
  const batchId = decodeURIComponent(params.batch);
  const [batch, setBatch] = useState<StoreBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<StoreBatch[]>('/receipts/store')
      .then((batches) => {
        const found = batches.find((item) => item.batch === batchId) ?? null;
        setBatch(found);
        if (!found) setError(`Batch ${batchId} was not found in the store.`);
      })
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }, [batchId]);

  return (
    <div className="stack">
      <div>
        <p className="tiny">
          <Link href="/app/store">Store</Link> / Batch
        </p>
        <h1>{batchId}</h1>
        {batch ? (
          <p className="muted">
            {batch.material} · {batch.quantity} · {batch.supplier} · {batch.date}
          </p>
        ) : null}
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      {loading ? <div className="card pad muted">Opening batch…</div> : null}
      {batch ? (
        <div className="card pad stack">
          <div className="split">
            <h2>Bags and drums</h2>
            <span className="tag">{batch.packages.length} packages</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Bag or drum</th>
                  <th>Number</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {batch.packages.map((item) => (
                  <tr key={`${item.kind}-${item.packageNumber}`}>
                    <td>{item.kind === 'BAG' ? 'Bag' : 'Drum'}</td>
                    <td>{item.packageNumber}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      <div>
        <Link className="btn ghost" href="/app/store">
          Back to store
        </Link>
      </div>
    </div>
  );
}
