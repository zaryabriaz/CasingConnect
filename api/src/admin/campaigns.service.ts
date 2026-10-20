import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketplaceProspectStatus } from '@prisma/client';
import { escapeHtml, MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_TEMPLATES, type CampaignTemplateId } from './campaign-templates';
import { SendCampaignDto } from './dto';

export { CAMPAIGN_TEMPLATES, type CampaignTemplateId } from './campaign-templates';

const MAX_BATCH = 25;
const SEND_GAP_MS = 450;

type TemplateBody = {
  id: CampaignTemplateId;
  label: string;
  description: string;
  subject: string;
  build: (companyName: string, siteUrl: string) => { text: string; html: string };
};

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  siteUrl() {
    return (
      this.config.get<string>('PUBLIC_SITE_URL')?.trim() ||
      this.config.get<string>('NEXT_PUBLIC_SITE_URL')?.trim() ||
      'https://casingconnect.com'
    ).replace(/\/$/, '');
  }

  templates() {
    return this.templateDefs().map(({ id, label, description, subject }) => ({
      id,
      label,
      description,
      subject,
      smtpConfigured: this.mail.isConfigured(),
    }));
  }

  preview(template: CampaignTemplateId, companyName = 'Your Company') {
    const def = this.templateDefs().find((item) => item.id === template);
    if (!def) throw new BadRequestException('Unknown campaign template.');
    const siteUrl = this.siteUrl();
    const body = def.build(companyName, siteUrl);
    return {
      template,
      subject: def.subject,
      text: body.text,
      html: body.html,
      smtpConfigured: this.mail.isConfigured(),
    };
  }

  async send(dto: SendCampaignDto) {
    if (!this.mail.isConfigured()) {
      throw new ServiceUnavailableException(
        'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.',
      );
    }

    const ids = [...new Set(dto.prospectIds ?? [])];
    if (ids.length === 0) {
      throw new BadRequestException('Select at least one prospect.');
    }
    if (ids.length > MAX_BATCH) {
      throw new BadRequestException(`Send at most ${MAX_BATCH} emails per batch.`);
    }

    const template = dto.template;
    if (!CAMPAIGN_TEMPLATES.includes(template)) {
      throw new BadRequestException('Unknown campaign template.');
    }

    const def = this.templateDefs().find((item) => item.id === template)!;
    const siteUrl = this.siteUrl();
    const prospects = await this.prisma.marketplaceProspect.findMany({
      where: { id: { in: ids } },
    });

    const byId = new Map(prospects.map((row) => [row.id, row]));
    const results: Array<{
      prospectId: string;
      name: string;
      email: string | null;
      ok: boolean;
      reason?: string;
    }> = [];

    for (const id of ids) {
      const prospect = byId.get(id);
      if (!prospect) {
        results.push({
          prospectId: id,
          name: 'Unknown',
          email: null,
          ok: false,
          reason: 'not_found',
        });
        continue;
      }

      const email = prospect.email?.trim().toLowerCase() ?? '';
      if (!email || !email.includes('@')) {
        results.push({
          prospectId: id,
          name: prospect.name,
          email: prospect.email,
          ok: false,
          reason: 'no_email',
        });
        continue;
      }

      if (dto.skipAlreadySent && prospect.lastCampaignAt && prospect.lastCampaignTemplate === template) {
        results.push({
          prospectId: id,
          name: prospect.name,
          email,
          ok: false,
          reason: 'already_sent',
        });
        continue;
      }

      const body = def.build(prospect.name, siteUrl);
      const sent = await this.mail.sendOutreach({
        to: email,
        subject: def.subject,
        text: body.text,
        html: body.html,
      });

      if (!sent.sent) {
        results.push({
          prospectId: id,
          name: prospect.name,
          email,
          ok: false,
          reason: sent.reason,
        });
        continue;
      }

      await this.prisma.marketplaceProspect.update({
        where: { id },
        data: {
          lastCampaignAt: new Date(),
          lastCampaignTemplate: template,
          campaignSendCount: { increment: 1 },
          status:
            prospect.status === MarketplaceProspectStatus.NEW
              ? MarketplaceProspectStatus.REVIEWED
              : undefined,
        },
      });

      results.push({
        prospectId: id,
        name: prospect.name,
        email,
        ok: true,
      });

      await sleep(SEND_GAP_MS);
    }

    const sentCount = results.filter((row) => row.ok).length;
    return {
      template,
      requested: ids.length,
      sent: sentCount,
      failed: results.length - sentCount,
      results,
    };
  }

  private templateDefs(): TemplateBody[] {
    return [
      {
        id: 'MARKETPLACE',
        label: 'Marketplace invite',
        description: 'Invite the company to list on the CasingConnect Marketplace.',
        subject: 'List your casing company on CasingConnect Marketplace',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m writing from CasingConnect — B2B software and marketplace for the natural casing trade (sheep, hog, and beef casings).',
            '',
            'In Pakistan, 15+ companies already use CasingConnect to manage buying → stock → production → sales with private company books.',
            '',
            'We invite casing companies abroad to list on our Marketplace so buyers and sellers can find you:',
            `${siteUrl}/marketplace`,
            '',
            'Register or reply to this email and we will help you get listed.',
            '',
            'Best regards,',
            'CasingConnect',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            greeting,
            paragraphs: [
              'I’m writing from <strong>CasingConnect</strong> — B2B software and marketplace for the <strong>natural casing trade</strong> (sheep, hog, and beef casings).',
              'In <strong>Pakistan, 15+ companies</strong> already use CasingConnect to manage buying → stock → production → sales with private company books.',
              'We invite casing companies abroad to <strong>list on our Marketplace</strong> so buyers and sellers can find you.',
            ],
            ctaLabel: 'Open Marketplace',
            ctaUrl: `${siteUrl}/marketplace`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'TAILORED',
        label: 'Tailored system setup',
        description: 'Offer a custom company setup like the Pakistan product.',
        subject: 'CasingConnect for your casing company — tailored setup',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'CasingConnect is natural casing business software used by 15+ companies in Pakistan for the full buying-to-sell cycle (buying, store & factory stock, production, sales, expenses, and party ledgers).',
            '',
            'We can set up the same system for your company — adapted for your country, currency, and workflow.',
            '',
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
            `Product overview: ${siteUrl}/`,
            '',
            'Reply to this email with your country and preferred currency if you would like us to follow up.',
            '',
            'Best regards,',
            'CasingConnect',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            greeting,
            paragraphs: [
              '<strong>CasingConnect</strong> is natural casing business software used by <strong>15+ companies in Pakistan</strong> for the full buying-to-sell cycle (buying, store &amp; factory stock, production, sales, expenses, and party ledgers).',
              'We can set up the same system for your company — adapted for your country, currency, and workflow.',
            ],
            ctaLabel: 'Request tailored setup',
            ctaUrl: `${siteUrl}/tailored-setup`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'COMBINED',
        label: 'Marketplace + system',
        description: 'Invite to the marketplace and offer a tailored company system.',
        subject: 'Invite: CasingConnect Marketplace & company software',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m reaching out from CasingConnect — B2B software and marketplace for the natural casing trade.',
            '',
            'In Pakistan, 15+ companies use CasingConnect for buying → stock → production → sales with private books.',
            '',
            'For companies outside Pakistan we offer two things:',
            `1) List your company on the Marketplace: ${siteUrl}/marketplace`,
            `2) Get a tailored company system (currency & workflow): ${siteUrl}/tailored-setup`,
            '',
            'Reply with your company name and country and we will guide the next step.',
            '',
            'Best regards,',
            'CasingConnect',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            greeting,
            paragraphs: [
              'I’m reaching out from <strong>CasingConnect</strong> — B2B software and marketplace for the natural casing trade.',
              'In <strong>Pakistan, 15+ companies</strong> use CasingConnect for buying → stock → production → sales with private books.',
              'For companies outside Pakistan we offer two things: list on the <strong>Marketplace</strong>, and/or get a <strong>tailored company system</strong> for your country and currency.',
            ],
            ctaLabel: 'Browse Marketplace',
            ctaUrl: `${siteUrl}/marketplace`,
            secondaryLabel: 'Request tailored setup',
            secondaryUrl: `${siteUrl}/tailored-setup`,
            siteUrl,
          });
          return { text, html };
        },
      },
    ];
  }
}

function greetingFor(companyName: string) {
  const clean = companyName.trim() || 'there';
  return `Hi ${clean} team,`;
}

function outreachHtml(input: {
  greeting: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  siteUrl: string;
}) {
  const paras = input.paragraphs
    .map((p) => `<p style="margin:0 0 14px">${p}</p>`)
    .join('');
  const secondary = input.secondaryLabel && input.secondaryUrl
    ? `<p style="margin:12px 0 0"><a href="${escapeHtml(input.secondaryUrl)}" style="color:#1f6b4a">${escapeHtml(input.secondaryLabel)}</a></p>`
    : '';

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.55;color:#122821;max-width:560px">
      <p style="margin:0 0 14px">${escapeHtml(input.greeting)}</p>
      ${paras}
      <p style="margin:20px 0">
        <a href="${escapeHtml(input.ctaUrl)}" style="display:inline-block;background:#1f6b4a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:700">${escapeHtml(input.ctaLabel)}</a>
      </p>
      ${secondary}
      <p style="margin:24px 0 0;color:#3a5248;font-size:13px">
        CasingConnect · <a href="${escapeHtml(input.siteUrl)}" style="color:#1f6b4a">${escapeHtml(input.siteUrl)}</a><br/>
        info@casingconnect.com
      </p>
    </div>
  `;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
