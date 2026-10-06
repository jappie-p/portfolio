import * as THREE from "three";
import { PLACES } from "../layout";
import type { Materials } from "../materials";
import { seeded } from "../textures";
import type { Piece } from "../types";
import { jpPlate, serverFace } from "./work/canvas";
import { cyl, merge, owns, rbox, solid, tube } from "./work/shapes";

/** The rack: outside width, depth and height (its top is where the helmet
 *  sits, 1.27 m up), how high it stands on its castors, a rack unit. */
const R = { w: 0.6, d: 0.6, h: 1.2, lift: 0.07 };
const U = 0.0445;

/** What is racked, from the top: its height in units and its face. */
const KIT: { u: number; face: "switch" | "drives" | "vents" | "blank" | "ups"; leds: number }[] = [
  { u: 1, face: "switch", leds: 0 },
  { u: 1, face: "switch", leds: 14 },
  { u: 1, face: "blank", leds: 0 },
  { u: 2, face: "drives", leds: 8 },
  { u: 2, face: "vents", leds: 3 },
  { u: 1, face: "vents", leds: 2 },
  { u: 1, face: "vents", leds: 2 },
  { u: 3, face: "blank", leds: 0 },
  { u: 2, face: "drives", leds: 8 },
  { u: 3, face: "blank", leds: 0 },
  { u: 2, face: "vents", leds: 2 },
  { u: 4, face: "ups", leds: 2 },
];

type Led = { mesh: THREE.Mesh; rate: number; phase: number; duty: number };

/**
 * My homelab: a black 19-inch rack on castors, smoked glass in its door.
 * Inside: a patch panel and a switch with bright patch cables, two storage
 * servers, compute nodes and a UPS at the foot, their LEDs blinking as
 * the traffic goes by. The JP plate on its brow.
 */
export function makeRack(m: Materials): Piece {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const back = -PLACES.homelab.at[2] + 0.03;
  body.position.z = back;
  group.add(body);
  const y0 = R.lift;
  const y1 = R.lift + R.h;
  const rand = seeded(404);

  // the cabinet: sides, top, plinth, back, the rails inside
  const shell: THREE.BufferGeometry[] = [
    rbox(0.022, R.h, R.d, 0.008, -R.w / 2 + 0.011, y0 + R.h / 2, R.d / 2),
    rbox(0.022, R.h, R.d, 0.008, R.w / 2 - 0.011, y0 + R.h / 2, R.d / 2),
    rbox(R.w, 0.03, R.d, 0.01, 0, y1 - 0.015, R.d / 2),
    rbox(R.w - 0.02, 0.05, R.d - 0.02, 0.008, 0, y0 + 0.025, R.d / 2),
    rbox(R.w - 0.04, R.h - 0.06, 0.012, 0.004, 0, y0 + R.h / 2, 0.012),
    // the brow over the door
    rbox(R.w, 0.06, 0.03, 0.008, 0, y1 - 0.045, R.d - 0.015),
  ];
  // powder-coated steel: black, matte, a soft sheen at the edges
  const powder = m.own("rackPowder", () => new THREE.MeshStandardMaterial({ color: "#18191b", roughness: 0.68, metalness: 0.15 }));
  body.add(solid(merge(shell), powder));
  const rails: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) rails.push(rbox(0.018, R.h - 0.14, 0.012, 0.002, s * 0.235, y0 + R.h / 2 - 0.02, R.d - 0.09));
  body.add(solid(merge(rails), m.alu()));
  // castors
  const wheels: THREE.BufferGeometry[] = [];
  for (const x of [-0.23, 0.23])
    for (const z of [0.07, R.d - 0.07]) {
      wheels.push(new THREE.CylinderGeometry(0.028, 0.028, 0.022, 18).rotateZ(Math.PI / 2).translate(x, 0.028, z));
      wheels.push(cyl(0.012, 0.012, 0.03, x, 0.055, z, 10));
    }
  body.add(solid(merge(wheels), m.rubber()));

  // the gear, top down, each face its own texture
  const faces = { switch: serverFace("switch"), drives: serverFace("drives"), vents: serverFace("vents") };
  const faceMat = (k: keyof typeof faces) => m.own(`rack-${k}`, () => owns(new THREE.MeshStandardMaterial({ map: faces[k], roughness: 0.45, metalness: 0.4 }), faces[k]));
  const leds: Led[] = [];
  const ledBox = new THREE.BoxGeometry(0.008, 0.005, 0.003);
  const front = R.d - 0.085;
  let y = y1 - 0.11;
  const cases: THREE.BufferGeometry[] = [];
  const blanks: THREE.BufferGeometry[] = [];
  const switchY: number[] = [];
  KIT.forEach((k) => {
    const h = k.u * U - 0.003;
    const cy = y - h / 2;
    if (k.face === "blank") blanks.push(rbox(0.485, h, 0.008, 0.002, 0, cy, front));
    else {
      cases.push(rbox(0.43, h - 0.004, 0.42, 0.004, 0, cy, front - 0.215));
      cases.push(rbox(0.485, h, 0.012, 0.003, 0, cy, front - 0.002));
      if (k.face === "ups") {
        // the UPS: a small blue display and its button
        const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.03), m.ledBlue());
        disp.position.set(-0.12, cy + 0.01, front + 0.0045);
        body.add(disp);
      } else {
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.47, h - 0.006), faceMat(k.face));
        plate.position.set(0, cy, front + 0.0045);
        body.add(plate);
        if (k.face === "switch") switchY.push(cy);
      }
    }
    for (let n = 0; n < k.leds; n++) {
      const kind = rand();
      const mat = kind < 0.62 ? m.ledGreen() : kind < 0.86 ? m.ledAmber() : m.ledBlue();
      const led = new THREE.Mesh(ledBox, mat);
      const x = k.face === "switch" ? -0.2 + n * 0.0285 : k.face === "drives" ? -0.19 + n * 0.0545 : 0.2 - n * 0.014;
      led.position.set(x, cy + (k.face === "switch" ? h * 0.32 : -h * 0.28), front + 0.006);
      body.add(led);
      // ports flicker with traffic, drives tick, status lights breathe
      const busy = k.face === "switch" || k.face === "drives";
      leds.push({ mesh: led, rate: busy ? 3 + rand() * 9 : 0.25 + rand() * 0.3, phase: rand(), duty: busy ? 0.35 + rand() * 0.4 : 0.85 });
    }
    y -= k.u * U;
  });
  body.add(solid(merge(cases), m.graphite()));
  if (blanks.length) body.add(solid(merge(blanks), m.black()));

  // patch cables from the panel down into the switch, in loops of colour
  const colours = ["#4ade80", "#3b82f6", "#facc15", "#f4f1ea", "#4ade80", "#3b82f6", "#f97316", "#4ade80"];
  if (switchY.length === 2) {
    const [ya, yb] = switchY;
    colours.forEach((hex, n) => {
      const x0 = -0.19 + n * 0.0285 * 1.4;
      const x1 = -0.19 + n * 0.0285 + 0.01;
      const sag = 0.03 + (n % 3) * 0.012;
      const cable = tube(
        [new THREE.Vector3(x0, ya - 0.004, front + 0.008), new THREE.Vector3(x0 + 0.004, ya - 0.01, front + 0.03 + sag), new THREE.Vector3(x1, yb + 0.004, front + 0.03 + sag * 0.6), new THREE.Vector3(x1, yb + 0.006, front + 0.008)],
        0.0028,
        20,
        6,
      );
      body.add(solid(cable, m.own(`cable-${hex}`, () => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.4 }))));
    });
  }

  // the door: a slim black frame, smoked glass, a chrome handle
  const door: THREE.BufferGeometry[] = [
    rbox(0.03, R.h - 0.1, 0.02, 0.006, -R.w / 2 + 0.035, y0 + (R.h - 0.1) / 2 + 0.04, R.d - 0.01),
    rbox(0.03, R.h - 0.1, 0.02, 0.006, R.w / 2 - 0.035, y0 + (R.h - 0.1) / 2 + 0.04, R.d - 0.01),
    rbox(R.w - 0.07, 0.03, 0.02, 0.006, 0, y0 + 0.055, R.d - 0.01),
    rbox(R.w - 0.07, 0.03, 0.02, 0.006, 0, y1 - 0.09, R.d - 0.01),
  ];
  body.add(solid(merge(door), powder));
  const smoke = m.own("smokedGlass", () => new THREE.MeshPhysicalMaterial({ color: "#2a2d30", roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, envMapIntensity: 1.3, clearcoat: 1 }));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(R.w - 0.1, R.h - 0.16), smoke);
  glass.position.set(0, y0 + 0.07 + (R.h - 0.16) / 2, R.d - 0.008);
  body.add(glass);
  body.add(solid(rbox(0.012, 0.16, 0.02, 0.005, R.w / 2 - 0.06, y0 + R.h * 0.55, R.d + 0.012), m.chrome()));

  // the JP plate on the brow
  const plateTex = jpPlate();
  const plate = new THREE.Mesh(
    rbox(0.1, 0.05, 0.004, 0.0018),
    m.own("jpPlate", () => owns(new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.35, metalness: 0.2 }), plateTex)),
  );
  plate.position.set(0, y1 - 0.045, R.d + 0.007);
  body.add(plate);

  return {
    id: "homelab",
    group,
    // at its left side, half way up: the helmet's pin floats over its top
    pin: new THREE.Vector3(-R.w / 2 - 0.12, y0 + R.h * 0.62, R.d * 0.7 + back),
    view: { target: new THREE.Vector3(0, 0.74, R.d / 2 + back), offset: new THREE.Vector3(-1.25, 0.6, 3.2) },
    update(time) {
      for (const l of leds) l.mesh.visible = (time * l.rate + l.phase) % 1 < l.duty;
    },
  };
}
