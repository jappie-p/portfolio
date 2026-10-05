import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { makePath, pose, project } from "@/components/school/gallery/path";
import { cameraPose } from "@/components/school/gallery/camera";
import { LIP, outerH, outerW, roomFor, stationOf } from "@/components/school/gallery/layout";
import { createRig, glideTo, goTo, nudge, settle, standClose, stepRig } from "@/components/school/gallery/rig";
import { SQUARE, sliceStart } from "@/components/school/gallery/slices";
import { homography } from "@/components/school/gallery/three/video";

describe("gallery camera", () => {
  it("projects exactly as a three.js camera with the same pose and lens shift", () => {
    const p = pose(-1.3, 1.6, 4.2, 0.4, 0.05, -0.18, 40);
    const cam = new THREE.PerspectiveCamera(40, 1440 / 900, 0.05, 60);
    cam.position.set(p.x, p.y, p.z);
    cam.rotation.set(p.pitch, -p.yaw, 0, "YXZ");
    cam.updateMatrixWorld();
    cam.projectionMatrix.elements[9] = -p.shift;
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    for (const [x, y, z] of [
      [0, 1.5, 0],
      [2.4, 0.7, 0.05],
      [-3, 2.8, 0],
    ]) {
      const ndc = new THREE.Vector3(x, y, z).project(cam);
      const [px, py] = project(p, 1440, 900, x, y, z);
      expect(px).toBeCloseTo(((ndc.x + 1) / 2) * 1440, 6);
      expect(py).toBeCloseTo(((1 - ndc.y) / 2) * 900, 6);
    }
  });

  it("walks through every station and never swings past one", () => {
    const stations = [pose(-4, 1.4, 6, 0.5), pose(0, 1.5, 5), pose(3.4, 1.5, 5), pose(6.8, 1.5, 5)];
    const at = makePath(stations);
    stations.forEach((s, i) => expect(at(i, pose(0, 0, 0)).x).toBeCloseTo(s.x, 9));
    for (let s = 1; s <= 3; s += 0.05) expect(at(s, pose(0, 0, 0)).z).toBeGreaterThanOrEqual(5 - 1e-9);
  });
});

describe("gallery walk", () => {
  const room = roomFor(16 / 10);

  it("a short sideways swipe still moves on to the next work", () => {
    const rig = createRig(room);
    goTo(rig, 1);
    rig.pos = 1;
    nudge(rig, 0.2);
    rig.pos = rig.target;
    settle(rig, 0.36);
    expect(rig.target).toBe(2);
  });

  it("gives like a rubber band past the last work, and reports the pull", () => {
    const rig = createRig(room);
    const end = room.stations.length - 1;
    goTo(rig, end);
    rig.pos = end;
    nudge(rig, 1.5);
    expect(rig.target).toBeGreaterThan(end);
    expect(rig.target).toBeLessThan(end + 0.35);
    expect(settle(rig, 0)).toBeCloseTo(1.5, 6);
    expect(rig.target).toBe(end);
  });

  it("eases the camera onto its station", () => {
    const rig = createRig(room);
    goTo(rig, 2);
    for (let i = 0; i < 180; i++) stepRig(rig, 1 / 60);
    expect(rig.pos).toBeCloseTo(2, 3);
  });

  it("glides to a work, steps right up to it and reports arriving once", () => {
    const rig = createRig(room);
    glideTo(rig, 1, 1);
    let arrivals = 0;
    for (let i = 0; i < 300; i++) if (stepRig(rig, 1 / 60)) arrivals++;
    expect(rig.pos).toBeCloseTo(stationOf(room, 1), 3);
    expect(rig.dolly.t).toBeCloseTo(1, 3);
    expect(arrivals).toBe(1);
  });

  it("from one work to the next it pulls back a little, then steps up again", () => {
    const rig = createRig(room);
    standClose(rig, 0);
    glideTo(rig, 1, 1);
    let least = 1;
    for (let i = 0; i < 400 && rig.glide.on; i++) {
      stepRig(rig, 1 / 60);
      least = Math.min(least, rig.dolly.t);
    }
    expect(least).toBeLessThan(0.55);
    expect(least).toBeGreaterThan(0.2);
    expect(rig.dolly.t).toBeGreaterThan(0.985);
  });

  it("does not move off a work until it has pulled back from it", () => {
    const rig = createRig(room);
    standClose(rig, 0);
    glideTo(rig, 1, 1);
    stepRig(rig, 1 / 60);
    expect(rig.target).toBe(stationOf(room, 0));
    for (let i = 0; i < 60; i++) stepRig(rig, 1 / 60);
    expect(rig.target).toBe(stationOf(room, 1));
  });

  it("a quick run of steps changes course without stopping on the way", () => {
    const rig = createRig(room);
    standClose(rig, 0);
    glideTo(rig, 1, 1);
    let arrivals = 0;
    for (let i = 0; i < 20; i++) if (stepRig(rig, 1 / 60)) arrivals++;
    glideTo(rig, 2, 1);
    for (let i = 0; i < 400; i++) if (stepRig(rig, 1 / 60)) arrivals++;
    expect(arrivals).toBe(1);
    expect(rig.pos).toBeCloseTo(stationOf(room, 2), 3);
  });

  it("never glides faster than its cap, however far it goes", () => {
    const rig = createRig(room);
    glideTo(rig, 3, 0);
    let fastest = 0;
    for (let i = 0; i < 400; i++) {
      stepRig(rig, 1 / 60);
      fastest = Math.max(fastest, Math.abs(rig.vel));
    }
    expect(fastest).toBeLessThanOrEqual(3.4 + 1e-9);
  });

  it("right up to a print, its picture covers its own slice of the project's panel", () => {
    const rig = createRig(roomFor(1440 / 900));
    standClose(rig, 1);
    const p = cameraPose(rig, 0, 1440 / 900, pose(0, 0, 0));
    const w = rig.room.works[1];
    const [x0, y0] = project(p, 1440, 900, w.x - w.w / 2, w.y + w.h / 2, w.depth - LIP);
    const [x1, y1] = project(p, 1440, 900, w.x + w.w / 2, w.y - w.h / 2, w.depth - LIP);
    expect(x0 / 1440).toBeCloseTo(sliceStart("kiosk"), 3);
    expect(x1 / 1440).toBeCloseTo(sliceStart("kiosk") + SQUARE, 3);
    expect(y0).toBeCloseTo(0, 1);
    expect(y1).toBeCloseTo(900, 1);
  });
});

describe("gallery room", () => {
  it("starts a wide wall at the entrance, with the first frame clear of the copy", () => {
    const room = roomFor(1440 / 900, { right: 0.1, below: 0, ndcPerPx: 2 / 900 });
    expect(room.narrow).toBe(false);
    expect(room.faces[0]).toBe(-1);
    const first = room.works[0];
    const [x] = project(room.stations[0], 1440, 900, first.x - outerW(first) / 2, first.y, first.depth);
    expect((x / 1440) * 2 - 1).toBeCloseTo(0.1, 3);
  });

  it("hangs a phone's works below the copy, with room for the label", () => {
    const room = roomFor(390 / 844, { right: 0, below: 0.15, ndcPerPx: 2 / 844 });
    expect(room.narrow).toBe(true);
    expect(stationOf(room, 0)).toBe(0);
    room.works.forEach((w, i) => {
      const [, top] = project(room.stations[i], 390, 844, w.x, w.y + outerH(w) / 2, w.depth);
      expect(1 - (top / 844) * 2).toBeLessThan(0.15);
    });
  });
});

describe("the trailer in the Zelda print", () => {
  it("maps the window's corners onto the video's square", () => {
    const quad: [number, number][] = [
      [307.5, 375],
      [896.5, 386],
      [897, 891],
      [307, 902.5],
    ];
    const h = homography(quad);
    const unit = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
    quad.forEach(([x, y], i) => {
      const v = new THREE.Vector3(x, y, 1).applyMatrix3(h);
      expect(v.x / v.z).toBeCloseTo(unit[i][0], 6);
      expect(v.y / v.z).toBeCloseTo(unit[i][1], 6);
    });
  });
});
