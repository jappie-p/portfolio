import { useId } from "react";
import { between, rng } from "./layout";

type Shape = { vb: [number, number]; body: string; rib: string; veins?: string };

/** Three leaf outlines, stem on the left (or top), drawn in their own box. */
const SHAPES: Shape[] = [
  {
    vb: [100, 44],
    body: "M4 22C14 6 46 0 72 6C86 9 95 16 99 22C95 28 86 35 72 38C46 44 14 38 4 22Z",
    rib: "M1 22C36 20.5 66 20.5 97 22",
    veins: "M24 21C30 14 36 11 42 9M42 21C49 13 56 10 62 8M60 21C66 15 72 12 78 11M24 23C30 30 36 33 42 35M42 23C49 31 56 34 62 36M60 23C66 29 72 32 78 33",
  },
  {
    vb: [100, 26],
    body: "M3 13C25 1 70 1 99 13C70 25 25 25 3 13Z",
    rib: "M1 13L96 13",
  },
  {
    vb: [80, 72],
    body: "M40 13C30 1 6 3 4 25C2 45 22 61 40 70C58 61 78 45 76 25C74 3 50 1 40 13Z",
    rib: "M40 13C41 31 41 49 40 67",
    veins: "M40 30C32 26 24 26 16 30M40 30C48 26 56 26 64 30M40 46C33 43 26 44 20 48M40 46C47 43 54 44 60 48",
  },
];

// light catches them lime on the lamp side, deep green in the shade
const HUES = [
  ["#a3d84e", "#4a9a3e", "#1f5530"],
  ["#62a94d", "#2b6a3a", "#143d27"],
  ["#7cc08e", "#2f7560", "#15423a"],
];

/** A drifting leaf. Positions and paths are fractions of the panel, resolved
 *  by the scene; depth sets size, blur and how fast it seems to fall. */
export type LeafSpec = {
  shape: number;
  hue: number;
  size: number;
  blur: number;
  opacity: number;
  lane: number;
  drift: number;
  period: number;
  offset: number;
  spin: number;
  tumble: number;
  phase: number;
  tilt: number;
};

export const DRIFTERS: LeafSpec[] = (() => {
  const r = rng(58);
  const depths = [
    { size: [26, 34], blur: 1.2, opacity: 0.55, period: [44, 56] },
    { size: [44, 62], blur: 0, opacity: 0.95, period: [30, 40] },
    { size: [88, 112], blur: 3.6, opacity: 0.5, period: [22, 28] },
  ];
  const plan = [0, 1, 0, 1, 2, 1, 0, 1, 0, 2, 1, 1];
  return plan.map((d, i) => {
    const dp = depths[d];
    return {
      shape: i % 3,
      // the ones right by the lens are in shade
      hue: d === 2 ? 1 : (i * 2) % 3,
      size: between(r, dp.size[0], dp.size[1]),
      blur: dp.blur,
      opacity: dp.opacity,
      lane: between(r, 0, 1),
      drift: between(r, 0.08, 0.2),
      period: between(r, dp.period[0], dp.period[1]),
      offset: i / plan.length + between(r, -0.04, 0.04),
      spin: between(r, 0.18, 0.4),
      tumble: between(r, 0.25, 0.6),
      phase: r() * 6.28,
      tilt: between(r, -40, 40),
    };
  });
})();

function Leaf({ spec, id }: { spec: LeafSpec; id: string }) {
  const s = SHAPES[spec.shape];
  const [a, b, c] = HUES[spec.hue];
  const h = (spec.size * s.vb[1]) / s.vb[0];
  const pad = spec.blur * 3;
  return (
    <svg
      width={spec.size + pad * 2}
      height={h + pad * 2}
      viewBox={`${-pad * (s.vb[0] / spec.size)} ${-pad * (s.vb[0] / spec.size)} ${s.vb[0] + (pad * 2 * s.vb[0]) / spec.size} ${s.vb[1] + (pad * 2 * s.vb[0]) / spec.size}`}
      className="block overflow-visible"
    >
      <defs>
        <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="0.5" stopColor={b} />
          <stop offset="1" stopColor={c} />
        </linearGradient>
        {spec.blur > 0 && (
          <filter id={`${id}f`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={(spec.blur * s.vb[0]) / spec.size} />
          </filter>
        )}
      </defs>
      <g filter={spec.blur > 0 ? `url(#${id}f)` : undefined}>
        <path d={s.body} fill={`url(#${id}g)`} />
        <path d={s.rib} fill="none" stroke="rgba(214,240,160,0.5)" strokeWidth={s.vb[0] / 60} strokeLinecap="round" />
        {s.veins && <path d={s.veins} fill="none" stroke="rgba(214,240,160,0.22)" strokeWidth={s.vb[0] / 110} strokeLinecap="round" />}
      </g>
    </svg>
  );
}

// Monstera: a broad heart of a leaf, tip down, split from the margin almost
// to the midrib along curving veins, with a few holes by the rib.
const MONSTERA = "M100 24C70 4 18 14 8 66C-2 120 34 178 100 214C166 178 202 120 192 66C182 14 130 4 100 24Z";
// each split: from near the rib, bending out past the margin (x0 y0 cx cy x1 y1)
const SPLIT_L = [
  [90, 50, 50, 46, 0, 60],
  [90, 78, 46, 80, -6, 100],
  [90, 108, 50, 116, 2, 148],
  [92, 138, 62, 152, 28, 190],
  [95, 166, 80, 182, 62, 208],
];
const SPLITS = [...SPLIT_L, ...SPLIT_L.map(([a, b, c, d, e, f]) => [200 - a, b, 200 - c, d, 200 - e, f])].map(
  ([a, b, c, d, e, f]) => `M${a} ${b}Q${c} ${d} ${e} ${f}`,
);
const HOLES = [
  [78, 64],
  [76, 94],
  [79, 124],
  [122, 64],
  [124, 94],
  [121, 124],
];

/** A big monstera leaf, so close to the lens it is a soft dark shape with
 *  lamplight on its rim: it frames a corner of the room. */
function Monstera({ id, blur }: { id: string; blur: number }) {
  return (
    <svg viewBox="-10 -4 220 228" className="block h-full w-full overflow-visible">
      <defs>
        <linearGradient id={`${id}m`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#123a26" />
          <stop offset="0.55" stopColor="#0a2519" />
          <stop offset="1" stopColor="#061810" />
        </linearGradient>
        <mask id={`${id}k`} maskUnits="userSpaceOnUse" x="-10" y="-4" width="220" height="228">
          <path d={MONSTERA} fill="#fff" />
          <g stroke="#000" strokeWidth="6" strokeLinecap="round" fill="none">
            {SPLITS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <g fill="#000">
            {HOLES.map(([x, y]) => (
              <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="4.5" ry="8" />
            ))}
          </g>
        </mask>
        <filter id={`${id}b`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      <g filter={`url(#${id}b)`}>
        <g mask={`url(#${id}k)`}>
          <path d={MONSTERA} fill={`url(#${id}m)`} />
          {/* lamplight catching the rim */}
          <path d={MONSTERA} fill="none" stroke="rgba(163,216,78,0.3)" strokeWidth="4" />
        </g>
        <path d="M100 26C101 90 101 150 100 206" stroke="rgba(140,198,63,0.22)" strokeWidth="3" fill="none" />
      </g>
    </svg>
  );
}

/** The SVG layer: two out-of-focus monsteras in the corners and the drifting
 *  leaves. The scene moves them (data-leaf / data-frond) with transforms only. */
export function Leaves() {
  const id = useId().replace(/:/g, "");
  return (
    <div className="absolute inset-0">
      <div data-frond="0" className="absolute" style={{ left: "-12%", bottom: "-20%", width: "30%", aspectRatio: "1", transformOrigin: "50% 50%", rotate: "-138deg", willChange: "transform" }}>
        <Monstera id={`${id}a`} blur={3.2} />
      </div>
      <div data-frond="1" className="absolute" style={{ left: "-8%", top: "-15%", width: "22%", aspectRatio: "1", transformOrigin: "50% 50%", rotate: "-36deg", willChange: "transform" }}>
        <Monstera id={`${id}b`} blur={4} />
      </div>
      {DRIFTERS.map((spec, i) => (
        <div key={i} data-leaf={i} className="absolute left-0 top-0" style={{ opacity: 0, willChange: "transform, opacity" }}>
          <Leaf spec={spec} id={`${id}l${i}`} />
        </div>
      ))}
    </div>
  );
}
