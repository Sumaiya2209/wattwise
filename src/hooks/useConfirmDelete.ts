"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

// onDelete: error message return kore, success hole null
export function useConfirmDelete<T>(onDelete: (item: T) => Promise<string | null>) {
  const router = useRouter();
  const [target, setTarget] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ask = useCallback((item: T) => {
    setError("");
    setTarget(item);
  }, []);

  const cancel = useCallback(() => {
    if (!busy) setTarget(null);
  }, [busy]);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    setError("");
    const err = await onDelete(target);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setTarget(null);
    router.refresh(); // sidebar count (buildings/floors/meters) update
  }

  return { target, busy, error, ask, cancel, confirm };
}