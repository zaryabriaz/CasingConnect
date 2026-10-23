'use client';

import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { Banner, Field } from '@/components/ui';
import { useSession } from '@/components/session';
import { api, apiForm, errorText, mediaUrl, readToken } from '@/lib/api';
import { canManage, isExporter } from '@/lib/labels';

type DocType = 'COMMERCIAL_INVOICE' | 'PACKING_LIST';

type ExportLine = {
  description: string;
  quantity: string;
  unit: string;
  rate: string;
  amount: string;
  packages: string;
  netWeight: string;
  grossWeight: string;
  marks: string;
};

type Letterhead = {
  businessName: string;
  letterheadUrl: string | null;
};

type ExportDoc = {
  id: string;
  type: DocType;
  documentNumber: string;
  title: string | null;
  buyerName: string;
  buyerAddress: string | null;
  documentDate: string;
  pdfUrl: string;
  createdAt: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function blankLine(): ExportLine {
  return {
    description: '',
    quantity: '',
    unit: 'hanks',
    rate: '',
    amount: '',
    packages: '',
    netWeight: '',
    grossWeight: '',
    marks: '',
  };
}

function typeLabel(type: DocType) {
  return type === 'COMMERCIAL_INVOICE' ? 'Commercial Invoice' : 'Packing List';
}

export default function ExportsPage() {
  const session = useSession();
  const manage = canManage(session.role);
  const exporter = isExporter(session.business.activities);
  const [letterhead, setLetterhead] = useState<Letterhead | null>(null);
  const [history, setHistory] = useState<ExportDoc[]>([]);
  const [type, setType] = useState<DocType>('COMMERCIAL_INVOICE');
  const [documentNumber, setDocumentNumber] = useState('');
  const [documentDate, setDocumentDate] = useState(today());
  const [buyerName, setBuyerName] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [incoterms, setIncoterms] = useState('');
  const [currency, setCurrency] = useState(session.business.currency || 'USD');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [destinationCountry, setDestinationCountry] = useState('');
  const [vesselOrFlight, setVesselOrFlight] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<ExportLine[]>([blankLine()]);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    if (!manage || !exporter) return;
    setError(null);
    try {
      const [lh, docs] = await Promise.all([
        api<Letterhead>('/exports/letterhead'),
        api<ExportDoc[]>('/exports/documents'),
      ]);
      setLetterhead(lh);
      setHistory(docs);
      if (!currency) setCurrency(session.business.currency || 'USD');
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.business.id, manage, exporter]);

  if (!exporter) {
    return (
      <div className="stack">
        <h1>Exports</h1>
        <p className="muted">
          Export documents are available when this company includes the Exporter activity.{' '}
          <Link href="/app/profile">Update company profile</Link>
        </p>
      </div>
    );
  }

  async function onLetterheadPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !manage) return;
    setUploading(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const data = await apiForm<Letterhead>('/exports/letterhead', form);
      setLetterhead(data);
      setNote('Letterhead uploaded. New PDFs will print on this sheet.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setUploading(false);
    }
  }

  async function removeLetterhead() {
    if (!manage) return;
    setBusy(true);
    setError(null);
    try {
      const data = await api<Letterhead>('/exports/letterhead', { method: 'DELETE' });
      setLetterhead(data);
      setNote('Letterhead removed.');
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  function updateLine(index: number, patch: Partial<ExportLine>) {
    setLines((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    if (!manage) return;
    const filled = lines.filter((line) => line.description.trim());
    if (filled.length === 0) {
      setError('Add at least one line with a description.');
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const created = await api<ExportDoc>('/exports/documents', {
        method: 'POST',
        body: JSON.stringify({
          type,
          documentNumber: documentNumber.trim(),
          documentDate,
          buyerName: buyerName.trim(),
          buyerAddress: buyerAddress.trim() || undefined,
          incoterms: incoterms.trim() || undefined,
          currency: currency.trim() || undefined,
          paymentTerms: paymentTerms.trim() || undefined,
          destinationCountry: destinationCountry.trim() || undefined,
          vesselOrFlight: vesselOrFlight.trim() || undefined,
          containerNo: containerNo.trim() || undefined,
          notes: notes.trim() || undefined,
          lines: filled.map((line) => ({
            description: line.description.trim(),
            quantity: line.quantity.trim() || undefined,
            unit: line.unit.trim() || undefined,
            rate: line.rate.trim() || undefined,
            amount: line.amount.trim() || undefined,
            packages: line.packages.trim() || undefined,
            netWeight: line.netWeight.trim() || undefined,
            grossWeight: line.grossWeight.trim() || undefined,
            marks: line.marks.trim() || undefined,
          })),
        }),
      });
      setHistory((rows) => [created, ...rows]);
      setNote(`${typeLabel(created.type)} ${created.documentNumber} generated.`);
      await downloadPdf(created.id, created.documentNumber);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(id: string, documentNo: string) {
    const token = readToken();
    const base =
      typeof window !== 'undefined' && window.location.port === '3011'
        ? `${window.location.protocol}//${window.location.hostname}:3010/api/v1`
        : `${window.location.origin}/api/v1`;
    const response = await fetch(`${base}/exports/documents/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Could not download the PDF.');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentNo || 'export'}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!manage) {
    return (
      <div className="stack">
        <div>
          <p className="tiny eyebrow">Exports</p>
          <h1>Export documents</h1>
          <p className="muted">Only owners and managers can generate export letterhead documents.</p>
        </div>
      </div>
    );
  }

  const letterheadSrc = mediaUrl(letterhead?.letterheadUrl);

  return (
    <div className="stack">
      <div>
        <p className="tiny eyebrow">Exports</p>
        <h1>Export documents</h1>
        <p className="muted">
          Upload your company letterhead, then generate a Commercial Invoice or Packing List printed
          on that sheet — separate from Sales.
        </p>
      </div>
      {error ? <Banner kind="bad">{error}</Banner> : null}
      {note ? <Banner kind="note">{note}</Banner> : null}

      <section className="card pad stack">
        <div>
          <h2>Company letterhead</h2>
          <p className="muted tiny">
            Upload a full-page scan or design (JPG / PNG / WebP). Document fields print below the
            header area.
          </p>
        </div>
        {letterheadSrc ? (
          <div className="export-letterhead-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={letterheadSrc} alt="Company letterhead" />
          </div>
        ) : (
          <p className="muted">No letterhead yet — PDFs will still generate on a plain page.</p>
        )}
        <div className="inline" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <label className="btn ghost">
            {uploading ? 'Uploading…' : letterheadSrc ? 'Replace letterhead' : 'Upload letterhead'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              disabled={uploading || busy}
              onChange={(event) => void onLetterheadPick(event)}
            />
          </label>
          {letterheadSrc ? (
            <button className="btn ghost" type="button" disabled={busy} onClick={() => void removeLetterhead()}>
              Remove
            </button>
          ) : null}
        </div>
      </section>

      <form className="card pad form" onSubmit={(event) => void onGenerate(event)}>
        <h2>Generate document</h2>
        <div className="row-2">
          <Field label="Document type">
            <select value={type} onChange={(event) => setType(event.target.value as DocType)}>
              <option value="COMMERCIAL_INVOICE">Commercial Invoice</option>
              <option value="PACKING_LIST">Packing List</option>
            </select>
          </Field>
          <Field label="Document number">
            <input
              required
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              placeholder="INV-2026-001"
            />
          </Field>
        </div>
        <div className="row-2">
          <Field label="Date">
            <input
              type="date"
              required
              value={documentDate}
              onChange={(event) => setDocumentDate(event.target.value)}
            />
          </Field>
          <Field label="Currency">
            <input value={currency} onChange={(event) => setCurrency(event.target.value)} placeholder="USD" />
          </Field>
        </div>
        <Field label="Buyer / consignee">
          <input
            required
            value={buyerName}
            onChange={(event) => setBuyerName(event.target.value)}
            placeholder="Buyer company name"
          />
        </Field>
        <Field label="Buyer address">
          <textarea
            rows={2}
            value={buyerAddress}
            onChange={(event) => setBuyerAddress(event.target.value)}
            placeholder="Street, city, country"
          />
        </Field>
        <div className="row-2">
          <Field label="Incoterms">
            <input
              value={incoterms}
              onChange={(event) => setIncoterms(event.target.value)}
              placeholder="CIF Rotterdam"
            />
          </Field>
          <Field label="Payment terms">
            <input
              value={paymentTerms}
              onChange={(event) => setPaymentTerms(event.target.value)}
              placeholder="LC at sight / TT"
            />
          </Field>
        </div>
        <div className="row-2">
          <Field label="Destination country">
            <input
              value={destinationCountry}
              onChange={(event) => setDestinationCountry(event.target.value)}
            />
          </Field>
          <Field label="Vessel / flight">
            <input value={vesselOrFlight} onChange={(event) => setVesselOrFlight(event.target.value)} />
          </Field>
        </div>
        <Field label="Container no.">
          <input value={containerNo} onChange={(event) => setContainerNo(event.target.value)} />
        </Field>

        <div className="stack" style={{ gap: '0.75rem' }}>
          <div className="split">
            <h3 style={{ margin: 0 }}>Lines</h3>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setLines((rows) => [...rows, blankLine()])}
            >
              Add line
            </button>
          </div>
          {lines.map((line, index) => (
            <div className="card pad stack" key={index} style={{ boxShadow: 'none' }}>
              <Field label="Description / quality">
                <input
                  value={line.description}
                  onChange={(event) => updateLine(index, { description: event.target.value })}
                  placeholder="26/28 AB sheep casings"
                />
              </Field>
              <div className="row-2">
                <Field label="Quantity">
                  <input
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  />
                </Field>
                <Field label="Unit">
                  <input
                    value={line.unit}
                    onChange={(event) => updateLine(index, { unit: event.target.value })}
                  />
                </Field>
              </div>
              {type === 'COMMERCIAL_INVOICE' ? (
                <div className="row-2">
                  <Field label="Rate">
                    <input
                      value={line.rate}
                      onChange={(event) => updateLine(index, { rate: event.target.value })}
                    />
                  </Field>
                  <Field label="Amount">
                    <input
                      value={line.amount}
                      onChange={(event) => updateLine(index, { amount: event.target.value })}
                    />
                  </Field>
                </div>
              ) : (
                <>
                  <div className="row-2">
                    <Field label="Packages">
                      <input
                        value={line.packages}
                        onChange={(event) => updateLine(index, { packages: event.target.value })}
                      />
                    </Field>
                    <Field label="Marks">
                      <input
                        value={line.marks}
                        onChange={(event) => updateLine(index, { marks: event.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="row-2">
                    <Field label="Net weight">
                      <input
                        value={line.netWeight}
                        onChange={(event) => updateLine(index, { netWeight: event.target.value })}
                      />
                    </Field>
                    <Field label="Gross weight">
                      <input
                        value={line.grossWeight}
                        onChange={(event) => updateLine(index, { grossWeight: event.target.value })}
                      />
                    </Field>
                  </div>
                </>
              )}
              {lines.length > 1 ? (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setLines((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove line
                </button>
              ) : null}
            </div>
          ))}
        </div>

        <Field label="Notes">
          <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? 'Generating…' : `Generate ${typeLabel(type)} PDF`}
        </button>
      </form>

      <section className="card pad stack">
        <h2>Recent documents</h2>
        {history.length === 0 ? (
          <p className="muted">No documents generated yet.</p>
        ) : (
          <div className="unit-rows">
            {history.map((doc) => (
              <div className="unit-row" key={doc.id}>
                <div>
                  <strong>
                    {typeLabel(doc.type)} · {doc.documentNumber}
                  </strong>
                  <div className="tiny">
                    {doc.buyerName} · {doc.documentDate}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() =>
                    void downloadPdf(doc.id, doc.documentNumber).catch((caught) =>
                      setError(errorText(caught)),
                    )
                  }
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
