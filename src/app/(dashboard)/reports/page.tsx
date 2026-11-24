import { requireUser } from "@/lib/session";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  await requireUser();
  return <ReportsClient />;
}