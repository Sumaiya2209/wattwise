export const TZ = "Asia/Dhaka";

export const fmtNum = (n: number, d = 0) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

export const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export const fmtBdt = (n: number) => `৳${fmtNum(n)}`;

export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));

  export function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short" }).format(new Date(iso));

export const fmtMonth = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short", year: "2-digit" }).format(new Date(iso));