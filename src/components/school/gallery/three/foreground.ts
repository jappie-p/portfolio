import * as THREE from "three";
import type { Room } from "../layout";
import { NEAR } from "./focus";
import { HEAD, OUT } from "./glsl";

const VERT = /* glsl */ `${HEAD}
in vec3 position;
in vec2 uv;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform vec2 uSize;
out vec2 vUv;
void main() {
  // a card that always faces the eye
  vUv = uv;
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
uniform sampler2D uMap;
uniform float uLevel;
${OUT}
vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
void main() {
  vec4 c = texture(uMap, vUv);
  if (c.a < 0.004) discard;
  emit(srgbToLinear(c.rgb / max(c.a, 1e-3)) * uLevel, c.a);
}
`;

/** How far right of the canvas a blurred shape is drawn. */
export const OFF = 4000;

/** Draw a shape already out of focus: canvas shadows blur in every browser,
 *  so the shape itself is drawn OFF to the right of the canvas (`draw` adds
 *  OFF to its x) and only its shadow lands. The shadow's offset is in
 *  canvas pixels, whatever the transform. */
export function blurred(g: CanvasRenderingContext2D, color: string, blur: number, draw: (g: CanvasRenderingContext2D) => void) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.shadowOffsetX = -OFF;
  g.fillStyle = "#000";
  draw(g);
  g.restore();
}

/** Leaves at the very corner of the view, close enough to be a green blur. */
function leaves() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d")!;
  const leaf = (x: number, y: number, a: number, l: number, color: string) =>
    blurred(g, color, 18, (g) => {
      g.save();
      g.translate(x + OFF, y);
      g.rotate(a);
      g.beginPath();
      g.ellipse(l / 2, 0, l / 2, l / 6, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
  leaf(10, 210, -0.9, 170, "rgba(34, 72, 30, 0.95)");
  leaf(60, 240, -1.25, 150, "rgba(48, 96, 38, 0.9)");
  leaf(0, 150, -0.35, 140, "rgba(26, 56, 24, 0.92)");
  leaf(110, 250, -1.6, 120, "rgba(70, 122, 50, 0.8)");
  return c;
}

function card(canvas: HTMLCanvasElement, size: [number, number]) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.premultiplyAlpha = true;
  const level = { value: 1 };
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: texture }, uSize: { value: new THREE.Vector2(...size) }, uLevel: level, uScreen: { value: 1 } },
      transparent: true,
      depthWrite: false,
    }),
  );
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.layers.set(NEAR);
  return { mesh, texture, level };
}

/**
 * What stands between you and the room at the entrance, out of focus: a
 * plant's leaves at the corner of the view. Painted once already blurred
 * (there is no depth of field here), on a card that faces the eye; only the
 * wide room's entrance has it.
 */
export function makeForeground() {
  const corner = card(leaves(), [0.6, 0.6]);
  const group = new THREE.Group();
  group.add(corner.mesh);
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  let wide = true;
  return {
    group,
    textures: [corner.texture],
    /** Stand it in front of the entrance's view, low and to the left. */
    place(room: Room) {
      wide = !room.narrow;
      const p = room.stations[0];
      fwd.set(Math.sin(p.yaw), 0, -Math.cos(p.yaw));
      right.set(Math.cos(p.yaw), 0, Math.sin(p.yaw));
      corner.mesh.position.set(p.x, 0.6, p.z).addScaledVector(fwd, 0.9).addScaledVector(right, -0.48);
    },
    /** the room's light coming on; `here` how near the walk still is to the
     *  entrance (it belongs to its view and goes as you walk on) */
    light(level: number, here: number) {
      corner.level.value = level * here;
      group.visible = wide && here > 0.002;
    },
  };
}

export type Foreground = ReturnType<typeof makeForeground>;
