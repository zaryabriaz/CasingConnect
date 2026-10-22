'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { MaterialCategory, Member } from '@/lib/types';

type StorePackage = {
  id: string;
  kind: 'BAG' | 'DRUM';
  packageNumber: string;
  quantity: string;
  batch: string;
  material: string;
  materialForm: string;
  date: string;
};

type WorkerOption = { id: string; name: string };

type IssueLine = {
  membershipId: string;
  materialCategoryId: string;
  quantity: string;
};

type FactorySnapshot = {
  balances: Array<{ material: string; materialForm: string; available: string }>;
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function blankIssue(membershipId = '', materialCategoryId = ''): IssueLine {
  return { membershipId, materialCategoryId, quantity: '' };
}

export default function OperationsPage() {
  const session = useSession();
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [workers, setWorkers] = useState<WorkerOption[]>([]);
  const [categories, setCategories] = useState<MaterialCategory[]>([]);
  const [factory, setFactory] = useState<FactorySnapshot | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [transferDate, setTransferDate] = useState(today);
  const [issueDate, setIssueDate] = useState(today);
  const [issueLines, setIssueLines] = useState<IssueLine[]>([blankIssue(), blankIssue()]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reload() {
    return Promise.all([
      api<StorePackage[]>('/stock/store-packages'),
      api<FactorySnapshot>('/stock/factory'),
      api<Member[]>('/members'),
      api<MaterialCategory[]>('/material-categories'),
    ]).then(([storePackages, factoryData, members, materialCategories]) => {
      const workerList = members
        .filter((member) => member.role === 'WORKER' && member.active)
        .map((member) => ({ id: member.id, name: member.name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const activeCategories = materialCategories
        .filter((item) => item.active)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      const defaultCategoryId =
        activeCategories.find((item) => item.code === 'RODA')?.id ?? activeCategories[0]?.id ?? '';
      setPackages(storePackages);
      setFactory(factoryData);
      setWorkers(workerList);
      setCategories(activeCategories);
      setSelected((current) => current.filter((id) => storePackages.some((item) => item.id === id)));
      setIssueLines((rows) =>
        rows.map((row) => ({
          ...row,
          membershipId:
            row.membershipId && workerList.some((worker) => worker.id === row.membershipId)
              ? row.membershipId
              : workerList[0]?.id ?? '',
          materialCategoryId:
            row.materialCategoryId &&
            activeCategories.some((category) => category.id === row.materialCategoryId)
              ? row.materialCategoryId
              : defaultCategoryId,
        })),
      );
    });
  }

  useEffect(() => {
    reload().catch((caught) => setError(errorText(caught)));
  }, [session.business.id]);

  const selectedRows = packages.filter((item) => selected.includes(item.id));
  const selectedTotal = selectedRows.reduce((sum, item) => sum + Number(item.quantity), 0);
  const defaultCategoryId =
    categories.find((item) => item.code === 'RODA')?.id ?? categories[0]?.id ?? '';

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function onTransfer(event: FormEvent) {
    event.preventDefault();
    if (selected.length === 0) {
      setError('Select at least one bag or drum to move to the factory.');
      return;
    }
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<{ reference: string; movedQuantity: string }>('/stock/transfer-to-factory', {
        method: 'POST',
        body: JSON.stringify({ date: transferDate, packageIds: selected, notes: notes || undefined }),
      });
      setSelected([]);
      setNotes('');
      setNote(`${result.reference}: moved ${result.movedQuantity} to the factory.`);
      await reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  async function onIssue(event: FormEvent) {
    event.preventDefault();
    const lines = issueLines
      .filter((line) => line.membershipId && line.quantity.trim() && line.materialCategoryId)
      .map((line) => ({
        membershipId: line.membershipId,
        materialCategoryId: line.materialCategoryId,
        quantity: line.quantity.trim(),
      }));
    if (lines.length === 0) {
      setError('Choose a worker, material category, and quantity on at least one line.');
      return;
    }
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const result = await api<{ reference: string }>('/stock/issue', {
        method: 'POST',
        body: JSON.stringify({ date: issueDate, lines, notes: notes || undefined }),
      });
      setIssueLines([
        blankIssue(workers[0]?.id ?? '', defaultCategoryId),
        blankIssue(workers[0]?.id ?? '', defaultCategoryId),
      ]);
      setNotes('');
      setNote(`${result.reference}: material given to workers.`);
      await reload();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Operations</p>
          <h1>Store to factory</h1>
          <p className="muted">Move bags into the factory pool, then give material to Worker-role users.</p>
        </div>
        <div className="nav-row">
          <Link className="btn ghost" href="/app/users">
            Users
          </Link>
          <Link className="btn ghost" href="/app/factory">
            Factory stock
          </Link>
        </div>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      <div className="stats">
        {(factory?.balances ?? []).map((row) => (
          <div className="stat" key={row.materialForm}>
            <span className="tiny">Factory {row.material}</span>
            <strong>{row.available}</strong>
          </div>
        ))}
      </div>

      <div className="two">
        <form className="card pad stack" onSubmit={onTransfer}>
          <h2>1. Transfer store → factory</h2>
          <p className="muted">Select bags or drums. Their quantity joins the factory pool.</p>
          <Field label="Date">
            <input type="date" value={transferDate} onChange={(event) => setTransferDate(event.target.value)} required />
          </Field>
          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th className="sheet-num" />
                  <th>Batch</th>
                  <th>Bag / drum</th>
                  <th>Material</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((item) => (
                  <tr key={item.id}>
                    <td className="sheet-num">
                      <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
                    </td>
                    <td>{item.batch}</td>
                    <td>
                      {item.kind === 'BAG' ? 'Bag' : 'Drum'} {item.packageNumber}
                    </td>
                    <td>{item.material}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
                {packages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      No bags left in the store. Record a store purchase on <Link href="/app/buying">Buying</Link>.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="tiny">
            Selected {selected.length} · quantity {selectedTotal || 0}
          </p>
          <Field label="Notes">
            <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
          </Field>
          <button className="btn primary" type="submit" disabled={pending || selected.length === 0}>
            {pending ? 'Saving…' : 'Move to factory'}
          </button>
        </form>

        <form className="card pad stack" onSubmit={onIssue}>
          <h2>2. Give to workers</h2>
          {workers.length === 0 ? (
            <Banner kind="bad">
              No workers yet. Add them on <Link href="/app/users">Users</Link> with role Worker.
            </Banner>
          ) : categories.length === 0 ? (
            <Banner kind="bad">
              No material categories. Add them on <Link href="/app/catalogue">Catalogue</Link>.
            </Banner>
          ) : (
            <p className="muted">Example: give 100 to Ahmed and 100 to Amjad. The rest stays in factory stock.</p>
          )}
          <Field label="Date">
            <input type="date" value={issueDate} onChange={(event) => setIssueDate(event.target.value)} required />
          </Field>
          {issueLines.map((line, index) => (
            <div className="row-3" key={index}>
              <Field label="Worker">
                <select
                  value={line.membershipId}
                  disabled={workers.length === 0}
                  onChange={(event) =>
                    setIssueLines((rows) =>
                      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, membershipId: event.target.value } : row)),
                    )
                  }
                >
                  {workers.length === 0 ? <option value="">No workers</option> : null}
                  {workers.map((worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Material">
                <select
                  value={line.materialCategoryId}
                  disabled={categories.length === 0}
                  onChange={(event) =>
                    setIssueLines((rows) =>
                      rows.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, materialCategoryId: event.target.value } : row,
                      ),
                    )
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity">
                <input
                  inputMode="decimal"
                  value={line.quantity}
                  placeholder="100"
                  onChange={(event) =>
                    setIssueLines((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, quantity: event.target.value } : row)))
                  }
                />
              </Field>
            </div>
          ))}
          <button
            className="btn ghost"
            type="button"
            onClick={() =>
              setIssueLines((rows) => [...rows, blankIssue(workers[0]?.id ?? '', defaultCategoryId)])
            }
          >
            Add worker line
          </button>
          <button
            className="btn primary"
            type="submit"
            disabled={pending || workers.length === 0 || categories.length === 0}
          >
            {pending ? 'Saving…' : 'Give material'}
          </button>
        </form>
      </div>
    </div>
  );
}
