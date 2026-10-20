'use client';

import { COUNTRIES, countryByCode, flagOf } from '@/lib/countries';

export function CountrySelect({
  value,
  onChange,
  name = 'country',
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  name?: string;
  id?: string;
}) {
  const selected = countryByCode(value);
  return (
    <>
      <select
        id={id}
        className="country-select"
        value={selected.code}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="country"
        required
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {flagOf(country.code)} {country.name}
          </option>
        ))}
      </select>
      <input type="hidden" name={name} value={selected.name} />
    </>
  );
}

export function PhoneField({
  countryCode,
  onCountryChange,
  national,
  onNationalChange,
  required,
}: {
  countryCode: string;
  onCountryChange: (code: string) => void;
  national: string;
  onNationalChange: (value: string) => void;
  required?: boolean;
}) {
  const selected = countryByCode(countryCode);
  return (
    <div className="phone-field">
      <select
        className="phone-dial"
        value={selected.code}
        onChange={(event) => onCountryChange(event.target.value)}
        aria-label="Country calling code"
      >
        {COUNTRIES.map((country) => (
          <option key={country.code} value={country.code}>
            {flagOf(country.code)} +{country.dial} {country.name}
          </option>
        ))}
      </select>
      <input
        className="phone-national"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder="300 1234567"
        value={national}
        onChange={(event) => onNationalChange(event.target.value)}
        required={required}
      />
    </div>
  );
}
