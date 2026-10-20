'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Banner } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, errorText } from '@/lib/api';
import { canBook } from '@/lib/labels';

type QualityCol = { id: string; name: string; code: string };

type PersonRow = {
  membershipId: string | null;
  personName: string;
  remainingRoda?: string;
  remainingEighteenUp?: string;
  issued?: Array<{ material: string; materialForm: string; quantity: string }>;
  issuedTotal: string;
};

type ConversionRow = {
  id: string;
  reference: string;
  personName: string;
  fromMaterial: string;
  fromQuantity: string;
  toMaterial: string | null;
  toQuantity: string | null;
  labourRate: string | null;
  labourAmount: string | null;
  hanks: Array<{ qualityId: string; quality: string; quantity: string }>;
};

type CasingTypeOption = { id: string; code: string; name: string };

type DaySheet = {
  date: string;
  casingType: CasingTypeOption;
  casingTypes: CasingTypeOption[];
  qualities: QualityCol[];
  people: PersonRow[];
  conversions: ConversionRow[];
  report: {
    issuedToday: Array<{ personName: string; total: string; materials: Array<{ material: string; quantity: string }> }>;
    producedByQuality: Array<{ qualityId: string; quality: string; quantity: string }>;
  };
};

type DiameterGroup = {
  diameter: string;
  grades: Array<{ grade: string; quality: QualityCol }>;
};

function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function emptyOutputs(qualities: QualityCol[]) {
  return qualities.map((quality) => ({ qualityId: quality.id, quality: quality.name, quantity: '' }));
}

function groupByDiameter(qualities: QualityCol[]): DiameterGroup[] {
  const order: string[] = [];
  const map = new Map<string, DiameterGroup>();
  for (const quality of qualities) {
    const parts = quality.name.trim().split(/\s+/);
    const diameter = parts[0] ?? quality.name;
    const grade = parts.slice(1).join(' ') || '—';
    if (!map.has(diameter)) {
      order.push(diameter);
      map.set(diameter, { diameter, grades: [] });
    }
    map.get(diameter)!.grades.push({ grade, quality });
  }
  return order.map((diameter) => map.get(diameter)!);
}

function holdingLabel(person: PersonRow) {
  const parts = [
    Number(person.remainingRoda ?? 0) > 0 ? `Roda ${person.remainingRoda}` : null,
    Number(person.remainingEighteenUp ?? 0) > 0 ? `18/UP ${person.remainingEighteenUp}` : null,
  ].filter(Boolean);
  if (parts.length) return parts.join(' · ');
  if (person.issued?.length) {
    return person.issued.map((item) => `${item.material} ${item.quantity}`).join(' · ');
  }
  return 'Nothing left';
}

export default function ProductionPage() {
  const session = useSession();
  const editable = canBook(session.role) || session.role === 'SUPERVISOR';
  const [date, setDate] = useState(today);
  const [casingTypeId, setCasingTypeId] = useState('');
  const [casingTypes, setCasingTypes] = useState<CasingTypeOption[]>([]);
  const [qualities, setQualities] = useState<QualityCol[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [report, setReport] = useState<DaySheet['report'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  const [convertWorkerId, setConvertWorkerId] = useState('');
  const [convertMode, setConvertMode] = useState<'eighteen' | 'quality'>('eighteen');
  const [convertFrom, setConvertFrom] = useState<'RODA' | 'EIGHTEEN_UP'>('RODA');
  const [convertQty, setConvertQty] = useState('');
  const [convertEighteenHanks, setConvertEighteenHanks] = useState('');
  const [convertLabourRate, setConvertLabourRate] = useState('');
  const [convertHanks, setConvertHanks] = useState<Array<{ qualityId: string; quality: string; quantity: string }>>([]);

  function applySheet(sheet: DaySheet) {
    setCasingTypes(sheet.casingTypes);
    setCasingTypeId(sheet.casingType.id);
    setQualities(sheet.qualities);
    setPeople(sheet.people.length ? sheet.people : []);
    setConversions(sheet.conversions ?? []);
    setReport(sheet.report);
    setConvertWorkerId((current) => {
      if (current && sheet.people.some((row) => row.membershipId === current)) return current;
      return sheet.people.find((row) => row.membershipId)?.membershipId || '';
    });
    setConvertHanks(emptyOutputs(sheet.qualities));
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNote(null);
    const params = new URLSearchParams({ date });
    if (casingTypeId) params.set('casingTypeId', casingTypeId);
    api<DaySheet>(`/production/day?${params.toString()}`)
      .then(applySheet)
      .catch((caught) => setError(errorText(caught)))
      .finally(() => setLoading(false));
  }, [date, casingTypeId, session.business.id]);

  const showQualityFields = convertMode === 'quality';

  const selectedWorker = useMemo(
    () => people.find((row) => row.membershipId === convertWorkerId) ?? null,
    [people, convertWorkerId],
  );

  useEffect(() => {
    if (!selectedWorker) return;
    const roda = Number(selectedWorker.remainingRoda ?? 0);
    const eighteen = Number(selectedWorker.remainingEighteenUp ?? 0);
    if (roda <= 0 && eighteen > 0 && convertMode === 'eighteen') {
      setConvertMode('quality');
      setConvertFrom('EIGHTEEN_UP');
    }
  }, [selectedWorker, convertMode]);

  function setConvertHankQty(qualityId: string, quantity: string) {
    setConvertHanks((rows) =>
      rows.map((line) => (line.qualityId === qualityId ? { ...line, quantity } : line)),
    );
  }

  async function submitConvert() {
    if (!convertWorkerId) {
      setError('Choose a worker.');
      return;
    }
    if (convertMode === 'eighteen') {
      if (!convertEighteenHanks.trim() || Number(convertEighteenHanks) <= 0) {
        setError('Enter how many 18/UP hanks were made.');
        return;
      }
    } else {
      if (!convertQty.trim() || Number(convertQty) <= 0) {
        setError('Enter how much was used.');
        return;
      }
      const qualityLines = convertHanks.filter((line) => line.quantity.trim() && Number(line.quantity) > 0);
      if (qualityLines.length === 0) {
        setError('Enter at least one finished quality.');
        return;
      }
    }
    setConverting(true);
    setError(null);
    setNote(null);
    try {
      const labour =
        convertLabourRate.trim() && Number(convertLabourRate) > 0
          ? { labourRate: convertLabourRate.trim() }
          : {};
      const body =
        convertMode === 'eighteen'
          ? {
              date,
              membershipId: convertWorkerId,
              fromForm: 'RODA',
              fromQuantity: convertEighteenHanks.trim(),
              toForm: 'EIGHTEEN_UP',
              toQuantity: convertEighteenHanks.trim(),
              ...labour,
            }
          : {
              date,
              membershipId: convertWorkerId,
              fromForm: convertFrom,
              fromQuantity: convertQty.trim(),
              casingTypeId,
              outputs: convertHanks
                .filter((line) => line.quantity.trim() && Number(line.quantity) > 0)
                .map((line) => ({ qualityId: line.qualityId, quantity: line.quantity.trim() })),
              ...labour,
            };
      const sheet = await api<DaySheet>('/production/convert', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      applySheet(sheet);
      setConvertQty('');
      setConvertEighteenHanks('');
      setConvertLabourRate('');
      setConvertHanks(emptyOutputs(sheet.qualities));
      setNote(convertMode === 'eighteen' ? 'Recorded 18/UP.' : 'Recorded qualities.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setConverting(false);
    }
  }

  const groups = groupByDiameter(qualities);
  const flatCols = groups.flatMap((group) => group.grades.map((item) => item.quality));
  const holdingPeople = people.filter(
    (row) => Number(row.remainingRoda ?? 0) > 0 || Number(row.remainingEighteenUp ?? 0) > 0 || Number(row.issuedTotal) > 0,
  );

  const labourHankCount =
    convertMode === 'eighteen'
      ? Number(convertEighteenHanks) || 0
      : convertHanks.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const labourPreview =
    convertLabourRate.trim() && labourHankCount > 0 && Number(convertLabourRate) > 0
      ? (Number(convertLabourRate) * labourHankCount).toFixed(2).replace(/\.?0+$/, '')
      : '';

  return (
    <div className="stack">
      <div className="split">
        <div>
          <p className="tiny eyebrow">Production</p>
          <h1>Production</h1>
          <p className="muted">
            Issue material in <Link href="/app/operations">Operations</Link>, then record work here.
          </p>
        </div>
        <div className="nav-row">
          {casingTypes.length > 1 ? (
            <label className="field day-pick">
              <span>Casing type</span>
              <select value={casingTypeId} onChange={(event) => setCasingTypeId(event.target.value)}>
                {casingTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="field day-pick">
            <span>Date</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
        </div>
      </div>

      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      {loading || !report ? (
        <div className="card pad muted">Opening production…</div>
      ) : (
        <>
          <section className="card pad stack">
            <h2>With workers</h2>
            {holdingPeople.length === 0 ? (
              <p className="muted">
                Nobody is holding material. Issue Roda on <Link href="/app/operations">Operations</Link>.
              </p>
            ) : (
              <div className="dash-list">
                {holdingPeople.map((person) => (
                  <div className="dash-row" key={person.membershipId ?? person.personName}>
                    <span>
                      <strong>{person.personName}</strong>
                      <div className="tiny">{holdingLabel(person)}</div>
                    </span>
                    <strong>{person.issuedTotal}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>

          {editable ? (
            <section className="card pad stack">
              <h2>Record work</h2>
              <div className="row-3">
                <label className="field">
                  <span>Worker</span>
                  <select value={convertWorkerId} onChange={(event) => setConvertWorkerId(event.target.value)}>
                    {holdingPeople.length === 0 ? <option value="">Issue material first</option> : null}
                    {holdingPeople
                      .filter((row) => row.membershipId)
                      .map((row) => (
                        <option key={row.membershipId!} value={row.membershipId!}>
                          {row.personName} · {holdingLabel(row)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="field">
                  <span>Work done</span>
                  <select
                    value={convertMode}
                    onChange={(event) => {
                      const mode = event.target.value as 'eighteen' | 'quality';
                      setConvertMode(mode);
                      if (mode === 'eighteen') setConvertFrom('RODA');
                      if (mode === 'quality' && Number(selectedWorker?.remainingRoda ?? 0) <= 0) {
                        setConvertFrom('EIGHTEEN_UP');
                      }
                    }}
                  >
                    <option value="eighteen" disabled={Number(selectedWorker?.remainingRoda ?? 0) <= 0}>
                      18/UP
                    </option>
                    <option value="quality">Quality</option>
                  </select>
                </label>
                {showQualityFields ? (
                  <label className="field">
                    <span>From</span>
                    <select
                      value={convertFrom}
                      onChange={(event) => setConvertFrom(event.target.value as 'RODA' | 'EIGHTEEN_UP')}
                    >
                      <option value="RODA">Roda</option>
                      <option value="EIGHTEEN_UP">18/UP</option>
                    </select>
                  </label>
                ) : (
                  <label className="field">
                    <span>18/UP hanks</span>
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      value={convertEighteenHanks}
                      onChange={(event) => setConvertEighteenHanks(event.target.value)}
                    />
                  </label>
                )}
              </div>

              <div className="row-2">
                {showQualityFields ? (
                  <label className="field">
                    <span>{convertFrom === 'RODA' ? 'Roda' : '18/UP'} used</span>
                    <input
                      inputMode="decimal"
                      placeholder="0"
                      value={convertQty}
                      onChange={(event) => setConvertQty(event.target.value)}
                    />
                  </label>
                ) : (
                  <div />
                )}
                <label className="field">
                  <span>Labour rate / hank</span>
                  <input
                    inputMode="decimal"
                    placeholder="Optional"
                    value={convertLabourRate}
                    onChange={(event) => setConvertLabourRate(event.target.value)}
                  />
                  {labourPreview ? <span className="tiny">Labour amount {labourPreview}</span> : null}
                </label>
              </div>

              {showQualityFields ? (
                <div className="sheet-wrap">
                  <table className="sheet">
                    <thead>
                      <tr>
                        {groups.map((group) => (
                          <th key={group.diameter} colSpan={group.grades.length}>
                            {group.diameter}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        {groups.flatMap((group) =>
                          group.grades.map((item) => (
                            <th key={item.quality.id} className="grade-head">
                              {item.grade}
                            </th>
                          )),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {flatCols.map((quality) => {
                          const line = convertHanks.find((item) => item.qualityId === quality.id);
                          return (
                            <td key={quality.id}>
                              <input
                                inputMode="decimal"
                                value={line?.quantity ?? ''}
                                placeholder="0"
                                onChange={(event) => setConvertHankQty(quality.id, event.target.value)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null}

              <div className="nav-row">
                <button
                  className="btn primary"
                  type="button"
                  disabled={converting || !convertWorkerId}
                  onClick={() => void submitConvert()}
                >
                  {converting ? 'Saving…' : showQualityFields ? 'Record qualities' : 'Record 18/UP'}
                </button>
              </div>
            </section>
          ) : (
            <p className="muted">Your role can view this page. Owner, manager, supervisor, or accountant can record work.</p>
          )}

          <section className="card pad stack">
            <h2>Today</h2>
            {conversions.length === 0 && report.producedByQuality.length === 0 ? (
              <p className="muted">Nothing recorded yet for this date.</p>
            ) : (
              <div className="dash-list">
                {conversions.map((row) => (
                  <div className="dash-row" key={row.id}>
                    <span>
                      <strong>{row.personName}</strong>
                      <div className="tiny">
                        {row.reference} · {row.fromMaterial} {row.fromQuantity}
                        {row.toMaterial
                          ? ` → ${row.toMaterial} ${row.toQuantity ?? row.fromQuantity}`
                          : ` → ${row.hanks.map((item) => `${item.quality} ${item.quantity}`).join(', ')}`}
                        {row.labourAmount ? ` · Labour ${row.labourAmount}` : ''}
                      </div>
                    </span>
                    {row.labourAmount ? <strong>{row.labourAmount}</strong> : null}
                  </div>
                ))}
                {report.producedByQuality.map((row) => (
                  <div className="dash-row" key={`q-${row.qualityId}`}>
                    <span>
                      <strong>{row.quality}</strong>
                      <div className="tiny">Finished quality today</div>
                    </span>
                    <strong>{row.quantity}</strong>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
