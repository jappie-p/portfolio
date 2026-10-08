import * as THREE from "three";
import { BlendFunction, Effect } from "postprocessing";

const FRAG = /* glsl */ `
uniform float uContrast;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = max(inputColor.rgb, vec3(0.0));
  outputColor = vec4(0.18 * pow(c / 0.18, vec3(uContrast)), inputColor.a);
}
`;

/** Blender's "AgX - Medium High Contrast" look, before the AgX tone mapping:
 *  a contrast in log space is a power about mid grey in linear light. Per
 *  channel, so it deepens the colour a touch as well. */
export class LookEffect extends Effect {
  constructor(contrast = 1.2) {
    super("LookEffect", FRAG, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([["uContrast", new THREE.Uniform(contrast)]]),
    });
  }
}
