export type Country = {
  code: string;
  name: string;
  dial: string;
};

/** ISO2 → flag emoji (e.g. PK → 🇵🇰). */
export function flagOf(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export function countryByCode(code: string) {
  return COUNTRIES.find((item) => item.code === code) ?? COUNTRIES[0];
}

export function countryByName(name: string) {
  const needle = name.trim().toLowerCase();
  return COUNTRIES.find((item) => item.name.toLowerCase() === needle) ?? COUNTRIES[0];
}

export const DEFAULT_COUNTRY_CODE = 'PK';

/** Common trade markets first, then A–Z. */
export const COUNTRIES: Country[] = [
  { code: 'PK', name: 'Pakistan', dial: '92' },
  { code: 'CN', name: 'China', dial: '86' },
  { code: 'TR', name: 'Turkey', dial: '90' },
  { code: 'DE', name: 'Germany', dial: '49' },
  { code: 'NL', name: 'Netherlands', dial: '31' },
  { code: 'ES', name: 'Spain', dial: '34' },
  { code: 'IT', name: 'Italy', dial: '39' },
  { code: 'FR', name: 'France', dial: '33' },
  { code: 'GB', name: 'United Kingdom', dial: '44' },
  { code: 'US', name: 'United States', dial: '1' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '966' },
  { code: 'IN', name: 'India', dial: '91' },
  { code: 'BD', name: 'Bangladesh', dial: '880' },
  { code: 'AF', name: 'Afghanistan', dial: '93' },
  { code: 'AL', name: 'Albania', dial: '355' },
  { code: 'DZ', name: 'Algeria', dial: '213' },
  { code: 'AR', name: 'Argentina', dial: '54' },
  { code: 'AU', name: 'Australia', dial: '61' },
  { code: 'AT', name: 'Austria', dial: '43' },
  { code: 'BH', name: 'Bahrain', dial: '973' },
  { code: 'BE', name: 'Belgium', dial: '32' },
  { code: 'BR', name: 'Brazil', dial: '55' },
  { code: 'BG', name: 'Bulgaria', dial: '359' },
  { code: 'CA', name: 'Canada', dial: '1' },
  { code: 'CL', name: 'Chile', dial: '56' },
  { code: 'CO', name: 'Colombia', dial: '57' },
  { code: 'HR', name: 'Croatia', dial: '385' },
  { code: 'CY', name: 'Cyprus', dial: '357' },
  { code: 'CZ', name: 'Czechia', dial: '420' },
  { code: 'DK', name: 'Denmark', dial: '45' },
  { code: 'EG', name: 'Egypt', dial: '20' },
  { code: 'FI', name: 'Finland', dial: '358' },
  { code: 'GE', name: 'Georgia', dial: '995' },
  { code: 'GR', name: 'Greece', dial: '30' },
  { code: 'HK', name: 'Hong Kong', dial: '852' },
  { code: 'HU', name: 'Hungary', dial: '36' },
  { code: 'ID', name: 'Indonesia', dial: '62' },
  { code: 'IR', name: 'Iran', dial: '98' },
  { code: 'IQ', name: 'Iraq', dial: '964' },
  { code: 'IE', name: 'Ireland', dial: '353' },
  { code: 'IL', name: 'Israel', dial: '972' },
  { code: 'JP', name: 'Japan', dial: '81' },
  { code: 'JO', name: 'Jordan', dial: '962' },
  { code: 'KZ', name: 'Kazakhstan', dial: '7' },
  { code: 'KE', name: 'Kenya', dial: '254' },
  { code: 'KW', name: 'Kuwait', dial: '965' },
  { code: 'LB', name: 'Lebanon', dial: '961' },
  { code: 'LY', name: 'Libya', dial: '218' },
  { code: 'MY', name: 'Malaysia', dial: '60' },
  { code: 'MX', name: 'Mexico', dial: '52' },
  { code: 'MA', name: 'Morocco', dial: '212' },
  { code: 'NZ', name: 'New Zealand', dial: '64' },
  { code: 'NG', name: 'Nigeria', dial: '234' },
  { code: 'NO', name: 'Norway', dial: '47' },
  { code: 'OM', name: 'Oman', dial: '968' },
  { code: 'PH', name: 'Philippines', dial: '63' },
  { code: 'PL', name: 'Poland', dial: '48' },
  { code: 'PT', name: 'Portugal', dial: '351' },
  { code: 'QA', name: 'Qatar', dial: '974' },
  { code: 'RO', name: 'Romania', dial: '40' },
  { code: 'RU', name: 'Russia', dial: '7' },
  { code: 'RS', name: 'Serbia', dial: '381' },
  { code: 'SG', name: 'Singapore', dial: '65' },
  { code: 'SK', name: 'Slovakia', dial: '421' },
  { code: 'ZA', name: 'South Africa', dial: '27' },
  { code: 'KR', name: 'South Korea', dial: '82' },
  { code: 'LK', name: 'Sri Lanka', dial: '94' },
  { code: 'SE', name: 'Sweden', dial: '46' },
  { code: 'CH', name: 'Switzerland', dial: '41' },
  { code: 'SY', name: 'Syria', dial: '963' },
  { code: 'TW', name: 'Taiwan', dial: '886' },
  { code: 'TH', name: 'Thailand', dial: '66' },
  { code: 'TN', name: 'Tunisia', dial: '216' },
  { code: 'UA', name: 'Ukraine', dial: '380' },
  { code: 'UZ', name: 'Uzbekistan', dial: '998' },
  { code: 'VN', name: 'Vietnam', dial: '84' },
  { code: 'YE', name: 'Yemen', dial: '967' },
];

export function formatInternationalPhone(dial: string, national: string) {
  const digits = national.replace(/\D/g, '').replace(new RegExp(`^${dial}`), '');
  if (!digits) return '';
  return `+${dial} ${digits}`;
}
