import * as THREE from "three";
import { LIP, outerH, outerW, type Work } from "../layout";
import { HEAD, LIGHT, OUT, VERT } from "./glsl";
import type { Shared } from "./lights";
import { FACE_FRAG } from "./face";

const FRAME_FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
uniform vec3 cameraPosition;
uniform int uSpot;
uniform vec3 uTint;
${OUT}
${LIGHT}
void main() {
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L;
  vec3 lamp = spot(uSpot, vWorld, L);
  float nv = max(dot(n, V), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 70.0);
  // satin black: dark body, a crisp highlight where the top edge meets the light
  vec3 col = uTint * (uAmbient * 2.5 + lamp * max(dot(n, L), 0.0)) + lamp * spec * (0.05 + 0.6 * F);
  col += vec3(0.006, 0.006, 0.007) * pow(1.0 - nv, 2.0);
  emit(col, 1.0);
}
`;

const BEVEL = 0.005;

function frameGeometry(w: Work) {
  const ow = outerW(w) / 2;
  const oh = outerH(w) / 2;
  const iw = ow - w.frame;
  const ih = oh - w.frame;
  const shape = new THREE.Shape([new THREE.Vector2(-ow, -oh), new THREE.Vector2(ow, -oh), new THREE.Vector2(ow, oh), new THREE.Vector2(-ow, oh)]);
  shape.holes.push(new THREE.Path([new THREE.Vector2(-iw, -ih), new THREE.Vector2(-iw, ih), new THREE.Vector2(iw, ih), new THREE.Vector2(iw, -ih)]));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: w.depth - 2 * BEVEL,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL * 0.8,
    bevelOffset: -BEVEL * 0.8,
    bevelSegments: 3,
    curveSegments: 1,
  });
  g.translate(0, 0, BEVEL);
  return g;
}

export type ArtworkOptions = {
  spot: number;
  map: THREE.Texture | null;
  /** the slice of the texture the picture shows: offset and size, in uv */
  crop: THREE.Vector4;
  video?: { texture: THREE.Texture; homography: THREE.Matrix3; mix: { value: number } };
};

/**
 * One framed work: a satin black frame standing off the wall, and inside it a
 * single face carrying the mat, the bevelled window cut into it, the print
 * and the glass over all of it. The group pivots at its centre so it can lean
 * toward the pointer.
 */
export function makeArtwork(work: Work, shared: Shared, opts: ArtworkOptions) {
  const group = new THREE.Group();
  const frame = new THREE.Mesh(
    frameGeometry(work),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FRAME_FRAG,
      uniforms: { ...shared, uSpot: { value: opts.spot }, uTint: { value: new THREE.Color(0.018, 0.017, 0.017) } },
    }),
  );
  frame.position.z = -work.depth / 2;

  const fw = outerW(work) - 2 * work.frame;
  const fh = outerH(work) - 2 * work.frame;
  const uniforms = {
    ...shared,
    uSpot: { value: opts.spot },
    uMap: { value: opts.map },
    uCrop: { value: opts.crop },
    uSize: { value: new THREE.Vector2(fw, fh) },
    uPic: { value: new THREE.Vector2(work.w, work.h) },
    uLip: { value: LIP },
    uLevel: { value: 0 },
    uNorm: { value: 1 },
    uRaw: { value: 0 },
    uGlare: { value: new THREE.Vector3(0.5, 0.5, 0) },
    uVideo: { value: opts.video?.texture ?? null },
    uHomography: { value: opts.video?.homography ?? new THREE.Matrix3() },
    uVideoMix: opts.video?.mix ?? { value: 0 },
  };
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(fw, fh),
    new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: VERT,
      fragmentShader: FACE_FRAG,
      defines: opts.video ? { VIDEO: "" } : {},
      uniforms,
    }),
  );
  face.position.z = work.depth / 2 - LIP;
  group.add(frame, face);
  group.position.set(work.x, work.y, work.depth / 2);
  return { group, frame, face, uniforms, work };
}

export type Artwork = ReturnType<typeof makeArtwork>;
