import * as THREE from "three";
import type { Tone } from "./types";

/** A fresh tone: not muted, not lit up. */
export const tone = (): Tone => ({ uMute: { value: 0 }, uGlow: { value: 0 } });

/** The light a piece gives when you point at it: warm, mostly at its rim. */
const GLOW = /* glsl */ `
  {
    vec3 viewDir = normalize(vViewPosition);
    float rim = pow(1.0 - clamp(abs(dot(normal, viewDir)), 0.0, 1.0), 2.5);
    gl_FragColor.rgb += uGlow * vec3(1.0, 0.8, 0.52) * (0.05 + 0.4 * rim);
  }`;

/** The same for a material that takes no light of its own (the baked
 *  room): it brightens and warms a touch. */
const GLOW_BASIC = /* glsl */ `
  gl_FragColor.rgb += uGlow * (gl_FragColor.rgb * 0.22 + vec3(0.035, 0.026, 0.014));`;

/** Muted while a filter leaves it out: greyed and dimmed into the room. */
const MUTE = /* glsl */ `
  {
    float grey = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(grey) * 0.55 + vec3(0.012, 0.011, 0.01), uMute * 0.82);
  }`;

/** Hook a material up to a piece's tone (the same program for every piece:
 *  only the uniforms differ). Lit materials also take the glow at their rim. */
export function toned<T extends THREE.Material>(m: T, t: Tone): T {
  const lit = !(m as unknown as THREE.MeshBasicMaterial).isMeshBasicMaterial;
  m.onBeforeCompile = (s) => {
    s.uniforms.uMute = t.uMute;
    s.uniforms.uGlow = t.uGlow;
    s.fragmentShader = s.fragmentShader
      .replace("void main() {", "uniform float uMute;\nuniform float uGlow;\nvoid main() {")
      .replace("#include <opaque_fragment>", `#include <opaque_fragment>${lit ? GLOW : GLOW_BASIC}${MUTE}`);
  };
  m.customProgramCacheKey = () => (lit ? "toned-lit" : "toned-basic");
  return m;
}
