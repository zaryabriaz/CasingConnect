'use client';

import { Activity, PartnerRole } from '@/lib/types';
import { ACTIVITIES, PARTNER_ROLES } from '@/lib/labels';

export function Banner({ kind, children }: { kind: 'bad' | 'note'; children: React.ReactNode }) {
  return <p className={kind === 'bad' ? 'banner' : 'note'}>{children}</p>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ActivityChecks({
  selected,
  onChange,
  disabled,
  options = ACTIVITIES,
}: {
  selected: Activity[];
  onChange: (next: Activity[]) => void;
  disabled?: boolean;
  options?: readonly (readonly [Activity, string])[];
}) {
  return (
    <div className="checks">
      {options.map(([code, label]) => (
        <label key={code}>
          <input
            type="checkbox"
            checked={selected.includes(code)}
            disabled={disabled}
            onChange={(event) =>
              onChange(event.target.checked ? [...selected, code] : selected.filter((item) => item !== code))
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function RoleChecks({
  selected,
  onChange,
  disabled,
}: {
  selected: PartnerRole[];
  onChange: (next: PartnerRole[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="checks">
      {PARTNER_ROLES.map(([code, label]) => (
        <label key={code}>
          <input
            type="checkbox"
            checked={selected.includes(code)}
            disabled={disabled}
            onChange={(event) =>
              onChange(event.target.checked ? [...selected, code] : selected.filter((item) => item !== code))
            }
          />
          {label}
        </label>
      ))}
    </div>
  );
}
