import * as THREE from "three";
import { leafMask, oakBoard, oakPlanks, speckle } from "./textures";
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
      .replace("#include <opaque_fragment>", `#include <opaque_fragment>${lit ? GLOW : ""}${MUTE}`);
  };
  m.customProgramCacheKey = () => (lit ? "toned-lit" : "toned-basic");
  return m;
}

type Std = THREE.MeshStandardMaterialParameters;
type Phys = THREE.MeshPhysicalMaterialParameters;

/** The room's shared textures, made once. */
export function makeTextures(anisotropy: number) {
  const floor = oakPlanks(anisotropy);
  floor.repeat.set(0.5, 0.5);
  return { floor, board: oakBoard(anisotropy), leaf: leafMask(anisotropy), speckle: speckle(anisotropy) };
}
export type Textures = ReturnType<typeof makeTextures>;

/**
 * The room's palette, bound to one tone: a warm, lived-in Scandinavian room
 * in light oak and cream plaster, black steel and green. Every material is
 * made the first time it is asked for and kept; ask for one by name, or
 * make your own and pass it through `toned`.
 */
export function makeMaterials(tex: Textures, t: Tone) {
  const made = new Map<string, THREE.Material>();
  const std = (name: string, p: Std) => () => {
    if (!made.has(name)) made.set(name, toned(new THREE.MeshStandardMaterial(p), t));
    return made.get(name) as THREE.MeshStandardMaterial;
  };
  const phys = (name: string, p: Phys) => () => {
    if (!made.has(name)) made.set(name, toned(new THREE.MeshPhysicalMaterial(p), t));
    return made.get(name) as THREE.MeshPhysicalMaterial;
  };
  const basic = (name: string, p: THREE.MeshBasicMaterialParameters) => () => {
    if (!made.has(name)) made.set(name, toned(new THREE.MeshBasicMaterial({ toneMapped: false, ...p }), t));
    return made.get(name) as THREE.MeshBasicMaterial;
  };
  return {
    // wood
    oakFloor: std("oakFloor", { map: tex.floor, roughness: 0.48, metalness: 0 }),
    oak: std("oak", { map: tex.board, roughness: 0.42, metalness: 0 }),
    walnut: std("walnut", { color: "#5a3c26", roughness: 0.5 }),
    // walls
    plaster: std("plaster", { color: "#efe6d6", roughness: 0.92, roughnessMap: tex.speckle }),
    cream: std("cream", { color: "#f4ede1", roughness: 0.6 }),
    // metal
    black: std("black", { color: "#1d1e20", roughness: 0.5, metalness: 0.35, roughnessMap: tex.speckle }),
    graphite: std("graphite", { color: "#34373b", roughness: 0.4, metalness: 0.6 }),
    steel: std("steel", { color: "#a7adb3", roughness: 0.32, metalness: 1 }),
    alu: std("alu", { color: "#d3d7db", roughness: 0.22, metalness: 1 }),
    chrome: std("chrome", { color: "#ffffff", roughness: 0.06, metalness: 1 }),
    brass: std("brass", { color: "#c9a24a", roughness: 0.3, metalness: 1 }),
    bronze: std("bronze", { color: "#a86f3c", roughness: 0.32, metalness: 1 }),
    gold: std("gold", { color: "#e2b65a", roughness: 0.22, metalness: 1 }),
    silver: std("silver", { color: "#cfd3d8", roughness: 0.2, metalness: 1 }),
    // plastics, rubber, glass
    rubber: std("rubber", { color: "#141414", roughness: 0.92 }),
    plasticBlack: std("plasticBlack", { color: "#202124", roughness: 0.38 }),
    plasticWhite: std("plasticWhite", { color: "#f1f0ec", roughness: 0.35 }),
    glass: phys("glass", { color: "#dfeeee", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.6 }),
    // fabric and leather
    fabricGreen: phys("fabricGreen", { color: "#2f5a3c", roughness: 1, sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color("#7fa786") }),
    fabricGrey: phys("fabricGrey", { color: "#8b8984", roughness: 1, sheen: 0.8, sheenRoughness: 0.7, sheenColor: new THREE.Color("#d6d2c8") }),
    fabricSand: phys("fabricSand", { color: "#cdbb9a", roughness: 1, sheen: 0.8, sheenRoughness: 0.7, sheenColor: new THREE.Color("#efe3c8") }),
    leather: std("leather", { color: "#4a3022", roughness: 0.55 }),
    // pots, paper, plants
    ceramic: std("ceramic", { color: "#e6dccb", roughness: 0.55 }),
    stoneware: std("stoneware", { color: "#4b4a46", roughness: 0.75, roughnessMap: tex.speckle }),
    terracotta: std("terracotta", { color: "#b7643e", roughness: 0.85 }),
    paper: std("paper", { color: "#f6f1e6", roughness: 0.9 }),
    leaf: std("leaf", { color: "#3f7a3a", roughness: 0.55, alphaMap: tex.leaf, alphaTest: 0.5, side: THREE.DoubleSide }),
    leafDark: std("leafDark", { color: "#2c5a2c", roughness: 0.6, alphaMap: tex.leaf, alphaTest: 0.5, side: THREE.DoubleSide }),
    leafLight: std("leafLight", { color: "#6a9a45", roughness: 0.55, alphaMap: tex.leaf, alphaTest: 0.5, side: THREE.DoubleSide }),
    soil: std("soil", { color: "#2b2118", roughness: 1 }),
    // the brand's green, and light that glows of its own
    brand: std("brand", { color: "#1f4a32", roughness: 0.5 }),
    ledGreen: basic("ledGreen", { color: new THREE.Color(0.3, 2.4, 0.9) }),
    ledAmber: basic("ledAmber", { color: new THREE.Color(2.4, 1.2, 0.25) }),
    ledBlue: basic("ledBlue", { color: new THREE.Color(0.35, 0.9, 2.6) }),
    warmLight: basic("warmLight", { color: new THREE.Color(3.2, 2.3, 1.4) }),
    /** a material of your own, toned like the rest of the piece and kept by name */
    own: <T extends THREE.Material>(name: string, make: () => T): T => {
      if (!made.has(name)) made.set(name, toned(make(), t));
      return made.get(name) as T;
    },
    /** the piece's tone itself */
    tone: t,
    /** everything made so far, to dispose */
    all: () => [...made.values()],
  };
}
export type Materials = ReturnType<typeof makeMaterials>;
