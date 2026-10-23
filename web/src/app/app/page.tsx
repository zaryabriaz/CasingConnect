'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { isBuyerOnly } from '@/lib/labels';

type Dashboard = {
  date: string;
  currency: string;
  onHand: { total: string; store: string; factory: string };
  hanks: { available: string; total: string; sold: string; today: string };
  today: {
    purchases: number;
    purchaseAmount: string;
    sales: number;
    salesAmount: string;
    expenseTotal: string;
  };
  money: {
    receivable: string;
    payable: string;
    inventoryTotal: string;
    netPosition: string;
    netProfit: string;
  };
  recentPurchases: Array<{
    id: string;
    reference: string;
    date: string;
    material: string;
    quantity: string;
    amount: string | null;
    supplier: string;
  }>;
  recentSales: Array<{
    id: string;
    reference: string;
    date: string;
    customer: string;
    quantity: string;
    amount: string | null;
    paymentMode: 'CASH' | 'CREDIT';
  }>;
};

function formatMoney(currency: string, amount: string | null | undefined) {
  if (amount == null) return '—';
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

export default function DashboardPage() {
  const session = useSession();
  const router = useRouter();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const buyerOnly = isBuyerOnly(session.business.activities);

  useEffect(() => {
    if (buyerOnly) {
      router.replace('/marketplace');
      return;
    }
    api<Dashboard>('/dashboard')
      .then(setData)
      .catch((caught) => setError(errorText(caught)));
  }, [session.business.id, buyerOnly, router]);

  if (buyerOnly) {
    return (
      <div className="stack">
        <p className="muted">Opening Marketplace…</p>
      </div>
    );
  }

  const currency = data?.currency || session.business.currency || 'PKR';
  const recent = data
    ? [
        ...data.recentSales.slice(0, 3).map((sale) => ({
          key: sale.id,
          kind: 'Sale',
          title: sale.reference,
          meta: sale.customer,
          note: sale.paymentMode === 'CREDIT' ? 'Credit' : 'Cash',
          date: sale.date,
          amount: sale.amount,
          href: '/app/sales',
        })),
        ...data.recentPurchases.slice(0, 3).map((buy) => ({
          key: buy.id,
          kind: 'Buy',
          title: buy.reference,
          meta: buy.supplier,
          note: buy.material,
          date: buy.date,
          amount: buy.amount,
          href: '/app/buying',
        })),
      ]
        .sort((a, b) => b.date.localeCompare(a.date) || b.title.localeCompare(a.title))
        .slice(0, 5)
    : [];

  return (
    <div className="stack dash">
      <header className="dash-top">
        <div>
          <p className="tiny eyebrow">{session.business.name}</p>
          <h1>Dashboard</h1>
        </div>
        <div className="nav-row">
          <Link className="btn primary" href="/app/buying">
            Buying
          </Link>
          <Link className="btn ghost" href="/app/sales">
            Sales
          </Link>
          <Link className="btn ghost" href="/app/finance">
            Finance
          </Link>
        </div>
      </header>

      {error ? <Banner kind="bad">{error}</Banner> : null}

      {!data ? (
        <div className="card pad muted">Loading dashboard…</div>
      ) : (
        <>
          <section className="dash-focus">
            <div className="dash-focus-main">
              <span>Net position</span>
              <strong className={toneClass(data.money.netPosition)}>
                {formatMoney(currency, data.money.netPosition)}
              </strong>
              <p>What the business holds after payables</p>
            </div>
            <div className="dash-focus-side">
              <div>
                <span>Receivable</span>
                <strong>{formatMoney(currency, data.money.receivable)}</strong>
              </div>
              <div>
                <span>Stock</span>
                <strong>{formatMoney(currency, data.money.inventoryTotal)}</strong>
              </div>
              <div>
                <span>Payable</span>
                <strong>{formatMoney(currency, data.money.payable)}</strong>
              </div>
              <div>
                <span>Trading profit</span>
                <strong className={toneClass(data.money.netProfit)}>
                  {formatMoney(currency, data.money.netProfit)}
                </strong>
              </div>
            </div>
          </section>

          <section className="dash-ops">
            <div>
              <span>Raw on hand</span>
              <strong>{data.onHand.total}</strong>
              <em>
                Store {data.onHand.store} · Factory {data.onHand.factory}
              </em>
            </div>
            <div>
              <span>Hanks ready</span>
              <strong>{data.hanks.available}</strong>
              <em>
                {data.hanks.sold} sold of {data.hanks.total}
              </em>
            </div>
            <div>
              <span>Today</span>
              <strong>
                {data.today.sales > 0 || data.today.purchases > 0
                  ? `${data.today.sales} sold · ${data.today.purchases} bought`
                  : 'Quiet'}
              </strong>
              <em>
                {data.today.salesAmount !== '0' || data.today.purchaseAmount !== '0'
                  ? `In ${formatMoney(currency, data.today.salesAmount)} · Out ${formatMoney(currency, data.today.purchaseAmount)}`
                  : data.date}
              </em>
            </div>
          </section>

          <section className="card pad stack" style={{ gap: 8 }}>
            <strong>Support chat · live now</strong>
            <p className="muted" style={{ margin: 0 }}>
              Talk to the CasingConnect team in-app. Global chat between companies in any country is
              coming soon — a valuable feature we are building next.
            </p>
            <div>
              <Link className="btn ghost" href="/app/support">
                Open support chat
              </Link>
            </div>
          </section>

          <section className="dash-activity">
            <div className="dash-activity-head">
              <h2>Recent</h2>
              <Link href="/app/ledger">Ledger</Link>
            </div>
            {recent.length === 0 ? (
              <p className="muted">No buying or sales yet.</p>
            ) : (
              <ul className="dash-activity-list">
                {recent.map((row) => (
                  <li key={row.key}>
                    <Link href={row.href} className="dash-activity-row">
                      <span className={`dash-kind kind-${row.kind.toLowerCase()}`}>{row.kind}</span>
                      <span className="dash-activity-copy">
                        <strong>{row.title}</strong>
                        <em>
                          {row.meta} · {row.note}
                        </em>
                      </span>
                      <span className="dash-activity-amt">
                        <strong>{formatMoney(currency, row.amount)}</strong>
                        <em>{row.date}</em>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
