"use client";
import { useEffect, useId, useState } from "react";
import type { DiagramId } from "@/data/projects";
import { DIAGRAMS, type DiagramNode } from "@/data/diagrams";
import { useT } from "@/i18n/useT";

const W = 560;
const H = 400;
const HUB = { x: W / 2, y: H / 2, r: 54 };
const PAD = 40;
const BOX_H = 38;

const boxWidth = (label: string) => Math.min(156, Math.max(84, label.length * 7.6 + 30));
const rowY = (i: number, n: number) => PAD + ((i + 0.5) * (H - PAD * 2)) / n;

type Node = { key: string; label: string; x: number; y: number; w: number; side: "in" | "out" };

/** How a project fits together: the inputs on the left flow into the hub and
 *  the results flow out to the right, with packets riding the wires. Pure SVG
 *  (SMIL for the packets), no canvas. */
export function SystemDiagram({ id, className = "" }: { id: DiagramId; className?: string }) {
  const t = useT();
  const uid = useId().replace(/:/g, "");
  const [still, setStill] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStill(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const def = DIAGRAMS[id];
  const copy = t.diagrams[id];
  const label = (k: string) => (copy.nodes as Record<DiagramNode<typeof id>, string>)[k as DiagramNode<typeof id>];

  const side = (keys: readonly string[], s: "in" | "out"): Node[] => {
    const w = Math.max(...keys.map((k) => boxWidth(label(k))));
    return keys.map((key, i) => ({
      key,
      label: label(key),
      w,
      y: rowY(i, keys.length),
      x: s === "in" ? 12 + w / 2 : W - 12 - w / 2,
      side: s,
    }));
  };
  const nodes = [...side(def.in, "in"), ...side(def.out, "out")];

  const wire = (n: Node) => {
    const [ax, ay, bx, by] =
      n.side === "in" ? [n.x + n.w / 2, n.y, HUB.x - HUB.r + 4, HUB.y] : [HUB.x + HUB.r - 4, HUB.y, n.x - n.w / 2, n.y];
    const mx = (ax + bx) / 2;
    return `M ${ax} ${ay} C ${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`;
  };

  const summary = `${t.work.architecture}: ${def.in.map(label).join(", ")} → ${copy.hub} → ${def.out.map(label).join(", ")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`w-full max-w-xl ${className}`} role="img" aria-label={summary}>
      <defs>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </radialGradient>
      </defs>
      {nodes.map((n, i) => (
        <g key={`w-${n.key}`}>
          <path id={`${uid}-${n.key}`} d={wire(n)} fill="none" stroke="rgba(94,234,212,0.2)" strokeWidth="1.5" />
          <path d={wire(n)} fill="none" stroke="rgba(74,222,128,0.5)" strokeWidth="1.5" className="flow-dash" />
          {!still &&
            [0, 1].map((k) => (
              <circle key={k} r="3.5" fill={n.side === "in" ? "#5eead4" : "#4ade80"} className="flow-packet">
                <animateMotion dur="2.6s" repeatCount="indefinite" begin={`${i * 0.4 + k * 1.3}s`}>
                  <mpath href={`#${uid}-${n.key}`} />
                </animateMotion>
              </circle>
            ))}
        </g>
      ))}
      <circle cx={HUB.x} cy={HUB.y} r="100" fill={`url(#${uid}-glow)`} className="flow-hub-glow" />
      <polygon
        points={Array.from({ length: 6 }, (_, i) => {
          const a = Math.PI / 6 + (i * Math.PI) / 3;
          return `${HUB.x + Math.cos(a) * HUB.r},${HUB.y + Math.sin(a) * HUB.r}`;
        }).join(" ")}
        fill="rgba(8,14,20,0.92)"
        stroke="#4ade80"
        strokeWidth="2"
      />
      <text x={HUB.x} y={HUB.y + 5} textAnchor="middle" className="fill-ink text-[15px] font-semibold">
        {copy.hub}
      </text>
      {nodes.map((n) => (
        <g key={`n-${n.key}`}>
          <rect x={n.x - n.w / 2} y={n.y - BOX_H / 2} width={n.w} height={BOX_H} rx="12" fill="rgba(13,19,28,0.9)" stroke="rgba(255,255,255,0.16)" />
          <text x={n.x} y={n.y + 5} textAnchor="middle" className="fill-ink-dim text-[14px]">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
