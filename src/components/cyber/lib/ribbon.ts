import * as THREE from "three";
import type { SceneUniforms } from "./uniforms";
import { TRAVEL } from "./juice";

// Glowing filaments as camera-facing ribbons: one draw call for a whole
// family of strands, with the flowing light pulses computed on the GPU.

export type Strand = {
  points: THREE.Vector3[];
  width: number; // half-width in world units
  seed: number;
  kind: number; // index into the material's three colours
  group?: number; // index into the material's three gains (one per flood)
};

export function buildRibbonGeometry(strands: Strand[]) {
  let verts = 0;
  let quads = 0;
  for (const s of strands) {
    verts += s.points.length * 2;
    quads += s.points.length - 1;
  }
  const pos = new Float32Array(verts * 3);
  const tan = new Float32Array(verts * 3);
  const side = new Float32Array(verts);
  const along = new Float32Array(verts);
  const seed = new Float32Array(verts);
  const width = new Float32Array(verts);
  const kind = new Float32Array(verts);
  const group = new Float32Array(verts);
  const index = new Uint32Array(quads * 6);
  const t = new THREE.Vector3();
  let v = 0;
  let q = 0;
  for (const s of strands) {
    const n = s.points.length;
    const first = v;
    for (let k = 0; k < n; k++) {
      const p = s.points[k];
      t.subVectors(s.points[Math.min(k + 1, n - 1)], s.points[Math.max(k - 1, 0)]).normalize();
      for (const sd of [-1, 1]) {
        pos[v * 3] = p.x;
        pos[v * 3 + 1] = p.y;
        pos[v * 3 + 2] = p.z;
        tan[v * 3] = t.x;
        tan[v * 3 + 1] = t.y;
        tan[v * 3 + 2] = t.z;
        side[v] = sd;
        along[v] = k / (n - 1);
        seed[v] = s.seed;
        width[v] = s.width;
        kind[v] = s.kind;
        group[v] = s.group ?? 0;
        v++;
      }
    }
    for (let k = 0; k < n - 1; k++) {
      const a = first + k * 2;
      index.set([a, a + 2, a + 1, a + 1, a + 2, a + 3], q);
      q += 6;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aTangent", new THREE.BufferAttribute(tan, 3));
  g.setAttribute("aSide", new THREE.BufferAttribute(side, 1));
  g.setAttribute("aT", new THREE.BufferAttribute(along, 1));
  g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  g.setAttribute("aWidth", new THREE.BufferAttribute(width, 1));
  g.setAttribute("aKind", new THREE.BufferAttribute(kind, 1));
  g.setAttribute("aGroup", new THREE.BufferAttribute(group, 1));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  g.computeBoundingSphere();
  return g;
}

const VERT = /* glsl */ `
uniform float uTime;
uniform float uPixel;
uniform float uJitter;
attribute vec3 aTangent;
attribute float aSide;
attribute float aT;
attribute float aSeed;
attribute float aWidth;
attribute float aKind;
attribute float aGroup;
varying float vT;
varying float vSide;
varying float vSeed;
varying float vFade;
varying float vKind;
varying float vGroup;
varying float vDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 tw = normalize(mat3(modelMatrix) * aTangent);
  vec3 toCam = normalize(cameraPosition - wp.xyz);
  vec3 sideDir = normalize(cross(tw, toCam));
  if (uJitter > 0.0) {
    // electric crackle, strongest mid-strand, pinned at both ends
    vec3 up = normalize(cross(sideDir, tw));
    float ph = aT * 41.0 + uTime * 23.0 + aSeed * 91.0;
    float amp = uJitter * (0.3 + 0.7 * fract(aSeed * 7.13)) * sin(aT * 3.14159);
    wp.xyz += (sideDir * sin(ph) + up * cos(ph * 1.37)) * amp;
  }
  float dist = distance(cameraPosition, wp.xyz);
  float w = max(aWidth, uPixel * dist * 0.75);
  vFade = aWidth / w;
  wp.xyz += sideDir * w * aSide;
  vT = aT;
  vSide = aSide;
  vSeed = aSeed;
  vKind = aKind;
  vGroup = aGroup;
  vDist = dist;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uSpeed;
uniform float uPulses;
uniform float uBase;
uniform float uGain;
uniform float uLevel;
uniform vec3 uColors[3];
uniform float uGroups[3];
uniform vec2 uFog;
uniform vec2 uEnds;
uniform float uSalvo[3];
uniform float uTravel;
uniform float uBolt;
uniform float uCut;
uniform float uCutGain;
uniform float uPower;
varying float vT;
varying float vSide;
varying float vSeed;
varying float vFade;
varying float vKind;
varying float vGroup;
varying float vDist;
void main() {
  float across = 1.0 - abs(vSide);
  float core = across * across;
  float ph = fract(vT * uPulses - uTime * uSpeed * (0.75 + fract(vSeed * 3.7) * 0.5) + vSeed * 17.0);
  float pulse = pow(ph, 14.0);
  float ends = smoothstep(0.0, uEnds.x, vT) * (1.0 - smoothstep(1.0 - uEnds.y, 1.0, vT));
  int g = int(vGroup + 0.5);
  vec3 col = uColors[int(vKind + 0.5)];
  float gain = uGroups[g];
  float fog = 1.0 - smoothstep(uFog.x, uFog.y, vDist);
  // a salvo: one bright packet per strand racing to the wall, staggered, with a short tail
  float head = (uTime - uSalvo[g]) / uTravel - fract(vSeed * 7.31) * 0.22;
  float live = step(0.0, head) * step(head, 1.04);
  float bolt = (exp(-pow((vT - head) * 16.0, 2.0)) + smoothstep(head - 0.3, head, vT) * step(vT, head) * 0.3) * live;
  // right after a firewall shockwave the floods are cut back from the wall
  float cut = 1.0 - uCut * uCutGain * smoothstep(0.4, 0.97, vT);
  float b = ((uBase + pulse * uGain) * gain + bolt * uBolt) * core * ends * vFade * uLevel * fog * cut * uPower;
  gl_FragColor = vec4(col * b, 1.0);
}
`;

export type RibbonLook = {
  colors: [THREE.ColorRepresentation, THREE.ColorRepresentation, THREE.ColorRepresentation];
  speed: number;
  pulses: number;
  base: number;
  gain: number;
  jitter?: number;
  ends?: [number, number];
  /** brightness of the salvo packets (floods only) */
  bolt?: number;
  /** whether the firewall's shockwave cuts these strands back */
  cuts?: boolean;
};

export function createRibbonMaterial(u: SceneUniforms, look: RibbonLook) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: u.uTime,
      uPixel: u.uPixel,
      uJitter: { value: look.jitter ?? 0 },
      uSpeed: { value: look.speed },
      uPulses: { value: look.pulses },
      uBase: { value: look.base },
      uGain: { value: look.gain },
      uLevel: { value: 1 },
      uColors: { value: look.colors.map((c) => new THREE.Color(c)) },
      uGroups: { value: [1, 1, 1] },
      uFog: { value: new THREE.Vector2(18, 48) },
      uEnds: { value: new THREE.Vector2(...(look.ends ?? [0.1, 0.08])) },
      uSalvo: u.uSalvo,
      uTravel: { value: TRAVEL },
      uBolt: { value: look.bolt ?? 0 },
      uCut: u.uCut,
      uCutGain: { value: look.cuts ? 1 : 0 },
      uPower: u.uPower,
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}
