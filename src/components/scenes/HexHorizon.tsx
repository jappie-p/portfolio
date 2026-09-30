"use client";
import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// A glowing honeycomb floor running off to a horizon, drawn by one full-screen
// shader: perspective hex grid, a horizon glow, cells that flicker on, a scan
// sweeping away from you, and a light that follows the pointer across the
// floor. The honeycomb is the firewall's cells, laid flat.

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform float uHorizon;
uniform float uSpeed;
uniform vec3 uNear;
uniform vec3 uFar;
varying vec2 vUv;

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
    col += lc * lit * nearFade;
    col += uNear * spot * 0.08 * nearFade;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export type HexTone = "hero" | "contact";

const TONES: Record<HexTone, { near: string; far: string; horizon: number; speed: number }> = {
  hero: { near: "#4ade80", far: "#22d3ee", horizon: 0.29, speed: 0.55 },
  contact: { near: "#5eead4", far: "#4ade80", horizon: 0.15, speed: -0.35 },
};

function Floor({ tone, still }: { tone: HexTone; still: boolean }) {
  const { size, viewport, invalidate } = useThree();
  const mat = useMemo(() => {
    const t = TONES[tone];
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uTime: { value: 3.7 },
        uRes: { value: new THREE.Vector2(1, 1) },
        uMouse: { value: new THREE.Vector2(0, -1) },
        uMouseOn: { value: 0 },
        uHorizon: { value: t.horizon },
        uSpeed: { value: t.speed },
        uNear: { value: new THREE.Color(t.near) },
        uFar: { value: new THREE.Color(t.far) },
      },
      depthTest: false,
      depthWrite: false,
    });
  }, [tone]);
  useEffect(() => () => mat.dispose(), [mat]);

  useEffect(() => {
    mat.uniforms.uRes.value.set(size.width * viewport.dpr, size.height * viewport.dpr);
    invalidate();
  }, [mat, size, viewport.dpr, invalidate]);

  // the pointer is tracked on the window: the canvas sits under the page copy
  useEffect(() => {
    if (still || !window.matchMedia("(pointer: fine)").matches) return;
    const el = document.querySelector(`[data-hex="${tone}"]`);
    const onMove = (e: PointerEvent) => {
      const r = el?.getBoundingClientRect();
      if (!r) return;
      mat.uniforms.uMouse.value.set(((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1));
      mat.uniforms.uMouseOn.value = 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [mat, still, tone]);

  useFrame((_, delta) => {
    if (!still) mat.uniforms.uTime.value += Math.min(delta, 0.05);
  });

  return (
    <mesh frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** The honeycomb horizon. `active` pauses it off screen; `still` draws one frame. */
export function HexHorizon({ tone, active, still }: { tone: HexTone; active: boolean; still: boolean }) {
  return (
    <div data-hex={tone} className="absolute inset-0" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        frameloop={still ? "demand" : active ? "always" : "never"}
        gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 1] }}
      >
        <Floor tone={tone} still={still} />
      </Canvas>
    </div>
  );
}
