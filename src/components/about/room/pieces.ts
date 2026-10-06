import * as THREE from "three";
import { PLACES } from "./layout";
import { makeMaterials, makeTextures, tone, type Materials, type Textures } from "./materials";
import { makeBoard } from "./props/board";
import { makeDecor } from "./props/decor";
import { makeDesk } from "./props/desk";
import { makeHelmet } from "./props/helmet";
import { makeMedals } from "./props/medals";
import { makeMountainBike } from "./props/mtb";
import { makeRack } from "./props/rack";
import { makeRoadBike } from "./props/roadbike";
import { makeShell } from "./shell";
import { STORIES } from "./stories";
import type { Piece, Prop, StoryId, Tone } from "./types";

const MAKERS: Record<StoryId, (m: Materials, tex: Textures) => Piece> = {
  werk: makeDesk,
  homelab: makeRack,
  groei: makeMedals,
  motorrijden: makeHelmet,
  mountainbiken: makeMountainBike,
  wielrennen: makeRoadBike,
  windsurfen: makeBoard,
};

/** Stand a piece where it belongs, and carry its pin and view along. */
function place(p: Piece): Piece {
  const { at, turn } = PLACES[p.id];
  p.group.position.set(...at);
  p.group.rotation.y = turn;
  p.group.updateMatrixWorld(true);
  p.pin.applyMatrix4(p.group.matrixWorld);
  p.view.target.applyMatrix4(p.group.matrixWorld);
  p.view.offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
  return p;
}

/** The whole room: the pieces you can open (each with its own tone), and
 *  everything else. `dispose` frees all of it. */
export function makeRoom(anisotropy: number) {
  const tex = makeTextures(anisotropy);
  const tones = Object.fromEntries(STORIES.map((s) => [s.id, tone()])) as Record<StoryId, Tone>;
  const kits = STORIES.map((s) => makeMaterials(tex, tones[s.id]));
  const pieces = STORIES.map((s, i) => place(MAKERS[s.id](kits[i], tex)));
  const still = makeMaterials(tex, tone());
  const shell = makeShell(still);
  const props: Prop[] = [shell, ...makeDecor(still, tex)];
  const owned = [...Object.values(tex), ...shell.textures];
  return {
    pieces,
    props,
    tones,
    dispose() {
      const seen = new Set<THREE.Object3D>();
      for (const root of [...pieces.map((p) => p.group), ...props.map((p) => p.group)])
        root.traverse((o) => {
          if (seen.has(o)) return;
          seen.add(o);
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          const mat = mesh.material;
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
        });
      [...kits, still].forEach((k) => k.all().forEach((x) => x.dispose()));
      owned.forEach((t) => t.dispose());
    },
  };
}

export type RoomModel = ReturnType<typeof makeRoom>;
