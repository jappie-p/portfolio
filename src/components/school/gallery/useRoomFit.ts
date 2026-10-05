import { useEffect, type RefObject } from "react";
import { roomFor } from "./layout";
import { restPose } from "./camera";
import { placeOverlay, type OverlayDom } from "./place";
import { setRoom, type Rig } from "./rig";

/**
 * The room takes the view's shape, and leaves the copy its side of the wall
 * (or, in a narrow room, the band above the works). Until the scene runs,
 * the HTML is laid out from the walk's own pose.
 */
export function useRoomFit(rig: Rig, dom: OverlayDom, surface: RefObject<HTMLDivElement | null>, size: RefObject<{ w: number; h: number }>, onNarrow: (narrow: boolean) => void) {
  useEffect(() => {
    const el = surface.current;
    const copy = dom.heading?.firstElementChild;
    if (!el || !(copy instanceof HTMLElement)) return;
    let shape = "";
    const ro = new ResizeObserver(() => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      size.current = { w: width, h: height };
      const aspect = width / Math.max(height, 1);
      // where the copy ends, in NDC across the view, with a margin
      const left = (dom.heading?.offsetLeft ?? 0) + copy.offsetLeft;
      const top = (dom.heading?.offsetTop ?? 0) + copy.offsetTop;
      const clear = {
        right: Math.min(((left + copy.offsetWidth) / Math.max(width, 1)) * 2 - 1 + 0.07, 0.4),
        below: 1 - ((top + copy.offsetHeight) / Math.max(height, 1)) * 2,
        ndcPerPx: 2 / Math.max(height, 1),
      };
      const next = `${aspect.toFixed(3)}:${clear.right.toFixed(3)}:${clear.below.toFixed(3)}`;
      if (next !== shape) {
        shape = next;
        setRoom(rig, roomFor(aspect, clear));
        onNarrow(rig.room.narrow);
      }
      placeOverlay(dom, rig, restPose(rig), width, height);
    });
    ro.observe(el);
    ro.observe(copy);
    return () => ro.disconnect();
  }, [rig, dom, surface, size, onNarrow]);
}
