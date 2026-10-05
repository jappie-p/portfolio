import type * as THREE from "three";

/** Extra shader code for a built-in material: declarations at the top of
 *  each stage, and code spliced in after named chunks. */
export interface Patch {
  uniforms?: Record<string, THREE.IUniform>;
  vertexHead?: string;
  /** after `#include <begin_vertex>`: `transformed` is the object position */
  vertex?: string;
  fragmentHead?: string;
  /** chunk name to the code that runs right after it */
  after?: Record<string, string>;
  /** chunk name to the code that replaces it */
  replace?: Record<string, string>;
}

/**
 * Splice a patch into a material's shaders. The cache key keeps three from
 * handing a patched program to an unpatched material of the same kind.
 */
export function patchMaterial<M extends THREE.Material>(material: M, key: string, patch: Patch): M {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, patch.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${patch.vertexHead ?? ""}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${patch.vertex ?? ""}`);
    let frag = shader.fragmentShader.replace("#include <common>", `#include <common>\n${patch.fragmentHead ?? ""}`);
    for (const [chunk, code] of Object.entries(patch.replace ?? {})) frag = frag.replace(`#include <${chunk}>`, code);
    for (const [chunk, code] of Object.entries(patch.after ?? {})) frag = frag.replace(`#include <${chunk}>`, `#include <${chunk}>\n${code}`);
    shader.fragmentShader = frag;
  };
  material.customProgramCacheKey = () => key;
  return material;
}
