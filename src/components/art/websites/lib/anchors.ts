/** An element's layout box relative to another, from offsets, so tilt, float
 *  and rise-in transforms never skew it. */
export function layoutBox(el: HTMLElement, from: HTMLElement): Box {
  const at = (n: HTMLElement | null) => {
    let x = 0;
    let y = 0;
    for (; n; n = n.offsetParent as HTMLElement | null) {
      x += n.offsetLeft;
      y += n.offsetTop;
    }
    return { x, y };
  };
  const a = at(el);
  const b = at(from);
  return { x: a.x - b.x, y: a.y - b.y, w: el.offsetWidth, h: el.offsetHeight };
}

export type Box = { x: number; y: number; w: number; h: number };

/** Where a project panel's stage and copy sit, in the sheet's own CSS px. */
export interface PanelAnchors {
  /** the browser frame */
  frame: Box;
  /** bottom of the browser frame, and of frame and phone together */
  frameBottom: number;
  stageBottom: number;
  /** the copy column under (or beside) the stage */
  copy: Box;
  copyTop: number;
  copyBottom: number;
  /** right end of its buttons and links */
  actionsRight: number;
}

/**
 * Measure the panel around the sheet: the frames (figures) and the copy
 * column holding the project title. Null when there is no such panel (a bare
 * lab), and layouts fall back to fractions of the sheet.
 */
export function panelAnchors(sheet: HTMLElement): PanelAnchors | null {
  const scope = sheet.closest<HTMLElement>("[data-panel]") ?? sheet.closest<HTMLElement>("section");
  if (!scope) return null;
  const figures = [...scope.querySelectorAll<HTMLElement>("figure")];
  const title = [...scope.querySelectorAll<HTMLElement>("h3")].find((h) => !h.closest("figure"));
  if (!figures.length || !title) return null;
  let copy = title;
  while (copy.parentElement && copy.parentElement !== scope && !copy.parentElement.contains(figures[0])) copy = copy.parentElement;
  const boxes = figures.map((f) => layoutBox(f, sheet));
  const c = layoutBox(copy, sheet);
  const acts = [...copy.querySelectorAll<HTMLElement>("a, button, .btn")].map((a) => layoutBox(a, sheet));
  return {
    frame: boxes[0],
    frameBottom: boxes[0].y + boxes[0].h,
    stageBottom: Math.max(...boxes.map((b) => b.y + b.h)),
    copy: c,
    copyTop: c.y,
    copyBottom: c.y + c.h,
    actionsRight: acts.length ? Math.max(...acts.map((a) => a.x + a.w)) : c.x + c.w,
  };
}
