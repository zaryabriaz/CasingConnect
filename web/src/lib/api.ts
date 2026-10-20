import { AdminBusiness, AdminUser, AuthSession, SessionProfile } from './types';

export const TOKEN_KEY = 'casingconnect.token';

function baseUrl() {
  if (typeof window !== 'undefined') {
    // Local Next.js runs on :3011 and talks to the API on :3010.
    // Production is reverse-proxied on the same host (80/443) via nginx.
    if (window.location.port === '3011') {
      return `${window.location.protocol}//${window.location.hostname}:3010/api/v1`;
    }
    return `${window.location.origin}/api/v1`;
  }
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3010/api/v1';
}

export function apiOrigin() {
  return baseUrl().replace(/\/api\/v1\/?$/, '');
}

/** Resolve uploaded media (e.g. `/uploads/...`) against the API host. */
export function mediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${apiOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly details?: string[],
  ) {
    super(message);
  }
}

export function errorText(error: unknown) {
  if (error instanceof ApiError) {
    return [error.message, ...(error.details ?? [])].filter(Boolean).join(' ');
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The purchase could not be saved. Refresh the page and try again.';
}

export function readToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function parseApiResponse<T>(path: string, response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: { message?: string; details?: string[] };
  } | null;

  if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
    clearToken();
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  if (!response.ok || !body) {
    throw new ApiError(body?.error?.message ?? 'Request failed.', body?.error?.details);
  }
  return body.data as T;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = readToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  return parseApiResponse<T>(path, response);
}

/** Multipart upload — do not set Content-Type (browser sets the boundary). */
export async function apiForm<T>(path: string, form: FormData, method = 'POST'): Promise<T> {
  const token = readToken();
  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  return parseApiResponse<T>(path, response);
}

export function login(email: string, password: string) {
  return api<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}

export function register(input: {
  name: string;
  email: string;
  password: string;
  businessName: string;
  activities: string[];
  city?: string;
  country?: string;
  phone?: string;
  currency?: string;
  captchaToken: string;
  captchaAnswer: string;
  website?: string;
}) {
  return api<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

export function currentSession() {
  return api<SessionProfile>('/auth/me');
}

export function switchBusiness(businessId: string) {
  return api<AuthSession>('/auth/switch-business', { method: 'POST', body: JSON.stringify({ businessId }) });
}

export function listAdminBusinesses() {
  return api<AdminBusiness[]>('/admin/businesses');
}

export function getAdminBusiness(id: string) {
  return api<AdminBusiness>(`/admin/businesses/${id}`);
}

export function updateAdminBusiness(
  id: string,
  input: { active?: boolean; publicSiteEnabled?: boolean },
) {
  return api<AdminBusiness>(`/admin/businesses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function listAdminUsers() {
  return api<AdminUser[]>('/admin/users');
}

export function impersonateBusiness(businessId: string) {
  return api<AuthSession>('/admin/impersonate', {
    method: 'POST',
    body: JSON.stringify({ businessId }),
  });
}

export function exitImpersonation() {
  return api<AuthSession>('/admin/exit-impersonation', { method: 'POST' });
}
