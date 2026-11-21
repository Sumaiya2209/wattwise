export type Granularity = "hourly" | "daily" | "monthly";
export type DistMode = "buildings" | "departments";

export type SeriesPoint = { t: string; consumption: number; cost: number };
export type DistItem = { id: string; name: string; consumption: number; share: number };
export type MeterRow = {
  id: string;
  meterNumber: string;
  building: string;
  floor: string;
  department: string;
  avgKw: number;
  consumption: number;
  cost: number;
};

export type DashboardData = {
  range: { key: string; start: string; end: string; days: number };
  tariff: number;
  carbonFactor: number;
  kpis: {
    totalConsumption: number;
    totalCost: number;
    avgDaily: number;
    prevAvgDaily: number;
    consumptionDelta: number | null;
    costDelta: number | null;
    peak: { kw: number; at: string } | null;
    low: { kw: number; at: string } | null;
    carbonKg: number;
  };
  series: SeriesPoint[];
  distribution: DistItem[];
  meters: MeterRow[];
};