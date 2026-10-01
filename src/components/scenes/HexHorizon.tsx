"use client";
import { useEffect, useRef } from "react";

// A glowing honeycomb floor running off to a horizon, drawn by one full-screen
// shader: perspective hex grid, a horizon glow, cells that flicker on, a scan
// sweeping away from you, and a light that follows the pointer across the
// floor. The honeycomb is the firewall's cells, laid flat. Plain WebGL 2, so
// the first screen does not wait for a 3D library.

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uHorizon;
uniform float uSpeed;
uniform vec3 uNear;
uniform vec3 uFar;
uniform float uBoot;
in vec2 vUv;
out vec4 outColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// nearest hex centre (pointy-top lattice): xy = offset from it, zw = cell id
vec4 hexCell(vec2 p) {
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 c = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - c.xy * s, p - (c.zw + 0.5) * s);
  return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, c.xy) : vec4(h.zw, c.zw + 0.5);
}
float hexEdge(vec2 p) {
  p = abs(p);
  return 0.5 - max(dot(p, vec2(0.5, 0.8660254)), p.x);
}

// screen -> floor: depth grows toward the horizon
vec2 toFloor(vec2 uv, float aspect) {
  float d = max(uHorizon - uv.y, 1e-3);
  float z = 0.32 / d;
  return vec2((uv.x - 0.5) * aspect * z * 2.4, z * 1.7 - uTime * uSpeed);
}

// the shading runs in linear light; the screen wants sRGB
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  float aspect = uRes.x / uRes.y;
  float above = vUv.y - uHorizon;
  vec3 col = mix(vec3(0.012, 0.022, 0.035), vec3(0.0), smoothstep(0.0, 0.7, above));
  col += uFar * exp(-abs(above) * 16.0) * 0.3 + uNear * exp(-abs(above) * 45.0) * 0.2;

  if (above < 0.0) {
    float d = -above;
    vec2 g = toFloor(vUv, aspect);
    vec4 h = hexCell(g * 1.25);
    float e = hexEdge(h.xy);
    float fw = fwidth(e);
    float line = 1.0 - smoothstep(fw * 0.4, fw * 1.6 + 0.004, e);
    float halo = exp(-e * 22.0) * 0.16;
    float z = 0.32 / d;
    float fog = exp(-z * 0.16);
    float nearFade = smoothstep(0.0, 0.07, d);
    vec3 lc = mix(uFar, uNear, fog);

    float id = hash(h.zw);
    float on = step(0.955, hash(h.zw + floor(uTime * 0.7 + id * 5.0)));
    float breathe = 0.5 + 0.5 * sin(uTime * 2.5 + id * 6.283);
    float scan = exp(-pow(fract(z * 0.07 - uTime * 0.22) - 0.5, 2.0) * 500.0);

    // the pointer's spot on the floor
    vec2 m = uMouse * 0.5 + 0.5;
    float spot = 0.0;
    if (m.y < uHorizon - 0.01) {
      vec2 gm = toFloor(m, aspect);
      vec2 dm = g - gm;
      spot = exp(-dot(dm, dm) * 0.9) * uMouseOn;
    }

    float lit = (line + halo) * (0.16 + 0.72 * fog) * (1.0 + scan * 1.6 + spot * 3.0);
    lit += on * breathe * fog * 0.55 * smoothstep(0.0, 0.5, e);
    // power-on: the light climbs the screen from your feet to the horizon,
    // a bright front leading it (measured on screen, where depth bunches up)
    float b = uBoot * uBoot * (3.0 - 2.0 * uBoot);
    float front = uHorizon * (1.0 - b);
    float powered = smoothstep(front - 0.004, front + 0.02, d);
    float wave = exp(-pow((d - front) * 70.0, 2.0)) * (1.0 - b) * 2.4;
    lit = lit * powered + (line + halo + 0.15) * wave;
    col += lc * lit * nearFade;
    col += uNear * spot * 0.08 * nearFade;
  }
  outColor = vec4(toSRGB(max(col, 0.0)), 1.0);
}
`;

export type HexTone = "hero";

const TONES: Record<HexTone, { near: string; far: string; horizon: number; speed: number }> = {
  hero: { near: "#4ade80", far: "#22d3ee", horizon: 0.29, speed: 0.55 },
};

/** "#4ade80" as linear-light RGB, the space the shader mixes in. */
function linear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)];
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
  return s;
}

/** The honeycomb horizon. `active` pauses it off screen; `still` draws one frame. */
export function HexHorizon({ tone, active, still }: { tone: HexTone; active: boolean; still: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const run = useRef<(on: boolean) => void>(() => {});

  useEffect(() => {
    const cv = canvas.current;
    const gl = cv?.getContext("webgl2", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" });
    if (!cv || !gl) return;
    const t = TONES[tone];

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    // one triangle that covers the screen
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(prog, name);
    const uTime = u("uTime");
    const uRes = u("uRes");
    const uMouse = u("uMouse");
    const uMouseOn = u("uMouseOn");
    const uBoot = u("uBoot");
    gl.uniform1f(u("uHorizon"), t.horizon);
    gl.uniform1f(u("uSpeed"), t.speed);
    gl.uniform3fv(u("uNear"), linear(t.near));
    gl.uniform3fv(u("uFar"), linear(t.far));
    gl.uniform2f(uMouse, 0, -1);

    let time = 3.7;
    let boot = still ? 1 : 0;
    let mouseOn = 0;
    let raf = 0;
    let last = 0;

    const draw = () => {
      gl.uniform1f(uTime, time);
      gl.uniform1f(uBoot, boot);
      gl.uniform1f(uMouseOn, mouseOn);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;
      time += dt;
      // the floor powers on the first time it plays (the loop only runs on screen)
      boot = Math.min(1, boot + dt / 1.9);
      draw();
    };
    run.current = (on) => {
      cancelAnimationFrame(raf);
      last = 0;
      if (on) raf = requestAnimationFrame(frame);
    };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.max(1, Math.round(cv.clientWidth * dpr));
      cv.height = Math.max(1, Math.round(cv.clientHeight * dpr));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(uRes, cv.width, cv.height);
      draw();
    };
    const ro = new ResizeObserver(fit);
    ro.observe(cv);
    fit();

    // the pointer is tracked on the window: the canvas sits under the page copy
    const fine = !still && window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      gl.uniform2f(uMouse, ((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      mouseOn = 1;
    };
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      run.current = () => {};
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (fine) window.removeEventListener("pointermove", onMove);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [tone, still]);

  useEffect(() => {
    run.current(active && !still);
  }, [active, still]);

  return (
    <div data-hex={tone} className="absolute inset-0" aria-hidden>
      <canvas ref={canvas} className="block h-full w-full" />
    </div>
  );
}
