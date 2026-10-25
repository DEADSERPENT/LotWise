export type Role = "STAFF" | "ADMIN";
export interface User { id: string; email: string; role: Role }
export interface Vehicle { id: string; make: string; model: string; category: string; priceInPaise: number; quantity: number }
export interface Movement { id: string; actorUserId: string; actorEmail: string; type: string; quantityDelta: number; quantityBefore: number; quantityAfter: number; reason?: string | null; createdAt: string }
export interface Page<T> { data: T[]; pagination: { page: number; totalPages: number; total: number } }

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const KEY = "lotwise.token";
export const token = {
  get: () => sessionStorage.getItem(KEY),
  set: (t: string | null) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY)),
};

export async function api<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const t = token.get();
  const res = await fetch(`/api${path}`, {
    method,
    headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && json?.error?.code === "UNAUTHENTICATED") window.dispatchEvent(new Event("lotwise:logout"));
    throw new ApiError(res.status, json?.error?.code ?? "INTERNAL_ERROR", json?.error?.message ?? "Something went wrong.");
  }
  return json as T;
}
