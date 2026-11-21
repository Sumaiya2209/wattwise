"use client";

export default function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`ww-panel-2 inline-flex rounded-xl p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
            value === o.value
              ? "bg-emerald-500 text-white shadow dark:text-[#04120c]"
              : "ww-muted hover:text-[var(--ww-text)]"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}