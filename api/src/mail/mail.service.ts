import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import {
  brandedEmail,
  detailTable,
  escapeHtml,
  quoteBlock,
} from './email-layout';

export type SetupRequestMailInput = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  country: string;
  message: string;
  createdAt: string;
};

export type OutreachMailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

export type EnquiryAutoReplyKind =
  | 'tailored_setup'
  | 'marketplace_listing'
  | 'marketplace_inquiry';

export type EnquiryAutoReplyInput = {
  to: string;
  name: string;
  kind: EnquiryAutoReplyKind;
  detailLine?: string;
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST')?.trim() &&
        this.config.get<string>('SMTP_USER')?.trim() &&
        this.config.get<string>('SMTP_PASS')?.trim(),
    );
  }

  private transporter(): Transporter {
    return nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST')!.trim(),
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: String(this.config.get('SMTP_SECURE') ?? '').toLowerCase() === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER')!.trim(),
        pass: this.config.get<string>('SMTP_PASS')!.trim(),
      },
    });
  }

  private fromAddress() {
    return (
      this.config.get<string>('MAIL_FROM')?.trim() ||
      'info@casingconnect.com'
    );
  }

  private siteUrl() {
    return (
      this.config.get<string>('PUBLIC_SITE_URL')?.trim() ||
      this.config.get<string>('NEXT_PUBLIC_SITE_URL')?.trim() ||
      'https://casingconnect.com'
    ).replace(/\/$/, '');
  }

  async notifySetupRequest(input: SetupRequestMailInput) {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Setup request saved but email was not sent — set SMTP_HOST, SMTP_USER, SMTP_PASS to notify info@casingconnect.com.',
      );
      return { sent: false as const, reason: 'smtp_not_configured' };
    }

    const to =
      this.config.get<string>('MAIL_TO')?.trim() || 'info@casingconnect.com';
    const from = this.fromAddress();
    const subject = `Tailored setup · ${input.name}${
      input.companyName ? ` · ${input.companyName}` : ''
    }`;

    const text = [
      'New tailored setup request on CasingConnect.',
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? '—'}`,
      `Company: ${input.companyName ?? '—'}`,
      `Country: ${input.country}`,
      `Submitted: ${input.createdAt}`,
      `Request ID: ${input.id}`,
      '',
      'Message:',
      input.message,
      '',
      'Review in Admin → Requests.',
    ].join('\n');

    const html = brandedEmail({
      preheader: `New tailored setup from ${input.name}`,
      eyebrow: 'Internal alert',
      title: 'New tailored setup request',
      bodyHtml: `
        <p style="margin:0 0 12px">A prospect asked for a company system adapted to their country, currency, and workflow.</p>
        ${detailTable([
          ['Name', escapeHtml(input.name)],
          [
            'Email',
            `<a href="mailto:${escapeHtml(input.email)}" style="color:#145544">${escapeHtml(input.email)}</a>`,
          ],
          ['Phone', escapeHtml(input.phone ?? '—')],
          ['Company', escapeHtml(input.companyName ?? '—')],
          ['Country', escapeHtml(input.country)],
          ['Submitted', escapeHtml(input.createdAt)],
        ])}
        <p style="margin:8px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7f75">Their message</p>
        ${quoteBlock(input.message)}
      `,
      footerNote: 'Also visible in Admin → Requests. Reply-To is set to the visitor.',
    });

    try {
      await this.transporter().sendMail({
        from: `CasingConnect <${from}>`,
        to,
        replyTo: input.email,
        subject,
        text,
        html,
      });
      this.logger.log(`Setup request email sent to ${to} (${input.id})`);
      return { sent: true as const };
    } catch (error) {
      this.logger.error(
        `Failed to email setup request ${input.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: false as const, reason: 'send_failed' };
    }
  }

  async notifyMarketplaceListingRequest(input: {
    id: string;
    companyName: string;
    contactName: string;
    email: string;
    phone: string | null;
    country: string;
    city: string | null;
    companyWebsite: string | null;
    about: string;
  }) {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Marketplace listing request saved but email was not sent — configure SMTP to notify info@.',
      );
      return { sent: false as const, reason: 'smtp_not_configured' };
    }

    const to =
      this.config.get<string>('MAIL_TO')?.trim() || 'info@casingconnect.com';
    const from = this.fromAddress();
    const subject = `Marketplace listing · ${input.companyName}`;
    const text = [
      'A company asked to be listed on the CasingConnect Marketplace.',
      '',
      `Company: ${input.companyName}`,
      `Contact: ${input.contactName}`,
      `Email: ${input.email}`,
      `Phone: ${input.phone ?? '—'}`,
      `Country: ${input.country}`,
      `City: ${input.city ?? '—'}`,
      `Website: ${input.companyWebsite ?? '—'}`,
      `Request ID: ${input.id}`,
      '',
      'About:',
      input.about,
      '',
      'Review in Admin → Company finder (source: Self-submitted).',
    ].join('\n');

    const html = brandedEmail({
      preheader: `${input.companyName} asked to join the Marketplace`,
      eyebrow: 'Internal alert',
      title: 'Marketplace listing request',
      bodyHtml: `
        <p style="margin:0 0 12px">A natural casing company asked to appear in the public directory so buyers and sellers can find them.</p>
        ${detailTable([
          ['Company', escapeHtml(input.companyName)],
          ['Contact', escapeHtml(input.contactName)],
          [
            'Email',
            `<a href="mailto:${escapeHtml(input.email)}" style="color:#145544">${escapeHtml(input.email)}</a>`,
          ],
          ['Phone', escapeHtml(input.phone ?? '—')],
          ['Country', escapeHtml(input.country)],
          ['City', escapeHtml(input.city ?? '—')],
          [
            'Website',
            input.companyWebsite
              ? `<a href="${escapeHtml(input.companyWebsite)}" style="color:#145544">${escapeHtml(input.companyWebsite)}</a>`
              : '—',
          ],
        ])}
        <p style="margin:8px 0 0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6a7f75">About the company</p>
        ${quoteBlock(input.about)}
      `,
      footerNote: 'Admin → Company finder · source Self-submitted. Reply-To is the contact email.',
    });

    try {
      await this.transporter().sendMail({
        from: `CasingConnect <${from}>`,
        to,
        replyTo: input.email,
        subject,
        text,
        html,
      });
      return { sent: true as const };
    } catch (error) {
      this.logger.error(
        `Failed to email marketplace listing request ${input.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: false as const, reason: 'send_failed' };
    }
  }

  async sendOutreach(input: OutreachMailInput) {
    if (!this.isConfigured()) {
      return { sent: false as const, reason: 'smtp_not_configured' as const };
    }

    const from = this.fromAddress();
    const replyTo =
      input.replyTo?.trim() ||
      this.config.get<string>('MAIL_TO')?.trim() ||
      from;

    try {
      await this.transporter().sendMail({
        from: `CasingConnect <${from}>`,
        to: input.to,
        replyTo,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });
      this.logger.log(`Outreach email sent to ${input.to}`);
      return { sent: true as const };
    } catch (error) {
      this.logger.error(
        `Failed to send outreach to ${input.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: false as const, reason: 'send_failed' as const };
    }
  }

  /** Auto-reply to the person who submitted a public form / enquiry. */
  async sendEnquiryAutoReply(input: EnquiryAutoReplyInput) {
    if (!this.isConfigured()) {
      return { sent: false as const, reason: 'smtp_not_configured' as const };
    }

    const to = input.to.trim().toLowerCase();
    if (!to.includes('@')) {
      return { sent: false as const, reason: 'invalid_email' as const };
    }

    const from = this.fromAddress();
    const replyTo =
      this.config.get<string>('MAIL_TO')?.trim() || 'info@casingconnect.com';
    const site = this.siteUrl();
    const name = input.name.trim() || 'there';
    const detail = input.detailLine?.trim();
    const copy = autoReplyCopy(input.kind, name, detail, site);

    try {
      await this.transporter().sendMail({
        from: `CasingConnect <${from}>`,
        to,
        replyTo,
        subject: copy.subject,
        text: copy.text,
        html: copy.html,
      });
      this.logger.log(`Enquiry auto-reply sent to ${to}`);
      return { sent: true as const };
    } catch (error) {
      this.logger.error(
        `Failed to send enquiry auto-reply to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: false as const, reason: 'send_failed' as const };
    }
  }
}

function autoReplyCopy(
  kind: EnquiryAutoReplyKind,
  name: string,
  detail: string | undefined,
  site: string,
) {
  const first = name.split(/\s+/)[0] || name;

  if (kind === 'tailored_setup') {
    const subject = 'Your tailored setup request is with our team';
    const text = [
      `Dear ${first},`,
      '',
      'Thank you for requesting a tailored CasingConnect setup.',
      detail || null,
      '',
      'CasingConnect is built for the natural casing trade — private company books for buying, store and factory stock, production, sales, expenses, and party ledgers, plus an optional public company website and Marketplace presence.',
      '',
      'Our team has received your details and will review your country, currency, and workflow needs. You can expect a personal reply shortly.',
      '',
      'If you would like to add anything in the meantime, simply reply to this email.',
      '',
      'With regards,',
      'The CasingConnect team',
      site,
      'info@casingconnect.com',
    ]
      .filter((line) => line !== null)
      .join('\n');

    const html = brandedEmail({
      preheader: 'We received your tailored setup request and will reply shortly.',
      eyebrow: 'Request received',
      title: 'Thank you — your setup request is with our team',
      bodyHtml: `
        <p style="margin:0 0 14px">Dear ${escapeHtml(first)},</p>
        <p style="margin:0 0 14px">Thank you for requesting a <strong>tailored CasingConnect setup</strong> for your casing company.</p>
        ${detail ? `<p style="margin:0 0 14px;color:#3a5248">${escapeHtml(detail)}</p>` : ''}
        <p style="margin:0 0 14px">CasingConnect is built for the <strong>natural casing trade</strong> — private books for buying, store &amp; factory stock, production, sales, expenses, and party ledgers, with an optional public company website and Marketplace presence.</p>
        <p style="margin:0 0 14px">Our team has your details and will review your country, currency, and workflow. You can expect a <strong>personal reply shortly</strong>.</p>
        <p style="margin:0">Need to add anything? Just reply to this email — it reaches us directly.</p>
      `,
      ctaLabel: 'Explore CasingConnect',
      ctaUrl: site,
      footerNote: 'This is an automatic confirmation. A team member will follow up by email.',
    });
    return { subject, text, html };
  }

  if (kind === 'marketplace_listing') {
    const subject = 'Your company listing request — CasingConnect Marketplace';
    const text = [
      `Dear ${first},`,
      '',
      'Thank you for submitting your company to the CasingConnect Marketplace.',
      detail || null,
      '',
      'The Marketplace is the global directory for natural casing producers, exporters, and dealers — so buyers and sellers can find the right partners.',
      '',
      'Your request is with our team. We may follow up to verify a few details before your listing is fully confirmed.',
      '',
      `Browse the directory anytime: ${site}/marketplace`,
      '',
      'Questions? Reply to this email.',
      '',
      'With regards,',
      'The CasingConnect team',
      site,
    ]
      .filter((line) => line !== null)
      .join('\n');

    const html = brandedEmail({
      preheader: 'Your Marketplace listing request is with our team.',
      eyebrow: 'Marketplace',
      title: 'Your company listing request is received',
      bodyHtml: `
        <p style="margin:0 0 14px">Dear ${escapeHtml(first)},</p>
        <p style="margin:0 0 14px">Thank you for submitting your company to the <strong>CasingConnect Marketplace</strong> — the global directory for natural casing producers, exporters, and dealers.</p>
        ${detail ? `<p style="margin:0 0 14px;color:#3a5248">${escapeHtml(detail)}</p>` : ''}
        <p style="margin:0 0 14px">Your request is with our team. We may follow up to verify a few details so buyers and sellers can trust what they see in the directory.</p>
        <p style="margin:0">Questions or updates? Reply to this email and we will take care of it.</p>
      `,
      ctaLabel: 'Open Marketplace',
      ctaUrl: `${site}/marketplace`,
      footerNote: 'This is an automatic confirmation from CasingConnect.',
    });
    return { subject, text, html };
  }

  // marketplace_inquiry
  const subject = 'We received your Marketplace enquiry';
  const text = [
    `Dear ${first},`,
    '',
    'Thank you for your enquiry on the CasingConnect Marketplace.',
    detail || null,
    '',
    'Your message has been delivered to the seller. They can respond through CasingConnect, and our team is also notified when needed.',
    '',
    'We will make sure you hear back. If anything is urgent, reply to this email and include any extra details (calibre, packing, destination, or volume).',
    '',
    'With regards,',
    'The CasingConnect team',
    site,
  ]
    .filter((line) => line !== null)
    .join('\n');

  const html = brandedEmail({
    preheader: 'Your Marketplace enquiry was delivered to the seller.',
    eyebrow: 'Enquiry received',
    title: 'Your Marketplace enquiry is on its way',
    bodyHtml: `
      <p style="margin:0 0 14px">Dear ${escapeHtml(first)},</p>
      <p style="margin:0 0 14px">Thank you for reaching out through the <strong>CasingConnect Marketplace</strong>.</p>
      ${detail ? `<p style="margin:0 0 14px;color:#3a5248">${escapeHtml(detail)}</p>` : ''}
      <p style="margin:0 0 14px">Your message has been <strong>delivered to the seller</strong>. They can respond through the platform, and we are here if you need help moving the conversation forward.</p>
      <p style="margin:0">If the enquiry is urgent, reply to this email with calibre, packing, destination, or volume — we will make sure it reaches the right people.</p>
    `,
    ctaLabel: 'Back to Marketplace',
    ctaUrl: `${site}/marketplace`,
    footerNote: 'This is an automatic confirmation. Keep this thread for reference.',
  });
  return { subject, text, html };
}

export { escapeHtml };
