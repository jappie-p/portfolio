import * as THREE from "three";
import { HEAD } from "./glsl";

const QUAD = /* glsl */ `${HEAD}
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const BRIGHT = /* glsl */ `${HEAD}
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  // four taps through linear filtering, a box over the source pixels under
  // this one; then only what is over the knee: the lamps, the neon, the
  // fireflies, paper and glass in a spot
  vec3 c = texture(uTex, vUv + uStep * vec2(-1.0, -1.0)).rgb + texture(uTex, vUv + uStep * vec2(1.0, -1.0)).rgb;
  c += texture(uTex, vUv + uStep * vec2(-1.0, 1.0)).rgb + texture(uTex, vUv + uStep * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  float k = smoothstep(0.62, 1.0, max(c.r, max(c.g, c.b)));
  fragColor = vec4(c * k, 1.0);
}
`;

const BLUR = /* glsl */ `${HEAD}
uniform sampler2D uTex;
uniform vec2 uStep;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  // nine taps through linear filtering, a gaussian of radius ~4 steps
  vec3 c = texture(uTex, vUv).rgb * 0.227027;
  c += (texture(uTex, vUv + uStep * 1.384615).rgb + texture(uTex, vUv - uStep * 1.384615).rgb) * 0.316216;
  c += (texture(uTex, vUv + uStep * 3.230769).rgb + texture(uTex, vUv - uStep * 3.230769).rgb) * 0.070270;
  fragColor = vec4(c, 1.0);
}
`;

const ADD = /* glsl */ `${HEAD}
uniform sampler2D uFrame;
uniform sampler2D uNear;
uniform sampler2D uFar;
uniform float uStrength;
in vec2 vUv;
out highp vec4 fragColor;
void main() {
  // the frame as it was drawn, a tight halo and a wide one screened over
  // it: the dark round a lamp takes the glow, paper already bright in its
  // spot takes next to none, so it never burns out
  vec3 c = texture(uFrame, vUv).rgb;
  vec3 glow = (texture(uNear, vUv).rgb * 0.45 + texture(uFar, vUv).rgb * 0.75) * uStrength;
  fragColor = vec4(c + glow * (1.0 - c), 1.0);
}
`;

const target = (w: number, h: number, frame = false) =>
  new THREE.WebGLRenderTarget(w, h, {
    // the frame holds what the materials wrote for the screen (already
    // encoded, 8 bits a channel, as the canvas would); the glow, linear
    type: frame ? THREE.UnsignedByteType : THREE.HalfFloatType,
    depthBuffer: frame,
    generateMipmaps: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });

/**
 * The glow round whatever burns brightest, as a lens gives it: the room is
 * drawn into `frame` instead of the canvas, its brightest parts kept at a
 * quarter of the resolution and blurred there (and again at an eighth, for
 * the wide halo), and the frame laid on the canvas with both added over it.
 * With no glow wanted, the room goes straight to the canvas.
 */
export class Bloom {
  /** where the room is drawn while it glows */
  readonly frame = target(2, 2, true);
  private readonly near = target(2, 2);
  private readonly nearTmp = target(2, 2);
  private readonly far = target(2, 2);
  private readonly farTmp = target(2, 2);
  private readonly flat = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  /** its passes (public so they can be compiled ahead) */
  readonly bright: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly blur: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;
  readonly add: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const quad = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>, blending: Partial<THREE.ShaderMaterialParameters> = {}) => {
      const m = new THREE.Mesh(
        geometry,
        new THREE.RawShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: QUAD, fragmentShader, uniforms, depthTest: false, depthWrite: false, blending: THREE.NoBlending, ...blending }),
      );
      m.frustumCulled = false;
      return m;
    };
    this.bright = quad(BRIGHT, { uTex: { value: null }, uStep: { value: new THREE.Vector2() } });
    this.blur = quad(BLUR, { uTex: { value: null }, uStep: { value: new THREE.Vector2() } });
    this.add = quad(
      ADD,
      { uFrame: { value: this.frame.texture }, uNear: { value: this.near.texture }, uFar: { value: this.far.texture }, uStrength: { value: 0 } },
    );
  }

  /** Match the canvas' drawing buffer (in device pixels). */
  setSize(w: number, h: number) {
    if (this.frame.width === w && this.frame.height === h) return;
    this.frame.setSize(w, h);
    const q = (n: number, s: number) => Math.max(2, Math.round(n / s));
    this.near.setSize(q(w, 4), q(h, 4));
    this.nearTmp.setSize(q(w, 4), q(h, 4));
    this.far.setSize(q(w, 8), q(h, 8));
    this.farTmp.setSize(q(w, 8), q(h, 8));
  }

  /** Lay the frame on the canvas, `strength` 0..1 of the full glow over it. */
  render(gl: THREE.WebGLRenderer, strength: number) {
    const pass = (mesh: THREE.Mesh<THREE.BufferGeometry, THREE.RawShaderMaterial>, from: THREE.Texture, to: THREE.WebGLRenderTarget, x: number, y: number, w: number, h: number) => {
      mesh.material.uniforms.uTex.value = from;
      mesh.material.uniforms.uStep.value.set(x / w, y / h);
      gl.setRenderTarget(to);
      gl.render(mesh, this.flat);
    };
    const n = this.near;
    const f = this.far;
    pass(this.bright, this.frame.texture, n, 1, 1, this.frame.width, this.frame.height);
    pass(this.blur, n.texture, this.nearTmp, 1, 0, n.width, n.height);
    pass(this.blur, this.nearTmp.texture, n, 0, 1, n.width, n.height);
    pass(this.blur, n.texture, this.farTmp, 1.5, 0, f.width, f.height);
    pass(this.blur, this.farTmp.texture, f, 0, 1.5, f.width, f.height);
    pass(this.blur, f.texture, this.farTmp, 1.5, 0, f.width, f.height);
    pass(this.blur, this.farTmp.texture, f, 0, 1.5, f.width, f.height);
    gl.setRenderTarget(null);
    this.add.material.uniforms.uStrength.value = strength;
    gl.render(this.add, this.flat);
  }

  dispose() {
    this.frame.dispose();
    [this.near, this.nearTmp, this.far, this.farTmp].forEach((t) => t.dispose());
    this.bright.geometry.dispose();
    [this.bright, this.blur, this.add].forEach((m) => m.material.dispose());
  }
}
