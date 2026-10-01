/** Asks the 3D scenes for one fresh frame (in still mode they only draw on
 *  demand) without putting the 3D library in the page's first load: by the
 *  time a scene is on screen its chunk has loaded, so this resolves at once. */
export function redraw() {
  void import("@react-three/fiber").then((m) => m.invalidate());
}
