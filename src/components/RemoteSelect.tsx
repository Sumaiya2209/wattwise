"use client";

import { useList } from "@/hooks/useList";
import { inputCls } from "./FormField";

type Opt = { _id: string } & Record<string, unknown>;

export default function RemoteSelect({
  endpoint,
  params = {},
  value,
  onChange,
  placeholder,
  required,
  className,
  labelKey = "name",
}: {
  endpoint: string;
  params?: Record<string, string | number>;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  className?: string;
  labelKey?: string;
}) {
  const { rows, loading } = useList<Opt>(endpoint, {
    page: 1,
    limit: 100,
    ...params,
  });

  return (
    <select
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading && rows.length === 0}
      className={className ?? inputCls}
    >
      <option value="">{placeholder}</option>
      {rows.map((r) => (
        <option key={r._id} value={r._id}>
          {String(r[labelKey] ?? "")}
        </option>
      ))}
    </select>
  );
}