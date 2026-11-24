export function csvCell(v: string | number) {
  let s = String(v);
  // Excel formula injection thekano
  if (typeof v === "string" && /^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvLine(values: (string | number)[]) {
  return values.map(csvCell).join(",") + "\r\n";
}