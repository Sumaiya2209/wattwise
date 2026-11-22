"use client";

import { useCallback, useEffect, useState } from "react";

export type ListResult<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

export function useList<T extends { _id: string }>(
  endpoint: string,
  params: Record<string, string | number>
) {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString();
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<{
    key: string;
    result: ListResult<T> | null;
    error: string;
  }>({ key: "", result: null, error: "" });

  const key = `${qs}#${reload}`;

  useEffect(() => {
    let ignore = false;
    fetch(`${endpoint}?${qs}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load data");
        return json as ListResult<T>;
      })
      .then((result) => {
        if (!ignore) setState({ key, result, error: "" });
      })
      .catch((e: Error) => {
        if (!ignore) setState((s) => ({ key, result: s.result, error: e.message }));
      });
    return () => {
      ignore = true;
    };
  }, [endpoint, qs, key]);

  const refresh = useCallback(() => setReload((r) => r + 1), []);

  // Delete er por row sathe sathe list theke soriye dey (server sync pore hoy)
  const removeRow = useCallback((id: string) => {
    setState((s) =>
      s.result
        ? {
            ...s,
            result: {
              ...s.result,
              data: s.result.data.filter((r) => r._id !== id),
              total: Math.max(0, s.result.total - 1),
            },
          }
        : s
    );
  }, []);

  return {
    rows: state.result?.data ?? [],
    total: state.result?.total ?? 0,
    totalPages: state.result?.totalPages ?? 1,
    loading: state.key !== key,
    error: state.error,
    refresh,
    removeRow,
  };
}