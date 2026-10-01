import { useEffect, useState, type RefObject } from "react";

/** Whether any of the element actually shows. IntersectionObserver also calls
 *  a target that only touches the viewport's edge "intersecting": exactly where
 *  the panels either side of the one in view sit, so those would keep drawing.
 *  Only a real overlap (ratio above zero) counts here. */
export function useOnScreen(ref: RefObject<Element | null>): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setOn(entries.some((e) => e.isIntersecting && e.intersectionRatio > 0)), { threshold: [0, 0.001] });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return on;
}
