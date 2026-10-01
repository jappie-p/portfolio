/** Every backdrop takes the same two switches: animate now, or hold one
 *  composed frame (reduced motion). */
export interface BackdropProps {
  active: boolean;
  still: boolean;
  /** extra classes on the root (positioning stays absolute inset-0) */
  className?: string;
}

/** A canvas scene driven by useCanvasScene. Sizes are CSS pixels. */
export interface CanvasScene {
  /** Rebuild everything that depends on the size (static layers, sprites). */
  resize(width: number, height: number, dpr: number): void;
  /** Paint one frame at scene time `t` in seconds, pointer eased in -1..1.
   *  `complete` means this frame is the only one (still, or painted while
   *  idle): finish any work the scene spreads over frames before painting. */
  draw(t: number, pointerX: number, pointerY: number, complete: boolean): void;
}
