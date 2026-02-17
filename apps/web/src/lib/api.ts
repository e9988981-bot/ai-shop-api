/**
 * API client - uses same origin (Host) for tenant resolution
 */

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export function getApiBase(): string {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || '';
  return process.env.NEXT_PUBLIC_API_URL || '';
}

function getBase(): string {
  return getApiBase();
}

export async function api<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const base = getBase();
  const url = `${base}${path.startsWith('/') ? path : '/' + path}`;
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json.error || res.statusText, status: res.status };
  }
  return { ...(json as ApiResponse<T>), status: res.status };
}

export async function apiGet<T>(path: string): Promise<ApiResponse<T>> {
  return api<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export async function apiDelete<T>(path: string): Promise<ApiResponse<T>> {
  return api<T>(path, { method: 'DELETE' });
}
