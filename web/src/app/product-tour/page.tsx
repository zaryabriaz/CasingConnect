'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LogoLockup } from '@/components/logo';
import './tour.css';

type Visual =
  | 'welcome'
  | 'login'
  | 'dashboard'
  | 'pipeline'
  | 'buying'
  | 'store'
  | 'factory'
  | 'production'
  | 'expenses'
  | 'sales'
  | 'market'
  | 'inquiry'
  | 'start';

type Scene = {
  id: string;
  kicker: string;
  title: string;
  body: string;
  beats: string[];
  visual: Visual;
};

const SCENES: Scene[] = [
  {
    id: 'welcome',
    kicker: '01 · Intro',
    title: 'From login to sale — the full business flow',
    body: 'Walk through sign-in, the dashboard, then Buying → Store → Factory → Production → Expenses → Sales, and how each screen updates your books.',
    beats: ['Private company portal', 'Full dashboard', 'Each ops screen'],
    visual: 'welcome',
  },
  {
    id: 'login',
    kicker: '02 · Login',
    title: 'Sign in to your company books',
    body: 'Staff sign in with email and password. Access is limited to your business — buying, stock, sales, and ledgers stay private.',
    beats: ['Email + password', 'Role-based menus', 'Lands on Dashboard'],
    visual: 'login',
  },
  {
    id: 'dashboard',
    kicker: '03 · Dashboard',
    title: 'The complete dashboard',
    body: 'Net position, receivable, stock value, payable, and trading profit. Below: raw on hand (store vs factory), hanks ready, today’s buys/sales, and a recent activity feed.',
    beats: ['Money summary', 'Stock & hanks', 'Recent buy / sale rows'],
    visual: 'dashboard',
  },
  {
    id: 'pipeline',
    kicker: '04 · Ops pipeline',
    title: 'How work moves through your business',
    body: 'Buy into store, move material to the factory, produce hanks, record daily expenses, then sell — the dashboard and ledger update as you go.',
    beats: ['Buying → Store', 'Factory → Production', 'Expenses → Sales'],
    visual: 'pipeline',
  },
  {
    id: 'buying',
    kicker: '05 · Buying',
    title: 'Step 1 — Record a purchase',
    body: 'In Buying, pick a supplier, enter material and quantity, set amount, and choose destination (usually Store). Saving creates a receipt and puts quantity on hand.',
    beats: ['Supplier + material', 'Qty & amount', 'Destination: Store'],
    visual: 'buying',
  },
  {
    id: 'store',
    kicker: '06 · Store',
    title: 'Step 2 — Hold raw stock',
    body: 'Store shows packages and batches from purchases. Transfer stock to the factory when you are ready to process — dashboard “Raw on hand” splits store vs factory.',
    beats: ['See store batches', 'Transfer to factory', 'Dashboard stock updates'],
    visual: 'store',
  },
  {
    id: 'factory',
    kicker: '07 · Factory',
    title: 'Step 3 — Factory material',
    body: 'Factory shows material that has arrived from the store. You can see balances, recent transfers, and issue material to people before production converts it.',
    beats: ['Factory on-hand', 'Transfer / issue', 'Ready for production'],
    visual: 'factory',
  },
  {
    id: 'production',
    kicker: '08 · Production',
    title: 'Step 4 — Convert into hanks',
    body: 'Production converts factory material into finished hanks by quality (for example 18/20). Outputs rise under “Hanks ready” on the dashboard for selling.',
    beats: ['Choose worker & material', 'Enter hank outputs', 'Hanks available to sell'],
    visual: 'production',
  },
  {
    id: 'expenses',
    kicker: '09 · Expenses',
    title: 'Step 5 — Daily expenses',
    body: 'On Expenses, record the day’s costs — labour, salt, transport, and other lines. Save the day so finance and profit stay accurate alongside buys and sales.',
    beats: ['Add expense lines', 'Labour & materials', 'Save day total'],
    visual: 'expenses',
  },
  {
    id: 'sales',
    kicker: '10 · Sales',
    title: 'Step 6 — Invoice the customer',
    body: 'In Sales, create an invoice against ready hanks — cash or credit. Quantity leaves stock, receivable or cash moves, and the sale appears on the dashboard Recent list.',
    beats: ['Customer + hanks', 'Cash or credit', 'Dashboard & ledger update'],
    visual: 'sales',
  },
  {
    id: 'market',
    kicker: '11 · Marketplace',
    title: 'Optional — publish trade offers',
    body: 'When you want global visibility, publish the business and add listings. That does not replace private books — it sits beside them.',
    beats: ['Publish profile', 'Add listing', 'Trade offers go public'],
    visual: 'market',
  },
  {
    id: 'inquiry',
    kicker: '12 · Inquiries',
    title: 'Reply to buyer interest',
    body: 'Marketplace inquiries land in your portal Inbox. You keep using Buying / Store / Sales for real fulfilment after you agree terms.',
    beats: ['Inbox messages', 'Mark replied', 'Fulfil in private ops'],
    visual: 'inquiry',
  },
  {
    id: 'start',
    kicker: '13 · Try it',
    title: 'Open the real system',
    body: 'Sign in and walk Buying → Store → Factory → Production → Expenses → Sales yourself, or register a new company to start empty books.',
    beats: ['Sign in demo', 'Register business', 'Browse Marketplace'],
    visual: 'start',
  },
];

const SCENE_MS = 7500;

function SceneVisual({ visual }: { visual: Visual }) {
  if (visual === 'welcome') {
    return (
      <div className="tour-mock tour-mock-welcome">
        <strong>Business operating flow</strong>
        <span>Login → Dashboard → Buy → Store → Factory → Production → Expenses → Sell</span>
        <div className="tour-flow">
          <i>Buy</i>
          <i>Store</i>
          <i>Factory</i>
          <i>Production</i>
          <i>Expenses</i>
          <i>Sell</i>
        </div>
      </div>
    );
  }

  if (visual === 'login') {
    return (
      <div className="tour-mock tour-mock-login">
        <div className="tour-mock-title">Sign in</div>
        <label>
          <span>Email</span>
          <div className="tour-fake-input">owner@casingconnect.demo</div>
        </label>
        <label>
          <span>Password</span>
          <div className="tour-fake-input is-password">••••••••</div>
        </label>
        <div className="tour-fake-btn">Sign in</div>
        <p className="tour-mock-note">Opens Dashboard for Al-Noor Casings</p>
      </div>
    );
  }

  if (visual === 'dashboard') {
    return (
      <div className="tour-mock tour-mock-dash tour-mock-dash-full">
        <div className="tour-dash-head">
          <div>
            <em>Al-Noor Casings</em>
            <strong>Dashboard</strong>
          </div>
          <div className="tour-dash-tabs">
            <i className="is-on">Buying</i>
            <i>Sales</i>
            <i>Finance</i>
          </div>
        </div>
        <div className="tour-dash-hero">
          <span>Net position</span>
          <strong>PKR 90,000.00</strong>
          <p>What the business holds after payables</p>
        </div>
        <div className="tour-dash-grid is-four">
          <div>
            <span>Receivable</span>
            <b>PKR 0.00</b>
          </div>
          <div>
            <span>Stock</span>
            <b>PKR 90,000</b>
          </div>
          <div>
            <span>Payable</span>
            <b>PKR 0.00</b>
          </div>
          <div>
            <span>Trading profit</span>
            <b>PKR 0.00</b>
          </div>
        </div>
        <div className="tour-dash-ops">
          <div>
            <span>Raw on hand</span>
            <b>215</b>
            <em>Store 215 · Factory 0</em>
          </div>
          <div>
            <span>Hanks ready</span>
            <b>240</b>
            <em>0 sold of 240</em>
          </div>
          <div>
            <span>Today</span>
            <b>0 sold · 1 bought</b>
            <em>Out PKR 90,000</em>
          </div>
        </div>
        <div className="tour-dash-activity">
          <div className="tour-dash-activity-head">
            <strong>Recent</strong>
            <span>Ledger</span>
          </div>
          <div className="tour-dash-activity-row">
            <i className="kind-buy">Buy</i>
            <div>
              <b>RCP-0001</b>
              <em>Haji Bashir — Roda · Sheep</em>
            </div>
            <div className="tour-amt">
              <b>PKR 90,000</b>
              <em>2026-10-19</em>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (visual === 'pipeline') {
    return (
      <div className="tour-mock tour-mock-pipeline">
        <div className="tour-mock-title">Complete ops chain</div>
        <ol className="tour-pipeline">
          <li>
            <b>1</b>
            <div>
              <strong>Buying</strong>
              <span>Receipt into store</span>
            </div>
          </li>
          <li>
            <b>2</b>
            <div>
              <strong>Store</strong>
              <span>Hold &amp; transfer raw</span>
            </div>
          </li>
          <li>
            <b>3</b>
            <div>
              <strong>Factory</strong>
              <span>Material on hand / issue</span>
            </div>
          </li>
          <li>
            <b>4</b>
            <div>
              <strong>Production</strong>
              <span>Convert to hanks</span>
            </div>
          </li>
          <li>
            <b>5</b>
            <div>
              <strong>Expenses</strong>
              <span>Daily cost sheet</span>
            </div>
          </li>
          <li>
            <b>6</b>
            <div>
              <strong>Sales</strong>
              <span>Invoice hanks out</span>
            </div>
          </li>
        </ol>
        <p className="tour-mock-note">Dashboard + ledger refresh after each step</p>
      </div>
    );
  }

  if (visual === 'buying') {
    return (
      <div className="tour-mock tour-mock-form">
        <div className="tour-step-badge">Step 1 · Buying</div>
        <div className="tour-mock-title">New purchase</div>
        <div className="tour-form-row">
          <span>Supplier</span>
          <div className="tour-fake-input">Haji Bashir — Roda</div>
        </div>
        <div className="tour-form-row">
          <span>Material / qty</span>
          <div className="tour-fake-input">Sheep casings · 215 Roda</div>
        </div>
        <div className="tour-form-row">
          <span>Amount</span>
          <div className="tour-fake-input">PKR 90,000</div>
        </div>
        <div className="tour-form-row">
          <span>Destination</span>
          <div className="tour-fake-input">Store</div>
        </div>
        <div className="tour-fake-btn">Save purchase</div>
        <p className="tour-mock-note">Creates RCP-0001 · raw appears in Store</p>
      </div>
    );
  }

  if (visual === 'store') {
    return (
      <div className="tour-mock tour-mock-store">
        <div className="tour-step-badge">Step 2 · Store</div>
        <div className="tour-mock-title">Store stock</div>
        <div className="tour-store-row">
          <div>
            <b>Batch from RCP-0001</b>
            <em>Sheep · Store</em>
          </div>
          <strong>215 Roda</strong>
        </div>
        <div className="tour-store-row is-action">
          <div>
            <b>Transfer to factory</b>
            <em>Move raw for processing</em>
          </div>
          <span className="tour-mini-btn">Transfer</span>
        </div>
        <p className="tour-mock-note">Dashboard: Store ↓ · Factory ↑</p>
      </div>
    );
  }

  if (visual === 'factory') {
    return (
      <div className="tour-mock tour-mock-store">
        <div className="tour-step-badge">Step 3 · Factory</div>
        <div className="tour-mock-title">Factory material</div>
        <div className="tour-store-row">
          <div>
            <b>At factory</b>
            <em>Sheep · from store transfer</em>
          </div>
          <strong>215 Roda</strong>
        </div>
        <div className="tour-store-row is-action">
          <div>
            <b>Issue to people</b>
            <em>Hand out for processing</em>
          </div>
          <span className="tour-mini-btn">Issue</span>
        </div>
        <div className="tour-ops-line">
          <span>Recent</span>
          <em>Transfer in · 215 Roda</em>
        </div>
        <p className="tour-mock-note">Next: convert on Production</p>
      </div>
    );
  }

  if (visual === 'production') {
    return (
      <div className="tour-mock tour-mock-form">
        <div className="tour-step-badge">Step 4 · Production</div>
        <div className="tour-mock-title">Convert to hanks</div>
        <div className="tour-form-row">
          <span>Worker</span>
          <div className="tour-fake-input">Ahmad — line 1</div>
        </div>
        <div className="tour-form-row">
          <span>From material</span>
          <div className="tour-fake-input">Roda · 215</div>
        </div>
        <div className="tour-form-row">
          <span>Output quality</span>
          <div className="tour-fake-input">18/20 · 240 hanks</div>
        </div>
        <div className="tour-fake-btn">Save conversion</div>
        <div className="tour-listing">
          <b>240 hanks ready</b>
          <em>Shows on Dashboard · ready to sell</em>
        </div>
      </div>
    );
  }

  if (visual === 'expenses') {
    return (
      <div className="tour-mock tour-mock-expenses">
        <div className="tour-step-badge">Step 5 · Expenses</div>
        <div className="tour-mock-title">Daily expenses</div>
        <div className="tour-expense-row">
          <span>Labour</span>
          <em>Ahmad</em>
          <b>PKR 4,500</b>
        </div>
        <div className="tour-expense-row">
          <span>Salt bags</span>
          <em>12 bags</em>
          <b>PKR 3,600</b>
        </div>
        <div className="tour-expense-row">
          <span>Transport</span>
          <em>Local cart</em>
          <b>PKR 1,200</b>
        </div>
        <div className="tour-expense-total">
          <span>Day total</span>
          <strong>PKR 9,300</strong>
        </div>
        <div className="tour-fake-btn">Save day</div>
      </div>
    );
  }

  if (visual === 'sales') {
    return (
      <div className="tour-mock tour-mock-form">
        <div className="tour-step-badge">Step 6 · Sales</div>
        <div className="tour-mock-title">New sale</div>
        <div className="tour-form-row">
          <span>Customer</span>
          <div className="tour-fake-input">Euro Foods Trading</div>
        </div>
        <div className="tour-form-row">
          <span>Hanks / quality</span>
          <div className="tour-fake-input">100 hanks · 18/20</div>
        </div>
        <div className="tour-form-row">
          <span>Amount</span>
          <div className="tour-fake-input">PKR 55,000</div>
        </div>
        <div className="tour-form-row">
          <span>Payment</span>
          <div className="tour-fake-input">Credit</div>
        </div>
        <div className="tour-fake-btn">Save sale</div>
        <p className="tour-mock-note">Hanks ↓ · Receivable ↑ · Recent shows Sale</p>
      </div>
    );
  }

  if (visual === 'market') {
    return (
      <div className="tour-mock tour-mock-form">
        <div className="tour-mock-title">Marketplace listing</div>
        <div className="tour-form-row">
          <span>Quality</span>
          <div className="tour-fake-input">18/20</div>
        </div>
        <div className="tour-form-row">
          <span>Quantity</span>
          <div className="tour-fake-input">1000 hanks</div>
        </div>
        <div className="tour-form-row">
          <span>Currency</span>
          <div className="tour-fake-input">EUR</div>
        </div>
        <label className="tour-check">
          <i /> Publish this business on the Marketplace
        </label>
        <div className="tour-fake-btn">Add listing</div>
      </div>
    );
  }

  if (visual === 'inquiry') {
    return (
      <div className="tour-mock tour-mock-inquiry">
        <div className="tour-mock-title">Inquiries · Inbox</div>
        <div className="tour-inquiry-card">
          <strong>From EU Buyer Co.</strong>
          <p>Interested in 18/20 — can you supply EU?</p>
          <div className="tour-flow">
            <i>OPEN</i>
            <i>Mark replied</i>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="tour-mock tour-mock-welcome">
        <strong>Try the real flow</strong>
      <span>Sign in and run Buying → Store → Factory → Production → Expenses → Sales</span>
      <div className="tour-flow">
        <i>Login</i>
        <i>Factory</i>
        <i>Production</i>
        <i>Expenses</i>
      </div>
    </div>
  );
}

export default function ProductTourPage() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const scene = SCENES[index]!;
  const progress = useMemo(() => ((index + 1) / SCENES.length) * 100, [index]);

  useEffect(() => {
    document.title = 'CasingConnect | Product tour';
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      setIndex((current) => (current + 1) % SCENES.length);
    }, SCENE_MS);
    return () => window.clearTimeout(timer);
  }, [index, playing]);

  return (
    <div className="tour">
      <header className="tour-bar">
        <Link href="/" className="tour-brand" aria-label="CasingConnect home">
          <LogoLockup height={56} />
        </Link>
        <nav className="tour-nav">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/login">Sign in</Link>
          <Link className="tour-nav-cta" href="/register">
            Get started
          </Link>
        </nav>
      </header>

      <main className="tour-stage">
        <div className="tour-copy">
          <p className="tour-kicker">{scene.kicker}</p>
          <h1 key={scene.id + '-title'}>{scene.title}</h1>
          <p className="tour-body" key={scene.id + '-body'}>
            {scene.body}
          </p>
          <ul className="tour-beats" key={scene.id + '-beats'}>
            {scene.beats.map((beat) => (
              <li key={beat}>{beat}</li>
            ))}
          </ul>

          <div className="tour-controls">
            <button type="button" className="tour-play" onClick={() => setPlaying((value) => !value)}>
              {playing ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="tour-play"
              onClick={() => setIndex((current) => (current - 1 + SCENES.length) % SCENES.length)}
            >
              Prev
            </button>
            <button
              type="button"
              className="tour-play"
              onClick={() => setIndex((current) => (current + 1) % SCENES.length)}
            >
              Next
            </button>
            <div className="tour-dots" role="tablist" aria-label="Tour scenes">
              {SCENES.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  className={i === index ? 'is-active' : undefined}
                  onClick={() => {
                    setIndex(i);
                    setPlaying(false);
                  }}
                >
                  <span className="sr-only">{item.kicker}</span>
                </button>
              ))}
            </div>
            <span className="tour-count">
              {index + 1} / {SCENES.length}
            </span>
          </div>

          <div className="tour-progress" aria-hidden="true">
            <i style={{ width: `${progress}%` }} />
            {playing ? <em key={index} /> : null}
          </div>

          <div className="tour-cta">
            <Link href="/login">Sign in to try</Link>
            <Link href="/register">Register</Link>
            <Link href="/marketplace">Marketplace</Link>
          </div>
        </div>

        <aside className={`tour-visual is-${scene.visual}`} aria-hidden="true">
          <div className="tour-visual-frame" key={scene.id}>
            <SceneVisual visual={scene.visual} />
          </div>
        </aside>
      </main>
    </div>
  );
}
