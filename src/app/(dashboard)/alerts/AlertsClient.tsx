"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import Segmented from "@/components/Segmented";
import AlertHistory from "@/components/alerts/AlertHistory";
import ThresholdsTab from "@/components/alerts/ThresholdsTab";

type Tab = "history" | "limits";

export default function AlertsClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("history");
  const [scanning, setScanning] = useState(false);
  const [msg, setMsg] = useState("");
  const [version, setVersion] = useState(0);

  async function scan() {
    setScanning(true);
    setMsg("");
    const res = await fetch("/api/alerts/scan", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    setScanning(false);
    if (!res.ok) return setMsg(json.error ?? "Scan failed");
    setMsg(`Scan complete · ${json.created} new alert(s)`);
    setVersion((v) => v + 1); // history reload
    router.refresh();
  }

  return (
    <div>
      <PageHeader
        title="Alert Management"
        subtitle="Monitor consumption alerts and configure limits"
        action={
          <div className="flex items-center gap-3">
            {msg && <span className="ww-mono hidden text-xs ww-muted sm:block">{msg}</span>}
            <button
              onClick={scan}
              disabled={scanning}
              className="ww-panel-2 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--ww-text)] hover:text-emerald-500 disabled:opacity-60"
            >
              {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Scan now
            </button>
          </div>
        }
      />
      {msg && <p className="ww-mono -mt-3 mb-4 text-xs ww-muted sm:hidden">{msg}</p>}

      <div className="mb-5">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "history", label: "Alert History" },
            { value: "limits", label: "Threshold Limits" },
          ]}
        />
      </div>

      {tab === "history" ? <AlertHistory key={version} /> : <ThresholdsTab />}
    </div>
  );
}