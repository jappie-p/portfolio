import * as THREE from "three";
import { HEAD } from "./glsl";

/** Layer of what stands so close to the entrance's lens it is out of focus
 *  (MIRRORED is 1, SHADE 2):
 *  drawn on its own, blurred, and laid over the room. */
export const NEAR = 3;

const QUAD = /* glsl */ `${HEAD}
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BLUR = /* glsl */ `${HEAD}
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  // nine taps through linear filtering, premultiplied colour and coverage
  // together, so the edge goes soft into what is behind it
  vec4 c = texture(uTex, vUv) * 0.227027;
  c += (texture(uTex, vUv + uStep * 1.384615) + texture(uTex, vUv - uStep * 1.384615)) * 0.316216;
  c += (texture(uTex, vUv + uStep * 3.230769) + texture(uTex, vUv - uStep * 3.230769)) * 0.070270;
  fragColor = c;
}
`;

const OVER = /* glsl */ `${HEAD}
uniform sampler2D uTex;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  fragColor = texture(uTex, vUv);
}
`;

const target = (w: number, h: number, depth: boolean) =>
  new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, depthBuffer: depth, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });

/**
 * A lens's shallow focus for the few things right in front of it (the
 * bench, the leaves at the corner): they are drawn alone at half the
 * canvas' resolution, blurred at a quarter, and laid over the room as
 * premultiplied colour. Everything else stays sharp; nothing else is drawn
 * twice.
 */
export class Focus {
  private readonly near = target(2, 2, true);
  private readonly soft = target(2, 2, false);
  private readonly tmp = target(2, 2, false);
  private readonly flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly clear = new THREE.Color();
  /** the blur and the overlay (public so they can be compiled ahead) */
  readonly blur: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly over: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const quad = (fragmentShader: string, blending: Partial<THREE.ShaderMaterialParameters>) => {
      const m = new THREE.Mesh(
        geometry,
        new THREE.RawShaderMaterial({
          glslVersion: THREE.GLSL3,
          vertexShader: QUAD,
          fragmentShader,
          uniforms: { uTex: { value: null }, uStep: { value: new THREE.Vector2() } },
          depthTest: false,
          depthWrite: false,
          ...blending,
        }),
      );
      m.frustumCulled = false;
      return m;
    };
    this.blur = quad(BLUR, { blending: THREE.NoBlending });
    this.over = quad(OVER, {
      transparent: true,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
  }

  /** Match the canvas' drawing buffer (in device pixels). */
  setSize(w: number, h: number) {
    const nw = Math.max(2, Math.round(w / 2));
    const nh = Math.max(2, Math.round(h / 2));
    if (this.near.width === nw && this.near.height === nh) return;
    this.near.setSize(nw, nh);
    this.tmp.setSize(Math.max(2, nw >> 1), Math.max(2, nh >> 1));
    this.soft.setSize(Math.max(2, nw >> 1), Math.max(2, nh >> 1));
  }

  /** Draw layer NEAR, blur it by `radius` (quarter-resolution steps), and lay
   *  it over whatever `gl` last drew to the canvas. */
  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, radius: number) {
    const mask = camera.layers.mask;
    const alpha = gl.getClearAlpha();
    gl.getClearColor(this.clear);
    camera.layers.set(NEAR);
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(this.near);
    gl.clear();
    gl.render(scene, camera);
    camera.layers.mask = mask;
    gl.setClearColor(this.clear, alpha);
    const m = this.blur.material;
    const pass = (from: THREE.WebGLRenderTarget, to: THREE.WebGLRenderTarget, x: number, y: number) => {
      m.uniforms.uTex.value = from.texture;
      m.uniforms.uStep.value.set(x / to.width, y / to.height);
      gl.setRenderTarget(to);
      gl.render(this.blur, this.flat);
    };
    pass(this.near, this.tmp, radius, 0);
    pass(this.tmp, this.soft, 0, radius);
    pass(this.soft, this.tmp, radius * 0.6, 0);
    pass(this.tmp, this.soft, 0, radius * 0.6);
    gl.setRenderTarget(null);
    this.over.material.uniforms.uTex.value = this.soft.texture;
    const auto = gl.autoClear;
    gl.autoClear = false;
    gl.render(this.over, this.flat);
    gl.autoClear = auto;
  }

  dispose() {
    this.near.dispose();
    this.soft.dispose();
    this.tmp.dispose();
    this.blur.geometry.dispose();
    this.blur.material.dispose();
    this.over.material.dispose();
  }
}
