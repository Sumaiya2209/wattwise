import { requireUser } from "@/lib/session";
import InsightsClient from "./InsightsClient";

export default async function InsightsPage() {
  await requireUser();
  return <InsightsClient />;
}