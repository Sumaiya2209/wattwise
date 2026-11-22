const TONES = {
  green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  gray: "border-[var(--ww-border)] bg-[var(--ww-panel2)] text-[var(--ww-muted)]",
  red: "border-red-500/40 bg-red-500/10 text-red-500",
};

export default function StatusBadge({ label, tone }: { label: string; tone: keyof typeof TONES }) {
  return (
    <span className={`ww-mono rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase ${TONES[tone]}`}>
      {label}
    </span>
  );
}