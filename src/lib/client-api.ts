export async function sendJson(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown
): Promise<{ ok: boolean; error: string }> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.ok) return { ok: true, error: "" };
  const json = await res.json().catch(() => ({}));
  return { ok: false, error: json.error ?? "Something went wrong" };
}