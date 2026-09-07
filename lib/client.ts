export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) });
}
