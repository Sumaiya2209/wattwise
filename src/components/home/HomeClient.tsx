"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus_Jakarta_Sans } from "next/font/google";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Cpu,
  Database,
  FileSpreadsheet,
  Layers,
  Lock,
  Network,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import HeroCircuit from "./HeroCircuit";
import LiveChart, { type ChartProfile } from "./LiveChart";
import HomeNavbar from "./HomeNavbar";

const display = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["600", "700", "800"] });
const H = display.className;

/* ---------- small helpers ---------- */

function Reveal({
  children,
  className = "",
  delay = 0,
  visible = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  visible?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      className={`hm-reveal ${show ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

function Counter({ target, decimals = 0, suffix = "" }: { target: number; decimals?: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1600, 1);
      setVal(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <>
      {val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

function Pill({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-volt/25 bg-volt/10 px-3 py-1 font-mono text-xs text-volt">
      <Icon size={14} />
      <span>{children}</span>
    </div>
  );
}

/* ---------- data ---------- */

type SectorKey = "university" | "factory" | "tower";

const SECTORS: Record<
  SectorKey,
  { tab: string; name: string; meta: string; kwh: number; load: number; co2: string; saved: string; path: string }
> = {
  university: {
    tab: "University Campus",
    name: "Sylhet Metropolitan University",
    meta: "4 Buildings • 12 Floors • 24 Smart Meters",
    kwh: 1842.5,
    load: 72,
    co2: "24.8",
    saved: "Est. saving: ৳41k / mo",
    path: "M 0 65 Q 30 58, 60 44 T 120 50 T 180 30 T 240 42 T 300 28 T 360 36",
  },
  factory: {
    tab: "Manufacturing Plant",
    name: "BrightEdge Textiles Ltd",
    meta: "4 Production Units • 12 Floors • 24 Meters",
    kwh: 4290.8,
    load: 84,
    co2: "58.4",
    saved: "Est. saving: ৳98k / mo",
    path: "M 0 52 Q 30 35, 60 38 T 120 26 T 180 40 T 240 25 T 300 32 T 360 28",
  },
  tower: {
    tab: "Corporate Tower",
    name: "Zenith Corporate Tower",
    meta: "4 Buildings • 12 Floors • 24 Meters",
    kwh: 1124.2,
    load: 61,
    co2: "15.2",
    saved: "Est. saving: ৳26k / mo",
    path: "M 0 72 Q 30 68, 60 55 T 120 60 T 180 42 T 240 48 T 300 38 T 360 45",
  },
};

const BENTO: {
  icon: LucideIcon;
  title: string;
  text: string;
  foot: React.ReactNode;
}[] = [
    {
      icon: Network,
      title: "Multi-Tenant Hierarchy",
      text: "Model complex portfolios with strict relational isolation from Organization down to individual sub-meters.",
      foot: (
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-volt">
          {["Org", "Building", "Floor", "Meter"].map((s, i) => (
            <span key={s} className="flex items-center gap-1.5">
              {i > 0 && <span>→</span>}
              <span className="rounded border border-volt/25 bg-volt/10 px-2 py-0.5">{s}</span>
            </span>
          ))}
        </div>
      ),
    },
    {
      icon: Database,
      title: "High-Volume Time-Series Engine",
      text: "Server-side rollups across hourly, daily and monthly intervals, with debounced search and pagination over 100,000+ readings.",
      foot: (
        <div className="flex items-center justify-between font-mono text-xs text-alabaster/60">
          <span>Server-Side Aggregation</span>
          <span className="font-bold text-volt">MongoDB</span>
        </div>
      ),
    },
    {
      icon: BellRing,
      title: "Threshold & Anomaly Detection",
      text: "Configure building and meter limits with automated High Usage and Unusual Consumption alerts, tracked through a full lifecycle.",
      foot: (
        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="rounded bg-volt px-2 py-0.5 font-bold text-midnight">New</span>
          <span className="text-alabaster/40">→</span>
          <span className="rounded border border-volt/30 bg-volt/15 px-2 py-0.5 text-volt">Acknowledged</span>
          <span className="text-alabaster/40">→</span>
          <span className="rounded bg-alabaster/10 px-2 py-0.5 text-alabaster/75">Resolved</span>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Access Control",
      text: "Organization isolation, department-scoped visibility and read-only viewer protection, enforced on the server.",
      foot: (
        <div className="flex items-center justify-between font-mono text-xs text-alabaster/60">
          <span>4 Governance Scopes</span>
          <span className="font-semibold text-volt">Org-isolated RBAC</span>
        </div>
      ),
    },
    {
      icon: Sparkles,
      title: "Energy Insights & Anomalies",
      text: "Pinpoint off-hours spikes, rank peak-load drivers and estimate CO₂e from your real consumption data.",
      foot: (
        <div className="flex items-center justify-between font-mono text-xs text-alabaster/60">
          <span>Statistical z-score detection</span>
          <span className="font-semibold text-volt">Saving tips</span>
        </div>
      ),
    },
    {
      icon: FileSpreadsheet,
      title: "Instant CSV & Audit Reporting",
      text: "Custom date-range reports by building, department, meter or day, plus streamed CSV export of raw records.",
      foot: (
        <div className="flex items-center justify-between font-mono text-xs text-alabaster/60">
          <span>1-Click Export</span>
          <span className="font-semibold text-volt">CSV</span>
        </div>
      ),
    },
  ];

type RbacKey = "admin" | "facility" | "department" | "viewer";

const RBAC: Record<
  RbacKey,
  { tab: string; scope: string; title: string; desc: string; caps: { label: string; status: string }[] }
> = {
  admin: {
    tab: "Organization Admin",
    scope: "SCOPE: ORGANIZATION-WIDE",
    title: "Organization Admin",
    desc: "Full administrative control over buildings, floors, departments, smart meters and user roles, with organization-wide analytics.",
    caps: [
      { label: "Create & Manage Buildings, Floors & Departments", status: "FULL ACCESS" },
      { label: "Register & Manage Smart Electricity Meters", status: "FULL ACCESS" },
      { label: "Manage Organization Users & Roles", status: "FULL ACCESS" },
      { label: "Organization-Wide Analytics & Cost Reports", status: "FULL ACCESS" },
    ],
  },
  facility: {
    tab: "Facility Manager",
    scope: "SCOPE: METERS, THRESHOLDS & ALERTS",
    title: "Facility Manager",
    desc: "Operational control over meters, consumption thresholds, anomaly alerts and energy reports.",
    caps: [
      { label: "Configure kWh Alert Thresholds", status: "WRITE ENABLED" },
      { label: "Acknowledge & Resolve Active Alerts", status: "WRITE ENABLED" },
      { label: "Register & Manage Meters", status: "WRITE ENABLED" },
      { label: "Manage Users & Organization Structure", status: "RESTRICTED" },
    ],
  },
  department: {
    tab: "Department Manager",
    scope: "SCOPE: AUTHORIZED DEPARTMENT",
    title: "Department Manager",
    desc: "Department-level visibility to track electricity cost, compare historical usage and find saving opportunities.",
    caps: [
      { label: "View Department Consumption & Costs", status: "SCOPED ACCESS" },
      { label: "Compare Historical Usage Trends", status: "SCOPED ACCESS" },
      { label: "Export Department CSV Reports", status: "ENABLED" },
      { label: "Other Departments or Meter Edits", status: "ISOLATED" },
    ],
  },
  viewer: {
    tab: "Viewer (Read-Only)",
    scope: "SCOPE: READ-ONLY",
    title: "Viewer (Read-Only)",
    desc: "Read-only access for auditors and stakeholders to inspect analytics and download reports.",
    caps: [
      { label: "Inspect Dashboards & Historical Charts", status: "READ-ONLY" },
      { label: "Review Cost & Carbon Metrics", status: "READ-ONLY" },
      { label: "Export CSV Reports", status: "READ-ONLY" },
      { label: "Modify Thresholds, Meters or Alerts", status: "LOCKED" },
    ],
  },
};

const PROFILES: Record<SectorKey, ChartProfile> = {
  university: { base: 52, amp: 15, f1: 0.6, f2: 1.25 },
  factory: { base: 48, amp: 10, f1: 0.8, f2: 1.7 },
  tower: { base: 62, amp: 11, f1: 0.5, f2: 1.1 },
};


/* ---------- page ---------- */

export default function HomeClient({ loggedIn }: { loggedIn: boolean }) {
  const [sector, setSector] = useState<SectorKey>("university");
  const [jitter, setJitter] = useState(0);
  const s = SECTORS[sector];

  const [rbac, setRbac] = useState<RbacKey>("admin");
  const r = RBAC[rbac];

  const [buildings, setBuildings] = useState(6);
  const [meters, setMeters] = useState(48);
  const [monthlyKwh, setMonthlyKwh] = useState(85000);

  useEffect(() => {
    const id = setInterval(() => setJitter((Math.random() - 0.48) * 16.5), 2500);
    return () => clearInterval(id);
  }, []);

  // Simulator (illustrative)
  const annualBaseline = monthlyKwh * 12;
  const densityBonus = Math.min(0.035, (meters / (buildings * 20)) * 0.035);
  const efficiency = 0.165 + densityBonus;
  const kwhSaved = Math.round(annualBaseline * efficiency);
  const optimized = annualBaseline - kwhSaved;
  const usdSaved = Math.round(kwhSaved * 0.14);
  const bdtM = ((usdSaved * 119.5) / 1_000_000).toFixed(2);
  const co2 = (kwhSaved * 0.000396).toFixed(1);

  const primaryHref = loggedIn ? "/dashboard" : "/login";
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <div className="hm-grid relative min-h-screen overflow-x-clip bg-midnight font-sans text-alabaster antialiased selection:bg-volt selection:text-midnight">
      {/* ambient orbs */}
      <div
        className="hm-orb pointer-events-none fixed -left-40 -top-40 z-0 h-[560px] w-[560px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.16) 0%, rgba(11,17,32,0) 70%)" }}
      />
      <div
        className="hm-orb-slow pointer-events-none fixed -right-48 top-1/3 z-0 h-[620px] w-[620px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(11,17,32,0) 70%)" }}
      />

      <HomeNavbar loggedIn={loggedIn} />

      {/* ============ HERO ============ */}
      <section id="top" className="relative overflow-hidden pb-20 pt-12 sm:pb-28 sm:pt-16 lg:pb-32 lg:pt-20">

        <HeroCircuit />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-10">
            {/* left */}
            <Reveal visible className="space-y-7 lg:col-span-7">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-volt/30 bg-volt/10 px-3.5 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-volt opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-volt" />
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-volt">
                  ClimateTech • Energy Intelligence Platform
                </span>
              </div>

              <h1 className={`${H} text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl xl:text-[3.65rem]`}>
                Enterprise-Scale <br className="hidden sm:block" />
                <span className="text-volt drop-shadow-[0_0_28px_rgba(16,185,129,0.35)]">Smart Energy Intelligence</span>{" "}
                <br className="hidden sm:block" />
                for Modern Facilities.
              </h1>

              <p className="max-w-2xl text-base leading-relaxed text-alabaster/70 sm:text-lg">
                Monitor, analyze and optimize electricity consumption across multi-building offices, factories,
                universities and commercial complexes, turning 100,000+ raw meter readings into cost and carbon insights.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <Link
                  href={primaryHref}
                  className={`hm-shimmer flex items-center gap-2 rounded-2xl bg-volt px-6 py-3.5 text-sm font-bold tracking-wide text-midnight shadow-[0_0_32px_rgba(16,185,129,0.42)] transition-all hover:brightness-105 active:scale-[0.98] ${H}`}
                >
                  <span>{loggedIn ? "Open Dashboard" : "Explore Live Demo"}</span>
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#architecture"
                  className="flex items-center gap-2 rounded-2xl border border-alabaster/15 bg-alabaster/[0.04] px-6 py-3.5 text-sm font-semibold transition-all hover:border-volt"
                >
                  <Layers size={16} className="text-volt" />
                  <span>View System Architecture</span>
                </a>
              </div>

              <div className="grid max-w-xl grid-cols-3 gap-4 border-t border-alabaster/10 pt-6 sm:gap-6">
                <div>
                  <div className="font-mono text-xl font-bold sm:text-2xl">
                    <Counter target={100000} suffix="+" />
                  </div>
                  <p className="mt-1 text-xs text-alabaster/55">Hourly Records Handled</p>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold text-volt sm:text-2xl">
                    <Counter target={4} />
                  </div>
                  <p className="mt-1 text-xs text-alabaster/55">Role-Based Workspaces</p>
                </div>
                <div>
                  <div className="font-mono text-xl font-bold sm:text-2xl">
                    <Counter target={3} />
                  </div>
                  <p className="mt-1 text-xs text-alabaster/55">Organizations in Demo</p>
                </div>
              </div>
            </Reveal>

            {/* right: telemetry card */}
            <Reveal visible delay={0.16} className="hm-perspective lg:col-span-5">
              <div className="hm-card hm-tilt relative rounded-3xl border-volt/30 p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-2 border-b border-alabaster/10 pb-4">
                  <div className="inline-flex w-full justify-between rounded-xl border border-alabaster/10 bg-alabaster/[0.04] p-1">
                    {(Object.keys(SECTORS) as SectorKey[]).map((k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => {
                          setSector(k);
                          setJitter(0);
                        }}
                        className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-[11px] transition-all ${sector === k
                          ? "bg-volt font-bold text-midnight shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                          : "font-semibold text-alabaster/65 hover:text-alabaster"
                          }`}
                      >
                        {SECTORS[k].tab}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-volt" />
                      <h2 className="truncate text-sm font-bold">{s.name}</h2>
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-alabaster/50">{s.meta}</p>
                  </div>
                  <span className="shrink-0 rounded-lg border border-volt/30 bg-volt/15 px-2.5 py-1 font-mono text-xs font-bold text-volt">
                    SAMPLE
                  </span>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-alabaster/10 bg-alabaster/[0.03] p-3.5">
                    <span className="mb-1 block text-[11px] text-alabaster/55">Live Load Stream</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-2xl font-bold">
                        {(s.kwh + jitter).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                      <span className="font-mono text-xs font-semibold text-volt">kWh</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-alabaster/10">
                      <div className="h-full rounded-full bg-volt transition-all duration-700" style={{ width: `${s.load}%` }} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-alabaster/10 bg-alabaster/[0.03] p-3.5">
                    <span className="mb-1 block text-[11px] text-alabaster/55">Monthly CO₂e</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-mono text-2xl font-bold text-volt">{s.co2}</span>
                      <span className="font-mono text-xs font-semibold">tCO₂e</span>
                    </div>
                    <div className="mt-2 font-mono text-[11px] text-alabaster/60">{s.saved}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-alabaster/10 bg-midnight/80 p-3.5">
                  <div className="mb-2 flex items-center justify-between font-mono text-[10px] text-alabaster/50">
                    <span>HOURLY LOAD CURVE</span>
                    <span className="text-volt">THRESHOLD SAFE</span>
                  </div>
                  <LiveChart profile={PROFILES[sector]} />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-alabaster/10 pt-3 font-mono text-[11px] text-alabaster/55">
                  <span>ILLUSTRATIVE PREVIEW</span>
                  <Link href={primaryHref} className="flex items-center gap-1 font-semibold text-volt hover:underline">
                    <span>Open Full Console</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============ BENTO ============ */}
      <section id="platform" className="relative border-t border-alabaster/10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-16 max-w-3xl space-y-4 text-center">
            <Pill icon={Cpu}>CORE INTELLIGENCE CAPABILITIES</Pill>
            <h2 className={`${H} text-3xl font-extrabold tracking-tight sm:text-4xl`}>
              Built for High-Density Commercial &amp; Industrial Telemetry
            </h2>
            <p className="text-sm leading-relaxed text-alabaster/65 sm:text-base">
              Every module ingests large volumes of time-series meter records and surfaces actionable energy-saving
              opportunities across your whole facility hierarchy.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {BENTO.map((b, i) => (
              <Reveal key={b.title} delay={(i % 3) * 0.08}>
                <div className="hm-card group flex h-full flex-col justify-between rounded-3xl p-6 sm:p-7">
                  <div className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-volt/35 bg-volt/15 transition-transform group-hover:scale-110">
                      <b.icon size={24} className="text-volt" />
                    </div>
                    <h3 className={`${H} text-lg font-bold`}>{b.title}</h3>
                    <p className="text-sm leading-relaxed text-alabaster/65">{b.text}</p>
                  </div>
                  <div className="mt-6 border-t border-alabaster/10 pt-4">{b.foot}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SIMULATOR ============ */}
      <section id="analytics-preview" className="relative border-t border-alabaster/10 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="hm-card rounded-[2rem] border-volt/25 p-6 sm:p-10 lg:p-12">
              <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
                <div className="space-y-7 lg:col-span-6">
                  <div className="space-y-3">
                    <Pill icon={SlidersHorizontal}>INTERACTIVE ROI &amp; CARBON SIMULATOR</Pill>
                    <h2 className={`${H} text-2xl font-extrabold sm:text-3xl lg:text-4xl`}>
                      Model Your Facility&apos;s Savings Potential
                    </h2>
                    <p className="text-sm leading-relaxed text-alabaster/65">
                      Adjust your infrastructure scale to get an illustrative estimate of annual kWh reduction, bill
                      savings and CO₂e avoided.
                    </p>
                  </div>

                  {[
                    {
                      label: "Managed Buildings / Plants",
                      value: `${buildings} Building${buildings === 1 ? "" : "s"}`,
                      min: 1, max: 25, step: 1, v: buildings, set: setBuildings,
                    },
                    {
                      label: "Connected Smart Meters",
                      value: `${meters} Meters`,
                      min: 10, max: 250, step: 2, v: meters, set: setMeters,
                    },
                    {
                      label: "Monthly Baseline Electricity (kWh)",
                      value: `${fmt(monthlyKwh)} kWh`,
                      min: 15000, max: 500000, step: 5000, v: monthlyKwh, set: setMonthlyKwh,
                    },
                  ].map((sl) => (
                    <div key={sl.label} className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-alabaster/80">{sl.label}</span>
                        <span className="rounded-lg border border-volt/25 bg-volt/10 px-2.5 py-0.5 font-mono text-sm font-bold text-volt">
                          {sl.value}
                        </span>
                      </div>
                      <input
                        type="range"
                        className="hm-slider"
                        min={sl.min}
                        max={sl.max}
                        step={sl.step}
                        value={sl.v}
                        onChange={(e) => sl.set(Number(e.target.value))}
                        aria-label={sl.label}
                      />
                    </div>
                  ))}
                </div>

                <div className="lg:col-span-6">
                  <div className="space-y-6 rounded-3xl border border-volt/35 bg-midnight/90 p-6 shadow-[0_0_40px_rgba(16,185,129,0.14)] sm:p-8">
                    <div className="flex items-center justify-between gap-3 border-b border-alabaster/10 pb-4">
                      <span className="font-mono text-xs uppercase tracking-wider text-alabaster/60">Projected Annual Impact</span>
                      <span className="rounded-full bg-volt/15 px-2.5 py-1 font-mono text-xs font-bold text-volt">
                        {(efficiency * 100).toFixed(1)}% est. gain
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-alabaster/10 bg-alabaster/[0.03] p-4">
                        <span className="block text-[11px] text-alabaster/55">Annual kWh Saved</span>
                        <span className="mt-1 block font-mono text-xl font-bold sm:text-2xl">{fmt(kwhSaved)}</span>
                        <span className="font-mono text-[11px] text-volt">kWh / yr</span>
                      </div>
                      <div className="rounded-2xl border border-volt/30 bg-alabaster/[0.03] p-4">
                        <span className="block text-[11px] text-alabaster/55">Est. Cost Savings</span>
                        <span className="mt-1 block font-mono text-xl font-bold text-volt sm:text-2xl">${fmt(usdSaved)}</span>
                        <span className="font-mono text-[11px] text-alabaster/65">≈ ৳{bdtM}M BDT</span>
                      </div>
                      <div className="rounded-2xl border border-alabaster/10 bg-alabaster/[0.03] p-4">
                        <span className="block text-[11px] text-alabaster/55">Carbon Reduced</span>
                        <span className="mt-1 block font-mono text-xl font-bold sm:text-2xl">{co2}</span>
                        <span className="font-mono text-[11px] text-volt">tCO₂e / yr</span>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-alabaster/10 bg-alabaster/[0.02] p-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="text-alabaster/60">Unoptimized Annual Draw</span>
                          <span className="text-alabaster/80">{fmt(annualBaseline)} kWh</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-alabaster/10">
                          <div className="h-full w-full rounded-full bg-alabaster/35" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between font-mono text-xs">
                          <span className="font-semibold text-volt">With Optimization</span>
                          <span className="font-bold text-volt">{fmt(optimized)} kWh</span>
                        </div>
                        <div className="h-3 w-full overflow-hidden rounded-full bg-alabaster/10">
                          <div
                            className="h-full rounded-full bg-volt shadow-[0_0_16px_rgba(16,185,129,0.6)] transition-all duration-500"
                            style={{ width: `${(100 - efficiency * 100).toFixed(1)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-alabaster/50">Illustrative estimate @ $0.14/kWh</span>
                      <Link href={primaryHref} className="flex items-center gap-1 text-xs font-bold text-volt hover:underline">
                        <span>See real data in the demo</span>
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ RBAC ============ */}
      <section id="roles-rbac" className="relative border-t border-alabaster/10 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-12 max-w-2xl space-y-3 text-center">
            <Pill icon={Lock}>MULTI-TENANT RBAC ARCHITECTURE</Pill>
            <h2 className={`${H} text-3xl font-extrabold sm:text-4xl`}>Four Purpose-Built Governance Scopes</h2>
            <p className="text-sm text-alabaster/65 sm:text-base">
              Data integrity and operational permissions enforced across executives, engineers, unit heads and auditors.
            </p>
          </Reveal>

          <Reveal className="mb-8 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {(Object.keys(RBAC) as RbacKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRbac(k)}
                className={`cursor-pointer rounded-2xl px-4 py-2.5 text-xs transition-all sm:px-5 sm:text-sm ${rbac === k
                  ? "bg-volt font-bold text-midnight shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                  : "border border-alabaster/15 bg-alabaster/[0.04] font-semibold text-alabaster/75 hover:border-volt"
                  }`}
              >
                {RBAC[k].tab}
              </button>
            ))}
          </Reveal>

          <Reveal>
            <div className="hm-card rounded-3xl border-volt/25 p-6 sm:p-9">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
                <div className="space-y-4 lg:col-span-5">
                  <div className="inline-flex items-center gap-2 rounded-lg border border-volt/30 bg-volt/15 px-3 py-1 font-mono text-xs font-bold text-volt">
                    {r.scope}
                  </div>
                  <h3 className={`${H} text-2xl font-bold`}>{r.title}</h3>
                  <p className="text-sm leading-relaxed text-alabaster/70">{r.desc}</p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 rounded-xl border border-volt/40 bg-alabaster/[0.05] px-4 py-2.5 text-xs font-bold text-volt transition-all hover:bg-volt hover:text-midnight"
                  >
                    <span>Sign In with Demo Credentials</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="lg:col-span-7">
                  <div className="space-y-3 rounded-2xl border border-alabaster/10 bg-midnight/85 p-5">
                    <div className="flex items-center justify-between border-b border-alabaster/10 pb-2 font-mono text-[11px] text-alabaster/50">
                      <span>CAPABILITY &amp; SECURITY BOUNDARY</span>
                      <span>ACCESS LEVEL</span>
                    </div>
                    <div className="space-y-2.5">
                      {r.caps.map((c) => {
                        const locked = ["RESTRICTED", "ISOLATED", "LOCKED"].includes(c.status);
                        return (
                          <div
                            key={c.label}
                            className="flex items-center justify-between gap-3 rounded-xl border border-alabaster/10 bg-alabaster/[0.02] p-3"
                          >
                            <span className="text-xs font-medium text-alabaster/85 sm:text-sm">{c.label}</span>
                            <span
                              className={`shrink-0 rounded-md px-2.5 py-0.5 font-mono text-[10px] font-bold ${locked
                                ? "border border-alabaster/15 bg-alabaster/10 text-alabaster/50"
                                : "border border-volt/35 bg-volt/15 text-volt"
                                }`}
                            >
                              {c.status}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>


      {/* ============ CTA + FOOTER ============ */}
      <footer id="architecture" className="relative scroll-mt-20 pb-12 pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="hm-card relative mb-16 overflow-hidden rounded-[2rem] border-volt/35 p-8 text-center sm:p-12 lg:p-14">
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.2) 0%, rgba(11,17,32,0) 70%)" }}
              />
              <div className="relative z-10 mx-auto max-w-2xl space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-volt/30 bg-volt/15 px-3 py-1 font-mono text-xs font-semibold text-volt">
                  ZERO-WASTE INFRASTRUCTURE
                </span>
                <h2 className={`${H} text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl`}>
                  Ready to Decarbonize &amp; Optimize Your Infrastructure?
                </h2>
                <p className="text-sm leading-relaxed text-alabaster/70 sm:text-base">
                  Explore smart meter data, role-based governance and automated peak-load insights in the live workspace.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <Link
                    href={primaryHref}
                    className={`hm-shimmer flex items-center gap-2 rounded-2xl bg-volt px-7 py-3.5 text-sm font-bold tracking-wide text-midnight shadow-[0_0_32px_rgba(16,185,129,0.42)] transition-all hover:brightness-105 ${H}`}
                  >
                    <span>{loggedIn ? "Open Dashboard" : "Launch Live Dashboard"}</span>
                    <ArrowUpRight size={16} />
                  </Link>
                  {!loggedIn && (
                    <Link
                      href="/register"
                      className="rounded-2xl border border-alabaster/20 bg-alabaster/[0.05] px-7 py-3.5 text-sm font-semibold transition-all hover:border-volt"
                    >
                      Provision Organization
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </Reveal>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-alabaster/10 pt-8 text-xs text-alabaster/50 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-volt/35 bg-volt/15">
                <Zap size={14} className="text-volt" />
              </div>
              <span className={`${H} font-bold text-alabaster`}>WattWise</span>
              <span className="font-mono text-[11px]">© 2026 Energy Intelligence Platform</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-mono text-[11px]">
              <a href="#platform" className="transition-colors hover:text-volt">Platform</a>
              <a href="#analytics-preview" className="transition-colors hover:text-volt">ROI Simulator</a>
              <a href="#roles-rbac" className="transition-colors hover:text-volt">RBAC</a>
              <Link href="/login" className="transition-colors hover:text-volt">Login</Link>
              <Link href="/register" className="transition-colors hover:text-volt">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}