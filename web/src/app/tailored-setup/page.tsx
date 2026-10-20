'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { CountrySelect, PhoneField } from '@/components/country-fields';
import { captchaReady, FormCaptcha, HoneypotField } from '@/components/form-captcha';
import { Banner, Field } from '@/components/ui';
import { api, errorText } from '@/lib/api';
import { countryByCode, formatInternationalPhone } from '@/lib/countries';

export default function TailoredSetupPage() {
  const [countryCode, setCountryCode] = useState('DE');
  const [phoneNational, setPhoneNational] = useState('');
  const [captcha, setCaptcha] = useState<{ token: string; answer: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

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
      await api('/setup-requests', {
        method: 'POST',
        body: JSON.stringify({
          name: String(form.get('name') ?? '').trim(),
          email: String(form.get('email') ?? '').trim(),
          companyName: String(form.get('companyName') ?? '').trim() || undefined,
          country: country.name,
          ...(phone ? { phone } : {}),
          message: String(form.get('message') ?? '').trim(),
          captchaToken: captcha!.token,
          captchaAnswer: captcha!.answer,
          website: String(form.get('website') ?? ''),
        }),
      });
      setSent(true);
    } catch (caught) {
      setError(errorText(caught));
      setPending(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        title="Request received"
        lead="Thanks — our team will review your query and get back to you about a tailored setup."
        footer={
          <>
            <Link href="/">Back to home</Link>
            {' · '}
            <Link href="/marketplace">Browse marketplace</Link>
          </>
        }
      >
        <p className="tiny" style={{ margin: 0 }}>
          You can close this page. We will contact you at the email you provided.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Request a tailored setup"
      lead="Tell us about your casing business and what you need customised — currency, workflow, language, or local practice. Especially useful if you are outside Pakistan."
      footer={
        <>
          Prefer a standard account? <Link href="/register">Register here</Link>
        </>
      }
    >
      {error ? <Banner kind="bad">{error}</Banner> : null}
      <form className="stack" onSubmit={onSubmit}>
        <Field label="Your name">
          <input name="name" required autoComplete="name" />
        </Field>
        <Field label="Work email">
          <input name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Company name (optional)">
          <input name="companyName" autoComplete="organization" />
        </Field>
        <Field label="Country">
          <CountrySelect value={countryCode} onChange={setCountryCode} />
        </Field>
        <Field label="Phone (optional)">
          <PhoneField
            countryCode={countryCode}
            onCountryChange={setCountryCode}
            national={phoneNational}
            onNationalChange={setPhoneNational}
          />
        </Field>
        <Field label="What do you need?">
          <textarea
            name="message"
            required
            minLength={10}
            rows={5}
            placeholder="e.g. We process sheep casings in Spain and need EUR books, Spanish labels, and a different store workflow…"
          />
        </Field>
        <HoneypotField />
        <FormCaptcha onChange={onCaptcha} />
        <button className="auth-submit" type="submit" disabled={pending || !captchaReady(captcha)}>
          {pending ? 'Sending…' : 'Send request'}
        </button>
      </form>
    </AuthShell>
  );
}
