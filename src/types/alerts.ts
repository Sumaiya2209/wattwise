export type AlertItem = {
  _id: string;
  type: "high_usage" | "unusual";
  status: "new" | "acknowledged" | "resolved";
  message: string;
  value: number;
  limit?: number;
  triggeredAt: string;
  meterNumber?: string;
  buildingName?: string;
};

export type AlertsResponse = {
  data: AlertItem[];
  total: number;
  page: number;
  totalPages: number;
  newCount: number;
};

export type Insight = {
  id: string;
  tag: string;
  tone: "warn" | "info" | "good";
  scope: string;
  when?: string;
  title: string;
  body: string;
  saveBdt: number | null;
  saveLabel: "Save" | "Excess";
  action: string;
};

export type InsightsData = {
  insights: Insight[];
  monthlySavingsBdt: number;
  recordsAnalyzed: number;
};