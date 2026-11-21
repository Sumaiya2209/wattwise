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
  const initialLoading = loading && rows.length === 0;

  if (error && rows.length === 0) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-50 p-4 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
        {error}
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-500 dark:border-gray-700">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 font-semibold">
                  {c.header}
                </th>
              ))}
              {actions && <th className="px-4 py-3 text-right font-semibold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row._id} className="text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/40">
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
          <div
            key={row._id}
            className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 font-semibold text-gray-900 dark:text-white">
                {cell(columns[0], row)}
              </div>
              {actions && <div className="shrink-0">{actions(row)}</div>}
            </div>
            <dl className="mt-3 space-y-1.5 text-sm">
              {columns.slice(1).map((c) => (
                <div key={c.key} className="flex justify-between gap-3">
                  <dt className="text-gray-500">{c.header}</dt>
                  <dd className="text-right text-gray-800 dark:text-gray-200">{cell(c, row)}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 text-sm text-gray-500 sm:flex-row">
        <span>
          Page {page} of {totalPages} · {total.toLocaleString()} total
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 disabled:opacity-40 dark:border-gray-700"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}