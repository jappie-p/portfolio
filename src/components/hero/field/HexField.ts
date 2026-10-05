import { columns, prism } from "./grid";
import { invert, lookAt, multiply, perspective, project, type Mat4, type Vec3 } from "./mat4";
import { FIELD_FRAG, FIELD_VERT, SKY_FRAG, SKY_VERT } from "./shaders";

/** Where the build-up stands: 0 sketch, 1 wire, 2.45 fully rendered; `rise`
 *  lifts the columns out of the floor, `draw` pencils the sketch in. */
export type FieldState = { stage: number; rise: number; draw: number };

const BG = "#05080d";
const NEAR = "#4ade80";
const FAR = "#22d3ee";
const PENCIL = "#e9e4d8";
const WIRE = "#5fe3ef";
/** How far back the columns stand; past them, and to either side, the floor runs on. */
const FAR_Z = -58;
/** The height the columns settle to at the edges of their patch, the floor's own. */
const FLOOR_H = 1.1;

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** "#4ade80" as linear-light RGB, the space the shaders mix in. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)];
}

/** Starts compiling and linking a program; whether it worked is asked later,
 *  so a driver that compiles in the background never blocks the page. */
function program(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const p = gl.createProgram()!;
  for (const [type, src] of [
    [gl.VERTEX_SHADER, vert],
    [gl.FRAGMENT_SHADER, frag],
  ] as const) {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    gl.attachShader(p, s);
  }
  gl.linkProgram(p);
  return p;
}

/**
 * The hero's field of hexagonal columns, in plain WebGL 2 (no 3D library on
 * the first screen). It draws the build-up it is given (`state`), floats the
 * columns in slow swells, and lifts the ones under the pointer.
 */
export class HexField {
  private gl: WebGL2RenderingContext;
  private field: WebGLProgram;
  private sky: WebGLProgram;
  private parallel: { COMPLETION_STATUS_KHR: number } | null;
  private live = false;
  private pending: [number, number, number] | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private skyVao: WebGLVertexArrayObject | null = null;
  private buffers: WebGLBuffer[] = [];
  private count = 0;
  private instances = 0;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private su: Record<string, WebGLUniformLocation | null> = {};
  private w = 1;
  private h = 1;
  private viewProj: Mat4 = new Float32Array(16);
  private inverse: Mat4 | null = null;
  private eye: Vec3 = [0, 8, 13];
  private halfWidth = 34;
  private time = 4;
  private mouse = { x: 0, z: -6, on: 0, tx: 0, tz: -6, want: 0 };
  private look = { x: 0, y: 0, tx: 0, ty: 0 };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly state: FieldState,
  ) {
    const gl = canvas.getContext("webgl2", { antialias: true, alpha: false, powerPreference: "high-performance" });
    if (!gl) throw new Error("no webgl2");
    this.gl = gl;
    this.parallel = gl.getExtension("KHR_parallel_shader_compile");
    this.field = program(gl, FIELD_VERT, FIELD_FRAG);
    this.sky = program(gl, SKY_VERT, SKY_FRAG);
  }

  /** Whether the shaders are built; the rest of the setup happens then. */
  ready(): boolean {
    if (this.live) return true;
    const { gl, parallel } = this;
    if (parallel && !(gl.getProgramParameter(this.field, parallel.COMPLETION_STATUS_KHR) && gl.getProgramParameter(this.sky, parallel.COMPLETION_STATUS_KHR))) return false;
    for (const p of [this.field, this.sky]) {
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link failed");
    }
    this.setup();
    this.live = true;
    if (this.pending) this.resize(...this.pending);
    return true;
  }

  private setup() {
    const { gl } = this;
    for (const name of ["uViewProj", "uTime", "uRise", "uStage", "uMouse", "uHalfWidth", "uCam", "uPass", "uDraw", "uBg", "uNear", "uFar", "uPencil", "uWire", "uRegion", "uFloorH", "uSettle", "uHorizon", "uGlow", "uViewH"]) {
      this.u[name] = gl.getUniformLocation(this.field, name);
    }
    for (const name of ["uHorizon", "uGlow", "uBg", "uNear", "uFar", "uPencil", "uWire", "uInvViewProj", "uCam", "uRegion", "uHalfWidth", "uFloorY", "uTime", "uStage", "uDraw"]) {
      this.su[name] = gl.getUniformLocation(this.sky, name);
    }

    // the column template, shared by every instance
    const tpl = prism();
    this.count = tpl.count;
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    const vb = this.buffer(gl.ARRAY_BUFFER, tpl.data);
    const stride = tpl.stride * 4;
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    for (const [loc, size, offset] of [
      [0, 3, 0],
      [1, 3, 3],
      [2, 2, 6],
      [3, 1, 8],
    ]) {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
    }
    // the sky: one triangle over the whole screen
    this.skyVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.skyVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3])));
    const aSky = gl.getAttribLocation(this.sky, "aPos");
    gl.enableVertexAttribArray(aSky);
    gl.vertexAttribPointer(aSky, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    gl.useProgram(this.field);
    gl.uniform3fv(this.u.uBg, linear(BG));
    gl.uniform3fv(this.u.uNear, linear(NEAR));
    gl.uniform3fv(this.u.uFar, linear(FAR));
    gl.uniform3fv(this.u.uPencil, linear(PENCIL));
    gl.uniform3fv(this.u.uWire, linear(WIRE));
    gl.uniform1f(this.u.uFloorH, FLOOR_H);
    gl.useProgram(this.sky);
    gl.uniform3fv(this.su.uBg, linear(BG));
    gl.uniform3fv(this.su.uNear, linear(NEAR));
    gl.uniform3fv(this.su.uFar, linear(FAR));
    gl.uniform3fv(this.su.uPencil, linear(PENCIL));
    gl.uniform3fv(this.su.uWire, linear(WIRE));
  }

  private buffer(target: number, data: Float32Array) {
    const b = this.gl.createBuffer()!;
    this.gl.bindBuffer(target, b);
    this.gl.bufferData(target, data, this.gl.STATIC_DRAW);
    this.buffers.push(b);
    return b;
  }

  /** Size the canvas and lay out a field and camera that suit the screen. */
  resize(width: number, height: number, dpr: number) {
    if (!this.live) {
      this.pending = [width, height, dpr];
      return;
    }
    const { gl, canvas } = this;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    this.w = width;
    this.h = height;
    gl.viewport(0, 0, canvas.width, canvas.height);
    const aspect = width / height;
    const tall = aspect < 1;
    this.halfWidth = tall ? 16 : 34;
    this.eye = tall ? [0, 5, 18] : [0, 4.6, 14];

    // a new grid for the new shape
    const near = tall ? 9 : 8;
    const inst = columns(this.halfWidth, FAR_Z, near);
    this.instances = inst.length / 3;
    gl.bindVertexArray(this.vao);
    this.buffer(gl.ARRAY_BUFFER, inst);
    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 3, gl.FLOAT, false, 12, 0);
    gl.vertexAttribDivisor(4, 1);
    gl.bindVertexArray(null);
    // drop the previous instance buffer
    if (this.buffers.length > 3) gl.deleteBuffer(this.buffers.splice(2, 1)[0]);
    gl.useProgram(this.field);
    gl.uniform3f(this.u.uRegion, this.halfWidth, FAR_Z, near);
    // a narrow patch settles over a shorter way, or nothing would stand at full height
    gl.uniform1f(this.u.uSettle, Math.min(14, this.halfWidth * 0.4));
    gl.uniform1f(this.u.uViewH, canvas.height);
    gl.useProgram(this.sky);
    gl.uniform3f(this.su.uRegion, this.halfWidth, FAR_Z, near);
    this.camera();
  }

  private camera() {
    const aspect = this.w / this.h;
    const tall = aspect < 1;
    const eye: Vec3 = [this.eye[0] + this.look.x * 1.4, this.eye[1] - this.look.y * 0.6, this.eye[2]];
    // the camera looks a touch up, so the horizon sits low: sky behind the
    // copy, the field along the bottom of the screen
    const pitch = ((tall ? 10.5 : 3.5) * Math.PI) / 180;
    const target: Vec3 = [eye[0] * 0.5, eye[1] + Math.tan(pitch) * 30, eye[2] - 30];
    const proj = perspective(((tall ? 56 : 42) * Math.PI) / 180, aspect, 0.1, 220);
    this.viewProj = multiply(proj, lookAt(eye, target));
    this.inverse = invert(this.viewProj);
    const gl = this.gl;
    gl.useProgram(this.field);
    gl.uniformMatrix4fv(this.u.uViewProj, false, this.viewProj);
    gl.uniform3f(this.u.uCam, eye[0], eye[1], eye[2]);
    gl.uniform1f(this.u.uHalfWidth, this.halfWidth);
    // where the floor meets the sky, on screen
    const [, hy] = project(this.viewProj, 0, 0, -2000);
    gl.uniform1f(this.u.uHorizon, hy * 0.5 + 0.5);
    gl.useProgram(this.sky);
    gl.uniform1f(this.su.uHorizon, hy * 0.5 + 0.5);
    if (this.inverse) gl.uniformMatrix4fv(this.su.uInvViewProj, false, this.inverse);
    gl.uniform3f(this.su.uCam, eye[0], eye[1], eye[2]);
    gl.uniform1f(this.su.uHalfWidth, this.halfWidth);
  }

  /** The pointer, in CSS pixels on the canvas, or null when it leaves. */
  pointer(x: number | null, y = 0) {
    if (x === null) {
      this.mouse.want = 0;
      this.look.tx = 0;
      this.look.ty = 0;
      return;
    }
    const nx = (x / this.w) * 2 - 1;
    const ny = 1 - (y / this.h) * 2;
    this.look.tx = nx;
    this.look.ty = ny;
    if (!this.inverse) return;
    // where that ray meets the tops of the columns
    const a = project(this.inverse, nx, ny, -1);
    const b = project(this.inverse, nx, ny, 1);
    const t = (1.2 - a[1]) / (b[1] - a[1]);
    if (t > 0 && Number.isFinite(t)) {
      this.mouse.tx = a[0] + (b[0] - a[0]) * t;
      this.mouse.tz = a[2] + (b[2] - a[2]) * t;
      this.mouse.want = 1;
    }
  }

  /** Advance the float by dt seconds (0 holds it) and draw one frame. */
  frame(dt: number) {
    if (!this.live) return;
    const { gl, state } = this;
    this.time += dt;
    const k = 1 - Math.exp(-dt * 5);
    const m = this.mouse;
    m.x += (m.tx - m.x) * k;
    m.z += (m.tz - m.z) * k;
    m.on += (m.want - m.on) * (1 - Math.exp(-dt * 3));
    const l = this.look;
    if (Math.abs(l.tx - l.x) + Math.abs(l.ty - l.y) > 1e-4) {
      l.x += (l.tx - l.x) * (1 - Math.exp(-dt * 2.5));
      l.y += (l.ty - l.y) * (1 - Math.exp(-dt * 2.5));
      this.camera();
    }

    gl.clearColor(0.0196, 0.0314, 0.051, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // the sky and the floor around the columns first, behind everything
    const glow = clamp01(state.stage - 1.2);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.sky);
    gl.uniform1f(this.su.uGlow, glow);
    gl.uniform1f(this.su.uTime, this.time);
    gl.uniform1f(this.su.uStage, state.stage);
    gl.uniform1f(this.su.uDraw, state.draw);
    gl.uniform1f(this.su.uFloorY, FLOOR_H * (0.05 + 0.95 * this.floorRise()));
    gl.bindVertexArray(this.skyVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.useProgram(this.field);
    gl.uniform1f(this.u.uGlow, glow);
    gl.uniform1f(this.u.uTime, this.time);
    gl.uniform1f(this.u.uRise, state.rise);
    gl.uniform1f(this.u.uStage, state.stage);
    gl.uniform1f(this.u.uDraw, state.draw);
    gl.uniform3f(this.u.uMouse, m.x, m.z, m.on);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // solid columns, then the lines of the ones still being drawn
    gl.depthMask(true);
    gl.uniform1f(this.u.uPass, 0);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, this.count, this.instances);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniform1f(this.u.uPass, 1);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, this.count, this.instances);
    gl.depthMask(true);
    gl.bindVertexArray(null);
  }

  /** How far the floor has risen: as the columns at the edge of their patch do. */
  private floorRise() {
    const { stage, rise } = this.state;
    const r = clamp01((rise * 1.35 - 0.78) / 0.32);
    return r * r * (3 - 2 * r) * smooth(1.55, 2, Math.min(Math.max(stage - 0.45, 0), 2));
  }

  dispose() {
    const { gl } = this;
    for (const b of this.buffers) gl.deleteBuffer(b);
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.skyVao) gl.deleteVertexArray(this.skyVao);
    gl.deleteProgram(this.field);
    gl.deleteProgram(this.sky);
  }
}
