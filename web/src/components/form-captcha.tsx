'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, errorText } from '@/lib/api';
import { Field } from '@/components/ui';

type Challenge = {
  token: string;
  question: string;
};

type Props = {
  onChange: (value: { token: string; answer: string } | null) => void;
};

/** Free built-in captcha — no third-party keys required. */
export function FormCaptcha({ onChange }: Props) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAnswer('');
    onChange(null);
    try {
      const next = await api<Challenge>('/captcha/challenge');
      setChallenge(next);
    } catch (caught) {
      setChallenge(null);
      setError(errorText(caught));
    } finally {
      setLoading(false);
    }
  }, [onChange]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!challenge || !answer.trim()) {
      onChange(null);
      return;
    }
    onChange({ token: challenge.token, answer: answer.trim() });
  }, [answer, challenge, onChange]);

  return (
    <div className="captcha-block">
      <Field label={challenge ? challenge.question : 'Captcha'}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            inputMode="numeric"
            autoComplete="off"
            required
            value={answer}
            disabled={loading || !challenge}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder={loading ? 'Loading…' : 'Your answer'}
            aria-label="Captcha answer"
          />
          <button type="button" className="linkish" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </Field>
      {error ? <p className="tiny" style={{ margin: 0, color: '#8a2b2b' }}>{error}</p> : null}
    </div>
  );
}

export function captchaReady(value: { token: string; answer: string } | null) {
  return Boolean(value?.token && value.answer.trim());
}

/** Hidden honeypot field — leave empty; bots often fill it. */
export function HoneypotField() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <label>
        Website
        <input name="website" type="text" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}
