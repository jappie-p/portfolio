import { lerp, smoothstep } from "./math";
import { C, LIGHTS, S, V, W, mix, rgba } from "./palette";
import type { Fixture, FixtureKind } from "./stage";
import { DROP, PHRASE, kick } from "./tempo";

export type Beam = { x: number; y: number; angle: number; spread: number; power: number; color: number };

// Where a group points, as -1..1 of its range, for a fixture at u (-1..1).
// A new pattern (and look) takes over on every drop.
type Pattern = (u: number, beat: number) => number;
const PATTERNS: Pattern[] = [
  (u, b) => u * (0.62 + 0.38 * Math.sin((Math.PI * b) / 4)),
  (u, b) => 0.8 * Math.sin((Math.PI * b) / 8) + 0.14 * u,
  (u, b) => u * Math.cos((Math.PI * b) / 4),
  (u, b) => 0.72 * Math.sin((Math.PI * b) / 4 - u * 2.4),
];

const RANGE: Record<FixtureKind, number> = { roof: 0.8, deck: 1.05, tower: 0.26 };
const SPREAD: Record<FixtureKind, number> = { roof: 0.018, deck: 0.04, tower: 0.05 };
const POWER: Record<FixtureKind, number> = { roof: 1, deck: 0.8, tower: 0.7 };

/** Colour pairs per phrase for even and odd fixtures, indices into LIGHTS. */
const LOOKS = [
  { roof: [W, S], deck: [V, C], tower: S },
  { roof: [V, W], deck: [C, V], tower: C },
  { roof: [C, S], deck: [V, S], tower: W },
  { roof: [S, V], deck: [C, W], tower: V },
] as const;

const phraseOf = (beat: number) => Math.floor((beat - DROP) / PHRASE);
const mod = (n: number, m: number) => ((n % m) + m) % m;

/** The two colours leading right now: they tint the crowd's rim light. */
export function leadColours(beat: number): readonly [number, number] {
  return LOOKS[mod(phraseOf(beat), LOOKS.length)].roof;
}

/** Aims every fixture for this beat, into `out` (reused between frames). */
export function aim(fixtures: Fixture[], beat: number, drop: number, out: Beam[]) {
  const phrase = phraseOf(beat);
  const since = beat - DROP - phrase * PHRASE;
  const blend = smoothstep(0, 2, since);
  const from = PATTERNS[mod(phrase - 1, PATTERNS.length)];
  const to = PATTERNS[mod(phrase, PATTERNS.length)];
  const look = LOOKS[mod(phrase, LOOKS.length)];
  const k = kick(beat - Math.floor(beat), 5);
  const zoom = 0.5 + 0.5 * Math.sin((Math.PI * beat) / 2);
  out.length = fixtures.length;
  fixtures.forEach((f, i) => {
    const u = f.kind === "tower" ? f.side : f.u;
    const v = lerp(from(u, beat), to(u, beat), blend);
    const base = f.kind === "tower" ? f.side * 0.52 : 0;
    const colour = f.kind === "tower" ? look.tower : look[f.kind][i % 2];
    const b = out[i] ?? (out[i] = { x: 0, y: 0, angle: 0, spread: 0, power: 0, color: 0 });
    b.x = f.x;
    b.y = f.y;
    b.angle = base + v * RANGE[f.kind];
    b.spread = SPREAD[f.kind] * (f.kind === "roof" ? 0.8 + 0.5 * zoom : 1);
    b.power = POWER[f.kind] * (0.66 + 0.34 * k) * (1 + drop * 0.8);
    b.color = drop > 0.45 ? W : colour;
  });
}

// three nested cones per beam, wide and faint to narrow and hot
const LAYERS = [
  { spread: 3.4, alpha: 0.05, core: false },
  { spread: 1.4, alpha: 0.15, core: false },
  { spread: 0.42, alpha: 0.5, core: true },
];

/** Draws beams as soft additive cones. Each colour has one radial gradient
 *  centred on the lens, reused for every beam by rotating the canvas instead
 *  of the gradient. */
export class BeamPainter {
  private readonly body: CanvasGradient[];
  private readonly core: CanvasGradient[];

  constructor(
    ctx: CanvasRenderingContext2D,
    private readonly reach: number,
  ) {
    const make = (t: number) =>
      LIGHTS.map((c) => {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, reach);
        const tint = mix(c, [255, 255, 255], t);
        const stops = [
          [0, 1],
          [0.02, 0.85],
          [0.08, 0.5],
          [0.2, 0.26],
          [0.45, 0.1],
          [0.75, 0.03],
          [1, 0],
        ];
        for (const [o, a] of stops) g.addColorStop(o, rgba(tint, a));
        return g;
      });
    this.body = make(0);
    this.core = make(0.45);
  }

  draw(ctx: CanvasRenderingContext2D, beams: Beam[], u: number) {
    const L = this.reach;
    const lens = 2.2 * u;
    for (const b of beams) {
      if (b.power < 0.01) continue;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      for (const layer of LAYERS) {
        const hw = Math.tan(b.spread * layer.spread) * L;
        ctx.globalAlpha = Math.min(1, layer.alpha * b.power);
        ctx.fillStyle = (layer.core ? this.core : this.body)[b.color];
        ctx.beginPath();
        ctx.moveTo(-lens, 0);
        ctx.lineTo(lens, 0);
        ctx.lineTo(hw + lens, -L);
        ctx.lineTo(-hw - lens, -L);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
