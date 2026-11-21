const DAY = 24 * 3600 * 1000;

// Range er end = org er sesh record er shomoy (seed data purano hole-o dashboard khali thakbe na)
export function resolveRange(params: URLSearchParams, anchor: Date) {
  const requested = params.get("range") ?? "30d";
  const anchorEnd = new Date(anchor.getTime() + 3600 * 1000);

  let custom: { start: Date; end: Date } | null = null;
  if (requested === "custom") {
    const f = new Date(`${params.get("from")}T00:00:00+06:00`);
    const t = new Date(`${params.get("to")}T00:00:00+06:00`);
    if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && t >= f) {
      custom = { start: f, end: new Date(t.getTime() + DAY) };
    }
  }

  const key = custom ? "custom" : requested === "today" || requested === "7d" ? requested : "30d";
  const days = key === "today" ? 1 : key === "7d" ? 7 : 30;
  const end = custom?.end ?? anchorEnd;
  const start = custom?.start ?? new Date(end.getTime() - days * DAY);
  const span = end.getTime() - start.getTime();

  return {
    key,
    start,
    end,
    prevStart: new Date(start.getTime() - span),
    prevEnd: start,
    days: span / DAY,
    hours: span / 3600000,
  };
}