"use client";

import { useState } from "react";
import InsightsPanel from "@/components/dashboard/InsightsPanel";
import PageHeader from "@/components/PageHeader";
import Segmented from "@/components/Segmented";

type R = "7d" | "30d";

export default function InsightsClient() {
  const [range, setRange] = useState<R>("30d");
  return (
    <div>
      <PageHeader
        title="Energy Insights"
        subtitle="Anomalies, peak-load drivers and saving suggestions from your real consumption data"
        action={
          <Segmented<R>
            value={range}
            onChange={setRange}
            options={[
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
            ]}
          />
        }
      />
      <InsightsPanel query={`range=${range}`} />
    </div>
  );
}