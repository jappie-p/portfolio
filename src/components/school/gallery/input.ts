import { goTo, last, nudge, settle, type Rig } from "./rig";

export type InputOptions = {
  rig: Rig;
  /** the cover panel: a sideways swipe anywhere on it walks */
  panel: HTMLElement;
  /** the layer over the wall: drags start here */
  surface: HTMLElement;
  /** the view's width in CSS pixels */
  width: () => number;
  /** the gallery is the panel in front of you (for the arrow keys) */
  engaged: () => boolean;
  /** stepping up to a work, or zooming into one: hands off */
  busy: () => boolean;
  /** pulled past the last work: on to the next panel */
  onEdge: () => void;
  /** the keys walked to another station */
  onStep: (station: number) => void;
};

/** A gesture is over once its events stop for this long (trackpad momentum
 *  keeps one going). */
const QUIET_MS = 150;

/**
 * The walk's inputs. Only clearly sideways input walks: a swipe or shift
 * wheel, a drag, the arrow keys; anything vertical scrolls the page as ever.
 * At either end the next sideways gesture is left to the track, so the row
 * still slides on to the projects.
 */
export function bindInput(o: InputOptions): () => void {
  const { rig, panel, surface } = o;
  const stride = () => rig.room.stride * Math.max(o.width(), 1);

  // --- wheel and trackpad: decide per gesture, from its first event ---
  let gesture: { walk: boolean; at: number; moved: number } | null = null;
  let quiet = 0;
  const release = () => {
    if (gesture?.walk) settle(rig, Math.sign(gesture.moved) * 0.36);
    gesture = null;
  };
  const onWheel = (e: WheelEvent) => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? o.width() : 1;
    const dx = e.deltaX * unit;
    const dy = e.deltaY * unit;
    if (!gesture || e.timeStamp - gesture.at > QUIET_MS) {
      if (gesture?.walk) release();
      const sideways = Math.abs(dx) > Math.abs(dy) * 1.25 && Math.abs(dx) > 0.5;
      const atEnd = dx > 0 ? rig.target >= last(rig) - 0.02 : rig.target <= 0.02;
      gesture = { walk: sideways && !atEnd && !o.busy(), at: e.timeStamp, moved: 0 };
    }
    gesture.at = e.timeStamp;
    if (!gesture.walk) return;
    e.preventDefault();
    gesture.moved += dx;
    nudge(rig, dx / stride());
    window.clearTimeout(quiet);
    quiet = window.setTimeout(release, QUIET_MS);
  };

  // --- drag: the wall follows the finger or the mouse ---
  let drag: { id: number; x: number; y: number; at: number; lastX: number; v: number; on: boolean } | null = null;
  let swallow = false;
  const onDown = (e: PointerEvent) => {
    if (o.busy() || (e.pointerType === "mouse" && e.button !== 0)) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp, lastX: e.clientX, v: 0, on: false };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.on) {
      // vertical intent: let the page have it
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (drag = null);
      if (Math.abs(dx) < 8) return;
      drag.on = true;
      drag.lastX = e.clientX;
      surface.setPointerCapture(e.pointerId);
      surface.toggleAttribute("data-dragging", true);
    }
    const ds = -(e.clientX - drag.lastX) / stride();
    const dt = Math.max(e.timeStamp - drag.at, 1) / 1000;
    drag.v = drag.v * 0.55 + (ds / dt) * 0.45;
    drag.lastX = e.clientX;
    drag.at = e.timeStamp;
    nudge(rig, ds);
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.on) {
      const moved = -(e.clientX - drag.x) / stride();
      const flick = Math.max(-1, Math.min(1, drag.v * 0.14)) + Math.sign(moved) * (Math.abs(moved) > 0.08 ? 0.3 : 0);
      if (settle(rig, flick) > 0.16 && e.type === "pointerup") o.onEdge();
      swallow = true;
      window.setTimeout(() => (swallow = false), 0);
      surface.toggleAttribute("data-dragging", false);
    }
    drag = null;
  };
  // a drag that started on a work is not a click on it
  const onClick = (e: MouseEvent) => {
    if (!swallow) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // --- keys: the arrows walk from work to work, then hand over to the track ---
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || !o.engaged() || o.busy()) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    const next = Math.round(rig.target) + (e.key === "ArrowRight" ? 1 : -1);
    if (next < 0 || next > last(rig)) return;
    e.preventDefault();
    e.stopPropagation();
    goTo(rig, next);
    o.onStep(next);
  };

  panel.addEventListener("wheel", onWheel, { passive: false });
  surface.addEventListener("pointerdown", onDown);
  surface.addEventListener("pointermove", onMove);
  surface.addEventListener("pointerup", onUp);
  surface.addEventListener("pointercancel", onUp);
  surface.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  return () => {
    window.clearTimeout(quiet);
    panel.removeEventListener("wheel", onWheel);
    surface.removeEventListener("pointerdown", onDown);
    surface.removeEventListener("pointermove", onMove);
    surface.removeEventListener("pointerup", onUp);
    surface.removeEventListener("pointercancel", onUp);
    surface.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey, true);
  };
}
