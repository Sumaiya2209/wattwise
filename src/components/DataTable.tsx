"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
};

type Props<T extends { _id: string }> = {
  columns: Column<T>[];
  rows: T[];
  loading: boolean;
  error?: string;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  actions?: (row: T) => ReactNode;
  emptyText?: string;
};

function cell<T>(col: Column<T>, row: T): ReactNode {
  if (col.render) return col.render(row);
  const v = (row as unknown as Record<string, unknown>)[col.key];
  return v === undefined || v === null || v === "" ? "—" : String(v);
}

export default function DataTable<T extends { _id: string }>({
  columns,
  rows,
  loading,
  error,
  page,
  totalPages,
  total,
  onPageChange,
  actions,
  emptyText = "No data found",
}: Props<T>) {
  if (error && rows.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>
    );
  }

  if (loading && rows.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ww-skeleton h-14 animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--ww-border)] p-10 text-center text-sm ww-muted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`transition-opacity ${loading ? "opacity-60" : ""}`}>
      {/* Desktop table */}
      <div className="ww-panel hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="ww-eyebrow">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium">
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row._id}
                className="border-t border-[var(--ww-border)] text-[var(--ww-text)] hover:bg-[var(--ww-panel2)]"
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    {cell(c, row)}
                  </td>
                ))}
                {actions && <td className="px-4 py-3 text-right">{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row._id} className="ww-panel p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 font-semibold text-[var(--ww-text)]">{cell(columns[0], row)}</div>
              {actions && <div className="shrink-0">{actions(row)}</div>}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {columns.slice(1).map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <dt className="ww-muted">{c.header}</dt>
                  <dd className="text-right text-[var(--ww-text)]">{cell(c, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <span className="ww-muted">
          Page {page} of {totalPages} · {total.toLocaleString()} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="ww-panel-2 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[var(--ww-text)] disabled:opacity-40"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="ww-panel-2 flex items-center gap-1 rounded-lg px-3 py-1.5 text-[var(--ww-text)] disabled:opacity-40"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}