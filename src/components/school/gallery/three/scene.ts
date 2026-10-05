import * as THREE from "three";
import { stationOf, type Room } from "../layout";
import { cameraPose } from "../camera";
import { pose, type Pose } from "../path";
import { ease, inFront, type Rig } from "../rig";
import { makeArtwork, type Artwork } from "./artwork";
import { makeFestival } from "./breakout/festival";
import { makeKiosk } from "./breakout/kiosk";
import type { Breakout } from "./breakout/types";
import { makeZelda } from "./breakout/zelda";
import { exhibitUniforms, placeExhibit, titlesOf, type Exhibit } from "./exhibit";
import { makeFloor } from "./floor";
import { fontReady, letterTitles, type Lettering } from "./lettering";
import { applySpots, shapeAt, sharedUniforms, smooth, spotsFor, type Spot } from "./lights";
import { noiseTexture } from "./noise";
import { MIRRORED, Reflector } from "./reflector";
import { Rigging } from "./rigging";
import { Shades } from "./shadows";
import { cardTexture, drawCard, type CardCopy } from "./textures";
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
  /** the camera's pose this frame, head turn and dolly included */
  readonly pose: Pose = pose(0, 1.5, 4);
  room: Room;
  private readonly slots = frameSlots();
  private spots: Spot[] = [];
  private art: Artwork[] = [];
  private readonly rigging = new Rigging(this.shared, this.slots);
  private readonly shades = new Shades();
  private lettering: Lettering | null = null;
  private exhibit: Exhibit | null = null;
  private breakouts: (Breakout | null)[] = [];
  private leans = Array.from({ length: 4 }, leanState);
  private level = [0, 0, 0, 0, 0];
  private haze = 1;
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
    const lettering = letterTitles(titlesOf(this.room), anisotropy);
    this.lettering = lettering;
    this.owned.push(lettering.texture);
    this.exhibit = exhibitUniforms(lettering.texture);
    // set again in the display font, should it still be on its way
    const font = fontReady();
    if (!font.ready)
      font.loaded
        .then(() => {
          if (this.disposed) return;
          lettering.redraw();
          this.layout(this.room);
        })
        .catch(() => {});
    yield;
    const wall = makeWall(this.shared, this.slots, this.exhibit, this.shades);
    wall.layers.enable(MIRRORED);
    this.scene.add(wall, makeFloor(this.shared, this.reflector), this.rigging.group);
    yield;
    this.card = cardTexture(this.copy, anisotropy);
    this.owned.push(this.card);
    yield;
    for (const [i, w] of this.room.works.entries()) {
      const map = w.id === "berlijn" ? this.card : this.pictures[w.id];
      const crop = w.id === "berlijn" ? new THREE.Vector4(0, 0, 1, 1) : new THREE.Vector4(this.crops[w.id], 0, 0.625, 1);
      const video = w.id === "zelda" && this.trailer ? this.trailer : undefined;
      const a = makeArtwork(w, this.shared, { spot: i + 1, map, crop, video, shades: this.shades.uniforms });
      a.frame.layers.enable(MIRRORED);
      a.face.layers.enable(MIRRORED);
      this.art.push(a);
      this.scene.add(a.group);
      yield;
    }
    // what breaks out of the prints, hung in their groups so it leans with them
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
      if (b) {
        a.group.add(...b.parts);
        this.owned.push(...(b.textures ?? []));
      }
      this.breakouts.push(b);
      if (b) yield;
    }
    this.layout(this.room);
  }

  /** The first draw of each part, one per step, into a scratch target: a
   *  program's first use (uniforms, buffers) then never lands on a frame
   *  you see. */
  *warm(gl: THREE.WebGLRenderer, buffer: THREE.Vector2): Generator<void> {
    const scratch = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType });
    const parts = this.scene.children.slice();
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
    } finally {
      parts.forEach((p) => (p.visible = true));
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
    room.works.forEach((w, i) => {
      const a = this.art[i];
      if (!a) return;
      a.group.position.set(w.x, w.y, w.depth / 2);
      a.uniforms.uNorm.value = 1 / Math.max(shapeAt(this.spots[i + 1], new THREE.Vector3(w.x, w.y, w.depth)), 1e-4);
    });
    this.rigging.hang(room, this.spots);
    this.shades.place(room);
    this.breakouts.forEach((b) => b?.fit?.(room.narrow));
    if (this.exhibit && this.lettering) placeExhibit(this.exhibit, room, this.lettering);
    applySpots(this.shared, this.spots, this.level);
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
    applySpots(this.shared, this.spots, this.level);
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
    gl.setRenderTarget(null);
    gl.render(this.scene, this.camera);
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
    this.owned.forEach((t) => t.dispose());
    Object.values(this.pictures).forEach((t) => t.dispose());
    this.trailer?.dispose();
  }
}
