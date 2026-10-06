import * as THREE from "three";
import type { Materials, Textures } from "../materials";
import { seeded } from "../textures";
import type { Prop } from "../types";
import { fern, fiddleFig, monstera, palm, rubberPlant, snakePlant } from "./decor/bigPlants";
import { framed, mountains, painting, sea, sunset } from "./decor/frames";
import { Garden } from "./decor/garden";
import { cable, floorLamp } from "./decor/lamp";
import { pot, stand } from "./decor/pots";
import { makeShelves, SHELF } from "./decor/shelves";
import { cactus, echeveria, herb, pothos } from "./decor/smallPlants";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** The oak ledge over the window. */
const LEDGE = { x0: 2.9, x1: 4.1, top: 2.68, depth: 0.15, thick: 0.03 };
function ledge(m: Materials) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(LEDGE.x1 - LEDGE.x0, LEDGE.thick, LEDGE.depth), m.oak());
  board.position.set((LEDGE.x0 + LEDGE.x1) / 2, LEDGE.top - LEDGE.thick / 2, LEDGE.depth / 2);
  board.castShadow = board.receiveShadow = true;
  return board;
}

/**
 * What makes the room lived in: plants in every corner (a monstera on its
 * stand at the front left, a fiddle-leaf fig in a basket by the desk, a
 * snake plant between the desk and the rack, a palm in the back corner, a
 * rubber plant by the board, pothos trailing from the shelves, succulents
 * and herbs on the sill), the shelves with their books, pictures on the
 * walls, and a floor lamp's warm light. Every leaf of a kind is one draw;
 * the leaves sway a little.
 */
export function makeDecor(m: Materials, tex: Textures): Prop[] {
  const anisotropy = tex.floor.anisotropy;
  const time = { value: 0 };
  const rand = seeded(2024);
  const garden = new Garden();
  const group = new THREE.Group();
  const add = (p: ReturnType<typeof pot>) => {
    group.add(p.group);
    return p.soil;
  };

  // the monstera on its stand, front left, leaning out to the room
  group.add(stand(m, V(0.5, 0, 3.3), 0.17, 0.2));
  monstera(garden, add(pot(m, "planter", V(0.5, 0.17, 3.3), 0.17, 0.3, 1, anisotropy)), rand, 1.05, -0.4, 4.6);
  // the fiddle-leaf fig in its basket, back left by the desk
  fiddleFig(garden, add(pot(m, "basket", V(0.3, 0, 0.36), 0.17, 0.3, 2, anisotropy)), rand, 1.3, 0.6);
  // a fern spilling out of a basket at the open side, low by the desk
  fern(garden, add(pot(m, "basket", V(0.28, 0, 1.25), 0.15, 0.22, 13, anisotropy)), rand, 1);
  // the snake plant between the desk and the rack
  snakePlant(garden, add(pot(m, "stoneware", V(2.88, 0, 0.3), 0.12, 0.27, 3)), rand);
  // the palm in the back right corner, fanning out away from the walls
  palm(garden, add(pot(m, "planter", V(4.72, 0, 0.42), 0.16, 0.36, 4)), rand, 1, 2.7, 1.3);
  // the rubber plant by the board, at the front
  rubberPlant(garden, add(pot(m, "terracotta", V(4.05, 0, 3.55), 0.14, 0.27, 5)), rand);
  // and a small snake plant beside it
  snakePlant(garden, add(pot(m, "planter", V(3.72, 0, 3.72), 0.1, 0.2, 14)), rand, 0.65);

  // the shelves, a trailing pothos on the top one and a succulent on the lowest
  group.add(makeShelves(m, anisotropy));
  const [low, mid, high] = SHELF.tops;
  pothos(garden, add(pot(m, "planter", V(2.6, high, 0.11), 0.06, 0.09, 6)), SHELF.depth, rand, [
    { dx: -0.11, drop: 0.5 },
    { dx: -0.03, drop: 0.85 },
    { dx: 0.04, drop: 0.35 },
    { dx: 0.11, drop: 0.65 },
  ]);
  echeveria(garden, add(pot(m, "bowl", V(2.09, low, 0.11), 0.065, 0.04, 7)), rand);
  cactus(garden, add(pot(m, "terracotta", V(2.47, mid, 0.1), 0.035, 0.055, 8)), rand, 0.08, 0.018);

  // the windowsill: a herb, two succulents, a cactus
  const sill = 1.5;
  herb(garden, add(pot(m, "terracotta", V(2.97, sill, 0.03), 0.05, 0.08, 9)), rand);
  echeveria(garden, add(pot(m, "bowl", V(3.17, sill, 0.03), 0.055, 0.035, 10)), rand, 0.85);
  cactus(garden, add(pot(m, "planter", V(3.98, sill, 0.03), 0.035, 0.06, 11)), rand, 0.11, 0.02);
  echeveria(garden, add(pot(m, "stoneware", V(4.1, sill, 0.03), 0.045, 0.05, 12)), rand, 0.7);

  // a ledge over the window: pothos trailing down its corners, a cactus between
  group.add(ledge(m));
  pothos(garden, add(pot(m, "terracotta", V(3.06, LEDGE.top, 0.07), 0.05, 0.075, 15)), LEDGE.depth, rand, [
    { dx: -0.06, drop: 0.45 },
    { dx: 0.02, drop: 0.3 },
  ]);
  cactus(garden, add(pot(m, "planter", V(3.5, LEDGE.top, 0.07), 0.035, 0.055, 16)), rand, 0.1, 0.02);
  pothos(garden, add(pot(m, "planter", V(3.95, LEDGE.top, 0.07), 0.05, 0.07, 17)), LEDGE.depth, rand, [
    { dx: 0.05, drop: 0.55 },
    { dx: -0.02, drop: 0.32 },
  ]);

  group.add(...garden.meshes(m, time, anisotropy));

  // pictures: mountains on the back wall over the fig, the sea and a
  // windsurf sunset on the right wall over the bike
  const hills = framed(m, painting(mountains, 384, 512, anisotropy), 0.48, 0.62, "black", 0.055);
  hills.position.set(0.44, 2.33, 0.001);
  const water = framed(m, painting(sea, 512, 384, anisotropy), 0.5, 0.36, "oak", 0.045);
  water.position.set(5.199, 2.5, 1.42);
  water.rotation.y = -Math.PI / 2;
  const dusk = framed(m, painting(sunset, 512, 384, anisotropy), 0.5, 0.36, "black", 0.045);
  dusk.position.set(5.199, 2.5, 2.02);
  dusk.rotation.y = -Math.PI / 2;
  group.add(hills, water, dusk);

  // the floor lamp at the open left side, and the cable from the desk to the rack
  group.add(floorLamp(m, V(0.3, 0, 2.25)));
  group.add(cable(m, [V(2.45, 0.005, 0.5), V(2.58, 0.005, 0.16), V(2.8, 0.005, 0.05), V(3.18, 0.005, 0.05), V(3.32, 0.04, 0.14)]));

  return [{ group, update: (t) => void (time.value = t) }];
}
