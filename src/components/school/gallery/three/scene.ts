import * as THREE from "three";
import { stationOf, type Room } from "../layout";
import { lerpPose, makePath, pose, type Pose } from "../path";
import { ease, type Rig } from "../rig";
import { makeArtwork, type Artwork } from "./artwork";
import { makeFloor } from "./floor";
import { applySpots, shapeAt, sharedUniforms, spotsFor, type Spot } from "./lights";
import { noiseTexture } from "./noise";
import { MIRRORED, Reflector } from "./reflector";
import { Rigging } from "./rigging";
import { cardTexture, drawCard, type CardCopy } from "./textures";
import type { Trailer } from "./video";
import { frameSlots, makeWall, placeFrames } from "./wall";

export type Pictures = { zelda: THREE.Texture; kiosk: THREE.Texture; festival: THREE.Texture };
/** Which slice of each 16:10 world the square prints show (u offset, width). */
export type Crops = Record<keyof Pictures, number>;

const LOOK_X = 0.16;
const LOOK_YAW = 0.022;
const LOOK_PITCH = 0.012;

/** A light coming on: a quick strike, a dip, then it settles at full. */
export function strike(t: number) {
  if (t <= 0) return 0;
  if (t < 0.06) return (t / 0.06) * 0.85;
  if (t < 0.11) return 0.85 - ((t - 0.06) / 0.05) * 0.35;
  return Math.min(0.5 + 0.5 * ease(Math.min((t - 0.11) / 0.32, 1)), 1);
}

const leanState = () => ({ x: 0, y: 0, lift: 0, glow: 0 });

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
  private path: (s: number, out: Pose) => Pose;
  private art: Artwork[] = [];
  private readonly rigging = new Rigging(this.shared, this.slots);
  private leans = Array.from({ length: 4 }, leanState);
  private level = [0, 0, 0, 0, 0];
  private time = 0;
  private boot = -1;
  private readonly walk = pose(0, 0, 0);
  private card: THREE.CanvasTexture | null = null;
  private readonly owned: THREE.Texture[] = [];

  constructor(
    room: Room,
    private readonly pictures: Pictures,
    private readonly crops: Crops,
    private readonly trailer: Trailer | null,
    private readonly copy: CardCopy,
  ) {
    this.room = room;
    this.path = makePath(room.stations);
  }

  /** The build, one step per call: the caller yields to the page in between. */
  *steps(anisotropy: number): Generator<void> {
    const noise = noiseTexture();
    this.owned.push(noise);
    this.shared.uNoise.value = noise;
    yield;
    const wall = makeWall(this.shared, this.slots);
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
      const a = makeArtwork(w, this.shared, { spot: i + 1, map, crop, video });
      a.frame.layers.enable(MIRRORED);
      a.face.layers.enable(MIRRORED);
      this.art.push(a);
      this.scene.add(a.group);
      yield;
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
    this.path = makePath(room.stations);
    this.spots = spotsFor(room);
    room.works.forEach((w, i) => {
      const a = this.art[i];
      if (!a) return;
      a.group.position.set(w.x, w.y, w.depth / 2);
      a.uniforms.uNorm.value = 1 / Math.max(shapeAt(this.spots[i + 1], new THREE.Vector3(w.x, w.y, w.depth)), 1e-4);
    });
    this.rigging.hang(room, this.spots);
    applySpots(this.shared, this.spots, this.level);
  }

  /** Redraw the Berlijn card in the reader's language. */
  setCopy(copy: CardCopy) {
    if (!this.card) return;
    drawCard(this.card.image as HTMLCanvasElement, copy);
    this.card.needsUpdate = true;
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
    const p = this.path(rig.pos, this.walk);
    // the head: a small turn toward the mouse, the eye shifting the other
    // way, and the faint sway of someone standing still
    const sway = this.time * 0.5;
    p.x += rig.look.x * LOOK_X + Math.sin(sway * 0.9) * 0.012;
    p.y += -rig.look.y * 0.05 + Math.sin(sway * 1.3 + 1) * 0.006;
    p.yaw += rig.look.x * LOOK_YAW + Math.sin(sway * 0.7 + 2) * 0.0012;
    p.pitch -= rig.look.y * LOOK_PITCH;
    const d = rig.dolly;
    if (d.work >= 0 && d.t > 0) lerpPose(p, this.room.close[d.work], ease(d.t), this.pose);
    else Object.assign(this.pose, p);

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
      a.uniforms.uRaw.value = d.work === i && this.room.works[i].id !== "berlijn" ? Math.max(0, (d.t - 0.55) / 0.45) : 0;
    });
    placeFrames(this.slots, this.room, lift);

    this.spots.forEach((s, i) => {
      const on = this.boot < 0 ? 0 : strike(this.time - this.boot - 0.15 - i * 0.26);
      this.level[i] = on * (s.work >= 0 ? 1 + 0.38 * this.leans[s.work].glow : 1);
      const a = s.work >= 0 ? this.art[s.work] : null;
      if (a) a.uniforms.uLevel.value = this.level[i];
    });
    applySpots(this.shared, this.spots, this.level);

    // the trailer plays while the Zelda print is anywhere near the view
    const zelda = stationOf(this.room, 0);
    this.trailer?.update(this.boot >= 0 && Math.abs(rig.pos - zelda) < 1, dt);
  }

  render(gl: THREE.WebGLRenderer, buffer: THREE.Vector2) {
    gl.getDrawingBufferSize(buffer);
    this.rigging.light(this.level, buffer.y / (2 * Math.tan((this.camera.fov * Math.PI) / 360)));
    this.reflector.setSize(buffer.x, buffer.y);
    this.shared.uScreen.value = 0;
    this.reflector.render(gl, this.scene, this.camera);
    this.shared.uScreen.value = 1;
    gl.setRenderTarget(null);
    gl.render(this.scene, this.camera);
  }

  dispose() {
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
