"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

export type ChartProfile = { base: number; amp: number; f1: number; f2: number };

const W = 360;
const H = 90;
const N = 36; // visible points
const STEP = W / (N - 1);
const TICK = 800; // ms per new reading
const DT = 0.32;

function sample(t: number, p: ChartProfile) {
  const v =
    p.base +
    p.amp * Math.sin(t * p.f1) +
    p.amp * 0.5 * Math.sin(t * p.f2 + 1.3) +
    1.8 * Math.sin(t * 5.3);
  return Math.min(80, Math.max(28, v)); // threshold line (y=22) kokhono cross hoy na
}

const initial = (p: ChartProfile) => Array.from({ length: N + 1 }, (_, i) => sample(i * DT, p));

export default function LiveChart({ profile }: { profile: ChartProfile }) {
  const [pts, setPts] = useState<number[]>(() => initial(profile));
  const profileRef = useRef(profile);
  const ptsRef = useRef(pts);
  const tRef = useRef((N + 1) * DT);
  const lastRef = useRef(0);
  const groupRef = useRef<SVGGElement>(null);
  const dotRef = useRef<SVGGElement>(null);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Notun reading ashe, purono ta bam dike soriye jay
  useEffect(() => {
    const id = setInterval(() => {
      const next = sample(tRef.current, profileRef.current);
      tRef.current += DT;
      setPts((prev) => [...prev.slice(1), next]);
    }, TICK);
    return () => clearInterval(id);
  }, []);

  // Notun data render hole transform reset (glitch chhara)
  useLayoutEffect(() => {
    ptsRef.current = pts;
    lastRef.current = performance.now();
    groupRef.current?.setAttribute("transform", "translate(0 0)");
    dotRef.current?.setAttribute("transform", `translate(${W} ${pts[N - 1].toFixed(2)})`);
  }, [pts]);

  // Smooth scroll (60fps)
  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const p = Math.min(1, (now - lastRef.current) / TICK);
      const arr = ptsRef.current;
      groupRef.current?.setAttribute("transform", `translate(${(-p * STEP).toFixed(2)} 0)`);
      const y = arr[N - 1] + (arr[N] - arr[N - 1]) * p;
      dotRef.current?.setAttribute("transform", `translate(${W} ${y.toFixed(2)})`);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const line = pts.map((y, i) => `${i === 0 ? "M" : "L"}${(i * STEP).toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${(N * STEP).toFixed(1)} ${H} L0 ${H} Z`;

  return (
    <svg className="h-24 w-full text-alabaster" viewBox={`0 0 ${W + 12} ${H}`} fill="none" role="img" aria-label="Live load curve (illustrative)">
      <defs>
        <linearGradient id="wh-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="wh-scan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0" />
          <stop offset="60%" stopColor="#10B981" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <clipPath id="wh-clip">
          <rect x="0" y="0" width={W} height={H} />
        </clipPath>
      </defs>

      {[45, 68].map((y) => (
        <line key={y} x1="0" x2={W} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.1" />
      ))}
      <line x1="0" y1="22" x2={W} y2="22" stroke="rgba(16,185,129,0.5)" strokeWidth="1" strokeDasharray="4 4" />

      <g clipPath="url(#wh-clip)">
        <g ref={groupRef}>
          <path d={area} fill="url(#wh-fill)" />
          <path
            d={line}
            stroke="#10B981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0 0 5px rgba(16,185,129,0.7))" }}
          />
        </g>
        <rect className="hm-scan" x="0" y="0" width="70" height={H} fill="url(#wh-scan)" />
      </g>

      <g ref={dotRef}>
        <circle r="8" fill="#10B981" opacity="0.2">
          <animate attributeName="r" values="4;12;4" dur="1.6s" repeatCount="indefinite" />
        </circle>
        <circle r="3.6" fill="#10B981" className="stroke-midnight" strokeWidth="1.5" />
      </g>
    </svg>
  );
}