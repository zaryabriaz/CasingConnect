'use client';

import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canBook } from '@/lib/labels';

type ExpenseWorker = { id: string; name: string };

type ExpenseLine = {
  id?: string;
  particulars: string;
  category: string;
  bags: string;
  rate: string;
  amount: string;
  paidTo: string;
  membershipId: string;
  notes: string;
};

type DaySheet = {
  date: string;
  total: string;
  workers: ExpenseWorker[];
  lines: Array<{
    id: string;
    particulars: string;
    category: string;
    bags: string | null;
    rate: string | null;
    amount: string;
    paidTo: string | null;
    membershipId: string | null;
    workerName: string | null;
    notes: string | null;
  }>;
};

const CATEGORIES = [
  'Labour',
  'Transport',
  'Salt',
  'Chemicals',
  'Utilities',
  'Food / Tea',
  'Petrol / Diesel',
  'Maintenance',
  'Office',
  'Other',
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isSalt(category: string) {
  return category.trim().toLowerCase() === 'salt';
}

function isLabour(category: string) {
  return category.trim().toLowerCase() === 'labour';
}

function saltAmount(bags: string, rate: string) {
  const bagCount = Number(bags);
  const bagRate = Number(rate);
  if (!Number.isFinite(bagCount) || !Number.isFinite(bagRate) || bagCount <= 0 || bagRate <= 0) return '';
  const value = bagCount * bagRate;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function blankRow(): ExpenseLine {
  return {
    particulars: '',
    category: '',
    bags: '',
    rate: '',
    amount: '',
    paidTo: '',
    membershipId: '',
    notes: '',
  };
}

function toRows(sheet: DaySheet): ExpenseLine[] {
  const rows = sheet.lines.map((line) => ({
    id: line.id,
    particulars: line.particulars,
    category: line.category,
    bags: line.bags ?? '',
    rate: line.rate ?? '',
    amount: line.amount,
    paidTo: line.paidTo ?? '',
    membershipId: line.membershipId ?? '',
    notes: line.notes ?? '',
  }));
  return rows.length ? [...rows, blankRow()] : [blankRow(), blankRow(), blankRow()];
}

function rowHasContent(row: ExpenseLine) {
  return Boolean(
    row.particulars.trim() ||
      row.category.trim() ||
      row.bags.trim() ||
      row.rate.trim() ||
      row.amount.trim() ||
      row.paidTo.trim() ||
      row.membershipId.trim() ||
      row.notes.trim(),
  );
}

export default function ExpensesPage() {
  const session = useSession();
  const editable = canBook(session.role);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState<ExpenseLine[]>([blankRow(), blankRow(), blankRow()]);
  const [workers, setWorkers] = useState<ExpenseWorker[]>([]);
  const [savedTotal, setSavedTotal] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNote(null);
    api<DaySheet>(`/expenses?date=${date}`)
      .then((sheet) => {
        setRows(toRows(sheet));
        setWorkers(sheet.workers ?? []);
        setSavedTotal(sheet.total);
      })
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }, [date, session.business.id]);

  const filled = rows.filter(rowHasContent);
  const dayTotal = filled.reduce((sum, row) => {
    const amount = isSalt(row.category) ? saltAmount(row.bags, row.rate) || row.amount : row.amount;
    return sum + (Number(amount) || 0);
  }, 0);

  function updateRow(index: number, patch: Partial<ExpenseLine>) {
    setRows((current) => {
      const next = current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const merged = { ...row, ...patch };
        if (isSalt(merged.category)) {
          const bags = patch.bags !== undefined ? patch.bags : merged.bags;
          const rate = patch.rate !== undefined ? patch.rate : merged.rate;
          return { ...merged, bags, rate, amount: saltAmount(bags, rate), membershipId: '' };
        }
        if (patch.category !== undefined && !isSalt(patch.category) && !isLabour(patch.category)) {
          return { ...merged, bags: '', rate: '', membershipId: '' };
        }
        if (patch.membershipId !== undefined && isLabour(merged.category)) {
          const worker = workers.find((item) => item.id === patch.membershipId);
          return {
            ...merged,
            paidTo: worker?.name ?? merged.paidTo,
            particulars: merged.particulars.trim() || (worker ? `Labour — ${worker.name}` : merged.particulars),
          };
        }
        if (patch.category !== undefined && isLabour(patch.category)) {
          return { ...merged, bags: '', rate: '' };
        }
        return merged;
      });
      const last = next[next.length - 1];
      return rowHasContent(last) ? [...next, blankRow()] : next;
    });
    setNote(null);
  }

  function removeRow(index: number) {
    setRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      return next.length ? next : [blankRow()];
    });
    setNote(null);
  }

  async function saveDay() {
    setError(null);
    setNote(null);

    const lines = [];
    for (const row of filled) {
      const salt = isSalt(row.category);
      const labour = isLabour(row.category);
      const amount = salt ? saltAmount(row.bags, row.rate) : row.amount.trim();
      if (!row.particulars.trim() || !row.category.trim()) {
        setError('Each filled row needs particulars and category.');
        return;
      }
      if (salt && (!row.bags.trim() || !row.rate.trim() || !amount)) {
        setError('Salt lines need number of bags and rate per bag.');
        return;
      }
      if (!salt && !amount) {
        setError('Each filled row needs an amount.');
        return;
      }
      lines.push({
        ...(row.id ? { id: row.id } : {}),
        particulars: row.particulars.trim(),
        category: row.category.trim(),
        ...(salt ? { bags: row.bags.trim(), rate: row.rate.trim() } : {}),
        amount,
        paidTo: row.paidTo.trim() || undefined,
        ...(labour && row.membershipId ? { membershipId: row.membershipId } : {}),
        notes: row.notes.trim() || undefined,
      });
    }

    setSaving(true);
    try {
      const sheet = await api<DaySheet>('/expenses', {
        method: 'PUT',
        body: JSON.stringify({ date, lines }),
      });
      setRows(toRows(sheet));
      setWorkers(sheet.workers ?? []);
      setSavedTotal(sheet.total);
      setNote(`Saved ${sheet.lines.length} line${sheet.lines.length === 1 ? '' : 's'} for ${date}.`);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Money</p>
          <h1>Daily expenses</h1>
          <p className="muted">
            For Salt, enter bags × rate. For Labour, pick a worker (optional) and enter the wage amount.
          </p>
        </div>
        <label className="field day-pick">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      <div className="stats">
        <div className="stat">
          <span className="tiny">Day total</span>
          <strong>{dayTotal || savedTotal || 0}</strong>
        </div>
        <div className="stat">
          <span className="tiny">Lines</span>
          <strong>{filled.length}</strong>
        </div>
      </div>

      <div className="sheet-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th className="sheet-num">#</th>
              <th>Particulars</th>
              <th>Category</th>
              <th>Worker</th>
              <th>Bags</th>
              <th>Rate / bag</th>
              <th>Amount</th>
              <th>Paid to</th>
              <th>Notes</th>
              {editable ? <th className="sheet-actions" /> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={editable ? 10 : 9} className="muted">
                  Opening day sheet…
                </td>
              </tr>
            ) : (
              rows.map((row, index) => {
                const salt = isSalt(row.category);
                const labour = isLabour(row.category);
                return (
                  <tr key={row.id ?? `new-${index}`}>
                    <td className="sheet-num">{index + 1}</td>
                    <td>
                      <input
                        value={row.particulars}
                        disabled={!editable}
                        placeholder="What was spent"
                        onChange={(event) => updateRow(index, { particulars: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        list="expense-categories"
                        value={row.category}
                        disabled={!editable}
                        placeholder="Category"
                        onChange={(event) => updateRow(index, { category: event.target.value })}
                      />
                    </td>
                    <td>
                      <select
                        value={row.membershipId}
                        disabled={!editable || !labour}
                        onChange={(event) => updateRow(index, { membershipId: event.target.value })}
                      >
                        <option value="">{labour ? 'Worker' : '—'}</option>
                        {workers.map((worker) => (
                          <option key={worker.id} value={worker.id}>
                            {worker.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        value={row.bags}
                        disabled={!editable || !salt}
                        inputMode="decimal"
                        placeholder={salt ? 'Bags' : '—'}
                        onChange={(event) => updateRow(index, { bags: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.rate}
                        disabled={!editable || !salt}
                        inputMode="decimal"
                        placeholder={salt ? 'Rate' : '—'}
                        onChange={(event) => updateRow(index, { rate: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.amount}
                        disabled={!editable || salt}
                        inputMode="decimal"
                        placeholder={salt ? 'Bags × rate' : '0'}
                        onChange={(event) => updateRow(index, { amount: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.paidTo}
                        disabled={!editable}
                        placeholder="Paid to"
                        onChange={(event) => updateRow(index, { paidTo: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        value={row.notes}
                        disabled={!editable}
                        placeholder="Notes"
                        onChange={(event) => updateRow(index, { notes: event.target.value })}
                      />
                    </td>
                    {editable ? (
                      <td className="sheet-actions">
                        <button className="btn ghost" type="button" onClick={() => removeRow(index)} disabled={rows.length === 1}>
                          Remove
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6}>Total</td>
              <td>{dayTotal || 0}</td>
              <td colSpan={editable ? 3 : 2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <datalist id="expense-categories">
        {CATEGORIES.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>

      {editable ? (
        <div className="split">
          <button className="btn ghost" type="button" onClick={() => setRows((current) => [...current, blankRow()])}>
            Add row
          </button>
          <button className="btn primary" type="button" disabled={saving || loading} onClick={() => void saveDay()}>
            {saving ? 'Saving…' : 'Save day'}
          </button>
        </div>
      ) : (
        <p className="muted">Your role can view this sheet. Owner, manager, or accountant can edit it.</p>
      )}
    </div>
  );
}
