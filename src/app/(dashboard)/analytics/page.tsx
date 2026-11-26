import { Suspense } from "react";
import { requireUser } from "@/lib/session";
import AnalyticsClient from "./AnalyticsClient";

export const instant = false;

export default async function AnalyticsPage() {
  await requireUser();
  return (
    <Suspense fallback={null}>
      <AnalyticsClient />
    </Suspense>
  );
}