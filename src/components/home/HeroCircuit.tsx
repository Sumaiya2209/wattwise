const P1 = "M -40 160 H 320 L 410 250 H 780 L 860 330 H 1480";
const P2 = "M -40 580 H 240 L 340 480 H 720 L 820 380 H 1480";
const P3 = "M 680 -20 V 190 L 760 270 V 540 L 660 640 V 860";

const NODES: [number, number][] = [
  [320, 160], [410, 250], [780, 250], [860, 330],
  [240, 580], [340, 480], [720, 480], [820, 380],
  [680, 190], [760, 540],
];

export default function HeroCircuit() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 820"
      fill="none"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <filter id="wh-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="wh-trace" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F8FAFC" stopOpacity="0.03" />
          <stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.03" />
        </linearGradient>
      </defs>

      {/* dim base wires */}
      {[P1, P2, P3].map((p) => (
        <path key={p} d={p} stroke="url(#wh-trace)" strokeWidth="1.5" />
      ))}

      {/* current packets */}
      <path d={P1} stroke="#10B981" strokeWidth="2" strokeLinecap="round" className="hm-packet" filter="url(#wh-glow)" />
      <path d={P2} stroke="#10B981" strokeWidth="2" strokeLinecap="round" className="hm-packet" filter="url(#wh-glow)" />
      <path d={P3} stroke="#10B981" strokeWidth="2" strokeLinecap="round" className="hm-packet" filter="url(#wh-glow)" />

      {/* glowing electrons travelling along the wires */}
      <circle r="4" fill="#F8FAFC" filter="url(#wh-glow)">
        <animateMotion dur="6.5s" repeatCount="indefinite" path={P1} />
      </circle>
      <circle r="4" fill="#F8FAFC" filter="url(#wh-glow)">
        <animateMotion dur="8s" begin="1.5s" repeatCount="indefinite" path={P2} />
      </circle>
      <circle r="3.5" fill="#F8FAFC" filter="url(#wh-glow)">
        <animateMotion dur="7s" begin="0.8s" repeatCount="indefinite" path={P3} />
      </circle>

      {/* pulsing junction nodes */}
      {NODES.map(([x, y], i) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="4" fill="none" stroke="#10B981" strokeWidth="1.5">
            <animate attributeName="r" values="4;18" dur="2.8s" begin={`${(i * 0.37).toFixed(2)}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.65;0" dur="2.8s" begin={`${(i * 0.37).toFixed(2)}s`} repeatCount="indefinite" />
          </circle>
          <circle cx={x} cy={y} r="4" fill="#0B1120" stroke="#10B981" strokeWidth="2" />
        </g>
      ))}
    </svg>
  );
}