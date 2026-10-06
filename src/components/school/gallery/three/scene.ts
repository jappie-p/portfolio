import * as THREE from "three";
import { stationOf, type Room } from "../layout";
import { cameraPose } from "../camera";
import { pose, type Pose } from "../path";
import { ease, inFront, type Rig } from "../rig";
import { makeArtwork, type Artwork } from "./artwork";
import { makeBench, type Bench } from "./bench";
import { Bloom } from "./bloom";
import { makeFestival } from "./breakout/festival";
import { makeKiosk } from "./breakout/kiosk";
import type { Breakout } from "./breakout/types";
import { makeZelda } from "./breakout/zelda";
import { makeCeiling } from "./ceiling";
import { makeFloor } from "./floor";
import { Focus, NEAR } from "./focus";
import { makeForeground, type Foreground } from "./foreground";
import { fontReady, letterTitles } from "./lettering";
import { applyGlows, applySpots, ceilingOf, glowsFor, shapeAt, sharedUniforms, smooth, spotsFor, type Glow, type Spot } from "./lights";
import type { BarTitle } from "./moulding";
import { noiseTexture } from "./noise";
import { makePlants, plantsFor } from "./plants";
import { makePlaques, type Plaques } from "./plaques";
import { MIRRORED, Reflector } from "./reflector";
import { Rigging } from "./rigging";
import { Shades } from "./shadows";
import { cardTexture, drawCard, type CardCopy } from "./textures";
import { barNames, barTitles, placeBarTitles } from "./titles";
import type { Trailer } from "./video";
import { frameSlots, makeWall, placeFrames } from "./wall";

export type Pictures = { zelda: THREE.Texture; kiosk: THREE.Texture; festival: THREE.Texture };
/** Which slice of each 16:10 world the square prints show (u offset, width). */
export type Crops = Record<keyof Pictures, number>;

/** A light coming on: a quick strike, a dip, then it settles at full. */
export function strike(t: number) {
  if (t <= 0) return 0;
  if (t < 0.06) return (t / 0.06) * 0.85;
  if (t < 0.11) return 0.85 - ((t - 0.06) / 0.05) * 0.35;
  return Math.min(0.5 + 0.5 * ease(Math.min((t - 0.11) / 0.32, 1)), 1);
}

const leanState = () => ({ x: 0, y: 0, lift: 0, glow: 0 });

/** Stepping right up to a work, the room goes down around it: the other
 *  spots dim by this much, the haze in every beam by this much. */
const DIM = { spots: 0.78, haze: 0.85 };

/** How strongly the brightest light glows. */
const BLOOM = 0.9;

/** How far out of focus the bench and the leaves by the entrance are, in
 *  quarter-resolution steps of the blur. */
const FOCUS_BLUR = 1.5;

/** Point a three.js camera along a pose: the maths project() in path.ts mirrors. */
function aim(cam: THREE.PerspectiveCamera, p: Pose, aspect: number) {
  cam.fov = p.fov;
  cam.aspect = aspect;
  cam.updateProjectionMatrix();
  // the lens shift: an off-centre frustum, so verticals stay vertical
  cam.projectionMatrix.elements[9] = -p.shift;
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  cam.position.set(p.x, p.y, p.z);
  cam.rotation.set(p.pitch, -p.yaw, 0, "YXZ");
  cam.updateMatrixWorld();
}

/** The whole room, built in small steps so mounting never blocks a frame. */
export class GalleryScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60);
  readonly shared = sharedUniforms();
  readonly reflector = new Reflector();
  readonly focus = new Focus();
  readonly bloom = new Bloom();
  /** hung at each room's own height (see lights.ts) */
  private readonly ceiling = makeCeiling(this.shared);
  /** the camera's pose this frame, head turn and dolly included */
  readonly pose: Pose = pose(0, 1.5, 4);
  room: Room;
  private readonly slots = frameSlots();
  private spots: Spot[] = [];
  private art: Artwork[] = [];
  private readonly rigging = new Rigging(this.shared, this.slots);
  private readonly shades = new Shades();
  private titles: (BarTitle | null)[] = [];
  private plaques: Plaques | null = null;
  private foreground: Foreground | null = null;
  private bench: Bench | null = null;
  /** the plants along the wall, set out again for each room */
  private readonly beds = new THREE.Group();
  private glows: Glow[] = [];
  private breakouts: (Breakout | null)[] = [];
  /** what each breakout stands in the room, placed at its work */
  private sets: (THREE.Group | null)[] = [];
  private leans = Array.from({ length: 4 }, leanState);
  private level = [0, 0, 0, 0, 0];
  private haze = 1;
  /** how near the camera has stepped to any work, 0..1 */
  private close = 0;
  /** how near the walk still is to the entrance, 0..1 */
  private entrance = 1;
  private time = 0;
  private boot = -1;
  private card: THREE.CanvasTexture | null = null;
  private readonly owned: THREE.Texture[] = [];
  private disposed = false;

  constructor(
    room: Room,
    private readonly pictures: Pictures,
    private readonly crops: Crops,
    private readonly trailer: Trailer | null,
    private readonly copy: CardCopy,
  ) {
    this.room = room;
  }

  /** The build, one step per call: the caller yields to the page in between. */
  *steps(anisotropy: number): Generator<void> {
    const noise = noiseTexture();
    this.owned.push(noise);
    this.shared.uNoise.value = noise;
    yield;
    const lettering = letterTitles(barNames(this.room), anisotropy);
    this.owned.push(lettering.texture);
    this.titles = barTitles(this.room, lettering);
    const plaques = makePlaques(this.shared, this.room, anisotropy);
    this.plaques = plaques;
    this.owned.push(plaques.texture);
    // set again in the site's faces, should they still be on their way
    const font = fontReady();
    if (!font.ready)
      font.loaded
        .then(() => {
          if (this.disposed) return;
          lettering.redraw();
          placeBarTitles(this.titles, lettering);
          plaques.redraw();
        })
        .catch(() => {});
    yield;
    const wall = makeWall(this.shared, this.slots, this.shades);
    wall.layers.enable(MIRRORED);
    this.scene.add(wall, makeFloor(this.shared, this.reflector), this.ceiling, this.rigging.group);
    yield;
    this.card = cardTexture(this.copy, anisotropy);
    this.owned.push(this.card);
    this.foreground = makeForeground();
    this.owned.push(...this.foreground.textures);
    this.bench = makeBench(this.shared);
    this.scene.add(plaques.group, this.beds, this.foreground.group, this.bench.group);
    yield;
    for (const [i, w] of this.room.works.entries()) {
      const map = w.id === "berlijn" ? this.card : this.pictures[w.id];
      const crop = w.id === "berlijn" ? new THREE.Vector4(0, 0, 1, 1) : new THREE.Vector4(this.crops[w.id], 0, 0.625, 1);
      const video = w.id === "zelda" && this.trailer ? this.trailer : undefined;
      const a = makeArtwork(w, this.shared, { spot: i + 1, map, crop, video, shades: this.shades.uniforms, title: this.titles[i] });
      a.frame.layers.enable(MIRRORED);
      a.face.layers.enable(MIRRORED);
      this.art.push(a);
      this.scene.add(a.group);
      yield;
    }
    // what breaks out of the prints: the pieces on a print hang in its group
    // and lean with it, what stands round it in the room stays put
    for (const a of this.art) {
      const id = a.work.id;
      const shades = this.shades.uniforms;
      const b =
        id === "zelda"
          ? makeZelda(this.shared, a, shades)
          : id === "kiosk"
            ? makeKiosk(this.shared, a, shades, anisotropy, this.copy.receipt)
            : id === "festival"
              ? makeFestival(this.shared, a, shades)
              : null;
      let set: THREE.Group | null = null;
      if (b) {
        a.group.add(...b.parts);
        this.owned.push(...(b.textures ?? []));
        if (b.set) {
          set = new THREE.Group();
          set.add(...b.set);
          this.scene.add(set);
        }
      }
      this.breakouts.push(b);
      this.sets.push(set);
      if (b) yield;
    }
    // anything still on its way (Link's sprite) comes in before the room
    // shows, so it is warmed with the rest; never more than a few seconds
    const since = performance.now();
    while (this.breakouts.some((b) => b?.loading?.()) && performance.now() - since < 4000) yield;
    this.layout(this.room);
  }

  /** The first draw of each part, one per step, into a scratch target: a
   *  program's first use (uniforms, buffers) then never lands on a frame
   *  you see. */
  *warm(gl: THREE.WebGLRenderer, buffer: THREE.Vector2): Generator<void> {
    const scratch = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType });
    const parts = this.scene.children.slice();
    // every part is drawn once, even one this room keeps hidden; then each
    // goes back to how the room had it
    const shown = parts.map((p) => p.visible);
    const restore = () => parts.forEach((p, i) => (p.visible = shown[i]));
    gl.getDrawingBufferSize(buffer);
    this.reflector.setSize(buffer.x, buffer.y);
    try {
      for (const part of parts) {
        parts.forEach((p) => (p.visible = p === part));
        gl.setRenderTarget(scratch);
        gl.render(this.scene, this.camera);
        yield;
      }
      parts.forEach((p) => (p.visible = true));
      this.shades.render(gl, this.scene);
      yield;
      this.shared.uScreen.value = 0;
      this.reflector.render(gl, this.scene, this.camera);
      this.shared.uScreen.value = 1;
      yield;
      this.focus.setSize(buffer.x, buffer.y);
      this.focus.render(gl, this.scene, this.camera, 1);
      yield;
      this.bloom.setSize(buffer.x, buffer.y);
      gl.setRenderTarget(this.bloom.frame);
      gl.render(this.scene, this.camera);
      this.bloom.render(gl, 1);
      yield;
    } finally {
      restore();
      gl.setRenderTarget(null);
      scratch.dispose();
    }
  }

  /** Every texture the scene shows, for uploading ahead of the first frame. */
  textures(): THREE.Texture[] {
    return [...this.owned, ...Object.values(this.pictures)];
  }

  /** Hang the works and aim the lights for a room (the view changed shape). */
  layout(room: Room) {
    this.room = room;
    this.spots = spotsFor(room);
    this.glows = glowsFor(room);
    this.ceiling.position.y = ceilingOf(room);
    room.works.forEach((w, i) => {
      const a = this.art[i];
      if (!a) return;
      a.group.position.set(w.x, w.y, w.depth / 2);
      a.uniforms.uNorm.value = 1 / Math.max(shapeAt(this.spots[i + 1], new THREE.Vector3(w.x, w.y, w.depth)), 1e-4);
      this.sets[i]?.position.set(w.x, 0, 0);
    });
    this.rigging.hang(room, this.spots);
    this.shades.place(room);
    this.breakouts.forEach((b) => b?.fit?.(room.narrow));
    // the plaques would sit under the narrow room's labels; the bench and the
    // plants belong to the wide room's walk
    if (this.plaques) {
      this.plaques.hang(room);
      this.plaques.group.visible = !room.narrow;
    }
    this.foreground?.place(room);
    this.bench?.place(room);
    this.beds.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.beds.clear();
    if (!room.narrow) this.beds.add(makePlants(this.shared, plantsFor(room)), this.nearPlant(room));
    applySpots(this.shared, this.spots, this.level);
  }

  /** A tall plant right by the entrance's lens, low at the left of the view:
   *  out of focus (layer NEAR), so the room reads as seen past it. */
  private nearPlant(room: Room) {
    const p = room.stations[0];
    const fwd = [Math.sin(p.yaw), -Math.cos(p.yaw)];
    const right = [Math.cos(p.yaw), Math.sin(p.yaw)];
    const at = (f: number, r: number) => ({ x: p.x + fwd[0] * f + right[0] * r, z: p.z + fwd[1] * f + right[1] * r });
    const plant = makePlants(this.shared, [{ ...at(1.45, -0.9), pot: 0.4, size: 1.45 }]);
    plant.traverse((o) => o.layers.set(NEAR));
    return plant;
  }

  /** Redraw what the room prints in the reader's language: the Berlijn card
   *  and the kiosk's receipt. */
  setCopy(copy: CardCopy) {
    if (this.card) {
      drawCard(this.card.image as HTMLCanvasElement, copy);
      this.card.needsUpdate = true;
    }
    this.breakouts.forEach((b) => b?.setCopy?.(copy));
  }

  /** Off screen: the loop stops, so stop the trailer too. */
  rest() {
    this.trailer?.update(false, 0);
  }

  /** Turn the lights on, one after another (once, the first time it shows). */
  powerUp() {
    if (this.boot < 0) this.boot = this.time;
  }

  /** Advance one frame: camera, lights, hover, the trailer. */
  frame(rig: Rig, dt: number, w: number, h: number) {
    this.time += dt;
    this.shared.uTime.value = this.time;
    if (rig.room !== this.room) this.layout(rig.room);
    // the camera itself is the walk's (see camera.ts)
    cameraPose(rig, this.time, w / Math.max(h, 1), this.pose);
    aim(this.camera, this.pose, w / Math.max(h, 1));

    const k = 1 - Math.exp(-dt * 7);
    const lift: number[] = [];
    this.art.forEach((a, i) => {
      const l = this.leans[i];
      const hovered = rig.hover === i;
      l.x += ((hovered ? rig.lean.x : 0) - l.x) * k;
      l.y += ((hovered ? rig.lean.y : 0) - l.y) * k;
      l.lift += ((hovered ? 1 : 0) - l.lift) * k;
      l.glow += ((hovered || rig.focus === i ? 1 : 0) - l.glow) * k;
      a.group.rotation.set(-l.y * 0.05, l.x * 0.07, 0);
      a.group.position.z = a.work.depth / 2 + l.lift * 0.035;
      lift.push(l.lift * 0.035);
      a.uniforms.uGlare.value.set(0.5 + l.x * 0.42, 0.5 - l.y * 0.42, 0.3 + 0.7 * l.lift);
      a.uniforms.uRaw.value = this.room.works[i].id !== "berlijn" ? Math.max(0, (inFront(rig, i) - 0.55) / 0.45) : 0;
    });
    placeFrames(this.slots, this.room, lift);

    // stepping up to a work the room goes down around it: every other spot
    // dims, its own holds, and the haze thins in all the beams. Read off how
    // near the camera is to each work, so a glide hands the light from one to
    // the next as smoothly as it moves.
    const near = this.art.map((_, i) => inFront(rig, i));
    const all = Math.min(near.reduce((sum, n) => sum + n, 0), 1);
    this.spots.forEach((s, i) => {
      const on = this.boot < 0 ? 0 : strike(this.time - this.boot - 0.15 - i * 0.26);
      const others = all - (s.work >= 0 ? near[s.work] : 0);
      this.level[i] = on * (s.work >= 0 ? 1 + 0.38 * this.leans[s.work].glow : 1) * (1 - DIM.spots * smooth(0.05, 0.9, others));
      const a = s.work >= 0 ? this.art[s.work] : null;
      if (a) a.uniforms.uLevel.value = this.level[i];
    });
    this.haze = 1 - DIM.haze * smooth(0.05, 0.85, all);
    this.close = all;
    applySpots(this.shared, this.spots, this.level);
    // what the works give off comes and goes with their light
    applyGlows(this.shared, this.glows, (work) => this.level[work + 1] ?? 0);
    this.entrance = 1 - smooth(0.08, 0.45, Math.abs(rig.pos));
    this.foreground?.light(this.level[0] ?? 0, this.entrance);
    this.breakouts.forEach((b, i) => b?.update(this.time, near[i]));

    // the trailer plays while the Zelda print is anywhere near the view
    const zelda = stationOf(this.room, 0);
    this.trailer?.update(this.boot >= 0 && Math.abs(rig.pos - zelda) < 1, dt);
  }

  render(gl: THREE.WebGLRenderer, buffer: THREE.Vector2) {
    gl.getDrawingBufferSize(buffer);
    this.rigging.light(this.level, buffer.y / (2 * Math.tan((this.camera.fov * Math.PI) / 360)), this.haze);
    this.shades.render(gl, this.scene);
    this.reflector.setSize(buffer.x, buffer.y);
    this.shared.uScreen.value = 0;
    this.reflector.render(gl, this.scene, this.camera);
    this.shared.uScreen.value = 1;
    // the glow round the brightest light; gone by the time a picture opens
    // into its project, so the hand-over shows the picture as it is
    // (fullest at the entrance's view down the room, softer in front of a work)
    const glow = BLOOM * (0.55 + 0.45 * this.entrance) * (1 - smooth(0.05, 0.8, this.close));
    this.bloom.setSize(buffer.x, buffer.y);
    gl.setRenderTarget(glow > 0.002 ? this.bloom.frame : null);
    gl.render(this.scene, this.camera);
    if (glow > 0.002) this.bloom.render(gl, glow);
    // the bench and the leaves by the entrance, out of focus over the room
    if (this.bench?.group.visible) {
      this.focus.setSize(buffer.x, buffer.y);
      this.focus.render(gl, this.scene, this.camera, FOCUS_BLUR);
    }
  }

  dispose() {
    this.disposed = true;
    this.shades.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh && !(o as THREE.Points).isPoints) return;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.reflector.dispose();
    this.focus.dispose();
    this.bloom.dispose();
    this.owned.forEach((t) => t.dispose());
    Object.values(this.pictures).forEach((t) => t.dispose());
    this.trailer?.dispose();
  }
}
