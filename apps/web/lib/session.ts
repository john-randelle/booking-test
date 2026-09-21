import { headers } from "next/headers";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const h = await headers();
  return fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, cookie: h.get("cookie") ?? "" },
    cache: "no-store",
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const res = await apiFetch("/api/me");
  return res.ok ? ((await res.json()) as SessionUser) : null;
}

