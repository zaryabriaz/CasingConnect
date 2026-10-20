'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canBook } from '@/lib/labels';
import { CasingType, PartnerPage } from '@/lib/types';

type MaterialForm = 'RODA' | 'EIGHTEEN_UP' | 'QUALITY';

type PackageLine = {
  kind: 'BAG' | 'DRUM';
  packageNumber: string;
  quantity: string;
};

type PackGroup = {
  kind: 'BAG' | 'DRUM';
  count: string;
  each: string;
  firstNumber: string;
};

type PaymentMode = 'CASH' | 'CREDIT';
type CreditInstrument = 'NONE' | 'CHEQUE' | 'OTHER';

type Receipt = {
  id: string;
  reference: string;
  date: string;
  supplier: string;
  material: string;
  quantity: string;
  rate: string | null;
  amount: string | null;
  currency: string;
  place: string;
  destination: 'FACTORY' | 'STORE';
  paymentMode: PaymentMode;
  cashPaidTo: string | null;
  creditInstrument: CreditInstrument;
  chequeNumber: string | null;
  bankName: string | null;
  instrumentNote: string | null;
  packages: PackageLine[];
};

function paymentLabel(receipt: Receipt) {
  if (receipt.paymentMode === 'CASH') {
    return receipt.cashPaidTo ? `Cash · ${receipt.cashPaidTo}` : 'Cash';
  }
  if (receipt.creditInstrument === 'CHEQUE') {
    return `Credit · Cheque ${receipt.chequeNumber ?? ''}${receipt.bankName ? ` · ${receipt.bankName}` : ''}`;
  }
  if (receipt.creditInstrument === 'OTHER') {
    return `Credit · ${receipt.instrumentNote ?? 'Instrument'}`;
  }
  return 'Credit · No instrument';
}

const MATERIALS: [MaterialForm, string][] = [
  ['RODA', 'Roda'],
  ['EIGHTEEN_UP', '18/UP'],
  ['QUALITY', 'Quality'],
];

function formatTotal(value: number) {
  if (!value) return '';
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}

function planBags(total: number, each: number) {
  if (!(total > 0) || !(each > 0)) return null;
  if (each > total) return { full: 0, remainder: total, count: 1, last: total, overflow: true };
  const full = Math.floor(total / each);
  const used = full * each;
  const remainder = Math.round((total - used) * 1000) / 1000;
  if (remainder === 0) return { full, remainder: 0, count: full, last: each, overflow: false };
  return { full, remainder, count: full + 1, last: remainder, overflow: false };
}

function filledGroups(groups: PackGroup[]) {
  return groups.filter((group) => group.each.trim() !== '' && Number(group.each) > 0);
}

function expandGroups(groups: PackGroup[], bought: string): PackageLine[] {
  const total = Number(bought);
  const active = filledGroups(groups);
  const nextNumber = { BAG: 1, DRUM: 1 };
  const lines: PackageLine[] = [];
  active.forEach((group, groupIndex) => {
    const each = Number(group.each);
    const typedStart = Number.parseInt(group.firstNumber, 10);
    const start = group.firstNumber.trim() && Number.isFinite(typedStart) ? typedStart : nextNumber[group.kind];
    const plan = active.length === 1 ? planBags(total, each) : null;
    const count = plan ? plan.count : Number.parseInt(group.count, 10) || 0;
    for (let index = 0; index < count; index += 1) {
      const isLast = groupIndex === active.length - 1 && index === count - 1;
      const quantity = plan && isLast ? formatTotal(plan.last) : group.each.trim();
      if (!quantity) continue;
      lines.push({
        kind: group.kind,
        packageNumber: String(start + index),
        quantity,
      });
    }
    if (count > 0) nextNumber[group.kind] = start + count;
  });
  return lines;
}

function groupLabel(group: PackGroup, start: number) {
  const count = Number.parseInt(group.count, 10) || 0;
  if (!count || !group.each.trim()) return '';
  const end = start + count - 1;
  const name = group.kind === 'BAG' ? 'Bag' : 'Drum';
  const range = count === 1 ? `${name} ${start}` : `${name}s ${start}–${end}`;
  return `${range}, ${group.each} in each`;
}

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default function BuyingPage() {
  const session = useSession();
  const book = canBook(session.role);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [partners, setPartners] = useState<PartnerPage['items']>([]);
  const [casingTypes, setCasingTypes] = useState<CasingType[]>([]);
  const [casingTypeId, setCasingTypeId] = useState('');
  const [material, setMaterial] = useState<MaterialForm>('RODA');
  const [destination, setDestination] = useState<'FACTORY' | 'STORE'>('FACTORY');
  const [groups, setGroups] = useState<PackGroup[]>([{ kind: 'BAG', count: '', each: '', firstNumber: '' }]);
  const [bought, setBought] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [creditInstrument, setCreditInstrument] = useState<CreditInstrument>('NONE');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rateDrafts, setRateDrafts] = useState<Record<string, string>>({});
  const [savingRateId, setSavingRateId] = useState<string | null>(null);

  async function saveMissingRate(receiptId: string) {
    const rate = (rateDrafts[receiptId] ?? '').trim();
    if (!rate || !(Number(rate) > 0)) {
      setError('Enter a purchase rate greater than zero.');
      return;
    }
    setSavingRateId(receiptId);
    setError(null);
    try {
      await api(`/receipts/${receiptId}/rate`, {
        method: 'PATCH',
        body: JSON.stringify({ rate }),
      });
      setRateDrafts((current) => {
        const next = { ...current };
        delete next[receiptId];
        return next;
      });
      await loadReceipts();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSavingRateId(null);
    }
  }

  function loadReceipts() {
    return api<Receipt[]>('/receipts').then(setReceipts);
  }

  useEffect(() => {
    Promise.all([
      loadReceipts(),
      api<PartnerPage>('/partners?pageSize=100'),
      api<CasingType[]>('/casing-types'),
    ])
      .then(([, partnerPage, types]) => {
        setPartners(partnerPage.items.filter((item) => item.active));
        const activeTypes = types.filter((item) => item.active);
        setCasingTypes(activeTypes);
        const preferred = activeTypes.find((item) => item.code === 'SHEEP') ?? activeTypes[0];
        setCasingTypeId(preferred?.id ?? '');
      })
      .catch((caught) => setError(errorText(caught)));
  }, []);

  const selectedType = casingTypes.find((item) => item.id === casingTypeId);
  const qualities = (selectedType?.qualities ?? []).filter((item) => item.active);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const rate = String(form.get('rate') ?? '').trim();
    if (!rate || !(Number(rate) > 0)) {
      setError('Enter the purchase rate so the amount can post to the ledger.');
      return;
    }
    const storeLines = expandGroups(groups, bought);
    const active = filledGroups(groups);
    const plan = active.length === 1 ? planBags(Number(bought), Number(active[0]?.each)) : null;
    if (destination === 'STORE' && plan?.overflow) {
      setError('The quantity in each bag is more than the number bought.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api('/receipts', {
        method: 'POST',
        body: JSON.stringify({
          date: form.get('date'),
          partnerId: form.get('partnerId'),
          casingTypeId: casingTypeId || undefined,
          materialForm: material,
          qualityId: material === 'QUALITY' ? form.get('qualityId') : undefined,
          quantity: bought,
          destination,
          packages: destination === 'STORE' ? storeLines : [],
          rate,
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
      setMaterial('RODA');
      setDestination('FACTORY');
      setPaymentMode('CASH');
      setCreditInstrument('NONE');
      setGroups([{ kind: 'BAG', count: '', each: '', firstNumber: '' }]);
      setBought('');
      await loadReceipts();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  }

  const ready = partners.length > 0 && casingTypes.length > 0;
  const suggestion = filledGroups(groups).length === 1 ? planBags(Number(bought), Number(filledGroups(groups)[0]?.each)) : null;
  const storePreview = expandGroups(groups, bought);

  function updateGroup(index: number, patch: Partial<PackGroup>) {
    setGroups((rows) => rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Buying</p>
        <h1>What was bought</h1>
        <p className="muted">
          Choose the casing type (sheep, beef, or another active type), then record roda, 18/UP, or a quality.
          Send it to the factory, or to the store in bags and drums.
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      {ready ? (
        <form className="card pad form" onSubmit={onSubmit}>
          <h2>Record a purchase</h2>
          <div className="row-2">
            <Field label="Date">
              <input name="date" type="date" required defaultValue={today()} />
            </Field>
            <Field label="Supplier">
              <select name="partnerId" required defaultValue={partners[0]?.id}>
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Casing type">
            <select value={casingTypeId} onChange={(event) => setCasingTypeId(event.target.value)} required>
              {casingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="What was bought">
            <div className="checks">
              {MATERIALS.map(([code, label]) => (
                <label key={code}>
                  <input
                    type="radio"
                    name="materialForm"
                    checked={material === code}
                    onChange={() => setMaterial(code)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </Field>
          {material === 'QUALITY' ? (
            <Field label="Quality">
              <select name="qualityId" required defaultValue={qualities[0]?.id}>
                {qualities.map((quality) => (
                  <option key={quality.id} value={quality.id}>
                    {quality.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <div className="row-2">
            <Field label="Number">
              <input inputMode="decimal" required placeholder="1000" value={bought} onChange={(event) => setBought(event.target.value)} />
            </Field>
            <Field label="Sent to">
              <select name="destination" value={destination} onChange={(event) => setDestination(event.target.value as 'FACTORY' | 'STORE')}>
                <option value="FACTORY">Factory</option>
                <option value="STORE">Store</option>
              </select>
            </Field>
          </div>
          {destination === 'STORE' ? (
            <div className="stack">
              {suggestion?.overflow ? (
                <Banner kind="bad">The quantity in each is more than {bought} bought.</Banner>
              ) : null}
              {suggestion && !suggestion.overflow && suggestion.remainder > 0 ? (
                <Banner kind="note">
                  {suggestion.full} bags hold {filledGroups(groups)[0]?.each}. {formatTotal(suggestion.remainder)} is left, so you need {suggestion.count} bags. The last bag holds {formatTotal(suggestion.remainder)}.
                </Banner>
              ) : null}
              {groups.map((group, index) => {
                const earlier = expandGroups(groups.slice(0, index), bought).filter((line) => line.kind === group.kind);
                const start = group.firstNumber.trim()
                  ? Number.parseInt(group.firstNumber, 10)
                  : earlier.length
                    ? Number(earlier[earlier.length - 1]?.packageNumber) + 1
                    : 1;
                const planned = filledGroups(groups).length === 1 ? suggestion : null;
                const count = planned ? planned.count : Number.parseInt(group.count, 10) || 0;
                const name = group.kind === 'BAG' ? 'Bag' : 'Drum';
                const summary =
                  planned && !planned.overflow && planned.remainder > 0
                    ? `${name}s ${start}–${start + planned.full - 1} hold ${group.each}. ${name} ${start + planned.full} holds ${formatTotal(planned.remainder)}.`
                    : groupLabel({ ...group, count: String(count) }, Number.isFinite(start) ? start : 1);
                return (
                  <div className="card pad stack" key={index}>
                    <div className="row-2">
                      <Field label="Bag or drum">
                        <select value={group.kind} onChange={(event) => updateGroup(index, { kind: event.target.value as PackGroup['kind'] })}>
                          <option value="BAG">Bag</option>
                          <option value="DRUM">Drum</option>
                        </select>
                      </Field>
                      <Field label="How many">
                        <input readOnly value={planned && !planned.overflow ? String(planned.count) : group.count} />
                      </Field>
                      <Field label="Quantity in each">
                        <input inputMode="decimal" value={group.each} onChange={(event) => updateGroup(index, { each: event.target.value })} />
                      </Field>
                      <Field label="First number">
                        <input
                          inputMode="numeric"
                          placeholder="1"
                          value={group.firstNumber}
                          onChange={(event) => updateGroup(index, { firstNumber: event.target.value })}
                        />
                      </Field>
                    </div>
                    {summary ? <p className="tiny">{summary}</p> : null}
                    {groups.length > 1 ? (
                      <button className="btn ghost" type="button" onClick={() => setGroups((rows) => rows.filter((_, rowIndex) => rowIndex !== index))}>
                        Remove this group
                      </button>
                    ) : null}
                  </div>
                );
              })}
              <button
                className="btn ghost"
                type="button"
                onClick={() => setGroups((rows) => [...rows, { kind: 'BAG', count: '', each: '', firstNumber: '' }])}
              >
                Add another group
              </button>
            </div>
          ) : (
            <p className="tiny">At the factory this stays as one number. Bags and drums are recorded when it goes to the store.</p>
          )}
          <Field label="Rate (required for ledger)">
            <input name="rate" inputMode="decimal" placeholder="1800" required />
          </Field>
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
            <Field label="Cash given to">
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
          <button className="btn primary" type="submit" disabled={pending || (destination === 'STORE' && Boolean(suggestion?.overflow))}>
            {pending ? 'Saving…' : 'Save purchase'}
          </button>
        </form>
      ) : (
        <div className="card pad">
          <p>
            Add a supplier before the first purchase. <Link href="/app/partners">Partners</Link>
          </p>
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date</th>
              <th>Bought</th>
              <th>Number</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Sent to</th>
              <th>Bags and drums</th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td>{receipt.reference}</td>
                <td>{receipt.date}</td>
                <td>{receipt.material}</td>
                <td>{receipt.quantity}</td>
                <td>{receipt.supplier}</td>
                <td>
                  {receipt.amount ? (
                    `${receipt.currency} ${receipt.amount}`
                  ) : book ? (
                    <div className="inline buy-rate-fix">
                      <input
                        inputMode="decimal"
                        placeholder="Rate"
                        value={rateDrafts[receipt.id] ?? ''}
                        onChange={(event) =>
                          setRateDrafts((current) => ({ ...current, [receipt.id]: event.target.value }))
                        }
                        aria-label={`Rate for ${receipt.reference}`}
                      />
                      <button
                        className="btn ghost"
                        type="button"
                        disabled={savingRateId === receipt.id}
                        onClick={() => void saveMissingRate(receipt.id)}
                      >
                        {savingRateId === receipt.id ? 'Saving…' : 'Set rate'}
                      </button>
                    </div>
                  ) : (
                    <span className="tiny">No rate — amount missing</span>
                  )}
                </td>
                <td>{paymentLabel(receipt)}</td>
                <td>
                  {receipt.destination === 'STORE' ? 'Store' : 'Factory'}
                  <div className="tiny">{receipt.place}</div>
                </td>
                <td>
                  {receipt.packages.length === 0
                    ? '—'
                    : receipt.packages.map((item) => (
                        <span className="tag" key={`${item.kind}-${item.packageNumber}`}>
                          {item.kind === 'BAG' ? 'Bag' : 'Drum'} {item.packageNumber} · {item.quantity}
                        </span>
                      ))}
                </td>
              </tr>
            ))}
            {receipts.length === 0 ? (
              <tr>
                <td colSpan={9}>No purchase recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
