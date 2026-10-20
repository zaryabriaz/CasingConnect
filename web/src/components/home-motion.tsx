'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { LogoLockup } from '@/components/logo';
import { HOME_FAQS } from '@/lib/home-faq';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

export function HomeReveal({
  children,
  className = '',
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.classList.add('is-in');
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add('is-in');
        io.disconnect();
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
    );

    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  return (
    <section ref={ref} id={id} className={`home-reveal ${className}`.trim()}>
      {children}
    </section>
  );
}

function MagneticLink({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduced = usePrefersReducedMotion();

  const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.12}px, ${y * 0.16}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </Link>
  );
}

export function HomeExperience() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const stage = stageRef.current;
    const media = mediaRef.current;
    const root = stage?.closest('.home') as HTMLElement | null;
    if (!stage || !media) return;

    let raf = 0;
    let running = false;
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scrollY = 0;
    let stageVisible = true;

    const tick = () => {
      currentX += (targetX - currentX) * 0.05;
      currentY += (targetY - currentY) * 0.05;
      media.style.transform = `translate3d(${currentX}px, ${currentY + scrollY * 0.08}px, 0) scale(1.05)`;
      const moving =
        Math.abs(targetX - currentX) > 0.05 ||
        Math.abs(targetY - currentY) > 0.05;
      if (moving && stageVisible) {
        raf = window.requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const kick = () => {
      if (running || !stageVisible) return;
      running = true;
      raf = window.requestAnimationFrame(tick);
    };

    const onPointer = (e: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      targetX = ((e.clientX - rect.left) / rect.width - 0.5) * -12;
      targetY = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
      kick();
    };

    const onScroll = () => {
      scrollY = Math.min(window.scrollY, window.innerHeight);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      if (root) root.style.setProperty('--scroll', `${p.toFixed(2)}%`);
      kick();
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        stageVisible = entry.isIntersecting;
        if (stageVisible) kick();
      },
      { threshold: 0.05 },
    );
    io.observe(stage);

    stage.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      window.cancelAnimationFrame(raf);
      io.disconnect();
      stage.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [reduced]);

  return (
    <div className={`home ${ready ? 'is-ready' : ''}`}>
      <div className="home-progress" aria-hidden="true" />

      <div className="home-stage" ref={stageRef}>
        <div className="home-stage-media" ref={mediaRef}>
          <picture>
            <source srcSet="/home-hero.webp?v=7" type="image/webp" />
            <img
              src="/home-hero.jpg?v=7"
              alt="Natural casings prepared for the sausage and meat trade"
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        </div>
        <div className="home-stage-veil" aria-hidden="true" />

        <header className="home-bar">
          <Link href="/" className="home-mark" aria-label="CasingConnect home">
            <LogoLockup height={80} className="home-mark-logo" priority />
          </Link>
          <nav className="home-nav" aria-label="Primary">
            <a className="home-nav-link" href="#features">
              Features
            </a>
            <Link className="home-nav-link" href="/product-tour">
              Product tour
            </Link>
            <Link className="home-nav-link" href="/marketplace">
              Marketplace
            </Link>
            <a className="home-nav-link" href="#faq">
              FAQ
            </a>
            <Link className="home-nav-link" href="/natural-casings">
              Natural casings
            </Link>
            <Link className="home-nav-link home-nav-signin" href="/login">
              Sign in
            </Link>
            <Link className="home-nav-cta" href="/register">
              Get started
            </Link>
          </nav>
        </header>

        <main className="home-main">
          <h1 className="home-hero-title">
            <span className="home-brand">
              Casing<span>Connect</span>
            </span>
            <span className="home-hero-line">B2B natural casing business software</span>
          </h1>
          <p className="home-lead">
            CasingConnect is B2B natural casing business software for the casing trade — buying,
            store &amp; factory stock, production, sales, expenses, and party ledgers, plus your
            own public company website for buyers.
          </p>
          <div className="home-cta">
            <MagneticLink href="/marketplace" className="home-cta-market">
              <span className="home-cta-market-aura" aria-hidden="true" />
              <div className="home-cta-market-inner">
                <span className="home-cta-market-glow" aria-hidden="true" />
                <span className="home-cta-market-sparks" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                <span className="home-cta-market-orb" aria-hidden="true">
                  <span className="home-cta-market-ring" />
                  <span className="home-cta-market-ring is-delay" />
                </span>
                <span className="home-cta-market-copy">
                  <strong>Explore Marketplace</strong>
                  <small>Find buyers &amp; sellers worldwide</small>
                </span>
              </div>
            </MagneticLink>
            <MagneticLink href="/register" className="home-cta-secondary">
              Register your business
            </MagneticLink>
          </div>
        </main>
      </div>

      <HomeReveal className="home-features" id="features">
        <div className="home-features-inner">
          <div className="home-features-intro">
            <p className="home-features-eyebrow">Main features</p>
            <h2>What CasingConnect runs for you</h2>
            <p className="home-features-lead">
              B2B natural casing business software with private books for your company — and a
              public website each customer can activate for their own buyers.
            </p>
            <MagneticLink href="/product-tour" className="home-features-cta">
              See the product tour
            </MagneticLink>
          </div>
          <ul className="home-features-list">
            <li>
              <em>01</em>
              <div>
                <h3>Buying &amp; intake</h3>
                <p>Record purchases, suppliers, and material received into your books.</p>
              </div>
            </li>
            <li>
              <em>02</em>
              <div>
                <h3>Store &amp; factory stock</h3>
                <p>Track packages, transfers, and what is ready to process or sell.</p>
              </div>
            </li>
            <li>
              <em>03</em>
              <div>
                <h3>Production</h3>
                <p>Convert raw material into finished qualities with day-level records.</p>
              </div>
            </li>
            <li>
              <em>04</em>
              <div>
                <h3>Sales &amp; expenses</h3>
                <p>Invoice customers, log daily costs, and keep money movement visible.</p>
              </div>
            </li>
            <li>
              <em>05</em>
              <div>
                <h3>Party ledger</h3>
                <p>Supplier and customer balances — what you owe and what they owe.</p>
              </div>
            </li>
            <li>
              <em>06</em>
              <div>
                <h3>Your company website</h3>
                <p>
                  Each customer can activate their own branded public site — cover, logo, gallery,
                  colours, and content — for buyers.
                </p>
              </div>
            </li>
            <li>
              <em>07</em>
              <div>
                <h3>Marketplace</h3>
                <p>List trade offers and reach buyers and sellers on CasingConnect.</p>
              </div>
            </li>
          </ul>
        </div>
      </HomeReveal>

      <HomeReveal className="home-industry" id="natural-casings">
        <div className="home-industry-inner">
          <p className="home-faq-eyebrow">The casing trade</p>
          <h2>Built for natural casing companies</h2>
          <p className="home-industry-lead">
            Sheep casings, hog casings, and beef casings move through buying, salt packing, store
            and factory stock, production, and export sales. CasingConnect is the private software
            layer for that work — from Sialkot exporters to firms abroad that need a tailored setup.
          </p>
          <ul className="home-industry-points">
            <li>
              <h3>Sheep, hog &amp; beef casings</h3>
              <p>
                Built for the sausage and meat trade — calibres, salt grades, qualities, parties,
                and ledgers in one private company account.
              </p>
            </li>
            <li>
              <h3>Exporters, processors &amp; traders</h3>
              <p>
                Track intake to invoice in one company account, then publish a buyer-facing site or
                list offers on the marketplace when you are ready.
              </p>
            </li>
            <li>
              <h3>Pakistan &amp; worldwide</h3>
              <p>
                Start with CasingConnect Pakistan workflows, or request custom currency and process
                setup for your country.
              </p>
            </li>
          </ul>
          <MagneticLink href="/natural-casings" className="home-features-cta">
            Learn about natural casings
          </MagneticLink>
        </div>
      </HomeReveal>

      <HomeReveal className="home-close">
        <div className="home-close-copy">
          <h2>One private system for your business.</h2>
          <p>
            Intake, store and factory stock, customer invoices, and supplier balances — without
            mixing another firm&rsquo;s books.
          </p>
          <MagneticLink href="/register" className="home-close-cta">
            Open your books
          </MagneticLink>
        </div>
        <div className="home-close-visual">
          <picture>
            <source srcSet="/home-sausages.webp?v=7" type="image/webp" />
            <img
              src="/home-sausages.jpg?v=7"
              alt="Sausages made with natural casings from the casing trade"
              width={1280}
              height={720}
              loading="lazy"
              decoding="async"
            />
          </picture>
        </div>
      </HomeReveal>

      <HomeReveal className="home-global">
        <p className="home-global-eyebrow">Worldwide</p>
        <h2>Outside Pakistan? We can tailor it for you.</h2>
        <p>
          If your casing company is abroad and needs the software shaped around your currency,
          workflow, or local practice — we customise CasingConnect so you can manage buying,
          stock, sales, and ledgers your way.
        </p>
        <MagneticLink href="/tailored-setup" className="home-global-cta">
          <span className="home-global-cta-aura" aria-hidden="true" />
          <span className="home-global-cta-inner">
            <span className="home-global-cta-shine" aria-hidden="true" />
            <span className="home-global-cta-orb" aria-hidden="true">
              <span className="home-global-cta-ring" />
              <span className="home-global-cta-ring is-delay" />
            </span>
            <span className="home-global-cta-copy">
              <strong>Request a tailored setup</strong>
              <small>Custom books for your country</small>
            </span>
            <span className="home-global-cta-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12h12M13 6l6 6-6 6" />
              </svg>
            </span>
          </span>
        </MagneticLink>
      </HomeReveal>

      <HomeReveal className="home-faq" id="faq">
        <div className="home-faq-inner">
          <p className="home-faq-eyebrow">Questions</p>
          <h2>Natural casing software FAQ</h2>
          <p className="home-faq-lead">
            Straight answers on privacy, multi-currency setups, public websites, and getting
            started with CasingConnect.
          </p>
          <div className="home-faq-list">
            {HOME_FAQS.map((item) => (
              <details key={item.question} className="home-faq-item">
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </HomeReveal>

      <footer className="home-foot">
        <span>
          Casing<span>Connect</span>
        </span>
        <nav className="home-foot-links" aria-label="Footer">
          <Link href="/natural-casings">Natural casings</Link>
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/product-tour">Product tour</Link>
          <a href="mailto:info@casingconnect.com">info@casingconnect.com</a>
        </nav>
        <span>Pakistan and worldwide — natural casing business software.</span>
      </footer>
    </div>
  );
}
