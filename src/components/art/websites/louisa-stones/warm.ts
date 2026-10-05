import * as THREE from "three";
import { Effect, Pass, type EffectComposer } from "postprocessing";

/** A one-off pause, so each step of the warm-up runs in its own task. */
export const pause = (ms = 0) => new Promise<void>((r) => setTimeout(r, ms));

/** Every material the composer will draw with: the passes' full-screen
 *  materials and the ones they and their effects keep in fields of their own
 *  (blur chains swap theirs in and out). */
export function postMaterials(composer: EffectComposer): THREE.Material[] {
  const out = new Set<THREE.Material>();
  const seen = new Set<object>();
  const walk = (o: Pass | Effect) => {
    if (seen.has(o)) return;
    seen.add(o);
    if (o instanceof Pass && o.fullscreenMaterial) out.add(o.fullscreenMaterial);
    for (const v of Object.values(o)) {
      if (v instanceof THREE.Material) out.add(v);
      else if (v instanceof Pass || v instanceof Effect) walk(v);
      else if (Array.isArray(v)) for (const e of v) if (e instanceof Pass || e instanceof Effect) walk(e);
    }
  };
  for (const p of composer.passes) walk(p);
  return [...out];
}

/** Upload the textures a material samples (its maps and uniforms, one
 *  level into structs such as a BVH), so the first frame uploads none. */
function upload(gl: THREE.WebGLRenderer, material: THREE.Material) {
  const seen = new Set<unknown>();
  const visit = (v: unknown, depth: number) => {
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (v instanceof THREE.Texture) {
      if (!(v as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) gl.initTexture(v);
      return;
    }
    if (depth > 0) for (const x of Object.values(v)) visit(x, depth - 1);
  };
  for (const v of Object.values(material)) visit(v, 0);
  const uniforms = (material as THREE.ShaderMaterial).uniforms;
  if (uniforms) for (const u of Object.values(uniforms)) visit(u.value, 1);
}

/**
 * Compile each object's programs one per task, in parallel on the driver
 * (KHR_parallel_shader_compile), so the first frame never compiles. Scene
 * meshes draw into the composer's linear half-float targets; full-screen
 * materials (`screen`) are built for both a target and the canvas, since
 * the last pass draws to the canvas.
 */
export async function compileAll(gl: THREE.WebGLRenderer, camera: THREE.Camera, scene: THREE.Scene, parts: THREE.Object3D[], screen: THREE.Material[], cancelled: () => boolean) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const tri = new THREE.PlaneGeometry(2, 2);
  const flat = new THREE.OrthographicCamera();
  const jobs: [THREE.Object3D, THREE.Camera, THREE.WebGLRenderTarget | null][] = [
    ...parts.map((p): [THREE.Object3D, THREE.Camera, THREE.WebGLRenderTarget | null] => [p, camera, target]),
    ...screen.flatMap((m): [THREE.Object3D, THREE.Camera, THREE.WebGLRenderTarget | null][] => {
      const quad = new THREE.Mesh(tri, m);
      return [
        [quad, flat, target],
        [quad, flat, null],
      ];
    }),
  ];
  try {
    for (const [part, view, into] of jobs) {
      await pause();
      if (cancelled()) return false;
      const materials = (part as THREE.Mesh).material;
      for (const m of Array.isArray(materials) ? materials : materials ? [materials] : []) upload(gl, m);
      const previous = gl.getRenderTarget();
      gl.setRenderTarget(into);
      const done = gl.compileAsync(part, view, scene);
      gl.setRenderTarget(previous);
      await done;
    }
    return !cancelled();
  } finally {
    target.dispose();
    tri.dispose();
  }
}
