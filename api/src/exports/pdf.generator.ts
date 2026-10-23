import { createWriteStream, existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import type { CreateExportDocumentDto, ExportLineDto } from './dto';
import { ExportDocumentType } from '@prisma/client';

const PAGE = { width: 595.28, height: 841.89 }; // A4
const MARGIN_X = 48;
/** Reserve top band so letterhead header art is not covered. */
const CONTENT_TOP = 230;

type GenerateInput = {
  businessName: string;
  letterheadAbsolutePath: string | null;
  dto: CreateExportDocumentDto;
  outputAbsolutePath: string;
};

function money(value?: string) {
  if (!value?.trim()) return '—';
  const n = Number(value);
  if (Number.isFinite(n)) {
    return n.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value;
}

function qty(value?: string) {
  if (!value?.trim()) return '—';
  const n = Number(value);
  if (Number.isFinite(n)) return n.toLocaleString('en-PK', { maximumFractionDigits: 2 });
  return value;
}

export function generateExportPdf(input: GenerateInput): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 0,
      info: {
        Title: `${input.dto.documentNumber} — ${input.dto.type}`,
        Author: input.businessName,
      },
    });
    const stream = createWriteStream(input.outputAbsolutePath);
    doc.pipe(stream);
    stream.on('finish', () => resolve());
    stream.on('error', reject);
    doc.on('error', reject);

    if (input.letterheadAbsolutePath && existsSync(input.letterheadAbsolutePath)) {
      try {
        doc.image(input.letterheadAbsolutePath, 0, 0, {
          width: PAGE.width,
          height: PAGE.height,
        });
      } catch {
        // Non-image or corrupt letterhead — continue with blank page + title.
      }
    }

    let y = CONTENT_TOP;
    const docTitle =
      input.dto.type === ExportDocumentType.COMMERCIAL_INVOICE
        ? 'COMMERCIAL INVOICE'
        : 'PACKING LIST';

    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor('#0b342b')
      .text(docTitle, MARGIN_X, y, { width: PAGE.width - MARGIN_X * 2, align: 'center' });
    y = doc.y + 16;

    doc.font('Helvetica').fontSize(10).fillColor('#243832');
    const meta: Array<[string, string]> = [
      ['Document No.', input.dto.documentNumber],
      ['Date', input.dto.documentDate.slice(0, 10)],
      ['Buyer', input.dto.buyerName],
    ];
    if (input.dto.buyerAddress?.trim()) meta.push(['Address', input.dto.buyerAddress.trim()]);
    if (input.dto.incoterms?.trim()) meta.push(['Incoterms', input.dto.incoterms.trim()]);
    if (input.dto.currency?.trim()) meta.push(['Currency', input.dto.currency.trim()]);
    if (input.dto.paymentTerms?.trim()) meta.push(['Payment', input.dto.paymentTerms.trim()]);
    if (input.dto.destinationCountry?.trim()) {
      meta.push(['Destination', input.dto.destinationCountry.trim()]);
    }
    if (input.dto.vesselOrFlight?.trim()) meta.push(['Vessel / Flight', input.dto.vesselOrFlight.trim()]);
    if (input.dto.containerNo?.trim()) meta.push(['Container', input.dto.containerNo.trim()]);

    for (const [label, value] of meta) {
      doc.font('Helvetica-Bold').text(`${label}: `, MARGIN_X, y, { continued: true, width: 120 });
      doc.font('Helvetica').text(value, { width: PAGE.width - MARGIN_X * 2 - 120 });
      y = doc.y + 4;
    }

    y += 10;
    if (input.dto.type === ExportDocumentType.COMMERCIAL_INVOICE) {
      y = drawInvoiceTable(doc, input.dto.lines, y, input.dto.currency?.trim() || 'USD');
    } else {
      y = drawPackingTable(doc, input.dto.lines, y);
    }

    if (input.dto.notes?.trim()) {
      y = Math.max(y + 12, doc.y + 12);
      doc.font('Helvetica-Bold').fontSize(10).text('Notes', MARGIN_X, y);
      doc
        .font('Helvetica')
        .fontSize(9)
        .text(input.dto.notes.trim(), MARGIN_X, doc.y + 4, {
          width: PAGE.width - MARGIN_X * 2,
        });
    }

    doc.end();
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number) {
  if (y + needed > PAGE.height - 48) {
    doc.addPage();
    return CONTENT_TOP;
  }
  return y;
}

function drawInvoiceTable(
  doc: PDFKit.PDFDocument,
  lines: ExportLineDto[],
  startY: number,
  currency: string,
) {
  const cols = [
    { key: 'description', label: 'Description', x: MARGIN_X, w: 200 },
    { key: 'quantity', label: 'Qty', x: MARGIN_X + 200, w: 55 },
    { key: 'unit', label: 'Unit', x: MARGIN_X + 255, w: 45 },
    { key: 'rate', label: 'Rate', x: MARGIN_X + 300, w: 70 },
    { key: 'amount', label: 'Amount', x: MARGIN_X + 370, w: 100 },
  ] as const;

  let y = ensureSpace(doc, startY, 40);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0b342b');
  for (const col of cols) {
    doc.text(col.label, col.x, y, { width: col.w });
  }
  y += 14;
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE.width - MARGIN_X, y)
    .strokeColor('#c5d4cc')
    .stroke();
  y += 8;

  let total = 0;
  doc.font('Helvetica').fontSize(9).fillColor('#243832');
  for (const line of lines) {
    y = ensureSpace(doc, y, 28);
    const rowY = y;
    doc.text(line.description, cols[0].x, rowY, { width: cols[0].w });
    doc.text(qty(line.quantity), cols[1].x, rowY, { width: cols[1].w });
    doc.text(line.unit?.trim() || '—', cols[2].x, rowY, { width: cols[2].w });
    doc.text(money(line.rate), cols[3].x, rowY, { width: cols[3].w });
    doc.text(money(line.amount), cols[4].x, rowY, { width: cols[4].w, align: 'right' });
    const amountN = Number(line.amount);
    if (Number.isFinite(amountN)) total += amountN;
    y = Math.max(doc.y, rowY + 16) + 4;
  }

  y = ensureSpace(doc, y + 6, 24);
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE.width - MARGIN_X, y)
    .strokeColor('#c5d4cc')
    .stroke();
  y += 8;
  doc
    .font('Helvetica-Bold')
    .text(`Total (${currency})`, MARGIN_X + 300, y, { width: 70 });
  doc.text(
    total
      ? total.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '—',
    MARGIN_X + 370,
    y,
    { width: 100, align: 'right' },
  );
  return y + 20;
}

function drawPackingTable(doc: PDFKit.PDFDocument, lines: ExportLineDto[], startY: number) {
  const cols = [
    { label: 'Description', x: MARGIN_X, w: 160 },
    { label: 'Packages', x: MARGIN_X + 160, w: 55 },
    { label: 'Qty', x: MARGIN_X + 215, w: 50 },
    { label: 'Net wt', x: MARGIN_X + 265, w: 55 },
    { label: 'Gross wt', x: MARGIN_X + 320, w: 55 },
    { label: 'Marks', x: MARGIN_X + 375, w: 95 },
  ] as const;

  let y = ensureSpace(doc, startY, 40);
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0b342b');
  for (const col of cols) {
    doc.text(col.label, col.x, y, { width: col.w });
  }
  y += 14;
  doc
    .moveTo(MARGIN_X, y)
    .lineTo(PAGE.width - MARGIN_X, y)
    .strokeColor('#c5d4cc')
    .stroke();
  y += 8;

  doc.font('Helvetica').fontSize(9).fillColor('#243832');
  for (const line of lines) {
    y = ensureSpace(doc, y, 28);
    const rowY = y;
    doc.text(line.description, cols[0].x, rowY, { width: cols[0].w });
    doc.text(line.packages?.trim() || '—', cols[1].x, rowY, { width: cols[1].w });
    doc.text(qty(line.quantity), cols[2].x, rowY, { width: cols[2].w });
    doc.text(line.netWeight?.trim() || '—', cols[3].x, rowY, { width: cols[3].w });
    doc.text(line.grossWeight?.trim() || '—', cols[4].x, rowY, { width: cols[4].w });
    doc.text(line.marks?.trim() || '—', cols[5].x, rowY, { width: cols[5].w });
    y = Math.max(doc.y, rowY + 16) + 4;
  }
  return y + 12;
}

export function letterheadDiskPath(uploadsRoot: string, letterheadUrl: string | null | undefined) {
  if (!letterheadUrl?.startsWith('/uploads/')) return null;
  return join(uploadsRoot, letterheadUrl.replace(/^\/uploads\//, ''));
}
