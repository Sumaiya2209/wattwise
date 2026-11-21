"use client";

import { useEffect, useState } from "react";

export function useApi<T>(url: string) {
  const [state, setState] = useState<{ url: string; data: T | null; error: string }>({
    url: "",
    data: null,
    error: "",
  });

  useEffect(() => {
    let ignore = false;
    fetch(url)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load data");
        return json as T;
      })
      .then((data) => {
        if (!ignore) setState({ url, data, error: "" });
      })
      .catch((e: Error) => {
        if (!ignore) setState((s) => ({ url, data: s.data, error: e.message }));
      });
    return () => {
      ignore = true;
    };
  }, [url]);

  return { data: state.data, error: state.error, loading: state.url !== url };
}