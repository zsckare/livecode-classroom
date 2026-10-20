export type Teacher = { id: string; name: string; email: string };
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message ?? 'Error de servidor');
  }
  return response.json() as Promise<T>;
}
