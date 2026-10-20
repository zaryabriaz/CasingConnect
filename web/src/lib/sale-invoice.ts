export type InvoiceSale = {
  reference: string;
  date: string;
  customer: string;
  channel?: 'LOCAL' | 'EXPORT';
  lines: Array<{
    quality: string;
    casingType: string;
    quantity: string;
    unit?: string;
    rate: string | null;
    amount: string | null;
  }>;
  quantity: string;
  amount: string | null;
  currency: string;
  destinationCountry?: string | null;
  exportRef?: string | null;
  paymentMode: 'CASH' | 'CREDIT';
  cashPaidTo: string | null;
  creditInstrument: 'NONE' | 'CHEQUE' | 'OTHER';
  chequeNumber: string | null;
  bankName: string | null;
  instrumentNote: string | null;
  notes?: string | null;
};

export type InvoiceBusiness = {
  name: string;
  phone?: string | null;
  address?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function paymentText(sale: InvoiceSale) {
  if (sale.paymentMode === 'CASH') {
    return sale.cashPaidTo ? `Cash — received by ${sale.cashPaidTo}` : 'Cash';
  }
  if (sale.creditInstrument === 'CHEQUE') {
    const cheque = sale.chequeNumber ? `Cheque No. ${sale.chequeNumber}` : 'Cheque';
    return sale.bankName ? `Credit — ${cheque}, ${sale.bankName}` : `Credit — ${cheque}`;
  }
  if (sale.creditInstrument === 'OTHER') {
    return `Credit — ${sale.instrumentNote ?? 'Instrument'}`;
  }
  return 'Credit — Open account';
}

function formatMoney(currency: string, amount: string | null) {
  if (!amount) return '—';
  const n = Number(amount);
  if (Number.isFinite(n)) {
    return `${currency} ${n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency} ${amount}`;
}

function formatQty(value: string) {
  const n = Number(value);
  if (Number.isFinite(n)) return n.toLocaleString('en-PK', { maximumFractionDigits: 2 });
  return value;
}

function lineAmount(currency: string, amount: string | null) {
  if (!amount) return '—';
  const n = Number(amount);
  if (Number.isFinite(n)) {
    return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return amount;
}

function invoiceHtml(business: InvoiceBusiness, sale: InvoiceSale) {
  const rows = sale.lines
    .map(
      (line, index) => `
      <tr>
        <td class="c-no">${index + 1}</td>
        <td>
          <div class="item">${escapeHtml(line.quality)}</div>
          <div class="sub">${escapeHtml(line.casingType)}</div>
        </td>
        <td class="num">${escapeHtml(formatQty(line.quantity))}${line.unit ? ` ${escapeHtml(line.unit)}` : ''}</td>
        <td class="num">${line.rate ? escapeHtml(formatQty(line.rate)) : '—'}</td>
        <td class="num">${escapeHtml(lineAmount(sale.currency, line.amount))}</td>
      </tr>`,
    )
    .join('');

  const total = formatMoney(sale.currency, sale.amount);
  const payment = paymentText(sale);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(sale.reference)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: "Source Sans 3", "Segoe UI", Arial, sans-serif;
      color: #1c1c1c;
      background: #e8e8e8;
      padding: 24px 16px 40px;
      font-size: 12.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .actions {
      max-width: 780px;
      margin: 0 auto 14px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .actions button {
      appearance: none;
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 9px 16px;
      border-radius: 4px;
      cursor: pointer;
      border: 1px solid #1a3d32;
      background: #1a3d32;
      color: #fff;
    }
    .actions button.secondary {
      background: #fff;
      color: #1a3d32;
    }

    .page {
      max-width: 780px;
      margin: 0 auto;
      background: #fff;
      padding: 40px 44px 36px;
      border: 1px solid #cfcfcf;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    .letterhead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      padding-bottom: 18px;
      border-bottom: 2px solid #1a3d32;
    }
    .company-name {
      margin: 0;
      font-family: "Libre Baskerville", Georgia, "Times New Roman", serif;
      font-size: 22px;
      font-weight: 700;
      color: #1a3d32;
      letter-spacing: 0.01em;
      line-height: 1.25;
    }
    .company-meta {
      margin-top: 8px;
      color: #444;
      font-size: 12px;
      line-height: 1.5;
      max-width: 320px;
    }
    .doc-title {
      text-align: right;
    }
    .doc-title h2 {
      margin: 0;
      font-family: "Libre Baskerville", Georgia, "Times New Roman", serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.12em;
      color: #1a3d32;
    }
    .doc-title .ref {
      margin-top: 8px;
      font-size: 13px;
      color: #333;
    }
    .doc-title .ref strong {
      font-weight: 700;
      color: #111;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 28px;
      margin: 22px 0 26px;
    }
    .block-label {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #666;
      margin-bottom: 6px;
    }
    .block-value {
      font-size: 15px;
      font-weight: 700;
      color: #111;
      margin-bottom: 4px;
    }
    .block-line {
      color: #444;
      font-size: 12.5px;
      margin: 2px 0;
    }
    .facts {
      border: 1px solid #d0d0d0;
      background: #f7f7f7;
      padding: 12px 14px;
    }
    .facts table { width: 100%; border-collapse: collapse; }
    .facts td {
      padding: 4px 0;
      vertical-align: top;
      font-size: 12.5px;
    }
    .facts td:first-child {
      width: 42%;
      color: #555;
      font-weight: 600;
    }
    .facts td:last-child {
      text-align: right;
      color: #111;
      font-weight: 600;
    }

    table.lines {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
    }
    table.lines thead th {
      background: #1a3d32;
      color: #fff;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 9px 10px;
      text-align: left;
      border: 1px solid #1a3d32;
    }
    table.lines thead th.num { text-align: right; }
    table.lines tbody td {
      padding: 10px;
      border: 1px solid #d5d5d5;
      vertical-align: top;
      font-size: 12.5px;
    }
    table.lines tbody tr:nth-child(even) td { background: #fafafa; }
    .c-no { width: 36px; text-align: center; color: #555; }
    .item { font-weight: 700; color: #111; }
    .sub { margin-top: 2px; color: #555; font-size: 11.5px; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }

    .summary {
      display: flex;
      justify-content: flex-end;
      margin-top: 0;
    }
    .summary table {
      width: 280px;
      border-collapse: collapse;
      margin-top: -1px;
    }
    .summary td {
      padding: 9px 12px;
      border: 1px solid #d5d5d5;
      font-size: 12.5px;
    }
    .summary td:first-child {
      background: #f3f3f3;
      font-weight: 600;
      color: #444;
      width: 48%;
    }
    .summary td:last-child {
      text-align: right;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .summary tr.total td {
      background: #1a3d32;
      color: #fff;
      border-color: #1a3d32;
      font-size: 13.5px;
      font-weight: 700;
    }

    .notes {
      margin-top: 28px;
      padding-top: 14px;
      border-top: 1px solid #d5d5d5;
    }
    .notes .block-label { margin-bottom: 4px; }
    .notes p {
      margin: 0;
      color: #444;
      font-size: 12.5px;
      max-width: 520px;
    }

    .sign-row {
      display: flex;
      justify-content: space-between;
      gap: 40px;
      margin-top: 42px;
    }
    .sign-box { width: 220px; }
    .sign-line {
      border-bottom: 1px solid #333;
      height: 40px;
      margin-bottom: 6px;
    }
    .sign-caption {
      font-size: 11px;
      color: #555;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      font-weight: 600;
    }

    .footer {
      margin-top: 28px;
      padding-top: 12px;
      border-top: 1px solid #d5d5d5;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 10.5px;
      color: #777;
      letter-spacing: 0.02em;
    }

    @media print {
      body { background: #fff; padding: 0; }
      .actions { display: none !important; }
      .page {
        max-width: none;
        border: none;
        box-shadow: none;
        padding: 0;
      }
    }

    @media (max-width: 640px) {
      .page { padding: 24px 18px; }
      .letterhead, .meta-grid, .sign-row, .footer {
        display: grid;
        grid-template-columns: 1fr;
      }
      .doc-title { text-align: left; }
      .facts td:last-child { text-align: left; }
      .summary { justify-content: stretch; }
      .summary table { width: 100%; }
    }
  </style>
</head>
<body>
  <div class="actions">
    <button type="button" class="secondary" id="closeBtn">Close</button>
    <button type="button" id="printBtn">Save as PDF</button>
  </div>

  <div class="page">
    <header class="letterhead">
      <div>
        <h1 class="company-name">${escapeHtml(business.name)}</h1>
        <div class="company-meta">
          ${business.address ? `${escapeHtml(business.address)}<br/>` : ''}
          ${business.phone ? `Tel: ${escapeHtml(business.phone)}` : ''}
        </div>
      </div>
      <div class="doc-title">
        <h2>INVOICE</h2>
        <div class="ref"><strong>${escapeHtml(sale.reference)}</strong></div>
      </div>
    </header>

    <section class="meta-grid">
      <div>
        <div class="block-label">Bill to</div>
        <div class="block-value">${escapeHtml(sale.customer)}</div>
        <div class="block-line">Customer</div>
      </div>
      <div class="facts">
        <table>
          <tr>
            <td>Invoice date</td>
            <td>${escapeHtml(sale.date)}</td>
          </tr>
          <tr>
            <td>Channel</td>
            <td>${escapeHtml(sale.channel === 'EXPORT' ? 'Export' : 'Local')}</td>
          </tr>
          <tr>
            <td>Payment terms</td>
            <td>${escapeHtml(payment)}</td>
          </tr>
          <tr>
            <td>Currency</td>
            <td>${escapeHtml(sale.currency)}</td>
          </tr>
          ${
            sale.channel === 'EXPORT' && sale.destinationCountry
              ? `<tr><td>Destination</td><td>${escapeHtml(sale.destinationCountry)}</td></tr>`
              : ''
          }
          ${
            sale.channel === 'EXPORT' && sale.exportRef
              ? `<tr><td>Export ref</td><td>${escapeHtml(sale.exportRef)}</td></tr>`
              : ''
          }
          <tr>
            <td>Total hanks</td>
            <td>${escapeHtml(formatQty(sale.quantity))}</td>
          </tr>
        </table>
      </div>
    </section>

    <table class="lines">
      <thead>
        <tr>
          <th class="c-no">No.</th>
          <th>Description</th>
          <th class="num">Hanks</th>
          <th class="num">Rate</th>
          <th class="num">Amount (${escapeHtml(sale.currency)})</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="summary">
      <table>
        <tr>
          <td>Total hanks</td>
          <td>${escapeHtml(formatQty(sale.quantity))}</td>
        </tr>
        <tr class="total">
          <td>Amount due</td>
          <td>${escapeHtml(total)}</td>
        </tr>
      </table>
    </div>

    <section class="notes">
      <div class="block-label">${sale.notes ? 'Notes' : 'Terms'}</div>
      <p>${
        sale.notes
          ? escapeHtml(sale.notes)
          : 'Goods once sold are not returnable unless a discrepancy in count or grade is reported promptly. Please retain this invoice for your records.'
      }</p>
    </section>

    <section class="sign-row">
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-caption">Prepared by</div>
      </div>
      <div class="sign-box">
        <div class="sign-line"></div>
        <div class="sign-caption">Authorized signature</div>
      </div>
    </section>

    <footer class="footer">
      <div>Computer-generated invoice — ${escapeHtml(business.name)}</div>
      <div>${escapeHtml(sale.reference)} · ${escapeHtml(sale.date)}</div>
    </footer>
  </div>

  <script>
    document.getElementById('printBtn').addEventListener('click', function () { window.print(); });
    document.getElementById('closeBtn').addEventListener('click', function () { window.close(); });
    window.addEventListener('load', function () {
      var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      ready.then(function () {
        setTimeout(function () { window.print(); }, 250);
      }).catch(function () {
        setTimeout(function () { window.print(); }, 500);
      });
    });
  </script>
</body>
</html>`;
}

/** Opens a print-ready invoice (browser Save as PDF). */
export function openSaleInvoicePdf(business: InvoiceBusiness, sale: InvoiceSale) {
  const html = invoiceHtml(business, sale);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const popup = window.open(url, '_blank', 'width=920,height=860');
  if (!popup) {
    URL.revokeObjectURL(url);
    const frame = document.createElement('iframe');
    frame.setAttribute('title', `Invoice ${sale.reference}`);
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(frame);
      throw new Error('Allow pop-ups to open the invoice PDF.');
    }
    doc.open();
    doc.write(html);
    doc.close();
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(frame);
      }, 1000);
    };
    return;
  }

  const revoke = () => URL.revokeObjectURL(url);
  popup.addEventListener?.('beforeunload', revoke);
  setTimeout(revoke, 60_000);
  popup.focus();
}
