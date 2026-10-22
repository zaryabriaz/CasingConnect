'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { CountrySelect, PhoneField } from '@/components/country-fields';
import { captchaReady, FormCaptcha, HONEYPOT_FIELD, HoneypotField } from '@/components/form-captcha';
import { Banner, Field } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { countryByCode, formatInternationalPhone } from '@/lib/countries';

type ListingRequestResult = {
  id: string;
  companyName: string;
  message: string;
};

export default function ListCompanyPage() {
  const [countryCode, setCountryCode] = useState('PK');
  const [phoneNational, setPhoneNational] = useState('');
  const [captcha, setCaptcha] = useState<{ token: string; answer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ListingRequestResult | null>(null);

  const onCaptcha = useCallback((value: { token: string; answer: string } | null) => {
    setCaptcha(value);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      const data = await api<ListingRequestResult>('/marketplace/listing-requests', {
        method: 'POST',
        body: JSON.stringify({
          companyName: String(form.get('companyName') ?? '').trim(),
          contactName: String(form.get('contactName') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          country: country.name,
          city: String(form.get('city') ?? '').trim() || undefined,
          companyWebsite: String(form.get('companyWebsite') ?? '').trim() || undefined,
          about: String(form.get('about') ?? '').trim(),
          ...(phone ? { phone } : {}),
          captchaToken: captcha!.token,
          captchaAnswer: captcha!.answer,
          website: String(form.get(HONEYPOT_FIELD) ?? ''),
        }),
      });
      setResult(data);
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  }

  if (result) {
    return (
      <AuthShell
        title="Company listed"
        lead={result.message}
        footer={
          <>
            <Link href="/marketplace">Open Marketplace</Link>
            {' · '}
            <Link href={`/marketplace?q=${encodeURIComponent(result.companyName)}`}>
              Find {result.companyName}
            </Link>
          </>
        }
      >
        <p className="tiny" style={{ margin: 0 }}>
          Want full private books (buying → sales)?{' '}
          <Link href="/register">Create a member account</Link> or{' '}
          <Link href="/tailored-setup">request a tailored setup</Link>.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="List your company"
      lead="Not in the CasingConnect Marketplace yet? Add your natural casing company so buyers and sellers can find you."
      footer={
        <>
          Already a member? <Link href="/login">Sign in</Link>
          {' · '}
          <Link href="/marketplace">Back to Marketplace</Link>
        </>
      }
    >
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <form className="stack" onSubmit={onSubmit}>
        <Field label="Company name">
          <input name="companyName" required autoComplete="organization" placeholder="e.g. Al-Noor Casings" />
        </Field>
        <Field label="Your name">
          <input name="contactName" required autoComplete="name" />
        </Field>
        <Field label="Work email">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Country">
          <CountrySelect value={countryCode} onChange={setCountryCode} />
        </Field>
        <Field label="City (optional)">
          <input name="city" autoComplete="address-level2" />
        </Field>
        <Field label="Phone (optional)">
          <PhoneField
            countryCode={countryCode}
            onCountryChange={setCountryCode}
            national={phoneNational}
            onNationalChange={setPhoneNational}
          />
        </Field>
        <Field label="Company website (optional)">
          <input
            name="companyWebsite"
            type="url"
            placeholder="https://…"
            autoComplete="off"
          />
        </Field>
        <Field label="About your company">
          <textarea
            name="about"
            required
            minLength={10}
            rows={5}
            placeholder="Sheep / hog / beef casings, markets you serve, certifications…"
          />
        </Field>
        <HoneypotField />
        <FormCaptcha onChange={onCaptcha} />
        <button className="auth-submit" type="submit" disabled={pending || !captchaReady(captcha)}>
          {pending ? 'Submitting…' : 'List my company'}
        </button>
      </form>
    </AuthShell>
  );
}
