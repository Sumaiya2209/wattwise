"use client";

import { Search } from "lucide-react";

export default function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="ww-panel-2 flex items-center gap-2 rounded-xl px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/30 sm:w-72">
      <Search size={16} className="ww-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-[var(--ww-text)] outline-none placeholder:text-[var(--ww-muted)]"
      />
    </div>
  );
}