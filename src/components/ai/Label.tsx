"use client";
import { forwardRef, useEffect, useMemo, useState } from "react";
import * as THREE from "three";

// Labels for the AI scene, drawn with Canvas 2D in the site's own display
// font and shown on a plane. (troika's SDF text made this canvas lose its
// WebGL context; a plain texture is cheaper anyway.)

const HEIGHT = 96;

/** The display font next/font loaded for the page, by its generated family name. */
function displayFamily(): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-display-var").trim();
  return v || "system-ui, sans-serif";
}

function drawLabel(text: string, color: string, spacing: number) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  const font = `600 ${HEIGHT * 0.62}px ${displayFamily()}`;
  g.font = font;
  const chars = [...text];
  const gap = HEIGHT * spacing;
  const widths = chars.map((ch) => g.measureText(ch).width);
  const w = Math.ceil(widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, chars.length - 1) + HEIGHT * 0.4);
  c.width = w;
  c.height = HEIGHT;
  g.font = font;
  g.fillStyle = color;
  g.textBaseline = "middle";
  let x = HEIGHT * 0.2;
  chars.forEach((ch, i) => {
    g.fillText(ch, x, HEIGHT * 0.54);
    x += widths[i] + gap;
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return { texture: t, aspect: w / HEIGHT };
}

type LabelProps = {
  text: string;
  /** world height of the line */
  size?: number;
  color?: string;
  spacing?: number;
  /** "center" or "top": where the plane hangs from its position */
  anchor?: "center" | "top";
  position?: [number, number, number];
};

/** A flat text label; its material's opacity is the handle for fading. Drawn
 *  again (a fresh key) once the webfont is really there. */
export const Label = forwardRef<THREE.Mesh, LabelProps>(function Label(props, ref) {
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    document.fonts.ready.then(() => live && setFontsReady(true));
    return () => void (live = false);
  }, []);
  return <LabelPlane key={fontsReady ? "font" : "fallback"} ref={ref} {...props} />;
});

const LabelPlane = forwardRef<THREE.Mesh, LabelProps>(function LabelPlane(
  { text, size = 0.36, color = "#e6f1f5", spacing = 0.08, anchor = "center", position = [0, 0, 0] },
  ref,
) {
  const label = useMemo(() => drawLabel(text, color, spacing), [text, color, spacing]);
  const material = useMemo(
    () => new THREE.MeshBasicMaterial({ map: label.texture, transparent: true, depthWrite: false, toneMapped: false }),
    [label],
  );
  useEffect(
    () => () => {
      label.texture.dispose();
      material.dispose();
    },
    [label, material],
  );

  const w = size * label.aspect * (HEIGHT / (HEIGHT * 0.62));
  const h = size * (HEIGHT / (HEIGHT * 0.62));
  const y = anchor === "top" ? position[1] - h / 2 : position[1];
  return (
    <mesh ref={ref} material={material} position={[position[0], y, position[2]]}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
});
