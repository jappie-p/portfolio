import * as THREE from "three";

/** The game's window in the Zelda print (zelda.webp, 1920 by 1200), corner by
 *  corner: top left, top right, bottom right, bottom left. The window leans a
 *  little in the capture, so it is a quad, not a rectangle. */
const WINDOW: [number, number][] = [
  [307.5, 375],
  [896.5, 386],
  [897, 891],
  [307, 902.5],
];

/** Solve the 8 unknowns of the homography taking the four points to the unit
 *  square (Gaussian elimination; the system is small and well conditioned). */
export function homography(quad: [number, number][]): THREE.Matrix3 {
  const to = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  const A: number[][] = [];
  quad.forEach(([x, y], i) => {
    const [u, v] = to[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y, u]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y, v]);
  });
  for (let c = 0; c < 8; c++) {
    let pivot = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[pivot][c])) pivot = r;
    [A[c], A[pivot]] = [A[pivot], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const h = A.map((row, i) => row[8] / row[i]);
  // Matrix3.set takes rows; GLSL multiplies it as written
  return new THREE.Matrix3().set(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1);
}

/** The Zelda trailer as a texture, loaded only once the print comes into
 *  view and playing only while it is. `mix` fades it in over the still once
 *  frames arrive, so the window never flashes black. */
export class Trailer {
  readonly mix = { value: 0 };
  readonly homography = homography(WINDOW);
  readonly texture: THREE.VideoTexture;
  private readonly video: HTMLVideoElement;
  private started = false;
  private playing = false;

  constructor(private readonly base: string) {
    const v = document.createElement("video");
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = "none";
    v.setAttribute("aria-hidden", "true");
    this.video = v;
    this.texture = new THREE.VideoTexture(v);
    this.texture.colorSpace = THREE.NoColorSpace;
    this.texture.generateMipmaps = false;
    this.texture.minFilter = THREE.LinearFilter;
  }

  /** Call every frame with whether the print is on screen. */
  update(shown: boolean, dt: number) {
    const v = this.video;
    if (shown && !this.playing) {
      if (!this.started) {
        this.started = true;
        v.src = `${this.base}.${v.canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4"}`;
      }
      this.playing = true;
      v.play().catch(() => (this.playing = false));
    } else if (!shown && this.playing) {
      this.playing = false;
      v.pause();
    }
    const live = this.playing && v.readyState >= 2 && !v.paused;
    this.mix.value = Math.min(Math.max(this.mix.value + (live ? dt : -dt) * 2.5, 0), 1);
  }

  dispose() {
    const v = this.video;
    v.pause();
    v.removeAttribute("src");
    v.load();
    this.texture.dispose();
  }
}
