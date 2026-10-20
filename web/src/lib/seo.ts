import type { Metadata } from 'next';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://casingconnect.com';
export const SITE_NAME = 'CasingConnect';
export const DEFAULT_OG_IMAGE = '/home-hero.jpg';

export function apiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api/v1';
}

export function apiOrigin() {
  return apiBaseUrl().replace(/\/api\/v1\/?$/, '');
}

/** Resolve uploaded media paths for Open Graph / JSON-LD. */
export function mediaUrlFromApi(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${apiOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absoluteUrl(path = '/') {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = SITE_URL.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${base}${suffix === '/' ? '' : suffix}` || base;
}

export function trimDescription(text: string | null | undefined, max = 160) {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export async function fetchPublicApi<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...init,
      next: { revalidate: 300 },
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: T };
    return (body.data ?? null) as T | null;
  } catch {
    return null;
  }
}

type PageSeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
  keywords?: string[];
};

export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
  keywords,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = absoluteUrl(image || DEFAULT_OG_IMAGE);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title}`;

  return {
    title: fullTitle,
    description,
    keywords,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url,
      siteName: SITE_NAME,
      title: fullTitle.includes(SITE_NAME) ? fullTitle : `${SITE_NAME} | ${fullTitle}`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle.includes(SITE_NAME) ? fullTitle : `${SITE_NAME} | ${fullTitle}`,
      description,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
  };
}
