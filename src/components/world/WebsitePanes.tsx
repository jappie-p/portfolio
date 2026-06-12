"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  DoubleSide,
  Group,
  PlaneGeometry,
  ShaderMaterial,
} from "three";
import { useJourney } from "@/lib/store";

// Deterministic PRNG — same seed = same result across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fragment shader: draws a browser window chrome + wireframe layout
// using rect SDFs. uLayout selects one of 3 layout presets.
// uProgress drives the assembly animation (0..1).
const BROWSER_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BROWSER_FRAG = /* glsl */ `
  uniform float uProgress;
  uniform float uLayout;
  uniform float uAlpha;
  varying vec2 vUv;

  float rectBorder(vec2 p, vec4 r, float thick) {
    float left   = r.x;
    float top    = r.y;
    float right  = r.x + r.z;
    float bottom = r.y + r.w;
    float dx = min(abs(p.x - left), abs(p.x - right));
    float dy = min(abs(p.y - top),  abs(p.y - bottom));
    bool insideX = p.x > left && p.x < right;
    bool insideY = p.y > top  && p.y < bottom;
    float onVert  = float(insideY) * smoothstep(thick, thick * 0.3, dx);
    float onHoriz = float(insideX) * smoothstep(thick, thick * 0.3, dy);
    return clamp(onVert + onHoriz, 0.0, 1.0);
  }

  float rectFill(vec2 p, vec4 r) {
    return step(r.x, p.x) * step(p.x, r.x + r.z)
         * step(r.y, p.y) * step(p.y, r.y + r.w);
  }

  float circle(vec2 p, vec2 center, float radius) {
    return smoothstep(radius, radius * 0.4, length(p - center));
  }

  float reveal(float progress, float threshold) {
    return smoothstep(threshold, threshold + 0.08, progress);
  }

  float scanline(vec2 p, float y, float thick) {
    return smoothstep(thick, thick * 0.2, abs(p.y - y));
  }

  void main() {
    vec2 p = vUv;
    float lineAlpha  = 0.0;
    float emberAlpha = 0.0;
    float bgAlpha    = 0.0;

    float T = 0.009;

    // Pane background
    bgAlpha = 0.22;
    // Chrome strip bg
    bgAlpha += rectFill(p, vec4(0.0, 0.0, 1.0, 0.12)) * 0.18;

    // Outer frame border
    lineAlpha += rectBorder(p, vec4(0.01, 0.01, 0.98, 0.98), T) * 0.55 * reveal(uProgress, 0.0);

    // Chrome divider
    lineAlpha += scanline(p, 0.12, T * 0.8) * float(p.x > 0.02 && p.x < 0.98) * 0.45 * reveal(uProgress, 0.02);

    // Traffic light dots
    emberAlpha += circle(p, vec2(0.07, 0.06), 0.018) * 0.85 * reveal(uProgress, 0.04);
    lineAlpha  += circle(p, vec2(0.12, 0.06), 0.018) * 0.50 * reveal(uProgress, 0.05);
    lineAlpha  += circle(p, vec2(0.17, 0.06), 0.018) * 0.50 * reveal(uProgress, 0.05);

    // URL bar
    lineAlpha += rectBorder(p, vec4(0.28, 0.025, 0.50, 0.075), T * 0.7) * 0.30 * reveal(uProgress, 0.06);

    // Cursor blink inside url bar
    float blink  = step(0.5, fract(uProgress * 3.0));
    float cursor = smoothstep(T, T * 0.3, abs(p.x - 0.30))
                 * float(p.y > 0.047 && p.y < 0.087);
    lineAlpha += cursor * blink * 0.50 * reveal(uProgress, 0.06);

    // Nav bar divider
    lineAlpha += scanline(p, 0.19, T * 0.8) * float(p.x > 0.04 && p.x < 0.96) * 0.35 * reveal(uProgress, 0.08);

    // Nav items
    lineAlpha += rectBorder(p, vec4(0.05, 0.14, 0.10, 0.04), T * 0.7) * 0.28 * reveal(uProgress, 0.10);
    lineAlpha += rectBorder(p, vec4(0.18, 0.14, 0.10, 0.04), T * 0.7) * 0.28 * reveal(uProgress, 0.10);
    lineAlpha += rectBorder(p, vec4(0.31, 0.14, 0.10, 0.04), T * 0.7) * 0.28 * reveal(uProgress, 0.10);

    // NOTE: "layout" is a reserved GLSL keyword — do not use as identifier.
    int layoutId = int(uLayout);

    if (layoutId == 0) {
      // Big hero + 3 card columns
      lineAlpha  += rectBorder(p, vec4(0.05, 0.22, 0.90, 0.28), T) * 0.55 * reveal(uProgress, 0.15);
      lineAlpha  += scanline(p, 0.29, T * 0.7) * float(p.x > 0.08 && p.x < 0.65) * 0.40 * reveal(uProgress, 0.20);
      lineAlpha  += scanline(p, 0.33, T * 0.6) * float(p.x > 0.08 && p.x < 0.50) * 0.28 * reveal(uProgress, 0.22);
      emberAlpha += rectBorder(p, vec4(0.08, 0.37, 0.18, 0.07), T) * 0.70 * reveal(uProgress, 0.25);
      lineAlpha  += rectBorder(p, vec4(0.05, 0.55, 0.26, 0.32), T) * 0.45 * reveal(uProgress, 0.30);
      lineAlpha  += rectBorder(p, vec4(0.37, 0.55, 0.26, 0.32), T) * 0.45 * reveal(uProgress, 0.38);
      lineAlpha  += rectBorder(p, vec4(0.69, 0.55, 0.26, 0.32), T) * 0.45 * reveal(uProgress, 0.46);
      // Text lines in col 0
      lineAlpha += scanline(p, 0.65, T * 0.6) * float(p.x > 0.07 && p.x < 0.27) * 0.22 * reveal(uProgress, 0.35);
      lineAlpha += scanline(p, 0.72, T * 0.6) * float(p.x > 0.07 && p.x < 0.24) * 0.18 * reveal(uProgress, 0.40);
      lineAlpha += scanline(p, 0.79, T * 0.6) * float(p.x > 0.07 && p.x < 0.20) * 0.15 * reveal(uProgress, 0.44);
      // Text lines in col 1
      lineAlpha += scanline(p, 0.65, T * 0.6) * float(p.x > 0.39 && p.x < 0.59) * 0.22 * reveal(uProgress, 0.43);
      lineAlpha += scanline(p, 0.72, T * 0.6) * float(p.x > 0.39 && p.x < 0.56) * 0.18 * reveal(uProgress, 0.48);
      lineAlpha += scanline(p, 0.79, T * 0.6) * float(p.x > 0.39 && p.x < 0.52) * 0.15 * reveal(uProgress, 0.52);
      // Text lines in col 2
      lineAlpha += scanline(p, 0.65, T * 0.6) * float(p.x > 0.71 && p.x < 0.91) * 0.22 * reveal(uProgress, 0.51);
      lineAlpha += scanline(p, 0.72, T * 0.6) * float(p.x > 0.71 && p.x < 0.88) * 0.18 * reveal(uProgress, 0.56);
      lineAlpha += scanline(p, 0.79, T * 0.6) * float(p.x > 0.71 && p.x < 0.84) * 0.15 * reveal(uProgress, 0.60);

    } else if (layoutId == 1) {
      // Sidebar + main content
      lineAlpha  += rectBorder(p, vec4(0.05, 0.22, 0.20, 0.72), T) * 0.45 * reveal(uProgress, 0.15);
      lineAlpha  += rectBorder(p, vec4(0.07, 0.27, 0.15, 0.07), T * 0.7) * 0.30 * reveal(uProgress, 0.18);
      lineAlpha  += rectBorder(p, vec4(0.07, 0.38, 0.15, 0.07), T * 0.7) * 0.30 * reveal(uProgress, 0.25);
      lineAlpha  += rectBorder(p, vec4(0.07, 0.49, 0.15, 0.07), T * 0.7) * 0.30 * reveal(uProgress, 0.32);
      lineAlpha  += rectBorder(p, vec4(0.07, 0.60, 0.15, 0.07), T * 0.7) * 0.30 * reveal(uProgress, 0.39);
      lineAlpha  += rectBorder(p, vec4(0.07, 0.71, 0.15, 0.07), T * 0.7) * 0.30 * reveal(uProgress, 0.46);
      lineAlpha  += rectBorder(p, vec4(0.30, 0.22, 0.65, 0.72), T) * 0.50 * reveal(uProgress, 0.20);
      lineAlpha  += scanline(p, 0.30, T * 0.8) * float(p.x > 0.33 && p.x < 0.80) * 0.45 * reveal(uProgress, 0.25);
      emberAlpha += scanline(p, 0.30, T * 0.8) * float(p.x > 0.33 && p.x < 0.80) * 0.20 * reveal(uProgress, 0.25);
      lineAlpha  += rectBorder(p, vec4(0.32, 0.36, 0.60, 0.20), T) * 0.42 * reveal(uProgress, 0.30);
      lineAlpha  += rectBorder(p, vec4(0.32, 0.60, 0.28, 0.28), T) * 0.42 * reveal(uProgress, 0.40);
      lineAlpha  += rectBorder(p, vec4(0.64, 0.60, 0.28, 0.28), T) * 0.42 * reveal(uProgress, 0.50);
      lineAlpha  += scanline(p, 0.43, T * 0.6) * float(p.x > 0.34 && p.x < 0.80) * 0.22 * reveal(uProgress, 0.33);
      lineAlpha  += scanline(p, 0.48, T * 0.6) * float(p.x > 0.34 && p.x < 0.72) * 0.18 * reveal(uProgress, 0.36);
      lineAlpha  += scanline(p, 0.53, T * 0.6) * float(p.x > 0.34 && p.x < 0.60) * 0.15 * reveal(uProgress, 0.39);

    } else {
      // 2x2 card grid with header
      lineAlpha  += rectBorder(p, vec4(0.05, 0.22, 0.90, 0.12), T) * 0.48 * reveal(uProgress, 0.15);
      lineAlpha  += scanline(p, 0.26, T * 0.8) * float(p.x > 0.08 && p.x < 0.55) * 0.40 * reveal(uProgress, 0.20);
      emberAlpha += scanline(p, 0.26, T * 0.8) * float(p.x > 0.08 && p.x < 0.55) * 0.25 * reveal(uProgress, 0.20);
      lineAlpha  += rectBorder(p, vec4(0.05, 0.38, 0.42, 0.26), T) * 0.45 * reveal(uProgress, 0.25);
      lineAlpha  += rectBorder(p, vec4(0.53, 0.38, 0.42, 0.26), T) * 0.45 * reveal(uProgress, 0.33);
      lineAlpha  += rectBorder(p, vec4(0.05, 0.68, 0.42, 0.26), T) * 0.45 * reveal(uProgress, 0.41);
      lineAlpha  += rectBorder(p, vec4(0.53, 0.68, 0.42, 0.26), T) * 0.45 * reveal(uProgress, 0.49);
      bgAlpha    += rectFill(p, vec4(0.07, 0.40, 0.38, 0.13)) * 0.12 * reveal(uProgress, 0.30);
      bgAlpha    += rectFill(p, vec4(0.55, 0.40, 0.38, 0.13)) * 0.12 * reveal(uProgress, 0.38);
      bgAlpha    += rectFill(p, vec4(0.07, 0.70, 0.38, 0.13)) * 0.12 * reveal(uProgress, 0.46);
      bgAlpha    += rectFill(p, vec4(0.55, 0.70, 0.38, 0.13)) * 0.12 * reveal(uProgress, 0.54);
      lineAlpha  += scanline(p, 0.58, T * 0.6) * float(p.x > 0.07 && p.x < 0.44) * 0.22 * reveal(uProgress, 0.28);
      lineAlpha  += scanline(p, 0.58, T * 0.6) * float(p.x > 0.55 && p.x < 0.92) * 0.22 * reveal(uProgress, 0.36);
      lineAlpha  += scanline(p, 0.88, T * 0.6) * float(p.x > 0.07 && p.x < 0.44) * 0.22 * reveal(uProgress, 0.44);
      lineAlpha  += scanline(p, 0.88, T * 0.6) * float(p.x > 0.55 && p.x < 0.92) * 0.22 * reveal(uProgress, 0.52);
      emberAlpha += rectBorder(p, vec4(0.70, 0.24, 0.22, 0.06), T * 0.8) * 0.75 * reveal(uProgress, 0.22);
    }

    lineAlpha  = clamp(lineAlpha * 1.6, 0.0, 1.0);
    emberAlpha = clamp(emberAlpha * 1.3, 0.0, 1.0);
    bgAlpha    = clamp(bgAlpha,    0.0, 1.0);

    vec3 boneDim = vec3(0.659, 0.635, 0.612);
    vec3 bone    = vec3(0.961, 0.941, 0.918);
    vec3 ember   = vec3(0.851, 0.467, 0.024);
    vec3 bgColor = vec3(0.028, 0.024, 0.020);

    vec3 lineCol = mix(boneDim, bone, lineAlpha * 0.6);
    vec3 emCol   = mix(ember, vec3(0.910, 0.588, 0.118), emberAlpha);

    vec3 col = bgColor * bgAlpha
             + lineCol * lineAlpha
             + emCol   * emberAlpha * 0.8;

    float totalAlpha = clamp(bgAlpha + lineAlpha * 0.85 + emberAlpha * 0.70, 0.0, 1.0);
    totalAlpha *= uAlpha;

    gl_FragColor = vec4(col, totalAlpha);
  }
`;

const ANIM_PERIOD = 6.0;
const ANIM_HOLD = 2.0;

interface PaneConfig {
  position: [number, number, number];
  width: number;
  height: number;
  rotY: number;
  rotX: number;
  layout: number;
  floatPhase: number;
  floatSpeed: number;
  floatAmp: number;
  staggerIndex: number;
}

function buildPaneConfigs(): PaneConfig[] {
  const rand = mulberry32(7331);
  return [
    {
      position: [-1.7, 1.55, -2.4],
      width: 2.1,
      height: 1.31,
      rotY: 0.4,
      rotX: -0.06,
      layout: 0,
      floatPhase: rand() * Math.PI * 2,
      floatSpeed: 0.38 + rand() * 0.12,
      floatAmp: 0.045 + rand() * 0.02,
      staggerIndex: 0,
    },
    {
      position: [1.9, 2.1, -4.0],
      width: 1.9,
      height: 1.19,
      rotY: -0.45,
      rotX: 0.05,
      layout: 1,
      floatPhase: rand() * Math.PI * 2,
      floatSpeed: 0.29 + rand() * 0.10,
      floatAmp: 0.038 + rand() * 0.018,
      staggerIndex: 1,
    },
    {
      position: [-2.4, 1.05, -5.4],
      width: 1.8,
      height: 1.13,
      rotY: 0.32,
      rotX: -0.08,
      layout: 2,
      floatPhase: rand() * Math.PI * 2,
      floatSpeed: 0.45 + rand() * 0.10,
      floatAmp: 0.05 + rand() * 0.015,
      staggerIndex: 2,
    },
  ];
}

const PANE_CONFIGS: PaneConfig[] = buildPaneConfigs();

// Each pane is its own component so useFrame mutations stay on local refs
// and don't touch render-scope arrays (satisfies react-hooks/immutability).
function AnimatedPane({ config }: { config: PaneConfig }) {
  const groupRef = useRef<Group>(null);
  const matRef = useRef<ShaderMaterial>(null);

  const { geometry, uniforms } = useMemo(() => {
    const geo = new PlaneGeometry(config.width, config.height, 1, 1);
    const uni = {
      uProgress: { value: 0.0 },
      uLayout: { value: config.layout },
      uAlpha: { value: 1.0 },
    };
    return { geometry: geo, uniforms: uni };
  }, [config.width, config.height, config.layout]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { chapter, chapterProgress } = useJourney.getState();

    // Visibility ramp: fade in chapter1 2nd half, full ch2, fade out ch3 first third
    let vis = 0.0;
    if (chapter === 1) {
      vis = chapterProgress > 0.6 ? Math.min(1, (chapterProgress - 0.6) / 0.4) : 0;
    } else if (chapter === 2) {
      vis = 1.0;
    } else if (chapter === 3) {
      vis = chapterProgress < 0.33 ? Math.max(0, 1 - chapterProgress / 0.33) : 0;
    }

    const g = groupRef.current;
    if (g) {
      g.visible = vis > 0.01;
      g.position.y = config.position[1] + Math.sin(t * config.floatSpeed + config.floatPhase) * config.floatAmp;
      g.rotation.z = Math.sin(t * config.floatSpeed * 0.7 + config.floatPhase + 1.0) * 0.018;
    }

    const m = matRef.current;
    if (m) {
      const buildTime = ANIM_PERIOD - ANIM_HOLD;
      const staggerOffset = config.staggerIndex * (ANIM_PERIOD / 3);
      const sc = (t + staggerOffset) % ANIM_PERIOD;
      const rawProgress = sc < buildTime ? sc / buildTime : 1.0;
      // Ease in-out cubic
      const eased = rawProgress < 0.5
        ? 4 * rawProgress * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;

      m.uniforms.uProgress.value = eased;
      m.uniforms.uAlpha.value = vis;
    }
  });

  return (
    <group
      ref={groupRef}
      position={config.position}
      rotation={[config.rotX, config.rotY, 0]}
    >
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          vertexShader={BROWSER_VERT}
          fragmentShader={BROWSER_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={DoubleSide}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function WebsitePanes() {
  return (
    <group>
      {PANE_CONFIGS.map((cfg, i) => (
        <AnimatedPane key={i} config={cfg} />
      ))}
    </group>
  );
}
