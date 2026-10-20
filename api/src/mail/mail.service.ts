import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

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

  async notifySetupRequest(input: SetupRequestMailInput) {
    if (!this.isConfigured()) {
      this.logger.warn(
        'Setup request saved but email was not sent — set SMTP_HOST, SMTP_USER, SMTP_PASS to notify info@casingconnect.com.',
      );
      return { sent: false as const, reason: 'smtp_not_configured' };
    }

    const to =
      this.config.get<string>('MAIL_TO')?.trim() || 'info@casingconnect.com';
    const from =
      this.config.get<string>('MAIL_FROM')?.trim() ||
      this.config.get<string>('SMTP_USER')!.trim();

    const transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST')!.trim(),
      port: Number(this.config.get('SMTP_PORT') ?? 587),
      secure: String(this.config.get('SMTP_SECURE') ?? '').toLowerCase() === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER')!.trim(),
        pass: this.config.get<string>('SMTP_PASS')!.trim(),
      },
    });

    const subject = `New tailored setup request — ${input.name}${
      input.companyName ? ` (${input.companyName})` : ''
    }`;

    const text = [
      'A new tailored setup request was submitted on CasingConnect.',
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
      'Also visible in Admin → Requests.',
    ].join('\n');

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#122821">
        <h2 style="margin:0 0 12px">New tailored setup request</h2>
        <p style="margin:0 0 16px">Submitted on CasingConnect.</p>
        <table style="border-collapse:collapse;width:100%;max-width:560px">
          <tr><td style="padding:6px 0;font-weight:700">Name</td><td style="padding:6px 0">${escapeHtml(input.name)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a></td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Phone</td><td style="padding:6px 0">${escapeHtml(input.phone ?? '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Company</td><td style="padding:6px 0">${escapeHtml(input.companyName ?? '—')}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Country</td><td style="padding:6px 0">${escapeHtml(input.country)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Submitted</td><td style="padding:6px 0">${escapeHtml(input.createdAt)}</td></tr>
        </table>
        <h3 style="margin:20px 0 8px">Message</h3>
        <pre style="white-space:pre-wrap;background:#f3efe6;padding:12px;border-radius:8px">${escapeHtml(input.message)}</pre>
        <p style="margin:16px 0 0;color:#3a5248;font-size:13px">Also visible in Admin → Requests.</p>
      </div>
    `;

    try {
      await transporter.sendMail({
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
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
