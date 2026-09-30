import { WORLD_DOTS, projectLatLon } from "@/data/world-dots";

const { width: W, height: H, step: STEP, viewBox, d } = WORLD_DOTS;

// Utrecht marker geometry, in the same viewBox pixel space as the dot grid.
// Region only (a city-level lat/lon), never a street address.
const [MARKER_X, MARKER_Y] = projectLatLon(52.09, 5.12);
const DOT_WIDTH = +(STEP * 0.55).toFixed(2);
const SPOTLIGHT_R = Math.round((W * 24) / 360); // fade radius, roughly Europe's width
const CORE_R = +(STEP * 0.6).toFixed(1);
const GLOW_R = +(CORE_R * 4.2).toFixed(1);

// The leader line points down-right: Utrecht sits near the top of the crop
// (Europe is close to the map's northern edge), so there is little room to
// aim the label chip upward without crowding the edge.
const LEAD_DX = Math.round(W * 0.038);
const LEAD_DY = Math.round(H * 0.085);
const LABEL_X = MARKER_X + LEAD_DX;
const LABEL_Y = MARKER_Y + LEAD_DY;
const LABEL_LEFT_PCT = +((LABEL_X / W) * 100).toFixed(2);
const LABEL_TOP_PCT = +((LABEL_Y / H) * 100).toFixed(2);

/** A quiet dot-grid world map (Natural Earth land, sampled to one SVG path
 *  for the whole grid) with a glowing marker on Utrecht. Pure SVG + CSS: no
 *  client JS, reduced motion is handled with a media query. */
export function WorldMap({ label, alt, className = "" }: { label: string; alt: string; className?: string }) {
  return (
    <figure className={`relative m-0 w-full ${className}`} style={{ aspectRatio: `${W} / ${H}` }}>
      <svg viewBox={viewBox} className="block h-auto w-full" role="img" aria-label={alt}>
        <defs>
          <radialGradient id="world-map-spotlight" gradientUnits="userSpaceOnUse" cx={MARKER_X} cy={MARKER_Y} r={SPOTLIGHT_R}>
            <stop offset="0%" stopColor="#4ade80" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#4ade80" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
          </radialGradient>
          <filter id="world-map-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation={CORE_R * 1.6} />
          </filter>
        </defs>

        {/* Base grid, then the same path again tinted by a radial gradient
            centered on Utrecht: one extra node lights up the neighbourhood
            instead of styling any dot individually. */}
        <path d={d} stroke="rgba(166,180,191,0.26)" strokeWidth={DOT_WIDTH} strokeLinecap="round" fill="none" />
        <path d={d} stroke="url(#world-map-spotlight)" strokeWidth={DOT_WIDTH} strokeLinecap="round" fill="none" />

        <line
          x1={MARKER_X}
          y1={MARKER_Y}
          x2={LABEL_X}
          y2={LABEL_Y}
          stroke="#4ade80"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          opacity={0.8}
        />

        <circle cx={MARKER_X} cy={MARKER_Y} r={GLOW_R} fill="#4ade80" opacity={0.28} filter="url(#world-map-glow)" />
        <circle className="wm-ring" cx={MARKER_X} cy={MARKER_Y} r={CORE_R} fill="none" stroke="#4ade80" strokeWidth={1.4} />
        <circle className="wm-ring wm-ring-delay" cx={MARKER_X} cy={MARKER_Y} r={CORE_R} fill="none" stroke="#4ade80" strokeWidth={1.4} />
        <circle cx={MARKER_X} cy={MARKER_Y} r={CORE_R} fill="#4ade80" />
      </svg>

      <div
        className="label pointer-events-none absolute flex -translate-y-1/2 translate-x-[10px] items-center gap-1.5 whitespace-nowrap text-[11px] tracking-[0.2em] text-ink-dim"
        style={{ left: `${LABEL_LEFT_PCT}%`, top: `${LABEL_TOP_PCT}%` }}
      >
        <span
          className="rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(13,19,28,0.72)] px-2.5 py-1 flex items-center gap-1.5"
        >
          <span aria-hidden className="h-[5px] w-[5px] flex-none rounded-full bg-leaf shadow-[0_0_6px_rgba(74,222,128,0.9)]" />
          {label}
        </span>
      </div>

      <style>{`
        .wm-ring {
          transform-box: fill-box;
          transform-origin: center;
          animation: wm-pulse 2.6s ease-out infinite;
          opacity: 0;
        }
        .wm-ring-delay { animation-delay: 1.3s; }
        @keyframes wm-pulse {
          0% { transform: scale(1); opacity: 0.55; }
          70% { opacity: 0.12; }
          100% { transform: scale(6.5); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wm-ring { animation: none; opacity: 0.22; transform: scale(2.4); }
        }
      `}</style>
    </figure>
  );
}
