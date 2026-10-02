import { HEAD, LIGHT, NOISE, OUT } from "./glsl";

/**
 * The face of a framed work, in one pass: the mat with the frame's lip
 * shading its top, the window cut into it at 45 degrees (its lower edge
 * catching the light), the print, and the glass over everything. With VIDEO
 * the browser window in the Zelda print plays the trailer, mapped into it
 * through a homography so it sits exactly where the still shows the game.
 */
export const FACE_FRAG = /* glsl */ `${HEAD}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
uniform vec3 cameraPosition;
uniform int uSpot;
uniform sampler2D uMap;
uniform vec4 uCrop;
uniform vec2 uSize;
uniform vec2 uPic;
uniform float uLip;
uniform float uLevel;
uniform float uNorm;
uniform float uRaw;
uniform vec3 uGlare;
#ifdef VIDEO
uniform sampler2D uVideo;
uniform mat3 uHomography;
uniform float uVideoMix;
#endif
${OUT}
${LIGHT}
${NOISE}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}

vec3 print(vec2 puv) {
  vec2 tuv = uCrop.xy + puv * uCrop.zw;
  vec3 c = texture(uMap, tuv).rgb;
#ifdef VIDEO
  // picture pixels to the window's own square, then into the trailer
  vec3 h = uHomography * vec3(tuv.x * 1920.0, (1.0 - tuv.y) * 1200.0, 1.0);
  vec2 st = h.xy / h.z;
  vec2 edge = min(st, 1.0 - st);
  float inside = smoothstep(0.0, 0.004, min(edge.x, edge.y));
  vec3 v = srgbToLinear(texture(uVideo, vec2(0.140625 + st.x * 0.71875, 1.0 - st.y)).rgb);
  // it gives way to the still as the camera steps in, so the zoom (which
  // grows the still) takes over without a jump
  c = mix(c, v, inside * uVideoMix * (1.0 - uRaw));
#endif
  return c;
}

void main() {
  vec3 p = vWorld;
  vec3 n = normalize(vNormal);
  vec3 V = normalize(cameraPosition - p);
  vec2 q = (vUv - 0.5) * uSize;
  vec3 L;
  spot(uSpot, p, L);
  vec3 lampPos = uSpotPos[uSpot];
  float lambert = max(dot(n, L), 0.0);

  // how the framing spot falls across the face, 1 at the picture's centre
  vec3 dl = lampPos - p;
  float cone = smoothstep(uSpotCone[uSpot].x, uSpotCone[uSpot].y, dot(-L, uSpotDir[uSpot]));
  float shape = cone * cone / dot(dl, dl) * lambert * uNorm;
  vec3 warm = vec3(1.0, 0.93, 0.84) * uLevel * mix(1.0, shape, 0.45);

  // print, bevel and mat, blended over a pixel so the edges never crawl
  const float bevel = 0.006;
  vec2 inside = uPic * 0.5 - abs(q);
  vec2 px = max(fwidth(q), vec2(1e-5));
  vec2 inPrint = clamp(inside / px + 0.5, 0.0, 1.0);
  vec2 inWindow = clamp((inside + bevel) / px + 0.5, 0.0, 1.0);
  float wPrint = inPrint.x * inPrint.y;
  float wBevel = inWindow.x * inWindow.y - wPrint;

  // the print, lit evenly by its spot and a little brighter toward the top;
  // the mat's cut edge throws a hairline of shade along its top
  vec3 tex = print(clamp(q / uPic + 0.5, 0.0, 1.0));
  vec3 lit = tex * uLevel * mix(1.0, shape, 0.3) * mix(0.8, 1.0, smoothstep(0.0, 0.004, uPic.y * 0.5 - q.y));
  vec3 printCol = mix(lit, tex, uRaw);

  // the frame's lip shades the top of the mat, the light coming from above
  float rise = (lampPos.y - p.y) / max(lampPos.z - p.z, 0.1);
  float run = abs(lampPos.x - p.x) / max(lampPos.z - p.z, 0.1);
  float lip = smoothstep(-0.004, 0.006, uSize.y * 0.5 - q.y - uLip * rise);
  lip *= smoothstep(-0.003, 0.004, uSize.x * 0.5 - abs(q.x) - uLip * run);
  // the bevel: white core cut at 45 degrees, each side facing the print
  vec3 bn = normalize(inside.x < inside.y ? vec3(-sign(q.x), 0.0, 1.0) : vec3(0.0, -sign(q.y), 1.0));
  float turn = min(max(dot(bn, L), 0.0) / max(lambert, 0.05), 1.6);
  vec3 bevelCol = vec3(0.93, 0.91, 0.87) * (uAmbient * 3.0 + warm * turn * lip);
  // cotton mat board, warm white, with a whisper of tooth
  vec3 board = vec3(0.7, 0.68, 0.63) * (0.97 + 0.06 * grain(vUv * uSize * 1.7).r);
  vec3 matCol = board * (uAmbient * 3.0 + warm * mix(0.45, 1.0, lip));

  vec3 col = printCol * wPrint + bevelCol * wBevel + matCol * (1.0 - wPrint - wBevel);
  // fade the face's very edge into the frame's black, so the seam between
  // the two meshes stays smooth with no multisampling
  vec2 edge = (uSize * 0.5 - abs(q)) / px;
  col *= clamp(min(edge.x, edge.y) - 0.5, 0.0, 1.0);

  // glass: the dim room behind the viewer, the lit wall opposite as a soft band
  vec3 R = reflect(-V, n);
  float F = 0.04 + 0.96 * pow(1.0 - max(dot(n, V), 0.0), 5.0);
  float band = exp(-pow((R.y + 0.08) * 4.0, 2.0)) * (0.6 + 0.4 * sin(R.x * 3.0 + 1.3));
  vec3 env = vec3(0.01, 0.01, 0.012) + vec3(0.07, 0.062, 0.052) * band;
  vec2 gd = vUv - uGlare.xy;
  float glare = exp(-dot(gd, gd) * 7.0) * uGlare.z;
  vec3 glass = env * F * 4.0 + vec3(1.0, 0.96, 0.9) * glare * 0.06;
  col += glass * (1.0 - uRaw);
  emit(col, 1.0);
}
`;
