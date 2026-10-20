'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';

type Breakdown = { label: string; amount: string; detail?: string };

type FinanceOverview = {
  currency: string;
  from: string | null;
  to: string | null;
  receivable: string;
  payable: string;
  inventoryRaw: string;
  inventoryFinished: string;
  inventoryTotal: string;
  netPosition: string;
  moneyIn: string;
  moneyOut: string;
  netCash: string;
  salesRevenue: string;
  purchaseCost: string;
  cogs: string;
  expenses: string;
  grossProfit: string;
  netProfit: string;
  assetBreakdown: Breakdown[];
  inventoryBreakdown: Breakdown[];
  moneyInBreakdown: Breakdown[];
  moneyOutBreakdown: Breakdown[];
  profitBreakdown: Breakdown[];
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function formatMoney(currency: string, amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} ${amount}`;
  const sign = n < 0 ? '-' : '';
  return `${sign}${currency} ${Math.abs(n).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function toneClass(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return '';
  return n > 0 ? 'is-up' : 'is-down';
}

export default function FinancePage() {
  const session = useSession();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState(today());
  const [data, setData] = useState<FinanceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function load(nextFrom = from, nextTo = to) {
    const params = new URLSearchParams();
    if (nextFrom) params.set('from', nextFrom);
    if (nextTo) params.set('to', nextTo);
    const qs = params.toString();
    setLoading(true);
    setError(null);
    return api<FinanceOverview>(`/finance/overview${qs ? `?${qs}` : ''}`)
      .then(setData)
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    void load();
  }, [session.business.id]);

  function onFilter(event: FormEvent) {
    event.preventDefault();
    void load(from, to);
  }

  function clearDates() {
    setFrom('');
    setTo(today());
    void load('', today());
  }

  const currency = data?.currency || session.business.currency || 'PKR';

  return (
    <div className="stack finance-page">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Trade</p>
          <h1>Finance</h1>
          <p className="muted">
            Assets, stock value, cash movement, and trading profit — leftover material is counted as inventory, not
            loss.
          </p>
        </div>
        <form className="finance-filter" onSubmit={onFilter}>
          <Field label="From">
            <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" value={to} onChange={(event) => setTo(event.target.value)} />
          </Field>
          <div className="finance-filter-actions">
            <button className="btn ghost" type="button" onClick={clearDates}>
              Reset
            </button>
            <button className="btn primary" type="submit" disabled={loading}>
              {loading ? 'Loading…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}

      {data ? (
        <>
          <p className="tiny">
            Period: {data.from || 'start'} → {data.to || 'today'}. Receivable, payable, and stock are current
            balances.
          </p>

          <div className="finance-kpis finance-kpis-6">
            <div className="finance-kpi">
              <span>Receivable</span>
              <strong>{formatMoney(currency, data.receivable)}</strong>
              <em>Customers owe you</em>
            </div>
            <div className="finance-kpi">
              <span>Stock assets</span>
              <strong>{formatMoney(currency, data.inventoryTotal)}</strong>
              <em>Raw + finished on hand</em>
            </div>
            <div className="finance-kpi">
              <span>Payable</span>
              <strong className="is-down">{formatMoney(currency, data.payable)}</strong>
              <em>You owe suppliers</em>
            </div>
            <div className="finance-kpi is-accent">
              <span>Net position</span>
              <strong className={toneClass(data.netPosition)}>{formatMoney(currency, data.netPosition)}</strong>
              <em>Receivable + stock − payable</em>
            </div>
            <div className="finance-kpi">
              <span>Money out</span>
              <strong className="is-down">{formatMoney(currency, data.moneyOut)}</strong>
              <em>Cash invested (period)</em>
            </div>
            <div className="finance-kpi">
              <span>Net profit</span>
              <strong className={toneClass(data.netProfit)}>{formatMoney(currency, data.netProfit)}</strong>
              <em>After cost of goods sold</em>
            </div>
          </div>

          <div className="finance-grid">
            <section className="card finance-panel">
              <h2>Business position</h2>
              <p className="tiny">What you own vs what you owe right now.</p>
              <table className="finance-table">
                <tbody>
                  <tr>
                    <td>
                      Receivable
                      <div className="tiny">Customers</div>
                    </td>
                    <td className="num">{formatMoney(currency, data.receivable)}</td>
                  </tr>
                  <tr>
                    <td>
                      Stock — raw material
                      <div className="tiny">Still in store / factory</div>
                    </td>
                    <td className="num">{formatMoney(currency, data.inventoryRaw)}</td>
                  </tr>
                  <tr>
                    <td>
                      Stock — finished hanks
                      <div className="tiny">Produced, not yet sold</div>
                    </td>
                    <td className="num">{formatMoney(currency, data.inventoryFinished)}</td>
                  </tr>
                  <tr className="is-sub">
                    <td>Total assets</td>
                    <td className="num">
                      {formatMoney(
                        currency,
                        String(Number(data.receivable) + Number(data.inventoryTotal)),
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Payable
                      <div className="tiny">Suppliers</div>
                    </td>
                    <td className="num is-down">{formatMoney(currency, data.payable)}</td>
                  </tr>
                  <tr className="is-total">
                    <td>Net position</td>
                    <td className={`num ${toneClass(data.netPosition)}`}>
                      {formatMoney(currency, data.netPosition)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {data.inventoryBreakdown.length > 0 ? (
                <div className="finance-inv-list">
                  <h3>Stock detail</h3>
                  <ul>
                    {data.inventoryBreakdown.map((row) => (
                      <li key={`${row.label}-${row.detail ?? ''}`}>
                        <span>
                          <strong>{row.label}</strong>
                          {row.detail ? <span className="tiny">{row.detail}</span> : null}
                        </span>
                        <strong>{formatMoney(currency, row.amount)}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="card finance-panel">
              <h2>Trading profit &amp; loss</h2>
              <p className="tiny">
                Only the cost of hanks sold is deducted. Purchases that stay in stock remain as assets above.
              </p>
              <table className="finance-table">
                <tbody>
                  <tr>
                    <td>Sales revenue</td>
                    <td className="num">{formatMoney(currency, data.salesRevenue)}</td>
                  </tr>
                  <tr>
                    <td>
                      Less: cost of goods sold
                      <div className="tiny">Cost of what you sold</div>
                    </td>
                    <td className="num">{formatMoney(currency, data.cogs)}</td>
                  </tr>
                  <tr className="is-sub">
                    <td>Gross profit</td>
                    <td className={`num ${toneClass(data.grossProfit)}`}>
                      {formatMoney(currency, data.grossProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td>Less: expenses</td>
                    <td className="num">{formatMoney(currency, data.expenses)}</td>
                  </tr>
                  <tr className="is-total">
                    <td>Net profit</td>
                    <td className={`num ${toneClass(data.netProfit)}`}>
                      {formatMoney(currency, data.netProfit)}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      Purchases in period
                      <div className="tiny">Reference only — not all is loss</div>
                    </td>
                    <td className="num">{formatMoney(currency, data.purchaseCost)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          </div>

          <section className="card finance-panel">
            <h2>Cash movement (period)</h2>
            <p className="tiny">Actual cash that moved — separate from credit and stock value.</p>
            <table className="finance-table">
              <tbody>
                {data.moneyInBreakdown.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="num is-up">{formatMoney(currency, row.amount)}</td>
                  </tr>
                ))}
                <tr className="is-sub">
                  <td>Total money in</td>
                  <td className="num is-up">{formatMoney(currency, data.moneyIn)}</td>
                </tr>
                {data.moneyOutBreakdown.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td className="num is-down">{formatMoney(currency, row.amount)}</td>
                  </tr>
                ))}
                <tr className="is-sub">
                  <td>Total money out</td>
                  <td className="num is-down">{formatMoney(currency, data.moneyOut)}</td>
                </tr>
                <tr className="is-total">
                  <td>Net cash movement</td>
                  <td className={`num ${toneClass(data.netCash)}`}>
                    {formatMoney(currency, data.netCash)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="card finance-panel">
            <h2>How this is calculated</h2>
            <ul className="finance-notes">
              <li>
                <strong>Stock assets</strong> value material still in store/factory at average buy rate. That money is
                not treated as a loss.
              </li>
              <li>
                <strong>Cost of goods sold</strong> uses material issued to workers, spread across produced hanks. If
                you have not issued material yet, COGS stays 0 and purchases sit in stock.
              </li>
              <li>
                <strong>Net position</strong> = receivable + stock − payable. <strong>Net profit</strong> = sales −
                COGS − expenses for the selected period.
              </li>
            </ul>
          </section>
        </>
      ) : loading ? (
        <div className="card pad">
          <p className="tiny">Loading finance overview…</p>
        </div>
      ) : null}
    </div>
  );
}
