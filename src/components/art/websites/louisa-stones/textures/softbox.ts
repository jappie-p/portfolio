import * as THREE from "three";

/**
 * The face of a softbox: an even plateau that falls off softly at the
 * edges, a touch hotter in the middle. Reflected in polished stone, that
 * falloff is what tells a real studio light from a white card.
 */
export function softboxTexture(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const edge = (t: number) => {
    const e = Math.min(t, 1 - t) / 0.34;
    const s = Math.min(1, Math.max(0, e));
    return s * s * (3 - 2 * s);
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const r2 = (u - 0.5) ** 2 + (v - 0.5) ** 2;
      const value = edge(u) * edge(v) * (0.82 + 0.18 * Math.max(0, 1 - r2 * 4));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = Math.round(value * 255);
      data[i + 3] = 255;
    }
  }
  return dataTexture(data, size);
}

function dataTexture(data: Uint8Array, size: number) {
  const tex = new THREE.DataTexture(data, size, size);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
