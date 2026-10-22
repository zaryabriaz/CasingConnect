/** Shared branded HTML shell for CasingConnect transactional mail. */

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const SITE = 'https://casingconnect.com';

export function brandedEmail(input: {
  preheader?: string;
  eyebrow?: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}) {
  const preheader = input.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(input.preheader)}</div>`
    : '';
  const eyebrow = input.eyebrow
    ? `<p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#c49a3c">${escapeHtml(input.eyebrow)}</p>`
    : '';
  const cta =
    input.ctaLabel && input.ctaUrl
      ? `<p style="margin:28px 0 0">
          <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#0b342b;color:#f4f7f5;text-decoration:none;padding:13px 22px;font-size:14px;font-weight:700;letter-spacing:0.02em">${escapeHtml(input.ctaLabel)}</a>
        </p>`
      : '';
  const footerNote = input.footerNote
    ? `<p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:#6a7f75">${escapeHtml(input.footerNote)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#e7efe9">
${preheader}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e7efe9;padding:28px 14px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#f7fbf8;border:1px solid rgba(18,40,33,0.1)">
      <tr>
        <td style="background:linear-gradient(135deg,#0b342b 0%,#145544 100%);padding:22px 28px">
          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:600;letter-spacing:-0.02em;color:#ffffff">
            Casing<span style="color:#dbb65a">Connect</span>
          </p>
          <p style="margin:6px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:rgba(244,247,245,0.72)">
            Natural casing trade · B2B
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 8px;font-family:Arial,Helvetica,sans-serif;color:#122821">
          ${eyebrow}
          <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:600;letter-spacing:-0.02em;line-height:1.25;color:#0b342b">
            ${escapeHtml(input.title)}
          </h1>
          <div style="font-size:15px;line-height:1.65;color:#243832">
            ${input.bodyHtml}
          </div>
          ${cta}
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px 28px;font-family:Arial,Helvetica,sans-serif;border-top:1px solid rgba(18,40,33,0.1)">
          ${footerNote}
          <p style="margin:0;font-size:12px;line-height:1.55;color:#6a7f75">
            <strong style="color:#0b342b">CasingConnect</strong><br/>
            Private company books · Marketplace · Public company sites<br/>
            <a href="${SITE}" style="color:#145544;text-decoration:none">${SITE.replace('https://', '')}</a>
            · <a href="mailto:info@casingconnect.com" style="color:#145544;text-decoration:none">info@casingconnect.com</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

export function detailTable(rows: Array<[string, string]>) {
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 12px 8px 0;vertical-align:top;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#6a7f75;white-space:nowrap">${escapeHtml(label)}</td>
        <td style="padding:8px 0;vertical-align:top;font-size:14px;color:#122821">${value}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse">${body}</table>`;
}

export function quoteBlock(text: string) {
  return `<div style="margin:16px 0 0;padding:14px 16px;background:#eef4f0;border-left:3px solid #c49a3c;font-size:14px;line-height:1.55;color:#243832;white-space:pre-wrap">${escapeHtml(text)}</div>`;
}
