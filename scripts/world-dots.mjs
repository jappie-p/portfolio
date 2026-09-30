#!/usr/bin/env node
/**
 * Generates src/data/world-dots.ts: a dot-grid world map (Natural Earth 110m
 * land, sampled on a regular equirectangular grid and kept where the grid
 * point falls on land) plus a projectLatLon() helper in the same pixel space.
 * Both are consumed by src/components/contact/WorldMap.tsx.
 *
 * Regenerate (from the portfolio root):
 *   npm i --prefix /tmp/world-dots-gen world-atlas topojson-client
 *   node scripts/world-dots.mjs /tmp/world-dots-gen/node_modules/world-atlas/land-110m.json --modules /tmp/world-dots-gen/node_modules
 *
 * world-atlas and topojson-client are generator-only: they are never added to
 * the app's package.json, so --modules points module resolution at whatever
 * node_modules they were installed into (it need not be an ancestor of this
 * file). Add --preview <file.html> to also write a standalone visual-QA page
 * showing the map at 1200px and 360px wide. --out writes the data file
 * somewhere other than src/data/world-dots.ts. --step overrides the grid
 * spacing (viewBox px); the default is tuned so the Netherlands reliably
 * gets a few dots while keeping the total in the 1800-3200 range.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") args.out = argv[++i];
    else if (a === "--preview") args.preview = argv[++i];
    else if (a === "--modules") args.modules = argv[++i];
    else if (a === "--step") args.step = Number(argv[++i]);
    else if (a === "--width") args.width = Number(argv[++i]);
    else if (a === "--offset-x") args.offsetX = Number(argv[++i]);
    else if (a === "--offset-y") args.offsetY = Number(argv[++i]);
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const landPath = args._[0];
if (!landPath) {
  console.error(
    "Usage: node scripts/world-dots.mjs <land-topojson-or-geojson-path> [--out src/data/world-dots.ts] [--preview file.html] [--modules <node_modules dir>] [--step N] [--width N]",
  );
  process.exit(1);
}

const req = createRequire(import.meta.url);

/** topojson-client is CJS with no "exports" map, so require.resolve() with a
 *  custom search path finds it even when it lives outside this file's own
 *  node_modules ancestry (e.g. a scratch install dir). Importing the
 *  resolved path works for both CJS and ESM builds. */
async function loadFeature(modulesDir) {
  const resolveOpts = modulesDir ? { paths: [modulesDir] } : undefined;
  const resolved = req.resolve("topojson-client", resolveOpts);
  const mod = await import(pathToFileURL(resolved).href);
  return mod.feature ?? mod.default?.feature;
}

const feature = await loadFeature(args.modules);
if (!feature) throw new Error("Could not load feature() from topojson-client");

const raw = JSON.parse(readFileSync(landPath, "utf8"));

// Normalize whatever we were handed down to a flat list of polygons, where
// each polygon is an array of rings (first = exterior, rest = holes) and
// each ring is an array of [lon, lat] pairs.
const polygons = [];
function collectFromGeometry(geometry) {
  if (!geometry) return;
  if (geometry.type === "Polygon") polygons.push(geometry.coordinates);
  else if (geometry.type === "MultiPolygon") for (const p of geometry.coordinates) polygons.push(p);
}

if (raw.type === "Topology") {
  const key = raw.objects.land ? "land" : Object.keys(raw.objects)[0];
  const geo = feature(raw, raw.objects[key]);
  if (geo.type === "FeatureCollection") for (const f of geo.features) collectFromGeometry(f.geometry);
  else collectFromGeometry(geo.geometry);
} else if (raw.type === "FeatureCollection") {
  for (const f of raw.features) collectFromGeometry(f.geometry);
} else if (raw.type === "Feature") {
  collectFromGeometry(raw.geometry);
} else {
  collectFromGeometry(raw);
}
if (polygons.length === 0) throw new Error(`No land polygons found in ${landPath}`);

// --- projection: equirectangular, cropped so Antarctica falls outside the
// sampled range and the Netherlands sits comfortably inside it -------------
const LON_MIN = -180;
const LON_MAX = 180;
const LAT_MIN = -56;
const LAT_MAX = 78;
const STEP = args.step ?? 9;
const WIDTH = args.width ?? 1500;
const HEIGHT = Math.round((WIDTH * (LAT_MAX - LAT_MIN)) / (LON_MAX - LON_MIN));

function project(lat, lon) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * HEIGHT;
  return [x, y];
}

const projPolygons = polygons.map((poly) => poly.map((ring) => ring.map(([lon, lat]) => project(lat, lon))));

// Even-odd point-in-polygon over every ring of a polygon (exterior + holes)
// at once: a point inside the exterior but inside a hole toggles twice
// (once per ring) and cancels out, which is exactly the "not in a hole"
// rule. A MultiPolygon is the union of its polygons, so any match wins.
function pointInRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}
function isLand(x, y) {
  for (const poly of projPolygons) {
    let inside = false;
    for (const ring of poly) if (pointInRing(x, y, ring)) inside = !inside;
    if (inside) return true;
  }
  return false;
}

// --- sample the grid --------------------------------------------------------
// A small sub-step offset (kept in [0, STEP)) just changes the grid's phase,
// which matters for whether a small country like the Netherlands happens to
// catch a point; it does not meaningfully change the total dot count.
// Defaults (6, 4) are a picked grid phase: at this width/step, sweeping
// offsetX/offsetY 0..step found (6, 4) gives the Netherlands 3 dots instead
// of 1. The total dot count barely moves with phase, only which small
// countries get caught by the grid.
const offsetX = ((args.offsetX ?? 6) % STEP + STEP) % STEP;
const offsetY = ((args.offsetY ?? 4) % STEP + STEP) % STEP;
const dots = [];
for (let gy = offsetY; gy <= HEIGHT; gy += STEP) {
  for (let gx = offsetX; gx <= WIDTH; gx += STEP) {
    if (isLand(gx, gy)) dots.push([Math.round(gx), Math.round(gy)]);
  }
}
const d = dots.map(([x, y]) => `M${x} ${y}h0`).join("");

// --- diagnostics (stderr, so stdout stays clean) ----------------------------
const [ux, uy] = project(52.09, 5.12);
let nearest = Infinity;
for (const [x, y] of dots) nearest = Math.min(nearest, Math.hypot(x - ux, y - uy));
const [nlX0, nlY0] = project(53.6, 3.3);
const [nlX1, nlY1] = project(50.7, 7.2);
const nlDots = dots.filter(([x, y]) => x >= nlX0 && x <= nlX1 && y >= nlY0 && y <= nlY1);
console.error(`world-dots: ${dots.length} dots (grid ${Math.floor(WIDTH / STEP) + 1}x${Math.floor(HEIGHT / STEP) + 1}, step ${STEP}, viewBox 0 0 ${WIDTH} ${HEIGHT}), d is ${d.length}b`);
console.error(`world-dots: Utrecht projects to [${ux.toFixed(1)}, ${uy.toFixed(1)}], nearest dot ${nearest.toFixed(2)}px away (1.5*step = ${(1.5 * STEP).toFixed(1)}px), ${nlDots.length} dots in the NL bbox`);

// --- write the data file ----------------------------------------------------
const outPath = resolve(args.out ?? "src/data/world-dots.ts");
const ts = `// GENERATED FILE. Do not edit by hand, see scripts/world-dots.mjs.
// Natural Earth 110m land (world-atlas), sampled on a ${STEP}px equirectangular
// grid cropped to lat ${LAT_MIN}..${LAT_MAX}. Regenerate with the one-liner in
// that script's header comment.

export const WORLD_DOTS = {
  viewBox: "0 0 ${WIDTH} ${HEIGHT}",
  width: ${WIDTH},
  height: ${HEIGHT},
  step: ${STEP},
  d: "${d}",
} as const;

const LON_MIN = ${LON_MIN};
const LON_MAX = ${LON_MAX};
const LAT_MIN = ${LAT_MIN};
const LAT_MAX = ${LAT_MAX};

/** Same equirectangular crop and pixel space as WORLD_DOTS, so a projected
 *  lat/lon lines up with the dot grid above. */
export function projectLatLon(lat: number, lon: number): [number, number] {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WORLD_DOTS.width;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * WORLD_DOTS.height;
  return [x, y];
}
`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, ts);
console.error(`world-dots: wrote ${outPath} (${(ts.length / 1024).toFixed(1)} KB)`);

// --- preview -----------------------------------------------------------------
if (args.preview) {
  const html = buildPreviewHtml({ WIDTH, HEIGHT, d, ux, uy, STEP });
  const previewPath = resolve(args.preview);
  mkdirSync(dirname(previewPath), { recursive: true });
  writeFileSync(previewPath, html);
  console.error(`world-dots: wrote preview ${previewPath}`);
}

/** Mirrors src/components/contact/WorldMap.tsx's markup and constants by
 *  hand (there is no JSX runtime here), so the visual QA screenshot matches
 *  what the real component renders. Keep the two in sync when either
 *  changes. */
function buildPreviewHtml({ WIDTH, HEIGHT, d, ux, uy, STEP }) {
  const dotWidth = +(STEP * 0.55).toFixed(2);
  const spotlightR = Math.round((WIDTH * 24) / 360);
  const coreR = +(STEP * 0.6).toFixed(1);
  const glowR = +(coreR * 4.2).toFixed(1);
  const leadDx = Math.round(WIDTH * 0.038);
  const leadDy = Math.round(HEIGHT * 0.085);
  const lx = ux + leadDx;
  const ly = uy + leadDy;

  const map = (label) => `
    <figure class="wm-figure" style="aspect-ratio:${WIDTH}/${HEIGHT}">
      <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="World map highlighting Utrecht, Netherlands">
        <defs>
          <radialGradient id="wm-spot-${label}" gradientUnits="userSpaceOnUse" cx="${ux}" cy="${uy}" r="${spotlightR}">
            <stop offset="0%" stop-color="#4ade80" stop-opacity="0.95" />
            <stop offset="45%" stop-color="#4ade80" stop-opacity="0.4" />
            <stop offset="100%" stop-color="#4ade80" stop-opacity="0" />
          </radialGradient>
          <filter id="wm-glow-${label}" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="${coreR * 1.6}" />
          </filter>
        </defs>
        <path d="${d}" stroke="rgba(166,180,191,0.26)" stroke-width="${dotWidth}" stroke-linecap="round" fill="none" />
        <path d="${d}" stroke="url(#wm-spot-${label})" stroke-width="${dotWidth}" stroke-linecap="round" fill="none" />
        <line x1="${ux}" y1="${uy}" x2="${lx}" y2="${ly}" stroke="#4ade80" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.8" />
        <circle cx="${ux}" cy="${uy}" r="${glowR}" fill="#4ade80" opacity="0.28" filter="url(#wm-glow-${label})" />
        <circle class="wm-ring" cx="${ux}" cy="${uy}" r="${coreR}" fill="none" stroke="#4ade80" stroke-width="1.4" />
        <circle class="wm-ring wm-ring-2" cx="${ux}" cy="${uy}" r="${coreR}" fill="none" stroke="#4ade80" stroke-width="1.4" />
        <circle cx="${ux}" cy="${uy}" r="${coreR}" fill="#4ade80" />
      </svg>
      <div class="wm-chip" style="left:${(lx / WIDTH) * 100}%; top:${(ly / HEIGHT) * 100}%">
        <span class="wm-dot"></span>Utrecht, NL
      </div>
    </figure>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>world-dots preview</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #05080d; color: #eaf0f3; font-family: system-ui, sans-serif; padding: 48px 24px 96px; display: flex; flex-direction: column; align-items: center; gap: 64px; }
  h2 { font-family: ui-monospace, monospace; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #a6b4bf; margin: 0 0 20px; }
  .wm-wrap { width: 100%; }
  .wm-figure { position: relative; width: 100%; margin: 0; }
  .wm-figure svg { display: block; width: 100%; height: auto; }
  .wm-ring {
    transform-box: fill-box;
    transform-origin: center;
    animation: wm-pulse 2.6s ease-out infinite;
    opacity: 0;
  }
  .wm-ring-2 { animation-delay: 1.3s; }
  @keyframes wm-pulse {
    0% { transform: scale(1); opacity: 0.55; }
    70% { opacity: 0.12; }
    100% { transform: scale(6.5); opacity: 0; }
  }
  .wm-chip {
    position: absolute;
    transform: translate(10px, -50%);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: #a6b4bf;
    background: rgba(13, 19, 28, 0.72);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    padding: 5px 10px 5px 8px;
  }
  .wm-dot { width: 6px; height: 6px; border-radius: 999px; background: #4ade80; box-shadow: 0 0 6px rgba(74,222,128,0.9); flex: none; }
  @media (prefers-reduced-motion: reduce) {
    .wm-ring { animation: none; opacity: 0.22; transform: scale(2.4); }
  }
</style>
</head>
<body>
  <div class="wm-wrap" style="max-width:1200px">
    <h2>1200px</h2>
    ${map("a")}
  </div>
  <div class="wm-wrap" style="max-width:360px">
    <h2>360px</h2>
    ${map("b")}
  </div>
</body>
</html>`;
}
