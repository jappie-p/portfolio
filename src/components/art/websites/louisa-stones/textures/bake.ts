import * as THREE from "three";

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export interface BakeOptions {
  size: number;
  uniforms?: Record<string, THREE.IUniform>;
  type?: THREE.TextureDataType;
  /** tile it (slate) or clamp it (a stone's face) */
  wrap?: THREE.Wrapping;
}

/**
 * Paint a procedural texture once on the GPU, mipmapped. The shader is
 * compiled ahead (in parallel, for the render target it draws into), so the
 * one draw never stalls a frame.
 */
export async function bake(gl: THREE.WebGLRenderer, fragmentShader: string, { size, uniforms = {}, type = THREE.UnsignedByteType, wrap = THREE.RepeatWrapping }: BakeOptions) {
  const target = new THREE.WebGLRenderTarget(size, size, {
    type,
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: wrap,
    wrapT: wrap,
  });
  target.texture.anisotropy = 4;
  const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  const camera = new THREE.OrthographicCamera();
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(target);
  const compiled = gl.compileAsync(quad, camera);
  gl.setRenderTarget(previous);
  await compiled;
  gl.setRenderTarget(target);
  gl.render(quad, camera);
  gl.setRenderTarget(previous);
  quad.geometry.dispose();
  material.dispose();
  return target;
}

/** Tiling value noise for bakes: `period` lattice cells across the tile. */
export const TILE_NOISE = /* glsl */ `
float tn_hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21) + uSeed);
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float tnoise(vec2 uv, vec2 period) {
  vec2 p = uv * period;
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = tn_hash(mod(i, period));
  float b = tn_hash(mod(i + vec2(1.0, 0.0), period));
  float c = tn_hash(mod(i + vec2(0.0, 1.0), period));
  float d = tn_hash(mod(i + vec2(1.0, 1.0), period));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float tfbm(vec2 uv, vec2 period, int octaves) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 8; i++) {
    if (i >= octaves) break;
    s += a * tnoise(uv, period);
    period *= 2.0;
    a *= 0.5;
  }
  return s;
}
`;
