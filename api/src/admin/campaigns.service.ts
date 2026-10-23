import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketplaceProspectStatus } from '@prisma/client';
import { brandedEmail, escapeHtml } from '../mail/email-layout';
import { MailService } from '../mail/mail.service';
import { buildWelcomeEmail } from '../mail/welcome-email';
import { PrismaService } from '../prisma/prisma.service';
import { CAMPAIGN_TEMPLATES, type CampaignTemplateId } from './campaign-templates';
import { SendCampaignDto } from './dto';

export { CAMPAIGN_TEMPLATES, type CampaignTemplateId } from './campaign-templates';

const MAX_BATCH = 25;
const SEND_GAP_MS = 450;

type TemplateExtras = {
  demoUrl?: string;
};

type TemplateBody = {
  id: CampaignTemplateId;
  label: string;
  description: string;
  subject: string;
  build: (
    companyName: string,
    siteUrl: string,
    extras?: TemplateExtras,
  ) => { text: string; html: string };
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

  preview(
    template: CampaignTemplateId,
    companyName = 'Your Company',
    demoUrl?: string,
  ) {
    const def = this.templateDefs().find((item) => item.id === template);
    if (!def) throw new BadRequestException('Unknown campaign template.');
    const siteUrl = this.siteUrl();
    const body = def.build(companyName, siteUrl, {
      demoUrl: normalizeDemoUrl(demoUrl, siteUrl),
    });
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
    const customEmails = [
      ...new Set(
        (dto.customEmails ?? [])
          .map((value) => value.trim().toLowerCase())
          .filter((value) => value.includes('@')),
      ),
    ];
    const totalRecipients = ids.length + customEmails.length;
    if (totalRecipients === 0) {
      throw new BadRequestException('Select at least one prospect or add a custom email.');
    }
    if (totalRecipients > MAX_BATCH) {
      throw new BadRequestException(`Send at most ${MAX_BATCH} emails per batch.`);
    }

    const template = dto.template;
    if (!CAMPAIGN_TEMPLATES.includes(template)) {
      throw new BadRequestException('Unknown campaign template.');
    }

    const def = this.templateDefs().find((item) => item.id === template)!;
    const siteUrl = this.siteUrl();
    const customCompanyName = dto.companyName?.trim() || 'there';
    const extras: TemplateExtras = {
      demoUrl: normalizeDemoUrl(dto.demoUrl, siteUrl),
    };
    if (template === 'PUBLIC_SITE' && !extras.demoUrl) {
      throw new BadRequestException(
        'Paste a public company-site demo URL for the Public site demo template.',
      );
    }
    const results: Array<{
      prospectId: string;
      name: string;
      email: string | null;
      ok: boolean;
      reason?: string;
    }> = [];

    if (ids.length > 0) {
      const prospects = await this.prisma.marketplaceProspect.findMany({
        where: { id: { in: ids } },
      });
      const byId = new Map(prospects.map((row) => [row.id, row]));

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

        if (
          dto.skipAlreadySent &&
          prospect.lastCampaignAt &&
          prospect.lastCampaignTemplate === template
        ) {
          results.push({
            prospectId: id,
            name: prospect.name,
            email,
            ok: false,
            reason: 'already_sent',
          });
          continue;
        }

        const body = def.build(prospect.name, siteUrl, extras);
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
    }

    for (const email of customEmails) {
      const body = def.build(customCompanyName, siteUrl, extras);
      const sent = await this.mail.sendOutreach({
        to: email,
        subject: def.subject,
        text: body.text,
        html: body.html,
      });

      results.push({
        prospectId: `custom:${email}`,
        name: customCompanyName,
        email,
        ok: sent.sent,
        reason: sent.sent ? undefined : sent.reason,
      });

      if (sent.sent) await sleep(SEND_GAP_MS);
    }

    const sentCount = results.filter((row) => row.ok).length;
    return {
      template,
      requested: totalRecipients,
      sent: sentCount,
      failed: results.length - sentCount,
      results,
    };
  }

  private templateDefs(): TemplateBody[] {
    return [
      {
        id: 'WELCOME',
        label: 'Welcome / thank you (signup)',
        description:
          'Thank them for joining and offer a tailored solution like the Pakistani market software at lowest rates. Same copy as the automatic signup email.',
        subject: 'Welcome to CasingConnect',
        build: (companyName, siteUrl) => {
          const clean = companyName.trim() || 'there';
          return buildWelcomeEmail({
            greetingName: `${clean} team`,
            companyName: clean === 'there' ? undefined : clean,
            siteUrl,
          });
        },
      },
      {
        id: 'PUBLIC_SITE',
        label: 'Public company site demo',
        description:
          'Highlight the customer-facing company website included with CasingConnect. Paste a live demo URL so they can open it freely. Demo is free; customised setup later costs very little.',
        subject: 'See a live company website demo — included with CasingConnect',
        build: (companyName, siteUrl, extras) => {
          const greeting = greetingFor(companyName);
          const demoUrl =
            extras?.demoUrl?.trim() || `${siteUrl}/site/your-demo`;
          const features = [
            'A customer-facing company website for your casing business',
            'Shows who you are, what you offer, and how buyers can reach you',
            'Included with the CasingConnect solution — not a separate product',
            'Fully customisable to your brand, products, markets, and language',
          ];
          const text = [
            greeting,
            '',
            'One part of CasingConnect that customers really like is the public company website — a customer-facing site for your casing business, built into our solution.',
            '',
            'You can open a live demo freely and browse it like a visitor would:',
            demoUrl,
            '',
            'What you get:',
            ...features.map((item, i) => `${i + 1}. ${item}`),
            '',
            'The demo is free to explore. If you later want a site customised for your company with us, the cost is very little compared with building one from scratch — and it sits alongside your private books and Marketplace presence.',
            '',
            'Also in progress: chat with our team in-app today, and soon global company chat so firms in any country can talk to each other inside CasingConnect.',
            '',
            `Explore CasingConnect: ${siteUrl}/`,
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
            '',
            'Reply if you would like your own demo link or a short walkthrough.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'A customer-facing company site — included with our solution',
            greeting,
            paragraphs: [
              'One part of <strong>CasingConnect</strong> that customers really like is the <strong>public company website</strong> — a customer-facing site for your casing business, built into our solution.',
              `You can open a <strong>live demo freely</strong> and browse it like a visitor would:<br/><a href="${escapeHtml(demoUrl)}" style="color:#145544;font-weight:700;word-break:break-all">${escapeHtml(demoUrl)}</a>`,
              'What you get:',
            ],
            features,
            closing:
              'The <strong>demo is free</strong> to explore. If you later want a site <strong>customised for your company</strong> with us, the cost is <strong>very little</strong> compared with building one from scratch — and it sits alongside your private books and Marketplace presence. Also in progress: <strong>chat with our team in-app</strong> today, and soon <strong>global company chat</strong> so firms in any country can talk inside CasingConnect.',
            ctaLabel: 'Open the live demo',
            ctaUrl: demoUrl,
            secondaryLabel: 'Request a tailored setup',
            secondaryUrl: `${siteUrl}/tailored-setup`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'CHAT',
        label: 'Support chat + global chat (coming soon)',
        description:
          'Highlight in-app chat with CasingConnect support now, and global company-to-company chat across countries as a valuable feature in progress.',
        subject: 'Chat with CasingConnect — and soon with companies worldwide',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const features = [
            'Support chat with the CasingConnect team — available now inside your login',
            'Ask about setup, books, Marketplace, or a tailored company system',
            'Coming soon: global company chat — message casing firms in any country',
            'One place for operations and conversations across the trade',
          ];
          const text = [
            greeting,
            '',
            'CasingConnect is building the conversation layer the natural casing trade has been missing.',
            '',
            'Available now: Support chat — message our team directly from your company login when you need help or want a tailored setup.',
            '',
            'Coming soon (in progress): global company chat — any company can talk to any other company, in any country, inside CasingConnect. Exporters, processors, makers, and buyers connecting without hunting for WhatsApp numbers.',
            '',
            'Why this matters:',
            ...features.map((item, i) => `${i + 1}. ${item}`),
            '',
            `Open Support chat: ${siteUrl}/app/support`,
            `See the product: ${siteUrl}/`,
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
            '',
            'Reply if you want an early look when global company chat goes live.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'Chat with us now — worldwide company chat is next',
            greeting,
            paragraphs: [
              '<strong>CasingConnect</strong> is building the conversation layer the natural casing trade has been missing.',
              '<strong>Available now:</strong> Support chat — message our team directly from your company login when you need help or want a tailored setup.',
              '<strong>Coming soon (in progress):</strong> global company chat — any company can talk to any other company, in <strong>any country</strong>, inside CasingConnect. Exporters, processors, makers, and buyers connecting without hunting for WhatsApp numbers.',
              'Why this matters:',
            ],
            features,
            closing:
              'This is a <strong>valuable feature we are shipping in stages</strong> — support chat first, then company-to-company chat worldwide.',
            ctaLabel: 'Open Support chat',
            ctaUrl: `${siteUrl}/app/support`,
            secondaryLabel: 'Request a tailored setup',
            secondaryUrl: `${siteUrl}/tailored-setup`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'INTERNATIONAL',
        label: 'International clients',
        description:
          'For companies abroad: Pakistan-proven casing software + global Marketplace for makers, importers, and exporters.',
        subject: 'Proven casing software from Pakistan — plus a global B2B marketplace',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const features = [
            'Private company books: buying, store & factory stock, production, sales, expenses, party ledgers',
            'Built for natural casings — sheep, hog, and beef workflows (not generic ERP)',
            'Global Marketplace connecting sausage makers, importers, and exporters',
            'Optional public company website so buyers can find you',
            'We tailor the same proven stack to your country, currency, and process',
          ];
          const text = [
            greeting,
            '',
            'I’m reaching out from CasingConnect — the B2B platform we built and run for the natural casing industry in Pakistan.',
            '',
            'Today, Pakistani casing companies use CasingConnect every day to run buying → stock → production → sales with clear digital books. That live product is what we bring to international partners: not a theory deck — software already proven in this trade.',
            '',
            'For your company we can deliver the same solution, adapted to how you buy, process, and sell — so one system covers operations and market presence:',
            ...features.map((item, i) => `${i + 1}. ${item}`),
            '',
            'On the Marketplace, sausage makers, importers, and exporters meet in one place — by country, product, and capability — while each company keeps private books behind the login.',
            '',
            `See the product: ${siteUrl}/`,
            `Browse the Marketplace: ${siteUrl}/marketplace`,
            `Request a tailored setup for your country: ${siteUrl}/tailored-setup`,
            '',
            'Reply with your country and what you produce or trade, and we will outline a practical setup for your firm.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'Pakistan-proven casing software — ready for your market',
            greeting,
            paragraphs: [
              'I’m reaching out from <strong>CasingConnect</strong> — the B2B platform we built and run for the <strong>natural casing industry in Pakistan</strong>.',
              'Pakistani casing companies already use CasingConnect every day for buying → stock → production → sales with clear digital books. That live product is what we offer international partners: <strong>not a concept — software proven in this trade</strong>.',
              'For your company we can deliver the <strong>same solution</strong>, adapted to how you buy, process, and sell — one system for operations and market presence.',
            ],
            features,
            closing:
              'On the <strong>Marketplace</strong>, sausage makers, importers, and exporters meet in one place — by country, product, and capability — while each firm keeps private books behind the login.',
            ctaLabel: 'Request a tailored setup',
            ctaUrl: `${siteUrl}/tailored-setup`,
            secondaryLabel: 'Browse the Marketplace',
            secondaryUrl: `${siteUrl}/marketplace`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'PAKISTAN',
        label: 'Pakistan exporters & manufacturers',
        description:
          'For local plants and exporters: digital khata, fewer day-to-day problems, and international visibility on the Marketplace.',
        subject: 'Digital khata for your casing plant + visibility in the world market',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const features = [
            'Buying with rates, bags/drums to store, and clear factory stock',
            'Production flow: Roda → 18/UP → qualities (as you work on the floor)',
            'Sales, expenses, and party ledgers (jama / khata) in one place',
            'Workers and managers with role-based access — no shared notebooks',
            'Marketplace profile so international buyers can find your company',
            'Optional public company website linked to your listing',
          ];
          const text = [
            greeting,
            '',
            'Assalam-o-Alaikum — I’m writing from CasingConnect, the system built for Pakistan’s natural casing plants and exporters.',
            '',
            'Most plants still run on paper khata, WhatsApp rates, and memory. That creates mix-ups on stock, party balances, and “who took what” from the store. CasingConnect puts the same day-to-day process on a clear system — so owners get control without changing how the floor already works.',
            '',
            'What you get:',
            ...features.map((item, i) => `${i + 1}. ${item}`),
            '',
            'Alongside private books, the Marketplace helps Pakistani exporters and manufacturers get identified by international buyers — so your company is visible beyond local contacts.',
            '',
            `See how it works: ${siteUrl}/`,
            `List on the Marketplace: ${siteUrl}/marketplace/list-company`,
            `Ask for a company setup: ${siteUrl}/tailored-setup`,
            '',
            'Reply with your city and whether you export, manufacture, or both — we will show you a short demo on your own numbers.',
            '',
            'With regards,',
            'The CasingConnect team',
            siteUrl,
            'info@casingconnect.com',
          ].join('\n');

          const html = outreachHtml({
            title: 'Apna khata, system pe — aur duniya ko dikhao',
            greeting,
            paragraphs: [
              'Assalam-o-Alaikum — I’m writing from <strong>CasingConnect</strong>, the system built for <strong>Pakistan’s natural casing plants and exporters</strong>.',
              'Most plants still run on <strong>paper khata</strong>, WhatsApp rates, and memory. That creates mix-ups on stock, party balances, and “who took what” from the store. CasingConnect puts the <strong>same day-to-day process on a clear system</strong> — so owners get control without changing how the floor already works.',
              'What you get:',
            ],
            features,
            closing:
              'Alongside private books, the <strong>Marketplace</strong> helps Pakistani exporters and manufacturers get <strong>identified by international buyers</strong> — so your company is visible beyond local contacts.',
            ctaLabel: 'Ask for a company setup',
            ctaUrl: `${siteUrl}/tailored-setup`,
            secondaryLabel: 'List on the Marketplace',
            secondaryUrl: `${siteUrl}/marketplace/list-company`,
            siteUrl,
          });
          return { text, html };
        },
      },
      {
        id: 'MARKETPLACE',
        label: 'Marketplace invite',
        description: 'Short invite to list on the CasingConnect Marketplace only.',
        subject: 'Be found by casing buyers worldwide — CasingConnect Marketplace',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'I’m writing from CasingConnect — the B2B marketplace for the natural casing trade (sheep, hog, and beef casings).',
            '',
            'More than 15 companies in Pakistan already run buying → stock → production → sales on CasingConnect. We invite established casing companies to join the Marketplace directory so buyers and sellers can find partners by country, product, and capability.',
            '',
            `Explore: ${siteUrl}/marketplace`,
            `List your company: ${siteUrl}/marketplace/list-company`,
            '',
            'Reply with your company name and country, and we will help you get listed.',
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
              'I’m writing from <strong>CasingConnect</strong> — the B2B marketplace for the <strong>natural casing trade</strong>.',
              'We invite established casing companies to join our <strong>Marketplace directory</strong> — so buyers and sellers can find verified partners by country, product, and capability.',
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
        description: 'Short offer for a custom company setup (any country).',
        subject: 'Private casing books for your country & currency — CasingConnect',
        build: (companyName, siteUrl) => {
          const greeting = greetingFor(companyName);
          const text = [
            greeting,
            '',
            'CasingConnect is natural casing business software used by 15+ companies in Pakistan for buying, store & factory stock, production, sales, expenses, and party ledgers — plus an optional public company website.',
            '',
            'We can set up the same system for your company, adapted to your country, currency, and workflow.',
            '',
            `Request a tailored setup: ${siteUrl}/tailored-setup`,
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
              '<strong>CasingConnect</strong> is used by <strong>15+ companies in Pakistan</strong> for the full buying-to-sell cycle — plus an optional public company website.',
              'We can set up the same system for your firm, adapted to your <strong>country, currency, and workflow</strong>.',
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
        description: 'Short combined invite (Marketplace listing + tailored system).',
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
            'Two clear next steps:',
            `1) List on the Marketplace: ${siteUrl}/marketplace/list-company`,
            `2) Request a tailored company system: ${siteUrl}/tailored-setup`,
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
              'Two paths: <strong>Marketplace visibility</strong> and/or a <strong>tailored company system</strong> for your country and currency.',
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

function normalizeDemoUrl(raw: string | undefined, siteUrl: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/')) return `${siteUrl}${value}`;
  return `https://${value.replace(/^\/+/, '')}`;
}

function outreachHtml(input: {
  title: string;
  greeting: string;
  paragraphs: string[];
  features?: string[];
  bullets?: string[];
  closing?: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryLabel?: string;
  secondaryUrl?: string;
  siteUrl: string;
}) {
  const paras = input.paragraphs
    .map((p) => `<p style="margin:0 0 14px">${p}</p>`)
    .join('');
  const featureItems = input.features ?? input.bullets ?? [];
  const features =
    featureItems.length > 0
      ? `<ul style="margin:0 0 18px;padding:0 0 0 18px;color:#243832;font-size:15px;line-height:1.55">
          ${featureItems
            .map((item) => `<li style="margin:0 0 8px">${escapeHtml(item)}</li>`)
            .join('')}
        </ul>`
      : '';
  const closing = input.closing
    ? `<p style="margin:0 0 14px">${input.closing}</p>`
    : '';
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
      ${features}
      ${closing}
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
