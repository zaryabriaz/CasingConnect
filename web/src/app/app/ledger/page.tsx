'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canBook, labelOf, PARTNER_ROLES } from '@/lib/labels';

type BalanceSide = 'DR' | 'CR' | 'NIL';
type PaymentDirection = 'RECEIVED' | 'PAID';
type PaymentMethod = 'NONE' | 'CHEQUE' | 'OTHER';
type BalanceFilter = 'ALL' | 'RECEIVABLE' | 'PAYABLE';

type PartnerSummary = {
  partnerId: string;
  partner: string;
  roles: string[];
  currency: string;
  receivable: string;
  payable: string;
  balance: string;
  balanceSide: BalanceSide;
  entries: number;
};

type LedgerEntry = {
  id: string;
  date: string;
  reference: string;
  type: 'SALE' | 'PURCHASE' | 'PAYMENT';
  particulars: string;
  debit: string | null;
  credit: string | null;
  balance: string;
  balanceSide: BalanceSide;
};

type LedgerAccount = {
  partnerId: string;
  partner: string;
  roles: string[];
  currency: string;
  receivable: string;
  payable: string;
  balance: string;
  balanceSide: BalanceSide;
  entries: LedgerEntry[];
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function roleText(roles: string[]) {
  return roles.map((role) => labelOf(PARTNER_ROLES, role)).join(' · ');
}

function entryTypeLabel(type: LedgerEntry['type']) {
  if (type === 'SALE') return 'Sale';
  if (type === 'PURCHASE') return 'Purchase';
  return 'Payment';
}

function sideLabel(side: BalanceSide) {
  if (side === 'DR') return 'Receivable';
  if (side === 'CR') return 'Payable';
  return 'Settled';
}

function formatMoney(currency: string, amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  return `${currency} ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function defaultDirection(side: BalanceSide): PaymentDirection {
  return side === 'CR' ? 'PAID' : 'RECEIVED';
}

export default function LedgerPage() {
  const session = useSession();
  const book = canBook(session.role);
  const [rows, setRows] = useState<PartnerSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [account, setAccount] = useState<LedgerAccount | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BalanceFilter>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [direction, setDirection] = useState<PaymentDirection>('RECEIVED');
  const [method, setMethod] = useState<PaymentMethod>('NONE');
  const [showPayment, setShowPayment] = useState(false);

  function loadSummary(preferPartnerId?: string) {
    return api<PartnerSummary[]>('/ledger')
      .then((list) => {
        setRows(list);
        const nextId =
          (preferPartnerId && list.some((row) => row.partnerId === preferPartnerId) && preferPartnerId) ||
          (selectedId && list.some((row) => row.partnerId === selectedId) && selectedId) ||
          list[0]?.partnerId ||
          null;
        setSelectedId(nextId);
        if (nextId) return loadAccount(nextId);
        setAccount(null);
        return null;
      })
      .catch((caught) => setError(errorText(caught)));
  }

  function loadAccount(partnerId: string) {
    setLoadingAccount(true);
    return api<LedgerAccount>(`/ledger/${partnerId}`)
      .then((next) => {
        setAccount(next);
        setDirection(defaultDirection(next.balanceSide));
      })
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoadingAccount(false));
  }

  useEffect(() => {
    void loadSummary();
  }, [session.business.id]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter === 'RECEIVABLE' && row.balanceSide !== 'DR') return false;
      if (filter === 'PAYABLE' && row.balanceSide !== 'CR') return false;
      if (!q) return true;
      return row.partner.toLowerCase().includes(q) || roleText(row.roles).toLowerCase().includes(q);
    });
  }, [rows, query, filter]);

  const totals = useMemo(() => {
    const receivable = rows.reduce((sum, row) => sum + Number(row.receivable || 0), 0);
    const payable = rows.reduce((sum, row) => sum + Number(row.payable || 0), 0);
    return {
      receivable: receivable.toFixed(2),
      payable: payable.toFixed(2),
      currency: session.business.currency || rows[0]?.currency || 'PKR',
    };
  }, [rows, session.business.currency]);

  async function onSelect(partnerId: string) {
    if (partnerId === selectedId) return;
    setError(null);
    setNote(null);
    setShowPayment(false);
    setMethod('NONE');
    setSelectedId(partnerId);
    await loadAccount(partnerId);
  }

  async function onPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !book) return;
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    setError(null);
    setNote(null);
    try {
      const body: Record<string, string | undefined> = {
        partnerId: selectedId,
        date: String(form.get('date') || today()),
        direction,
        amount: String(form.get('amount') || '').trim(),
        method,
        notes: String(form.get('notes') || '').trim() || undefined,
      };
      if (method === 'NONE') {
        const cashPaidTo = String(form.get('cashPaidTo') || '').trim();
        if (cashPaidTo) body.cashPaidTo = cashPaidTo;
      }
      if (method === 'CHEQUE') {
        body.chequeNumber = String(form.get('chequeNumber') || '').trim();
        body.bankName = String(form.get('bankName') || '').trim();
      }
      if (method === 'OTHER') {
        body.instrumentNote = String(form.get('instrumentNote') || '').trim();
      }

      const created = await api<{ reference: string }>('/ledger/payments', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      formEl.reset();
      setMethod('NONE');
      setShowPayment(false);
      setNote(`Payment ${created.reference} recorded.`);
      await loadSummary(selectedId);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack ledger-page">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Trade</p>
          <h1>Ledger</h1>
          <p className="muted">Customer and supplier khata — debit, credit, and closing balance.</p>
        </div>
        <div className="ledger-totals">
          <div className="ledger-total is-dr">
            <span>Total receivable</span>
            <strong>{formatMoney(totals.currency, totals.receivable)}</strong>
          </div>
          <div className="ledger-total is-cr">
            <span>Total payable</span>
            <strong>{formatMoney(totals.currency, totals.payable)}</strong>
          </div>
        </div>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      <div className="ledger-layout">
        <aside className="card ledger-sidebar">
          <div className="ledger-sidebar-head">
            <strong>Parties</strong>
            <span className="tiny">{visible.length} shown</span>
          </div>

          <div className="ledger-filters" role="tablist" aria-label="Balance filter">
            {(
              [
                ['ALL', 'All'],
                ['RECEIVABLE', 'Receivable'],
                ['PAYABLE', 'Payable'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                className={filter === value ? 'is-active' : undefined}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="field ledger-search">
            <span className="sr-only">Search partner</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name"
            />
          </label>

          <div className="ledger-party-list" role="listbox" aria-label="Partners">
            {visible.map((row) => {
              const selected = row.partnerId === selectedId;
              return (
                <button
                  key={row.partnerId}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`ledger-party${selected ? ' is-selected' : ''}`}
                  onClick={() => void onSelect(row.partnerId)}
                >
                  <span className="ledger-party-main">
                    <strong>{row.partner}</strong>
                    <span className="tiny">{roleText(row.roles) || 'Partner'}</span>
                  </span>
                  <span className="ledger-party-bal">
                    <span className={`ledger-pill side-${row.balanceSide.toLowerCase()}`}>
                      {sideLabel(row.balanceSide)}
                    </span>
                    <strong>
                      {row.balanceSide === 'NIL'
                        ? formatMoney(row.currency, '0')
                        : formatMoney(row.currency, row.balance)}
                    </strong>
                  </span>
                </button>
              );
            })}
            {visible.length === 0 ? (
              <div className="ledger-empty">
                {rows.length === 0
                  ? 'No ledger activity yet. Record buying or sales with amounts first.'
                  : 'No partners match this filter.'}
              </div>
            ) : null}
          </div>
        </aside>

        <section className="card ledger-detail">
          {!account && !loadingAccount ? (
            <div className="ledger-empty tall">Select a partner to open their account.</div>
          ) : null}

          {account ? (
            <>
              <div className="ledger-detail-head">
                <div>
                  <p className="tiny eyebrow">Account of</p>
                  <h2>{account.partner}</h2>
                  <p className="tiny">{roleText(account.roles)}</p>
                </div>
                <div className="ledger-detail-actions">
                  <div className={`ledger-closing side-${account.balanceSide.toLowerCase()}`}>
                    <span>Closing balance</span>
                    <strong>
                      {account.balanceSide === 'NIL'
                        ? formatMoney(account.currency, '0')
                        : `${formatMoney(account.currency, account.balance)} ${account.balanceSide}`}
                    </strong>
                    <em>{sideLabel(account.balanceSide)}</em>
                  </div>
                  {book ? (
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => setShowPayment((open) => !open)}
                    >
                      {showPayment ? 'Hide payment' : 'Record payment'}
                    </button>
                  ) : null}
                </div>
              </div>

              {showPayment && book ? (
                <form className="form ledger-pay" onSubmit={(event) => void onPayment(event)}>
                  <div className="ledger-pay-head">
                    <h3>Record payment</h3>
                    <p className="tiny">
                      {direction === 'RECEIVED'
                        ? 'Money coming in from this party (reduces receivable).'
                        : 'Money going out to this party (reduces payable).'}
                    </p>
                  </div>
                  <div className="row-2">
                    <Field label="Date">
                      <input name="date" type="date" defaultValue={today()} required />
                    </Field>
                    <Field label="Amount">
                      <input name="amount" inputMode="decimal" placeholder="0.00" required autoFocus />
                    </Field>
                  </div>
                  <div className="row-2">
                    <Field label="Direction">
                      <select
                        value={direction}
                        onChange={(event) => setDirection(event.target.value as PaymentDirection)}
                      >
                        <option value="RECEIVED">Received from party</option>
                        <option value="PAID">Paid to party</option>
                      </select>
                    </Field>
                    <Field label="Method">
                      <select value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)}>
                        <option value="NONE">Cash</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </Field>
                  </div>
                  {method === 'NONE' ? (
                    <Field label="Handled by (optional)">
                      <input name="cashPaidTo" placeholder="Person who received or paid cash" />
                    </Field>
                  ) : null}
                  {method === 'CHEQUE' ? (
                    <div className="row-2">
                      <Field label="Cheque number">
                        <input name="chequeNumber" required />
                      </Field>
                      <Field label="Bank">
                        <input name="bankName" required />
                      </Field>
                    </div>
                  ) : null}
                  {method === 'OTHER' ? (
                    <Field label="Instrument">
                      <input name="instrumentNote" required placeholder="Describe the instrument" />
                    </Field>
                  ) : null}
                  <Field label="Notes (optional)">
                    <input name="notes" />
                  </Field>
                  <div className="ledger-pay-actions">
                    <button className="btn ghost" type="button" onClick={() => setShowPayment(false)}>
                      Cancel
                    </button>
                    <button className="btn primary" type="submit" disabled={pending}>
                      {pending ? 'Saving…' : 'Save payment'}
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="table-wrap ledger-book-wrap">
                <table className="ledger-book">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Voucher</th>
                      <th>Particulars</th>
                      <th className="num">Debit</th>
                      <th className="num">Credit</th>
                      <th className="num">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingAccount ? (
                      <tr>
                        <td colSpan={6}>Loading account…</td>
                      </tr>
                    ) : null}
                    {!loadingAccount &&
                      account.entries.map((entry) => (
                        <tr key={entry.id}>
                          <td className="ledger-date">{entry.date}</td>
                          <td className="ledger-ref">{entry.reference}</td>
                          <td>
                            <div className="ledger-particulars">
                              <span>{entry.particulars}</span>
                              <span className={`ledger-type type-${entry.type.toLowerCase()}`}>
                                {entryTypeLabel(entry.type)}
                              </span>
                            </div>
                          </td>
                          <td className="num">{entry.debit ?? '—'}</td>
                          <td className="num">{entry.credit ?? '—'}</td>
                          <td className="num">
                            {entry.balanceSide === 'NIL' ? (
                              '—'
                            ) : (
                              <span className={`ledger-run side-${entry.balanceSide.toLowerCase()}`}>
                                {entry.balance} {entry.balanceSide}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    {!loadingAccount && account.entries.length === 0 ? (
                      <tr>
                        <td colSpan={6}>No entries for this partner.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              {!book ? (
                <p className="tiny ledger-note">Only owner, manager, or accountant can record payments.</p>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
}
