import { brandedEmail, escapeHtml } from './email-layout';

/** Shared Welcome / thank-you copy for signup auto-send and Admin campaigns. */
export function buildWelcomeEmail(input: {
  /** First name or “Company team” used after “Dear …,” */
  greetingName: string;
  /** Company shown in the body (optional). */
  companyName?: string;
  siteUrl: string;
}): { subject: string; text: string; html: string } {
  const site = input.siteUrl.replace(/\/$/, '');
  const who = input.greetingName.trim() || 'there';
  const company = input.companyName?.trim();
  const subject = 'Welcome to CasingConnect';

  const accountLine = company
    ? `Your account for ${company} is ready. You can sign in anytime and start using private company books for buying, stock, production, sales, expenses, and party ledgers — plus the Marketplace when you need it.`
    : 'You can sign in anytime and use private company books for buying, stock, production, sales, expenses, and party ledgers — plus the Marketplace when you need it.';

  const accountLineHtml = company
    ? `Your account for <strong>${escapeHtml(company)}</strong> is ready. Sign in anytime to use private company books for buying, stock, production, sales, expenses, and party ledgers — plus the Marketplace when you need it.`
    : 'Sign in anytime to use private company books for buying, stock, production, sales, expenses, and party ledgers — plus the Marketplace when you need it.';

  const text = [
    `Dear ${who},`,
    '',
    'Thank you for signing up — welcome to CasingConnect.',
    '',
    accountLine,
    '',
    'If you would like a solution tailored to your business — including software built along the same lines as what we offer for the Pakistani market — please let us know. We are happy to shape the system for your country, currency, and workflow at our lowest rates.',
    '',
    'You can also chat with our team inside the app (Support chat). Coming soon: global company chat — message casing firms in any country from CasingConnect. A valuable feature we are building now.',
    '',
    'Just reply to this email, or write to info@casingconnect.com, and we will take care of it.',
    '',
    `Open your workspace: ${site}/app`,
    `Support chat: ${site}/app/support`,
    `Request a tailored setup: ${site}/tailored-setup`,
    '',
    'With regards,',
    'The CasingConnect team',
    site,
    'info@casingconnect.com',
  ].join('\n');

  const html = brandedEmail({
    preheader: 'Welcome to CasingConnect — thank you for signing up.',
    eyebrow: 'Welcome',
    title: 'Welcome to CasingConnect',
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(who)},</p>
      <p style="margin:0 0 14px">Thank you for signing up — <strong>welcome to CasingConnect</strong>.</p>
      <p style="margin:0 0 14px">${accountLineHtml}</p>
      <p style="margin:0 0 14px">If you would like a <strong>solution tailored to your business</strong> — including software built along the same lines as what we offer for the <strong>Pakistani market</strong> — please let us know. We are happy to shape the system for your country, currency, and workflow at our <strong>lowest rates</strong>.</p>
      <p style="margin:0 0 14px">You can also <strong>chat with our team</strong> inside the app (Support chat). <strong>Coming soon:</strong> global company chat — message casing firms in any country from CasingConnect. A valuable feature we are building now.</p>
      <p style="margin:0">Just reply to this email, or write to <a href="mailto:info@casingconnect.com" style="color:#145544">info@casingconnect.com</a>, and we will take care of it.</p>
    `,
    ctaLabel: 'Open your workspace',
    ctaUrl: `${site}/app`,
    footerNote: 'You can reply directly to this email — it reaches the CasingConnect team.',
  });

  return { subject, text, html };
}
