'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { IconPdf } from '@/components/nav-icons';
import { openSaleInvoicePdf } from '@/lib/sale-invoice';
import { Partner, PartnerPage } from '@/lib/types';

type PaymentMode = 'CASH' | 'CREDIT';
type CreditInstrument = 'NONE' | 'CHEQUE' | 'OTHER';
type SaleChannel = 'LOCAL' | 'EXPORT';

type AvailableQuality = {
  qualityId: string;
  quality: string;
  casingTypeId: string;
  casingType: string;
  produced: string;
  sold: string;
  available: string;
};

type SaleLine = {
  qualityId: string;
  casingTypeId: string;
  quality: string;
  casingType: string;
  quantity: string;
  rate: string | null;
  amount: string | null;
};

type Sale = {
  id: string;
  reference: string;
  date: string;
  customer: string;
  channel: SaleChannel;
  lines: SaleLine[];
  quantity: string;
  amount: string | null;
  currency: string;
  destinationCountry: string | null;
  exportRef: string | null;
  paymentMode: PaymentMode;
  cashPaidTo: string | null;
  creditInstrument: CreditInstrument;
  chequeNumber: string | null;
  bankName: string | null;
  instrumentNote: string | null;
  notes?: string | null;
};

type SellEntry = { selling: string; rate: string };

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function paymentLabel(sale: Sale) {
  if (sale.paymentMode === 'CASH') {
    return sale.cashPaidTo ? `Cash · ${sale.cashPaidTo}` : 'Cash';
  }
  if (sale.creditInstrument === 'CHEQUE') {
    return `Credit · Cheque ${sale.chequeNumber ?? ''}${sale.bankName ? ` · ${sale.bankName}` : ''}`;
  }
  if (sale.creditInstrument === 'OTHER') {
    return `Credit · ${sale.instrumentNote ?? 'Instrument'}`;
  }
  return 'Credit · No instrument';
}

function lineAmount(selling: string, rate: string) {
  const qty = Number(selling);
  const price = Number(rate);
  if (!(qty > 0) || !(price > 0)) return '';
  return (Math.round(qty * price * 100) / 100).toFixed(2);
}

function toCustomers(items: Partner[]) {
  const active = items.filter((item) => item.active);
  const customers = active.filter((item) => item.roles.includes('CUSTOMER') || item.roles.includes('BUYER'));
  return customers.length ? customers : active;
}

export default function SalesPage() {
  const session = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [partners, setPartners] = useState<PartnerPage['items']>([]);
  const [partnerId, setPartnerId] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [available, setAvailable] = useState<AvailableQuality[]>([]);
  const [casingTypeId, setCasingTypeId] = useState('');
  const [entries, setEntries] = useState<Record<string, SellEntry>>({});
  const [channel, setChannel] = useState<SaleChannel>('LOCAL');
  const [currency, setCurrency] = useState(session.business.currency || 'PKR');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [exportRef, setExportRef] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [creditInstrument, setCreditInstrument] = useState<CreditInstrument>('NONE');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function invoiceBusiness() {
    return {
      name: session.business.name,
      phone: session.business.phone,
      address: [session.business.address, session.business.city].filter(Boolean).join(', ') || null,
    };
  }

  function openInvoice(sale: Sale) {
    try {
      openSaleInvoicePdf(invoiceBusiness(), sale);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  function reload(options?: { preferPartnerId?: string; keepEntries?: boolean }) {
    return Promise.all([
      api<Sale[]>('/sales'),
      api<PartnerPage>('/partners?pageSize=100'),
      api<AvailableQuality[]>('/sales/available'),
    ]).then(([saleList, partnerPage, availableList]) => {
      setSales(saleList);
      const customers = toCustomers(partnerPage.items);
      setPartners(customers);
      if (customers.length === 0) setAddingCustomer(true);
      setPartnerId((current) => {
        if (options?.preferPartnerId && customers.some((item) => item.id === options.preferPartnerId)) {
          return options.preferPartnerId!;
        }
        if (current && customers.some((item) => item.id === current)) return current;
        return customers[0]?.id ?? '';
      });
      setAvailable(availableList);
      const preferred =
        availableList.find((row) => Number(row.available) > 0) ?? availableList[0];
      setCasingTypeId((current) => {
        if (current && availableList.some((row) => row.casingTypeId === current)) return current;
        return preferred?.casingTypeId ?? '';
      });
      if (!options?.keepEntries) setEntries({});
    });
  }

  async function createCustomer(options?: { keepEntries?: boolean }) {
    const name = newCustomerName.trim();
    if (name.length < 2) {
      setError('Enter a customer name (at least 2 characters).');
      return null;
    }
    const created = await api<Partner>('/partners', {
      method: 'POST',
      body: JSON.stringify({
        name,
        roles: ['CUSTOMER'],
        ...(newCustomerPhone.trim() ? { phone: newCustomerPhone.trim() } : {}),
      }),
    });
    setNewCustomerName('');
    setNewCustomerPhone('');
    setAddingCustomer(false);
    await reload({ preferPartnerId: created.id, keepEntries: options?.keepEntries });
    return created.id;
  }

  useEffect(() => {
    reload().catch((caught) => setError(errorText(caught)));
  }, []);

  const casingTypes = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of available) map.set(row.casingTypeId, row.casingType);
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [available]);

  const rows = useMemo(
    () =>
      available
        .filter((row) => !casingTypeId || row.casingTypeId === casingTypeId)
        .sort((a, b) => a.quality.localeCompare(b.quality)),
    [available, casingTypeId],
  );

  function setEntry(qualityId: string, patch: Partial<SellEntry>) {
    setEntries((current) => {
      const prior = current[qualityId] ?? { selling: '', rate: '' };
      return { ...current, [qualityId]: { ...prior, ...patch } };
    });
  }

  const sellingTotal = rows.reduce((sum, row) => sum + (Number(entries[row.qualityId]?.selling) || 0), 0);
  const amountTotal = rows.reduce((sum, row) => {
    const entry = entries[row.qualityId];
    if (!entry) return sum;
    const amount = Number(lineAmount(entry.selling, entry.rate));
    return sum + (amount || 0);
  }, 0);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lines = rows
      .map((row) => {
        const entry = entries[row.qualityId];
        if (!entry?.selling.trim() || !(Number(entry.selling) > 0)) return null;
        return {
          casingTypeId: row.casingTypeId,
          qualityId: row.qualityId,
          quantity: entry.selling.trim(),
          ...(entry.rate.trim() ? { rate: entry.rate.trim() } : {}),
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (lines.length === 0) {
      setError('Enter a quantity on at least one quality.');
      return;
    }

    for (const row of rows) {
      const entry = entries[row.qualityId];
      if (!entry?.selling.trim()) continue;
      if (Number(entry.selling) > Number(row.available)) {
        setError(`${row.quality}: quantity ${entry.selling} is more than available ${row.available}.`);
        return;
      }
    }

    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    setPending(true);
    setError(null);
    try {
      let customerId = partnerId;
      if (addingCustomer || !customerId) {
        const createdId = await createCustomer({ keepEntries: true });
        if (!createdId) {
          setPending(false);
          return;
        }
        customerId = createdId;
      }

      const created = await api<Sale>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          date: form.get('date'),
          partnerId: customerId,
          channel,
          currency: currency.trim().toUpperCase() || undefined,
          ...(channel === 'EXPORT'
            ? {
                destinationCountry: destinationCountry.trim() || undefined,
                exportRef: exportRef.trim() || undefined,
              }
            : {}),
          lines,
          paymentMode,
          ...(paymentMode === 'CASH'
            ? { cashPaidTo: String(form.get('cashPaidTo') ?? '').trim() }
            : {
                creditInstrument,
                ...(creditInstrument === 'CHEQUE'
                  ? {
                      chequeNumber: String(form.get('chequeNumber') ?? '').trim(),
                      bankName: String(form.get('bankName') ?? '').trim(),
                    }
                  : {}),
                ...(creditInstrument === 'OTHER'
                  ? { instrumentNote: String(form.get('instrumentNote') ?? '').trim() }
                  : {}),
              }),
          notes: form.get('notes'),
        }),
      });
      formEl.reset();
      setEntries({});
      setChannel('LOCAL');
      setCurrency(session.business.currency || 'PKR');
      setDestinationCountry('');
      setExportRef('');
      setPaymentMode('CASH');
      setCreditInstrument('NONE');
      setAddingCustomer(false);
      await reload({ preferPartnerId: customerId });
      openInvoice(created);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  const hasStock = available.some((row) => Number(row.available) > 0);
  const ready = hasStock && (Boolean(partnerId) || addingCustomer);

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Sales</p>
          <h1>What was sold</h1>
          <p className="muted">Local or Export sale against available finished qualities.</p>
        </div>
        {casingTypes.length > 1 ? (
          <label className="field day-pick">
            <span>Casing type</span>
            <select value={casingTypeId} onChange={(event) => setCasingTypeId(event.target.value)}>
              {casingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}

      {!hasStock ? (
        <div className="card pad">
          Nothing available to sell yet. Record output on <Link href="/app/production">Production</Link> first.
        </div>
      ) : (
        <form className="stack" onSubmit={onSubmit}>
          <div className="card pad form">
            <div className="row-3">
              <Field label="Channel">
                <select
                  value={channel}
                  onChange={(event) => {
                    const next = event.target.value as SaleChannel;
                    setChannel(next);
                    setCurrency(next === 'EXPORT' ? 'USD' : session.business.currency || 'PKR');
                  }}
                >
                  <option value="LOCAL">Local</option>
                  <option value="EXPORT">Export</option>
                </select>
              </Field>
              <Field label="Date">
                <input name="date" type="date" required defaultValue={today()} />
              </Field>
              <Field label="Currency">
                <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                  <option value="PKR">PKR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="AED">AED</option>
                </select>
              </Field>
            </div>
            <div className="row-2">
              <Field label="Customer">
                <select
                  value={addingCustomer ? '__new__' : partnerId}
                  onChange={(event) => {
                    if (event.target.value === '__new__') {
                      setAddingCustomer(true);
                      return;
                    }
                    setAddingCustomer(false);
                    setPartnerId(event.target.value);
                  }}
                  required={!addingCustomer}
                >
                  {partners.length === 0 ? <option value="">No customers yet</option> : null}
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                  <option value="__new__">+ Add new customer</option>
                </select>
              </Field>
              {channel === 'EXPORT' ? (
                <Field label="Destination country">
                  <input
                    value={destinationCountry}
                    onChange={(event) => setDestinationCountry(event.target.value)}
                    placeholder="e.g. UAE"
                  />
                </Field>
              ) : (
                <div />
              )}
            </div>
            {channel === 'EXPORT' ? (
              <Field label="Export reference (BL / packing / invoice)">
                <input
                  value={exportRef}
                  onChange={(event) => setExportRef(event.target.value)}
                  placeholder="Optional"
                />
              </Field>
            ) : null}
            {addingCustomer ? (
              <div className="stack">
                <div className="row-2">
                  <Field label="New customer name">
                    <input
                      value={newCustomerName}
                      onChange={(event) => setNewCustomerName(event.target.value)}
                      required
                      minLength={2}
                      placeholder="e.g. Haji Bashir"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <input
                      value={newCustomerPhone}
                      onChange={(event) => setNewCustomerPhone(event.target.value)}
                      placeholder="03xx…"
                    />
                  </Field>
                </div>
                <div className="nav-row">
                  <button
                    className="btn ghost"
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      setPending(true);
                      setError(null);
                      void createCustomer()
                        .catch((caught) => setError(errorText(caught)))
                        .finally(() => setPending(false));
                    }}
                  >
                    Save customer only
                  </button>
                  <button
                    className="btn ghost"
                    type="button"
                    onClick={() => {
                      setAddingCustomer(false);
                      setNewCustomerName('');
                      setNewCustomerPhone('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
                <p className="tiny">New customers are saved as Partners with the Customer role.</p>
              </div>
            ) : null}
          </div>

          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th>Quality</th>
                  <th>Available</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const entry = entries[row.qualityId] ?? { selling: '', rate: '' };
                  const amount = lineAmount(entry.selling, entry.rate);
                  return (
                    <tr key={row.qualityId}>
                      <td>
                        <strong>{row.quality}</strong>
                        <div className="tiny">
                          {row.casingType} · hanks {row.produced} · sold {row.sold}
                        </div>
                      </td>
                      <td>{row.available}</td>
                      <td>
                        <input
                          inputMode="decimal"
                          placeholder="0"
                          value={entry.selling}
                          onChange={(event) => setEntry(row.qualityId, { selling: event.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          inputMode="decimal"
                          placeholder="0"
                          value={entry.rate}
                          onChange={(event) => setEntry(row.qualityId, { rate: event.target.value })}
                        />
                      </td>
                      <td>{amount || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Sale total</td>
                  <td>
                    <strong>{sellingTotal || 0}</strong>
                  </td>
                  <td />
                  <td>
                    <strong>{amountTotal ? amountTotal.toFixed(2) : '—'}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="tiny">Leave Quantity blank for qualities you are not including on this invoice.</p>

          <div className="card pad form">
            <Field label="Payment">
              <div className="checks">
                <label>
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'CASH'}
                    onChange={() => {
                      setPaymentMode('CASH');
                      setCreditInstrument('NONE');
                    }}
                  />
                  Cash
                </label>
                <label>
                  <input
                    type="radio"
                    name="paymentMode"
                    checked={paymentMode === 'CREDIT'}
                    onChange={() => setPaymentMode('CREDIT')}
                  />
                  Credit
                </label>
              </div>
            </Field>
            {paymentMode === 'CASH' ? (
              <Field label="Cash received by">
                <input name="cashPaidTo" required minLength={2} placeholder="Person who received the cash" />
              </Field>
            ) : (
              <>
                <Field label="Anything given for credit?">
                  <select
                    value={creditInstrument}
                    onChange={(event) => setCreditInstrument(event.target.value as CreditInstrument)}
                  >
                    <option value="NONE">No — open credit only</option>
                    <option value="CHEQUE">Yes — cheque</option>
                    <option value="OTHER">Yes — other (note, etc.)</option>
                  </select>
                </Field>
                {creditInstrument === 'CHEQUE' ? (
                  <div className="row-2">
                    <Field label="Cheque number">
                      <input name="chequeNumber" required minLength={1} placeholder="e.g. 452189" />
                    </Field>
                    <Field label="Bank">
                      <input name="bankName" required minLength={2} placeholder="Bank name" />
                    </Field>
                  </div>
                ) : null}
                {creditInstrument === 'OTHER' ? (
                  <Field label="What was given">
                    <input name="instrumentNote" required minLength={2} placeholder="Promissory note, receipt…" />
                  </Field>
                ) : null}
              </>
            )}
            <Field label="Notes">
              <input name="notes" />
            </Field>
            <button className="btn primary" type="submit" disabled={pending || !ready}>
              {pending ? 'Recording…' : 'Record invoice'}
            </button>
          </div>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date</th>
              <th>Channel</th>
              <th>Qualities</th>
              <th>Hanks</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id}>
                <td>{sale.reference}</td>
                <td>{sale.date}</td>
                <td>
                  {sale.channel === 'EXPORT' ? 'Export' : 'Local'}
                  {sale.destinationCountry ? <div className="tiny">{sale.destinationCountry}</div> : null}
                </td>
                <td>
                  {sale.lines.map((line) => (
                    <div key={line.qualityId}>
                      {line.quality}
                      <div className="tiny">
                        {line.casingType} · {line.quantity}
                        {line.rate ? ` @ ${line.rate}` : ''}
                      </div>
                    </div>
                  ))}
                </td>
                <td>{sale.quantity}</td>
                <td>{sale.customer}</td>
                <td>{sale.amount ? `${sale.currency} ${sale.amount}` : '—'}</td>
                <td>{paymentLabel(sale)}</td>
                <td>
                  <button
                    className="btn-invoice"
                    type="button"
                    onClick={() => openInvoice(sale)}
                    title="Open invoice PDF"
                    aria-label={`Open invoice PDF for ${sale.reference}`}
                  >
                    <IconPdf />
                    <span>Invoice</span>
                  </button>
                </td>
              </tr>
            ))}
            {sales.length === 0 ? (
              <tr>
                <td colSpan={9}>No invoice recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
