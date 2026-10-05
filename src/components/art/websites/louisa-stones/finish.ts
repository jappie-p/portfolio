import * as THREE from "three";
import { BlendFunction, Effect } from "postprocessing";

const FRAG = /* glsl */ `
uniform vec3 uPage;
uniform vec2 uSize;
uniform float uHeader;
uniform float uGrain;
float fin_hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 px = vec2(uv.x, 1.0 - uv.y) * uSize;
  vec3 col = inputColor.rgb;
  // the lens darkens toward the corners
  vec2 d = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0);
  col *= 1.0 - 0.4 * smoothstep(0.3, 1.0, length(d));
  // near black under the site header, and the page's own dark at the sides,
  // so the panel meets its neighbours seamlessly
  float head = 1.0 - smoothstep(uHeader * 0.5, uHeader * 1.5, px.y);
  float side = 1.0 - clamp(min(px.x, uSize.x - px.x) / (uSize.x * 0.045), 0.0, 1.0);
  col = mix(col, uPage, clamp(max(head * 0.92, side * side), 0.0, 1.0));
  // a faint grain, even in perceptual terms
  vec3 g = pow(max(col, 0.0), vec3(1.0 / 2.2)) + (fin_hash(gl_FragCoord.xy) - 0.5) * uGrain;
  outputColor = vec4(pow(max(g, 0.0), vec3(2.2)), inputColor.a);
}
`;

/** The last touches, after tone mapping: lens falloff, the page's dark
 *  under the header and at the edges, and film grain (which also keeps the
 *  dark gradients from banding). */
export class FinishEffect extends Effect {
  constructor() {
    super("FinishEffect", FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uPage", new THREE.Uniform(new THREE.Color("#05080d"))],
        ["uSize", new THREE.Uniform(new THREE.Vector2(1, 1))],
        ["uHeader", new THREE.Uniform(60)],
        ["uGrain", new THREE.Uniform(0.022)],
      ]),
    });
  }

  /** The canvas in CSS px, and how tall the site header over it is. */
  frame(w: number, h: number, header: number) {
    (this.uniforms.get("uSize")!.value as THREE.Vector2).set(w, h);
    this.uniforms.get("uHeader")!.value = header;
  }
}
