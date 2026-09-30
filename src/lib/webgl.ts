let hardware: boolean | undefined;

/** WebGL2 on a real GPU. Software rasterisers (SwiftShader, llvmpipe) can run
 *  WebGL but freeze the page on a heavy scene, so they count as no GPU.
 *  Probed once per page load with a throwaway context. */
export function hasHardwareWebGL(): boolean {
  if (typeof window === "undefined") return false;
  if (hardware !== undefined) return hardware;
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return (hardware = false);
    // Firefox reports the real renderer in RENDERER and warns about the debug extension
    let renderer = String(gl.getParameter(gl.RENDERER));
    if (!/firefox/i.test(navigator.userAgent)) {
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
    }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return (hardware = !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer));
  } catch {
    return (hardware = false);
  }
}
