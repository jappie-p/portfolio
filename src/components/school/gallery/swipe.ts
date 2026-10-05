export type SwipeOptions = {
  row: HTMLElement;
  /** the guided moves own the row's sideways input just now (inside a
   *  project, or gliding between them) */
  owns: () => boolean;
  /** asked to go on (+1) or back (-1) */
  onStep: (dir: 1 | -1) => void;
  /** Escape: back out into the gallery */
  onOut: () => void;
  /** live feedback while a swipe is under way, in px the content should
   *  follow; 0 when it let go without going anywhere */
  onPull: (dx: number) => void;
};

/** A trackpad gesture is over once its events stop for this long. */
const QUIET_MS = 150;
/** Sideways trackpad travel that counts as a swipe, px. */
const WHEEL_STEP = 60;
/** How far, or how fast (px/ms), a finger has to go. */
const DRAG_STEP = 56;
const FLICK = 0.45;

/**
 * The sideways input of the School row while it is guided: a trackpad
 * swipe, a finger dragged across, or the arrow keys each ask for one step
 * (a quick run of them chains); Escape backs out. Vertical input is left
 * alone, so the page still scrolls on to the next topic.
 */
export function bindSwipe(o: SwipeOptions): () => void {
  const { row } = o;

  // --- trackpad: one step per gesture, momentum included ---
  let gesture: { sideways: boolean; at: number; moved: number; fired: boolean } | null = null;
  let quiet = 0;
  const end = () => {
    if (gesture?.sideways && !gesture.fired) o.onPull(0);
    gesture = null;
  };
  const onWheel = (e: WheelEvent) => {
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? row.clientWidth : 1;
    const dx = e.deltaX * unit;
    const dy = e.deltaY * unit;
    if (!gesture || e.timeStamp - gesture.at > QUIET_MS) {
      end();
      gesture = { sideways: Math.abs(dx) > Math.abs(dy) * 1.25 && Math.abs(dx) > 0.5 && o.owns(), at: e.timeStamp, moved: 0, fired: false };
    }
    gesture.at = e.timeStamp;
    if (!gesture.sideways) return;
    e.preventDefault();
    window.clearTimeout(quiet);
    quiet = window.setTimeout(end, QUIET_MS);
    if (gesture.fired) return;
    gesture.moved += dx;
    if (Math.abs(gesture.moved) < WHEEL_STEP) return o.onPull(-gesture.moved);
    gesture.fired = true;
    o.onStep(gesture.moved > 0 ? 1 : -1);
  };

  // --- touch: the panel follows the finger, a long or quick enough drag steps ---
  let drag: { id: number; x: number; y: number; on: boolean; lastX: number; at: number; v: number } | null = null;
  let swallow = false;
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse" || !o.owns()) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, lastX: e.clientX, at: e.timeStamp, v: 0 };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!drag.on) {
      // vertical intent: the page scrolls
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) return void (drag = null);
      if (Math.abs(dx) < 10) return;
      drag.on = true;
    }
    const dt = Math.max(e.timeStamp - drag.at, 1);
    drag.v = drag.v * 0.6 + ((e.clientX - drag.lastX) / dt) * 0.4;
    drag.lastX = e.clientX;
    drag.at = e.timeStamp;
    o.onPull(dx);
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (!d.on) return;
    swallow = true;
    window.setTimeout(() => (swallow = false), 0);
    const dx = e.clientX - d.x;
    const quick = Math.abs(d.v) > FLICK;
    if (e.type === "pointerup" && (Math.abs(dx) > DRAG_STEP || quick)) o.onStep((quick ? d.v : dx) < 0 ? 1 : -1);
    else o.onPull(0);
  };
  // a drag that let go over a button is not a click on it
  const onClick = (e: MouseEvent) => {
    if (!swallow) return;
    e.preventDefault();
    e.stopPropagation();
  };

  // --- keys: one step per press, Escape backs out ---
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "Escape") return;
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const t = e.target instanceof Element ? e.target : null;
    if (t?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
    // an open dialog (the case panel, the menu) has Escape for itself
    if (document.querySelector('[role="dialog"]')) return;
    if (!o.owns()) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.key === "Escape") o.onOut();
    else o.onStep(e.key === "ArrowRight" ? 1 : -1);
  };

  row.addEventListener("wheel", onWheel, { passive: false });
  row.addEventListener("pointerdown", onDown);
  row.addEventListener("pointermove", onMove);
  row.addEventListener("pointerup", onUp);
  row.addEventListener("pointercancel", onUp);
  row.addEventListener("click", onClick, true);
  window.addEventListener("keydown", onKey, true);
  return () => {
    window.clearTimeout(quiet);
    row.removeEventListener("wheel", onWheel);
    row.removeEventListener("pointerdown", onDown);
    row.removeEventListener("pointermove", onMove);
    row.removeEventListener("pointerup", onUp);
    row.removeEventListener("pointercancel", onUp);
    row.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKey, true);
  };
}
