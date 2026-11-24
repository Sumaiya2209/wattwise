import { getSessionUser } from "@/lib/session";

const TTL_MS = 60_000;
const MAX_ENTRIES = 500;
const store = new Map<string, { exp: number; body: string }>();

export function invalidateOrg(orgId: string) {
  for (const k of store.keys()) {
    if (k.includes(`:${orgId}:`)) store.delete(k);
  }
}

export function withCache(ns: string, handler: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    const user = await getSessionUser();
    if (!user) return handler(req); // handler nijei 401 dey

    const url = new URL(req.url);
    const key = `${ns}:${user.organizationId}:${user.role}:${user.departmentId ?? ""}:${url.search}`;

    const hit = store.get(key);
    if (hit && hit.exp > Date.now()) {
      return new Response(hit.body, {
        headers: { "Content-Type": "application/json", "X-Cache": "HIT" },
      });
    }

    const res = await handler(req);
    if (!res.ok) return res;

    const body = await res.text();
    if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value as string);
    store.set(key, { exp: Date.now() + TTL_MS, body });
    return new Response(body, {
      headers: { "Content-Type": "application/json", "X-Cache": "MISS" },
    });
  };
}