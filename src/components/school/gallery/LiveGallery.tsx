"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { focusPosition } from "@/components/journey/zoom";
import { TOPIC_INDEX } from "@/lib/chapters";
import { jumpTo, onScreen, useInView } from "@/lib/scene";
import { useJourney } from "@/lib/store";
import { SCHOOL_EXTRA } from "@/data/projects";
import { BASE_PATH } from "@/data/site";
import { useT } from "@/i18n/useT";
import { GRAIN } from "../PosterWall";
import { SCHOOL_WORLDS } from "../worlds";
import { CoverCopy } from "./CoverCopy";
import { Fallback } from "./Fallback";
import { guide, markSwiped, useGuide } from "./guide";
import { bindInput } from "./input";
import { roomFor, stationOf, ORDER } from "./layout";
import { Overlay, type OverlayWork } from "./Overlay";
import { keep, placeOverlay, type OverlayDom } from "./place";
import { createRig, glideTo, goTo, standAt, standClose } from "./rig";
import { sliceStart } from "./slices";
import { bindSwipe } from "./swipe";
import { pass } from "./transit";
import { RoomBar } from "./RoomBar";
import { useRoomFit } from "./useRoomFit";
import type { Crops } from "./three/scene";
import s from "./gallery.module.css";

const GalleryCanvas = dynamic(() => import("./GalleryCanvas").then((m) => m.GalleryCanvas), { ssr: false });

/** The square prints are slices of the 16:10 worlds, centred on each subject. */
const CROPS: Crops = { zelda: sliceStart("zelda"), kiosk: sliceStart("kiosk"), festival: sliceStart("festival") };
const PICTURES = { zelda: SCHOOL_WORLDS.zelda.image.src, kiosk: SCHOOL_WORLDS.kiosk.image.src, festival: SCHOOL_WORLDS.festival.image.src };
const TRAILER = `${BASE_PATH}/trailers/zelda`;
const WORKS: OverlayWork[] = ORDER.map((id) =>
  id === "berlijn" ? { slug: id } : { slug: id, image: SCHOOL_WORLDS[id].image, position: focusPosition(SCHOOL_WORLDS[id].focus, 1, 1.6) },
);
/** How long a passage between a print and its panel takes (globals.css). */
const PASS_S = 0.5;
/** The Berlijn card: the walk ends at it, and it has no panel to go into. */
const CARD = ORDER.indexOf("berlijn");

/** Which project's panel is in front of you, or -1. */
function here() {
  const j = useJourney.getState();
  return j.topic === TOPIC_INDEX.school && j.project >= 1 ? j.project - 1 : -1;
}

/**
 * The School cover as a gallery at night you can walk through, and the way
 * between its projects: a print dives into its project's panel; from a
 * project you swipe on, back out into the print, a little way back along
 * the wall and into the next one, or out to stand in the gallery again.
 */
export function LiveGallery({ onLost }: { onLost: () => void }) {
  const t = useT();
  const [rig] = useState(() => createRig(roomFor(16 / 10)));
  const [dom] = useState<OverlayDom>(() => ({ works: [], pics: [], labels: [], heading: null, bar: null }));
  const [narrow, setNarrow] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 1, h: 1 });
  /** a passage between the gallery and a project is under way */
  const passing = useRef(false);
  const drawn = useRef(false);
  const active = useInView(surface);
  const live = useRef(active);
  const copy = useMemo(() => ({ title: t.school.extraTitle, tech: SCHOOL_EXTRA.tech, year: SCHOOL_EXTRA.year, receipt: t.school.receipt }), [t]);

  useEffect(() => {
    live.current = active;
    // back in the gallery some other way (the rail, a link, Tab): step back
    // from the print you were last in
    if (active && !rig.glide.on) Object.assign(rig.dolly, { to: 0, hold: false });
  }, [active, rig]);

  useEffect(() => {
    drawn.current = ready;
  }, [ready]);

  useRoomFit(rig, dom, surface, size, setNarrow);

  // mount the scene once the row comes near (the track clips its panels, so
  // watch the row), in a quiet moment: the projects' own scenes mount at the
  // same time, and a new GPU context waits behind their work. Once the row
  // has gone, the walk starts over at the entrance.
  useEffect(() => {
    const row = surface.current?.closest("[data-section]");
    if (!row) return;
    let idle = 0;
    let timer = 0;
    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some(onScreen)) return;
        near.disconnect();
        const go = () => setNear(true);
        // Safari has no idle callbacks
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 900 });
        else timer = window.setTimeout(go, 200);
      },
      { rootMargin: "150% 0px", threshold: [0, 0.001] },
    );
    const gone = new IntersectionObserver((entries) => {
      if (entries.some(onScreen)) return;
      standAt(rig, 0);
    });
    near.observe(row);
    gone.observe(row);
    return () => {
      near.disconnect();
      gone.disconnect();
      if (idle) window.cancelIdleCallback(idle);
      window.clearTimeout(timer);
    };
  }, [rig]);

  // the head turns a little toward the mouse while the gallery is in view
  useEffect(() => {
    if (!active) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      rig.look.tx = (e.clientX / window.innerWidth) * 2 - 1;
      rig.look.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [active, rig]);

  /** The row's project panels, and a swipe's pull taken off them again. */
  const panels = useCallback(() => surface.current?.closest("[data-section]")?.querySelectorAll<HTMLElement>(".project-panel") ?? [], []);
  const unpull = useCallback(() => {
    for (const p of panels()) Object.assign(p.style, { transform: "", transition: "" });
  }, [panels]);

  /** Through a print into its project's panel. */
  const enter = useCallback(
    (work: number) => {
      passing.current = true;
      pass(
        "in",
        () => {
          unpull();
          jumpTo("school", { panel: work + 1, instant: true });
          rig.dolly.hold = false;
        },
        rig.room.narrow,
      ).finally(() => (passing.current = false));
    },
    [rig, unpull],
  );

  /** From project `from` back into its print in the gallery, then a glide
   *  to `to`: into its panel (`want` 1), or to stand in front of it (0). */
  const leave = useCallback(
    (from: number, to: number, want: number) => {
      // the scene is not up yet: straight across, panel to panel
      if (!drawn.current) {
        if (want === 1) return enter(to);
        return void pass("out", () => jumpTo("school", { panel: 0, instant: true }), rig.room.narrow);
      }
      standClose(rig, from);
      // the project fades away over its own print before the camera moves
      glideTo(rig, to, want, PASS_S * 0.3);
      passing.current = true;
      pass(
        "out",
        () => {
          unpull();
          jumpTo("school", { panel: 0, instant: true });
        },
        rig.room.narrow,
      ).finally(() => (passing.current = false));
    },
    [rig, enter, unpull],
  );

  /** On to the next project, or back to the one before; a run of steps
   *  while the camera is still on its way just changes where it goes. */
  const step = useCallback(
    (dir: 1 | -1) => {
      markSwiped();
      const g = rig.glide;
      if (g.on) {
        const to = g.work + dir;
        if (to < 0) glideTo(rig, 0, 0);
        else if (to >= CARD) glideTo(rig, CARD, 0);
        else glideTo(rig, to, 1);
        return;
      }
      const from = here();
      if (from < 0) return;
      const to = from + dir;
      // before the first project you are back in the gallery; past the last,
      // on to the Berlijn card at the end of the wall
      if (to < 0) leave(from, from, 0);
      else if (to >= CARD) leave(from, CARD, 0);
      else leave(from, to, 1);
    },
    [rig, leave],
  );

  /** Back out into the gallery, in front of the print. */
  const out = useCallback(() => {
    const g = rig.glide;
    if (g.on) return glideTo(rig, g.work, 0);
    const from = here();
    if (from >= 0) leave(from, from, 0);
  }, [rig, leave]);

  /** A print walks up to and dives into its panel; the card just comes
   *  closer (and goes back on a second click). */
  const open = useCallback(
    (i: number) => {
      if (passing.current || rig.glide.on) return;
      if (i === CARD) {
        const d = rig.dolly;
        goTo(rig, stationOf(rig.room, i));
        Object.assign(d, { work: i, to: d.work === i && d.to === 1 ? 0 : 1 });
        return;
      }
      if (!drawn.current) return enter(i);
      glideTo(rig, i, 1);
    },
    [rig, enter],
  );

  const arrive = useCallback(() => {
    if (rig.glide.want === 1) enter(rig.glide.work);
  }, [rig, enter]);

  // the walk itself, on the cover
  useEffect(() => {
    const el = surface.current;
    const panel = el?.closest<HTMLElement>(".project-panel");
    if (!el || !panel) return;
    return bindInput({
      rig,
      panel,
      surface: el,
      width: () => size.current.w,
      engaged: () => {
        const j = useJourney.getState();
        return live.current && j.topic === TOPIC_INDEX.school && j.project === 0;
      },
      busy: () => passing.current || rig.glide.on,
      onStep: (station) => {
        // the keyboard walked on: keep focus on the work in front of you
        const w = rig.room.faces[station];
        if (w >= 0 && dom.works.includes(document.activeElement as HTMLElement)) dom.works[w]?.focus({ preventScroll: true });
      },
    });
  }, [rig, dom]);

  // the guided way between the projects: offered to their panels, and the
  // row's sideways input while you are in one (or on your way to the next)
  useEffect(() => {
    const row = surface.current?.closest<HTMLElement>("[data-section]");
    if (!row) return;
    row.toggleAttribute("data-guided", true);
    useGuide.getState().set(true);
    guide.use({ step, out });
    const unbind = bindSwipe({
      row,
      owns: () => useJourney.getState().topic === TOPIC_INDEX.school && (rig.glide.on || here() >= 0),
      onStep: step,
      onOut: out,
      // the panel follows the finger a little, and gives as it goes
      onPull: (dx) => {
        const p = panels()[here() + 1];
        if (here() < 0 || !p) return;
        if (dx === 0) return void Object.assign(p.style, { transition: "transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)", transform: "" });
        const share = Math.min(Math.abs(dx) / Math.max(row.clientWidth, 1), 1);
        Object.assign(p.style, { transition: "none", transform: `translateX(${(dx * 0.4).toFixed(1)}px) scale(${(1 - share * 0.08).toFixed(4)})` });
      },
    });
    return () => {
      unbind();
      unpull();
      guide.use(null);
      useGuide.getState().set(false);
      row.removeAttribute("data-guided");
    };
  }, [rig, step, out, panels, unpull]);

  const onFrame = useCallback((pose: Parameters<typeof placeOverlay>[2], w: number, h: number) => placeOverlay(dom, rig, pose, w, h), [dom, rig]);

  return (
    <>
      {/* the room, behind everything else in the panel */}
      <div aria-hidden className={s.room} style={{ "--grain": GRAIN } as CSSProperties}>
        {near && (
          <div className={s.canvas} data-ready={ready || undefined}>
            <Fallback onError={onLost}>
              <GalleryCanvas
                rig={rig}
                active={active}
                copy={copy}
                pictures={PICTURES}
                crops={CROPS}
                trailer={TRAILER}
                onReady={() => setReady(true)}
                onFrame={onFrame}
                onArrive={arrive}
                onLost={onLost}
              />
            </Fallback>
          </div>
        )}
        <div className={s.vignette} />
      </div>
      {/* the copy first (it reads first, and Tab reaches the works after it),
          painted over the works' layer */}
      <div
        ref={keep(dom, "heading")}
        className={`${s.heading} pointer-events-none relative z-10 flex w-full max-w-6xl`}
        onFocus={() => !rig.room.narrow && !rig.glide.on && goTo(rig, 0)}
      >
        <div className="pointer-events-auto">
          <CoverCopy onNext={() => open(0)} />
        </div>
      </div>
      <Overlay rig={rig} works={WORKS} narrow={narrow} dom={dom} surface={surface} onOpen={open} />
      <RoomBar rig={rig} dom={dom} />
    </>
  );
}
