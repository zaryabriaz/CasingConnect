'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { CountrySelect, PhoneField } from '@/components/country-fields';
import { captchaReady, FormCaptcha, HoneypotField } from '@/components/form-captcha';
import { ActivityChecks, Banner, Field } from '@/components/ui';
import { errorText, register, saveToken } from '@/lib/api';
import { countryByCode, DEFAULT_COUNTRY_CODE, formatInternationalPhone } from '@/lib/countries';
import { ACTIVITIES } from '@/lib/labels';
import { Activity } from '@/lib/types';

type Path = 'choose' | 'ops' | 'buyer';

export default function RegisterPage() {
  const router = useRouter();
  const [path, setPath] = useState<Path>('choose');
  const [activities, setActivities] = useState<Activity[]>(['PROCESSOR']);
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [captcha, setCaptcha] = useState<{ token: string; answer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onCaptcha = useCallback((value: { token: string; answer: string } | null) => {
    setCaptcha(value);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isBuyer = path === 'buyer';
    const selected = isBuyer ? (['BUYER'] as Activity[]) : activities;
    if (selected.length === 0) {
      setError('Choose at least one activity.');
      return;
    }
    if (!captchaReady(captcha)) {
      setError('Please complete the captcha.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const country = countryByCode(countryCode);
    const phone = formatInternationalPhone(country.dial, phoneNational);
    setPending(true);
    setError(null);
    try {
      const session = await register({
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
        businessName: String(form.get('businessName') ?? ''),
        city: String(form.get('city') ?? ''),
        country: country.name,
        ...(phone ? { phone } : {}),
        activities: selected,
        currency: isBuyer ? currency.trim().toUpperCase() || 'USD' : undefined,
        captchaToken: captcha!.token,
        captchaAnswer: captcha!.answer,
        website: String(form.get('website') ?? ''),
      });
      saveToken(session.accessToken);
      router.push(isBuyer ? '/marketplace' : '/app');
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  }

  if (path === 'choose') {
    return (
      <AuthShell
        title="Join CasingConnect"
        lead="Buyers discover sellers on the public Marketplace. Plants and traders keep private ops."
        footer={
          <>
            Already registered? <Link href="/login">Sign in</Link>
          </>
        }
      >
        <div className="stack" style={{ gap: '0.75rem' }}>
          <button className="auth-submit" type="button" onClick={() => setPath('buyer')}>
            I&rsquo;m a buyer
          </button>
          <button
            className="auth-submit"
            type="button"
            style={{ background: 'transparent', color: 'inherit', border: '1px solid currentColor' }}
            onClick={() => setPath('ops')}
          >
            I run a plant / trade ops
          </button>
        </div>
      </AuthShell>
    );
  }

  const isBuyer = path === 'buyer';

  return (
    <AuthShell
      title={isBuyer ? 'Register as a buyer' : 'Register your business'}
      lead={
        isBuyer
          ? 'Browse the Marketplace, inquire on listings, and track replies. No factory or production modules.'
          : 'You become the owner. Sheep casings are ready; enable beef later in Catalogue if you need it.'
      }
      footer={
        <>
          <button type="button" className="linkish" onClick={() => setPath('choose')} style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
            Back
          </button>
          {' · '}
          Already registered? <Link href="/login">Sign in</Link>
        </>
      }
    >
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <form className="auth-form" onSubmit={onSubmit}>
        <Field label="Your name">
          <input name="name" required minLength={2} autoComplete="name" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Password">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
        <Field label={isBuyer ? 'Company / trading name' : 'Business name'}>
          <input name="businessName" required minLength={2} autoComplete="organization" />
        </Field>
        <Field label="Phone">
          <PhoneField
            countryCode={countryCode}
            onCountryChange={setCountryCode}
            national={phoneNational}
            onNationalChange={setPhoneNational}
          />
        </Field>
        <div className="auth-row">
          <Field label="City">
            <input name="city" autoComplete="address-level2" />
          </Field>
          <Field label="Country">
            <CountrySelect value={countryCode} onChange={setCountryCode} />
          </Field>
        </div>
        {isBuyer ? (
          <Field label="Preferred currency">
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              required
              minLength={3}
              maxLength={3}
              placeholder="USD"
            />
          </Field>
        ) : (
          <div className="field">
            <span>Activities</span>
            <ActivityChecks
              selected={activities}
              onChange={setActivities}
              options={ACTIVITIES.filter(([code]) => code !== 'BUYER')}
            />
          </div>
        )}
        <HoneypotField />
        <FormCaptcha onChange={onCaptcha} />
        <button
          className="auth-submit"
          type="submit"
          disabled={pending || !captchaReady(captcha)}
        >
          {pending ? 'Creating…' : isBuyer ? 'Create buyer account' : 'Create the business'}
        </button>
      </form>
    </AuthShell>
  );
}
