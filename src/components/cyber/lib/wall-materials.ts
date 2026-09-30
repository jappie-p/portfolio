import * as THREE from "three";
import { HASH_GLSL, WALL_FRAG_DECL, WALL_TINT_GLSL, WALL_VERT_BODY, WALL_VERT_DECL, WALL_VERT_DISPLACE } from "./glsl";
import type { SceneUniforms } from "./uniforms";

// PBR materials for the wall, extended in-shader so a few shared uniforms can
// tint, heat, knock, ripple and power ~150 instanced cells without touching
// them on the CPU.

type Patch = { frag: string; at: "emissive" | "output"; decl?: string; displace?: boolean };

function extend(
  m: THREE.MeshStandardMaterial,
  key: string,
  u: SceneUniforms,
  extra: Record<string, THREE.IUniform>,
  patch: Patch,
) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uTime: u.uTime,
      uImpacts: u.uImpacts,
      uHits: u.uHits,
      uPulse: u.uPulse,
      uBoot: u.uBoot,
      uCursor: u.uCursor,
      uClear: u.uClear,
      uPing: u.uPing,
      ...extra,
    });
    let vert = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${WALL_VERT_DECL}`)
      .replace("#include <project_vertex>", `#include <project_vertex>\n${WALL_VERT_BODY}`);
    if (patch.displace) vert = vert.replace("#include <begin_vertex>", `#include <begin_vertex>\n${WALL_VERT_DISPLACE}`);
    shader.vertexShader = vert;
    const hook = patch.at === "emissive" ? "#include <emissivemap_fragment>" : "#include <opaque_fragment>";
    const inject = patch.at === "emissive" ? `${hook}\n${patch.frag}` : `${patch.frag}\n${hook}`;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${WALL_FRAG_DECL}\n${WALL_TINT_GLSL}\n${HASH_GLSL}\n${patch.decl ?? ""}`)
      .replace(hook, inject);
  };
  m.customProgramCacheKey = () => key;
  return m;
}

/** Brushed steel frames. The colour comes from reflections plus a fresnel-weighted
 *  tint (green/cyan to red along the wall), heat and shockwaves; unpowered steel
 *  sits dark until the power-on sweep passes. */
export function createBezelMaterial(u: SceneUniforms) {
  const m = new THREE.MeshStandardMaterial({ color: "#c9d2dc", metalness: 1, roughness: 0.3, envMapIntensity: 1.15 });
  return extend(m, "cyber-bezel", u, {}, {
    at: "output",
    displace: true,
    frag: /* glsl */ `{
      vec3 V = normalize(vViewPosition);
      float fres = pow(1.0 - clamp(dot(normal, V), 0.0, 1.0), 2.5);
      float on = cyOn(vCyCenter.x);
      float heat = cyHeat(vCyWorld);
      float ripple = cyRipple(vCyCenter);
      float wave = cyWave(vCyCenter);
      float flash = cyFlash(vCyCenter.x);
      outgoingLight *= mix(0.3, 1.0, on);
      outgoingLight += cyTint(vCyS) * (0.01 + fres * 0.13) * on;
      outgoingLight += vec3(1.0, 0.12, 0.2) * heat * (0.04 + fres * 0.55);
      float cursor = cyCursor(vCyCenter);
      float clear = cyClear(vCyCenter);
      outgoingLight += vec3(1.0, 0.16, 0.26) * ripple * (0.06 + fres * 0.9);
      outgoingLight += vec3(0.3, 0.85, 1.0) * wave * (0.1 + fres * 1.0);
      outgoingLight += vec3(0.6, 0.95, 1.0) * flash * (0.25 + fres * 1.2);
      float ping = cyPing(vCyCenter);
      outgoingLight += vec3(0.4, 0.95, 1.0) * cursor * (0.08 + fres * 1.1);
      outgoingLight += vec3(0.6, 1.0, 1.0) * ping * (0.1 + fres * 1.2);
      outgoingLight += vec3(0.3, 1.0, 0.6) * clear * (0.1 + fres * 1.1);
    }`,
  });
}

/** Smoked-glass cell faces with a glowing etched icon (atlas R = glyph, G = halo). */
export function createFaceMaterial(u: SceneUniforms, atlas: THREE.Texture, faceR: number) {
  const m = new THREE.MeshStandardMaterial({ color: "#06101b", metalness: 0.45, roughness: 0.22, envMapIntensity: 0.85 });
  return extend(m, "cyber-face", u, { uAtlas: { value: atlas }, uFaceR: { value: faceR } }, {
    at: "emissive",
    displace: true,
    decl: "uniform sampler2D uAtlas;\nuniform float uFaceR;",
    frag: /* glsl */ `{
      vec2 q = vCyLocal / uFaceR;
      vec2 a = abs(q);
      float hd = max(a.y, dot(a, vec2(0.8660254, 0.5))) - 0.8660254;
      float rim = 1.0 - smoothstep(0.0, 0.04, abs(hd + 0.16));
      vec2 iuv = q * 0.6 + 0.5;
      float inside = step(0.0, iuv.x) * step(iuv.x, 1.0) * step(0.0, iuv.y) * step(iuv.y, 1.0) * step(-0.5, vCyIcon);
      vec2 cell = vec2(mod(max(vCyIcon, 0.0), 4.0), floor(max(vCyIcon, 0.0) / 4.0 + 0.01));
      vec2 glyph = texture2D(uAtlas, (cell + clamp(vec2(iuv.x, 1.0 - iuv.y), 0.0, 1.0)) * 0.25).rg * inside;
      float red = smoothstep(0.9, 2.6, vCyS);
      vec3 cool = mix(vec3(0.3, 1.0, 0.72), vec3(0.35, 0.82, 1.0), smoothstep(-2.4, -0.6, vCyS));
      vec3 ink = mix(cool, vec3(1.0, 0.62, 0.7), red);
      float flick = 0.8 + 0.2 * sin(uTime * (0.9 + vCySeed * 1.7) + vCySeed * 31.0);
      float level = 0.55 + 0.45 * cyHash(vCySeed * 57.0);
      float on = cyOn(vCyCenter.x);
      float flash = cyFlash(vCyCenter.x);
      float heat = cyHeat(vCyWorld);
      float ripple = cyRipple(vCyCenter);
      float wave = cyWave(vCyCenter);
      vec3 add = ink * (glyph.x * 1.35 + glyph.y * 0.3) * flick * level * on;
      add += ink * rim * 0.22 * on;
      add += vec3(0.6, 0.95, 1.0) * flash * (0.5 + glyph.x * 2.2 + rim * 2.6);
      add += vec3(1.0, 0.1, 0.18) * heat * (0.12 + glyph.x * 1.4 + rim) * on;
      float cursor = cyCursor(vCyCenter);
      float clear = cyClear(vCyCenter);
      add += vec3(1.0, 0.16, 0.26) * ripple * (0.3 + rim * 2.4 + glyph.x * 1.4);
      add += vec3(0.35, 0.9, 1.0) * wave * (0.2 + rim * 2.4 + glyph.x * 1.4);
      float ping = cyPing(vCyCenter);
      add += vec3(0.35, 0.95, 1.0) * cursor * (0.3 + rim * 3.0 + glyph.x * 1.8);
      add += vec3(0.6, 1.0, 1.0) * ping * (0.3 + rim * 2.6 + glyph.x * 1.6);
      add += vec3(0.3, 1.0, 0.6) * clear * (0.25 + rim * 2.6 + glyph.x * 1.6);
      totalEmissiveRadiance += add;
    }`,
  });
}

/** Dark machinery behind the cells, with blinking status slits that follow the wall tint. */
export function createModuleMaterial(u: SceneUniforms) {
  const m = new THREE.MeshStandardMaterial({ color: "#1b2533", metalness: 0.85, roughness: 0.42, envMapIntensity: 0.7 });
  m.defines = { USE_UV: "" };
  return extend(m, "cyber-module", u, {}, {
    at: "emissive",
    frag: /* glsl */ `{
      float slit = (1.0 - smoothstep(0.0, 0.07, abs(vUv.y - 0.5))) * step(0.12, vUv.x) * step(vUv.x, 0.88);
      float blink = step(0.3, cyHash(vCySeed * 91.0 + floor(uTime * (0.4 + vCySeed))));
      float on = cyOn(vCyS);
      float heat = cyHeat(vCyWorld);
      totalEmissiveRadiance += cyTint(vCyS) * slit * (0.5 + 1.1 * blink) * on;
      totalEmissiveRadiance += vec3(0.6, 0.95, 1.0) * slit * cyFlash(vCyS) * 3.0;
      totalEmissiveRadiance += vec3(1.0, 0.1, 0.16) * heat * slit * 2.0;
    }`,
  });
}
