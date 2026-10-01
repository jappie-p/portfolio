import { glowSprite } from "../lib/canvas";
import { MATERIALS, type Material, type RGB } from "./materials";
import { norm, type Mesh, type V3 } from "./mesh";

/** A rigid crystal body in the scene: a mesh turning slowly about its pivot. */
export interface Body {
  mesh: Mesh;
  /** pivot on screen, CSS px */
  x: number;
  y: number;
  /** projected size (depth) */
  scale: number;
  /** resting orientation, radians */
  yaw: number;
  pitch: number;
  roll: number;
  /** turntable swing: amplitude (rad), period (s), phase */
  sway: number;
  period: number;
  phase: number;
  /** free tumble for floating shards, rad/s about x, y, z */
  spin: V3 | null;
  /** 0..1 fade into the dark with distance */
  fog: number;
  /** parallax weight, 0 far .. 1 near */
  depth: number;
}

export interface Glint {
  x: number;
  y: number;
  k: number;
}

const V: V3 = [0, 0, -1];
const L1 = norm([-0.45, -0.75, -0.5]);
const H1 = norm([L1[0] + V[0], L1[1] + V[1], L1[2] + V[2]]);
const L2 = norm([0.75, 0.2, 0.62]);
const L3 = norm([0.4, -0.5, -0.76]);
const H3 = norm([L3[0] + V[0], L3[1] + V[1], L3[2] + V[2]]);
const RIM: RGB = [255, 150, 214];
const FOG: RGB = [11, 8, 20];

const dot = (a: ArrayLike<number>, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function rampAt(m: Material, tone: number): RGB {
  const [a, b, c] = m.ramp;
  if (tone <= 0.72) {
    const t = tone / 0.72;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  const t = (tone - 0.72) / 0.28;
  return [b[0] + (c[0] - b[0]) * t, b[1] + (c[1] - b[1]) * t, b[2] + (c[2] - b[2]) * t];
}

/** Rotation matrix (row-major 3x3) for roll * pitch * yaw. */
function rotation(yaw: number, pitch: number, roll: number, out: Float32Array) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  // Ry
  const a = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  // Rx * Ry
  const b = [a[0], a[1], a[2], cp * a[3] - sp * a[6], cp * a[4] - sp * a[7], cp * a[5] - sp * a[8], sp * a[3] + cp * a[6], sp * a[4] + cp * a[7], sp * a[5] + cp * a[8]];
  // Rz * Rx * Ry
  out[0] = cr * b[0] - sr * b[3];
  out[1] = cr * b[1] - sr * b[4];
  out[2] = cr * b[2] - sr * b[5];
  out[3] = sr * b[0] + cr * b[3];
  out[4] = sr * b[1] + cr * b[4];
  out[5] = sr * b[2] + cr * b[5];
  out[6] = b[6];
  out[7] = b[7];
  out[8] = b[8];
}

const css = (c: RGB, a: number) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

/** Per-body scratch, reused every frame so drawing allocates almost nothing. */
export class BodyRenderer {
  private sx: Float32Array;
  private sy: Float32Array;
  private sz: Float32Array;
  private order: Uint16Array;
  private depth: Float32Array;
  private m = new Float32Array(9);
  private n = new Float32Array(3);

  constructor(readonly body: Body) {
    const nv = body.mesh.v.length;
    const nf = body.mesh.faces.length;
    this.sx = new Float32Array(nv);
    this.sy = new Float32Array(nv);
    this.sz = new Float32Array(nv);
    this.order = new Uint16Array(nf);
    this.depth = new Float32Array(nf);
  }

  /**
   * Draw the body at time t (s). ox/oy shift it (parallax, CSS px), tx/ty
   * turn it a touch toward the pointer. Bright facets report glints.
   */
  draw(ctx: CanvasRenderingContext2D, t: number, ox: number, oy: number, tx: number, ty: number, glints: Glint[], edge: number) {
    const b = this.body;
    const mesh = b.mesh;
    const swing = Math.sin((t / b.period) * Math.PI * 2 + b.phase) * b.sway;
    const lift = Math.cos((t / b.period) * Math.PI * 2 + b.phase * 1.3) * b.sway * 0.35;
    const s = b.spin;
    rotation(b.yaw + swing + tx + (s ? s[1] * t : 0), b.pitch + lift + ty + (s ? s[0] * t : 0), b.roll + (s ? s[2] * t : 0), this.m);
    const m = this.m;
    const px = b.x + ox;
    const py = b.y + oy;
    for (let i = 0; i < mesh.v.length; i++) {
      const v = mesh.v[i];
      this.sx[i] = px + (m[0] * v[0] + m[1] * v[1] + m[2] * v[2]) * b.scale;
      this.sy[i] = py + (m[3] * v[0] + m[4] * v[1] + m[5] * v[2]) * b.scale;
      this.sz[i] = m[6] * v[0] + m[7] * v[1] + m[8] * v[2];
    }
    const faces = mesh.faces;
    for (let f = 0; f < faces.length; f++) {
      const c = faces[f].c;
      this.depth[f] = m[6] * c[0] + m[7] * c[1] + m[8] * c[2];
      this.order[f] = f;
    }
    const depth = this.depth;
    this.order.sort((a, z) => depth[z] - depth[a]);

    const fogK = 1 - b.fog;
    ctx.lineJoin = "round";
    for (let k = 0; k < this.order.length; k++) {
      const face = faces[this.order[k]];
      const mat = MATERIALS[face.mat];
      const fn = face.n;
      const n = this.n;
      n[0] = m[0] * fn[0] + m[1] * fn[1] + m[2] * fn[2];
      n[1] = m[3] * fn[0] + m[4] * fn[1] + m[5] * fn[2];
      n[2] = m[6] * fn[0] + m[7] * fn[1] + m[8] * fn[2];
      const facing = -n[2];
      if (facing < 0 && !mat.inner) continue;

      ctx.beginPath();
      const idx = face.idx;
      ctx.moveTo(this.sx[idx[0]], this.sy[idx[0]]);
      for (let i = 1; i < idx.length; i++) ctx.lineTo(this.sx[idx[i]], this.sy[idx[i]]);
      ctx.closePath();

      if (facing < 0) {
        // the far side, lit from within: what makes it read as a gem
        const through = 0.5 + 0.5 * Math.max(0, -dot(n, L1));
        ctx.fillStyle = css(mix(mat.inner!, FOG, b.fog), 0.3 * through * fogK);
        ctx.fill();
        continue;
      }

      const diff = Math.max(0, dot(n, L1));
      const half = Math.max(0, dot(n, H1));
      const spec = half ** mat.shine * mat.spec;
      const satin = half ** 8 * 38 * mat.spec;
      const rim = Math.max(0, dot(n, L2)) * 0.5 + (1 - facing) ** 2 * 0.35;
      const light = (0.14 + 1.02 * diff) * face.vary;
      const lit = (c: RGB): RGB => {
        let r = c[0] * light + RIM[0] * rim * 0.42 + 255 * spec + satin;
        let g = c[1] * light + RIM[1] * rim * 0.42 + 255 * spec + satin;
        let bl = c[2] * light + RIM[2] * rim * 0.42 + 255 * spec + satin;
        if (!mat.sheen && spec > 0.02) {
          // a little dispersion: prismatic fire in the brightest facets
          const a = Math.atan2(n[1], n[0]) * 2;
          const fire = spec ** 0.4 * 70;
          r += (0.5 + 0.5 * Math.cos(a)) * fire;
          g += (0.5 + 0.5 * Math.cos(a - 2.1)) * fire;
          bl += (0.5 + 0.5 * Math.cos(a + 2.1)) * fire;
        }
        return mix([Math.min(255, r), Math.min(255, g), Math.min(255, bl)], FOG, b.fog);
      };
      const lo = face.lo;
      const hi = face.hi;
      const dx = this.sx[hi] - this.sx[lo];
      const dy = this.sy[hi] - this.sy[lo];
      const alpha = mat.alpha * (0.72 + 0.28 * fogK);
      if (dx * dx + dy * dy > 4) {
        const g = ctx.createLinearGradient(this.sx[lo], this.sy[lo], this.sx[hi], this.sy[hi]);
        g.addColorStop(0, css(lit(rampAt(mat, mesh.tone[lo])), alpha));
        g.addColorStop(1, css(lit(rampAt(mat, mesh.tone[hi])), alpha));
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = css(lit(rampAt(mat, (mesh.tone[lo] + mesh.tone[hi]) / 2)), alpha);
      }
      ctx.fill();
      if (mat.sheen && idx.length > 4) {
        // labradorescence: a blue, teal, green, gold flash across the broad face
        // as it swings through the light
        const flash = Math.max(0, dot(n, H3)) ** 1.6 * fogK;
        if (flash > 0.02) {
          const a = idx[0];
          const z = idx[idx.length >> 1];
          const g = ctx.createLinearGradient(this.sx[a], this.sy[a], this.sx[z], this.sy[z]);
          g.addColorStop(0, `rgba(37,99,235,${(0.8 * flash).toFixed(3)})`);
          g.addColorStop(0.42, `rgba(45,212,191,${flash.toFixed(3)})`);
          g.addColorStop(0.72, `rgba(132,204,22,${(0.55 * flash).toFixed(3)})`);
          g.addColorStop(1, `rgba(250,204,21,${(0.35 * flash).toFixed(3)})`);
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = g;
          ctx.fill();
          ctx.globalCompositeOperation = "source-over";
        }
      }
      ctx.lineWidth = edge;
      ctx.strokeStyle = `rgba(255,244,255,${((0.1 + 0.45 * Math.min(1, spec * 2)) * fogK).toFixed(3)})`;
      ctx.stroke();
      if (spec > 0.45 && fogK > 0.3) glints.push({ x: this.sx[hi], y: this.sy[hi], k: ((spec - 0.45) / 0.55) * fogK });
    }

    // light caught inside each crystal
    ctx.globalCompositeOperation = "lighter";
    for (const core of mesh.cores) {
      const inner = MATERIALS[core.mat].inner;
      if (!inner) continue;
      const size = core.r * b.scale * 5;
      ctx.globalAlpha = 0.13 * fogK;
      ctx.drawImage(glowSprite(`${inner[0]},${inner[1]},${inner[2]}`), this.sx[core.at] - size / 2, this.sy[core.at] - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
