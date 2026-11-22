export const inputCls =
  "w-full rounded-xl border border-[var(--ww-border)] bg-[var(--ww-panel2)] px-3 py-2.5 text-sm text-[var(--ww-text)] outline-none transition placeholder:text-[var(--ww-muted)] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60";

export default function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="ww-eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}