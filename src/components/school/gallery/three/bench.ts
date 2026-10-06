import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Room } from "../layout";
import { HEAD, LIGHT, NOISE, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { NEAR } from "./focus";
import { MIRRORED } from "./reflector";

const LEATHER = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 cameraPosition;
${OUT}
${LIGHT}
${NOISE}
void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  // black leather: a fine pebbled grain over a slow ripple where it is sat on
  vec4 g = grain(vWorld.xz * 7.0 + vWorld.y * 3.1);
  vec4 r = grain(vWorld.xz * 0.9 + 0.4);
  vec3 n = normalize(normalize(vNormal) + (g.rgb - 0.5) * 0.05 + (r.rgb - 0.5) * 0.08);
  vec3 light = uAmbient * 3.0 + glows(vWorld, n);
  vec3 sheen = vec3(0.0);
  for (int i = 0; i < SPOTS; i++) {
    vec3 L;
    light += spot(i, vWorld, L) * max(dot(n, L), 0.0);
    // the lamps themselves in its sheen, wherever they point
    vec3 d = uSpotPos[i] - vWorld;
    float h = max(dot(n, normalize(normalize(d) + V)), 0.0);
    sheen += uSpotCol[i] / (1.0 + dot(d, d)) * (pow(h, 60.0) + 0.04 * pow(h, 8.0));
  }
  float fres = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  // the lit room behind it, caught along its top and the edges turned toward
  // the works: what gives it its shape once it is out of focus
  vec3 room = vec3(0.11, 0.08, 0.055) * (0.5 * pow(1.0 - max(dot(n, V), 0.0), 2.0) + 0.3 * max(n.y, 0.0) + 0.35 * max(n.x, 0.0));
  emit(vec3(0.03, 0.026, 0.023) * light + sheen * (0.12 + 0.6 * fres) + room, 1.0);
}
`;

const SHADOW_FRAG = /* glsl */ `${HEAD}
in vec2 vUv;
${OUT}
void main() {
  // the dark it keeps under itself on the floor, soft all round
  vec2 q = abs(vUv - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.55, 1.0, q.x)) * (1.0 - smoothstep(0.3, 1.0, q.y));
  emit(vec3(0.0), a * 0.75);
}
`;

/** A seat that reads as leather: soft-edged, so the light runs along its edges. */
const pad = (w: number, h: number, d: number, r: number, x: number, y: number) => new RoundedBoxGeometry(w, h, d, 4, r).translate(x, y, 0);

/** The bench's length along the wall and its depth, metres. */
const SIZE = { long: 1.34, deep: 0.5 };

/**
 * A black leather gallery bench out in the room by the way in, seen low
 * and out of focus from the entrance: a long cushion on a recessed base, a square
 * arm at its far end, little feet. Lit by the spots, the lamps caught in its
 * sheen, seen again in the floor; only the wide room has one.
 */
export function makeBench(shared: Shared) {
  const parts = [
    pad(1.12, 0.15, SIZE.deep, 0.045, -0.11, 0.39),
    pad(0.22, 0.54, SIZE.deep, 0.04, 0.56, 0.34),
    pad(1.26, 0.24, SIZE.deep - 0.08, 0.012, 0, 0.19),
    ...[-0.56, 0.56].flatMap((x) => [-0.17, 0.17].map((z) => new THREE.BoxGeometry(0.05, 0.07, 0.05).translate(x, 0.035, z).toNonIndexed())),
  ];
  const geometry = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  const body = new THREE.Mesh(
    geometry,
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: LEATHER, uniforms: { ...shared } }),
  );
  // right in front of the entrance's lens: drawn out of focus (see focus.ts)
  body.layers.set(NEAR);
  body.layers.enable(MIRRORED);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(SIZE.long + 0.3, SIZE.deep + 0.3).rotateX(-Math.PI / 2).translate(0, 0.002, 0),
    new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: SHADOW_FRAG, uniforms: { ...shared }, transparent: true, depthWrite: false }),
  );
  shadow.renderOrder = 1;
  const group = new THREE.Group();
  group.add(body, shadow);
  return {
    group,
    /** Stand it for a room: out in the room right in front of the way in,
     *  low at the left of the entrance's view, along the wall like the
     *  works it faces. */
    place(room: Room) {
      const p = room.stations[0];
      group.position.set(p.x + Math.sin(p.yaw) * 2.5 - Math.cos(p.yaw) * 0.85, 0, p.z - Math.cos(p.yaw) * 2.5 - Math.sin(p.yaw) * 0.85);
      group.scale.setScalar(0.92);
      group.visible = !room.narrow;
    },
  };
}

export type Bench = ReturnType<typeof makeBench>;
