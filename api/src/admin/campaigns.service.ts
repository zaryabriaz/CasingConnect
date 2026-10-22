import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketplaceProspectStatus } from '@prisma/client';
import { brandedEmail, escapeHtml } from '../mail/email-layout';
import { MailService } from '../mail/mail.service';
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
        id: 'SOFTWARE',
        label: 'Software for exporters',
        description:
          'Pitch CasingConnect software to casing companies abroad — features, industry expertise, and affordable tailored setup.',
        subject: 'Casing business software for exporters — built by industry specialists',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m writing from CasingConnect — specialised business software for the natural casing industry (sheep, hog, and beef casings).',
            '',
            'We already serve multiple casing exporters who run their day-to-day operations on CasingConnect: buying, store & factory stock, production (Roda / 18/UP / qualities), sales, expenses, and party ledgers — with an optional public company website and Marketplace presence.',
            '',
            'Unlike generic ERP tools, CasingConnect is designed around casing workflows: material forms, hank-based finished stock, supplier & buyer ledgers, and export-ready books.',
            '',
            'Our team works only in this industry. We can configure a private company system for your country, currency, and process — at competitive rates built for mid-size exporters, not enterprise software pricing.',
            '',
            `See the product: ${siteUrl}/`,
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
            '',
            'Reply with your country and a short note on how you buy and sell today, and we will outline a simple setup plan for your company.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'Casing software built for exporters like you',
            greeting,
            paragraphs: [
              'I’m writing from <strong>CasingConnect</strong> — specialised business software for the <strong>natural casing industry</strong> (sheep, hog, and beef casings).',
              'We already serve <strong>multiple casing exporters</strong> who run buying, store &amp; factory stock, production (Roda / 18/UP / qualities), sales, expenses, and party ledgers on CasingConnect — with an optional public company website and Marketplace presence.',
              'Unlike generic ERP tools, CasingConnect follows <strong>casing workflows</strong>: material forms, hank-based finished stock, supplier &amp; buyer ledgers, and export-ready books.',
              'Our team works only in this industry. We can configure a private system for your <strong>country, currency, and process</strong> — at <strong>competitive rates</strong> built for mid-size exporters, not enterprise software pricing.',
            ],
            ctaLabel: 'Request a tailored setup',
            ctaUrl: `${siteUrl}/tailored-setup`,
            secondaryLabel: 'See the product',
            secondaryUrl: `${siteUrl}/`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'MARKETPLACE',
        label: 'Marketplace invite',
        description: 'Invite the company to list on the CasingConnect Marketplace.',
        subject: 'Be found by casing buyers worldwide — CasingConnect Marketplace',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m writing from CasingConnect — the B2B platform purpose-built for the natural casing trade (sheep, hog, and beef casings).',
            '',
            'More than 15 companies in Pakistan already run their full buying → stock → production → sales cycle on CasingConnect with private company books.',
            '',
            'We are inviting established casing companies abroad to join our Marketplace directory — so international buyers and sellers can find verified partners by country, product, and capability.',
            '',
            `Explore the Marketplace: ${siteUrl}/marketplace`,
            `List your company: ${siteUrl}/marketplace/list-company`,
            '',
            'Reply to this email with your company name and country, and we will help you get listed.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'List your company where casing buyers look',
            greeting,
            paragraphs: [
              'I’m writing from <strong>CasingConnect</strong> — the B2B platform purpose-built for the <strong>natural casing trade</strong> (sheep, hog, and beef casings).',
              'More than <strong>15 companies in Pakistan</strong> already run buying → stock → production → sales on CasingConnect with private company books.',
              'We invite established casing companies abroad to join our <strong>Marketplace directory</strong> — so buyers and sellers can find verified partners by country, product, and capability.',
            ],
            ctaLabel: 'Open Marketplace',
            ctaUrl: `${siteUrl}/marketplace`,
            secondaryLabel: 'List your company',
            secondaryUrl: `${siteUrl}/marketplace/list-company`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'TAILORED',
        label: 'Tailored system setup',
        description: 'Offer a custom company setup like the Pakistan product.',
        subject: 'Private casing books for your country & currency — CasingConnect',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'CasingConnect is natural casing business software used by 15+ companies in Pakistan for the full buying-to-sell cycle: buying, store & factory stock, production, sales, expenses, and party ledgers — with an optional public company website.',
            '',
            'We can set up the same system for your company, adapted to your country, currency, and day-to-day workflow — at competitive rates for exporters.',
            '',
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
            `See the product: ${siteUrl}/`,
            '',
            'Reply with your country and preferred currency and we will follow up personally.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'A casing system built around your operation',
            greeting,
            paragraphs: [
              '<strong>CasingConnect</strong> is natural casing business software used by <strong>15+ companies in Pakistan</strong> for the full buying-to-sell cycle — buying, store &amp; factory stock, production, sales, expenses, and party ledgers — plus an optional public company website.',
              'We can set up the same system for your firm, adapted to your <strong>country, currency, and workflow</strong> — at competitive rates for exporters.',
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
        subject: 'Marketplace visibility + private casing software — CasingConnect',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m reaching out from CasingConnect — B2B software and marketplace for the natural casing trade.',
            '',
            'In Pakistan, 15+ companies use CasingConnect for buying → stock → production → sales with private books.',
            '',
            'For companies outside Pakistan we offer two clear next steps:',
            `1) List your company on the Marketplace: ${siteUrl}/marketplace/list-company`,
            `2) Request a tailored company system for your country & currency: ${siteUrl}/tailored-setup`,
            '',
            'Reply with your company name and country and we will guide the right path.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'Two ways to work with CasingConnect',
            greeting,
            paragraphs: [
              'I’m reaching out from <strong>CasingConnect</strong> — B2B software and marketplace for the natural casing trade.',
              'In <strong>Pakistan, 15+ companies</strong> use CasingConnect for buying → stock → production → sales with private books.',
              'For companies abroad we offer two clear paths: <strong>Marketplace visibility</strong> for buyers and sellers, and/or a <strong>tailored company system</strong> for your country and currency.',
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
  return `Dear ${clean} team,`;
}

function outreachHtml(input: {
  title: string;
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
  const secondary =
    input.secondaryLabel && input.secondaryUrl
      ? `<p style="margin:14px 0 0"><a href="${escapeHtml(input.secondaryUrl)}" style="color:#145544;font-weight:700">${escapeHtml(input.secondaryLabel)} →</a></p>`
      : '';

  return brandedEmail({
    preheader: input.title,
    eyebrow: 'CasingConnect',
    title: input.title,
    bodyHtml: `
      <p style="margin:0 0 14px">${escapeHtml(input.greeting)}</p>
      ${paras}
      ${secondary}
    `,
    ctaLabel: input.ctaLabel,
    ctaUrl: input.ctaUrl,
    footerNote: 'You can reply directly to this email — it reaches the CasingConnect team.',
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
