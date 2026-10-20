import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MarketplaceProspectStatus, Prisma } from '@prisma/client';
import * as cheerio from 'cheerio';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';
import { PrismaService } from '../prisma/prisma.service';
import { CASING_TRADE_COUNTRIES, CURATED_CASING_PROSPECTS } from './casing-trade-data';
import { DiscoverProspectsDto, ScrapeProspectsDto, UpdateProspectDto } from './dto';

type Extracted = {
  name: string;
  website?: string;
  snippet?: string;
  country?: string;
};

const INDUSTRY_QUERIES = [
  'natural sausage casing manufacturers',
  'sheep casing exporters',
  'natural casing producers company',
  'hog casing processing company',
];

const COMPANY_HINT =
  /\b(casing|casings|naturd[aä]rme|darme|intestines?|abattoir|slaughter)\b/i;
const COMPANY_SUFFIX =
  /\b(co\.?|company|ltd\.?|limited|llc|gmbh|s\.?a\.?|bv|pty|inc\.?|corp\.?|plc|ag|sas|srl|oy|kk)\b/i;
const NOISE =
  /^(home|about|contact|login|membership|events|privacy|cookie|read more|more details|language|menu)$/i;

@Injectable()
export class ProspectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(status?: MarketplaceProspectStatus) {
    return this.prisma.marketplaceProspect.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  async update(id: string, dto: UpdateProspectDto) {
    const existing = await this.prisma.marketplaceProspect.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prospect not found.');
    return this.prisma.marketplaceProspect.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        country: dto.country === undefined ? undefined : dto.country?.trim() || null,
        city: dto.city === undefined ? undefined : dto.city?.trim() || null,
        website: dto.website === undefined ? undefined : dto.website?.trim() || null,
        email: dto.email === undefined ? undefined : dto.email?.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.marketplaceProspect.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Prospect not found.');
    await this.prisma.marketplaceProspect.delete({ where: { id } });
    return { ok: true };
  }

  async scrapeUrl(dto: ScrapeProspectsDto) {
    const url = this.assertPublicHttpUrl(dto.url.trim());
    await this.assertNotPrivateHost(url.hostname);

    const html = await this.fetchText(url.toString());
    const extracted = this.extractFromHtml(html, url.toString());
    const saved = await this.saveMany(extracted, url.toString(), url.hostname);

    return {
      sourceUrl: url.toString(),
      found: extracted.length,
      saved: saved.length,
      items: saved,
    };
  }

  async discover(dto: DiscoverProspectsDto) {
    const queries = dto.query?.trim()
      ? [dto.query.trim()]
      : INDUSTRY_QUERIES.slice(0, dto.limitQueries ?? 3);

    const all: Extracted[] = [];
    const sources: string[] = [];

    for (const query of queries) {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      sources.push(searchUrl);
      try {
        const html = await this.fetchText(searchUrl);
        all.push(...this.extractSearchResults(html));
      } catch {
        // Keep going — search engines often rate-limit.
      }
      await this.sleep(800);
    }

    const deduped = this.dedupe(all);
    const saved = await this.saveMany(deduped, sources[0] ?? 'discover', 'industry-search');

    return {
      queries,
      found: deduped.length,
      saved: saved.length,
      items: saved,
    };
  }

  /**
   * Replace previous trade-country seeds with verified natural casing companies
   * from public industry directories / company sites.
   */
  async seedTradeCountries() {
    await this.prisma.marketplaceProspect.deleteMany({
      where: { sourceLabel: { in: ['trade-country-seed', 'natural-casing-companies'] } },
    });

    const byCountry = new Map<string, number>();
    let saved = 0;

    for (const row of CURATED_CASING_PROSPECTS) {
      const sourceUrl = `seed://natural-casing/${encodeURIComponent(row.country)}/${encodeURIComponent(row.name)}`;
      await this.prisma.marketplaceProspect.create({
        data: {
          name: row.name,
          country: row.country,
          city: row.city ?? null,
          website: row.website ?? null,
          email: row.email ?? null,
          phone: row.phone ?? null,
          snippet: row.snippet ?? 'Natural casing company (public industry source).',
          sourceUrl,
          sourceLabel: 'natural-casing-companies',
          status: MarketplaceProspectStatus.NEW,
          notes: 'Loaded from public industry sources (ZVN, INSCA public pages, company sites).',
        },
      });
      saved += 1;
      byCountry.set(row.country, (byCountry.get(row.country) ?? 0) + 1);
    }

    return {
      countries: [...CASING_TRADE_COUNTRIES],
      saved,
      byCountry: Object.fromEntries(byCountry),
      note: 'Only verified natural casing companies — counts differ by country.',
    };
  }

  tradeCountries() {
    return {
      countries: [...CASING_TRADE_COUNTRIES],
      curatedCount: CURATED_CASING_PROSPECTS.length,
    };
  }

  private async saveMany(items: Extracted[], sourceUrl: string, sourceLabel: string) {
    const saved = [];
    for (const item of items) {
      try {
        const row = await this.prisma.marketplaceProspect.upsert({
          where: { name_sourceUrl: { name: item.name, sourceUrl } },
          create: {
            name: item.name,
            website: item.website ?? null,
            snippet: item.snippet ?? null,
            country: item.country ?? null,
            sourceUrl,
            sourceLabel,
            status: MarketplaceProspectStatus.NEW,
          },
          update: {
            website: item.website ?? undefined,
            snippet: item.snippet ?? undefined,
            country: item.country ?? undefined,
            sourceLabel,
          },
        });
        saved.push(row);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          continue;
        }
        throw error;
      }
    }
    return saved;
  }

  private extractFromHtml(html: string, pageUrl: string): Extracted[] {
    const $ = cheerio.load(html);
    $('script, style, noscript, svg, nav, footer, header').remove();

    const found: Extracted[] = [];

    $('a, li, h1, h2, h3, h4, td, strong').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!this.looksLikeCompany(text)) return;

      const tag = String($(el).prop('tagName') ?? '').toLowerCase();
      let website: string | undefined;
      if (tag === 'a') {
        const href = $(el).attr('href');
        website = this.absoluteUrl(href, pageUrl);
      } else {
        const nested = $(el).find('a[href]').first().attr('href');
        website = this.absoluteUrl(nested, pageUrl);
      }

      found.push({
        name: this.cleanName(text),
        website,
        snippet: text.slice(0, 240),
      });
    });

    return this.dedupe(found).slice(0, 80);
  }

  private extractSearchResults(html: string): Extracted[] {
    const $ = cheerio.load(html);
    const found: Extracted[] = [];

    $('.result, .web-result, .links_main').each((_, el) => {
      const title = $(el).find('a.result__a, a.result__url, h2 a, a').first().text().replace(/\s+/g, ' ').trim();
      const href = $(el).find('a.result__a, a.result__url, h2 a, a').first().attr('href');
      const snippet = $(el).find('.result__snippet, .result__body, td').first().text().replace(/\s+/g, ' ').trim();
      if (!title || NOISE.test(title)) return;
      if (!COMPANY_HINT.test(`${title} ${snippet}`) && !COMPANY_SUFFIX.test(title)) return;

      found.push({
        name: this.cleanName(title.replace(/\s*[-|].*$/, '').trim() || title),
        website: this.unwrapDdgUrl(href),
        snippet: snippet.slice(0, 240) || undefined,
      });
    });

    // Fallback: any result links
    if (found.length === 0) {
      $('a.result__a').each((_, el) => {
        const title = $(el).text().replace(/\s+/g, ' ').trim();
        if (!title || title.length < 4) return;
        found.push({
          name: this.cleanName(title.replace(/\s*[-|].*$/, '').trim() || title),
          website: this.unwrapDdgUrl($(el).attr('href')),
        });
      });
    }

    return this.dedupe(found).slice(0, 60);
  }

  private looksLikeCompany(text: string) {
    if (!text || text.length < 4 || text.length > 120) return false;
    if (NOISE.test(text)) return false;
    if (/https?:\/\//i.test(text)) return false;
    if ((text.match(/[,:;]/g) ?? []).length > 2) return false;
    const words = text.split(/\s+/);
    if (words.length < 2 && !COMPANY_SUFFIX.test(text)) return false;
    return COMPANY_HINT.test(text) || COMPANY_SUFFIX.test(text) || /^[A-Z][A-Za-z0-9&.'-]{2,}(\s+[A-Z][A-Za-z0-9&.'-]{1,}){1,6}$/.test(text);
  }

  private cleanName(name: string) {
    return name.replace(/\s+/g, ' ').replace(/^[-•*\d.]+\s*/, '').trim().slice(0, 160);
  }

  private dedupe(items: Extracted[]) {
    const seen = new Set<string>();
    const out: Extracted[] = [];
    for (const item of items) {
      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
    return out;
  }

  private assertPublicHttpUrl(raw: string) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new BadRequestException('Enter a valid http(s) URL.');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new BadRequestException('Only http and https URLs are allowed.');
    }
    if (url.username || url.password) {
      throw new BadRequestException('URLs with credentials are not allowed.');
    }
    return url;
  }

  private async assertNotPrivateHost(hostname: string) {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new BadRequestException('Local addresses are not allowed.');
    }
    if (isIP(host)) {
      if (this.isPrivateIp(host)) throw new BadRequestException('Private IP addresses are not allowed.');
      return;
    }
    try {
      const results = await lookup(host, { all: true });
      for (const row of results) {
        if (this.isPrivateIp(row.address)) {
          throw new BadRequestException('Host resolves to a private address.');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not resolve host.');
    }
  }

  private isPrivateIp(ip: string) {
    if (ip === '::1') return true;
    if (ip.includes(':')) {
      return ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80');
    }
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  private async fetchText(url: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent': 'CasingConnectAdminBot/1.0 (+https://casingconnect.local; research)',
          Accept: 'text/html,application/xhtml+xml',
        },
      });
      if (!response.ok) {
        throw new BadRequestException(`Fetch failed (${response.status}) for ${url}`);
      }
      const type = response.headers.get('content-type') ?? '';
      if (!/text\/html|application\/xhtml/i.test(type) && !type.includes('text/')) {
        throw new BadRequestException('URL did not return HTML.');
      }
      const text = await response.text();
      return text.slice(0, 1_500_000);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException('Could not fetch that URL.');
    } finally {
      clearTimeout(timer);
    }
  }

  private absoluteUrl(href: string | undefined, base: string) {
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) {
      return undefined;
    }
    try {
      const url = new URL(href, base);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
      return url.toString();
    } catch {
      return undefined;
    }
  }

  private unwrapDdgUrl(href: string | undefined) {
    if (!href) return undefined;
    try {
      const url = new URL(href, 'https://duckduckgo.com');
      const uddg = url.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
      return this.absoluteUrl(href, 'https://duckduckgo.com');
    } catch {
      return undefined;
    }
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
