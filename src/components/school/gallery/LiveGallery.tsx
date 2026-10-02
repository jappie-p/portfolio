"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { focusPosition, zoomInto } from "@/components/journey/zoom";
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
import { bindInput } from "./input";
import { roomFor, stationOf, ORDER } from "./layout";
import { Overlay, type OverlayWork } from "./Overlay";
import { keep, placeOverlay, type OverlayDom } from "./place";
import { createRig, goTo, standAt } from "./rig";
import { useRoomFit } from "./useRoomFit";
import type { Crops } from "./three/scene";
import s from "./gallery.module.css";

const GalleryCanvas = dynamic(() => import("./GalleryCanvas").then((m) => m.GalleryCanvas), { ssr: false });

/** The square prints are slices of the 16:10 worlds, centred on each subject. */
const SQUARE = 1 / 1.6;
const left = (focus: number) => Math.min(Math.max(focus - SQUARE / 2, 0), 1 - SQUARE);
const CROPS: Crops = { zelda: left(SCHOOL_WORLDS.zelda.focus), kiosk: left(SCHOOL_WORLDS.kiosk.focus), festival: left(SCHOOL_WORLDS.festival.focus) };
const PICTURES = { zelda: SCHOOL_WORLDS.zelda.image.src, kiosk: SCHOOL_WORLDS.kiosk.image.src, festival: SCHOOL_WORLDS.festival.image.src };
const TRAILER = `${BASE_PATH}/trailers/zelda`;
const WORKS: OverlayWork[] = ORDER.map((id) =>
  id === "berlijn" ? { slug: id } : { slug: id, image: SCHOOL_WORLDS[id].image, position: focusPosition(SCHOOL_WORLDS[id].focus, 1, 1.6) },
);

/** Scroll the row on to the panel after this one. */
function nextPanel(panel: HTMLElement) {
  const next = panel.nextElementSibling;
  if (next instanceof HTMLElement) panel.parentElement?.scrollTo({ left: next.offsetLeft, behavior: "smooth" });
}

/** The School cover as a gallery at night you can walk through. */
export function LiveGallery({ onLost }: { onLost: () => void }) {
  const t = useT();
  const [rig] = useState(() => createRig(roomFor(16 / 10)));
  const [dom] = useState<OverlayDom>(() => ({ works: [], pics: [], labels: [], heading: null }));
  const [narrow, setNarrow] = useState(false);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const size = useRef({ w: 1, h: 1 });
  const zooming = useRef(false);
  const active = useInView(surface);
  const live = useRef(active);
  const copy = useMemo(() => ({ title: t.school.extraTitle, tech: SCHOOL_EXTRA.tech, year: SCHOOL_EXTRA.year }), [t]);

  useEffect(() => {
    live.current = active;
  }, [active]);

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
      if (entries.some(onScreen) || rig.dolly.hold) return;
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

  const zoom = useCallback(
    (i: number) => {
      const pic = dom.pics[i];
      const id = ORDER[i];
      if (!pic || id === "berlijn") return;
      zooming.current = true;
      zoomInto(
        pic,
        () => {
          jumpTo("school", { panel: i + 1, instant: true });
          // back at that work, stepped back, for when you return
          standAt(rig, stationOf(rig.room, i));
        },
        { position: focusPosition(SCHOOL_WORLDS[id].focus, 1, 1.6) },
      )
        .catch(() => {})
        .finally(() => (zooming.current = false));
    },
    [dom, rig],
  );

  /** Step up to a work: a print hands over to the zoom into its panel, the
   *  card just comes closer (and goes back on a second click). */
  const open = useCallback(
    (i: number) => {
      const d = rig.dolly;
      if (zooming.current || d.hold) return;
      goTo(rig, stationOf(rig.room, i));
      if (ORDER[i] === "berlijn") {
        Object.assign(d, { work: i, to: d.work === i && d.to === 1 ? 0 : 1 });
      } else if (!ready) zoom(i);
      else Object.assign(d, { work: i, to: 1, hold: true });
    },
    [rig, ready, zoom],
  );

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
      busy: () => zooming.current || rig.dolly.hold,
      onEdge: () => nextPanel(panel),
      onStep: (station) => {
        // the keyboard walked on: keep focus on the work in front of you
        const w = rig.room.faces[station];
        if (w >= 0 && dom.works.includes(document.activeElement as HTMLElement)) dom.works[w]?.focus({ preventScroll: true });
      },
    });
  }, [rig, dom]);

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
                onArrive={zoom}
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
        onFocus={() => !rig.room.narrow && goTo(rig, 0)}
      >
        <div className="pointer-events-auto">
          <CoverCopy />
        </div>
      </div>
      <Overlay rig={rig} works={WORKS} narrow={narrow} dom={dom} surface={surface} onOpen={open} />
    </>
  );
}
