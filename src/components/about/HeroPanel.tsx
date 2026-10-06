"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { ProjectPanel } from "@/components/journey/panels";
import { NextButton } from "@/components/ui/NextButton";
import { useT } from "@/i18n/useT";
import { prefersReducedMotion } from "@/lib/motion";
import player from "@/assets/about/player.webp";
import { FACTS } from "./facts";
import { Leaves, type Leaf } from "./Leaves";
import a from "./about.module.css";
import h from "./hero.module.css";

/** The plant behind his shoulder: a fiddle-leaf fig, broad leaves high up. */
const BACK: Leaf[] = [
  { turn: -38, stem: 2.1, size: 0.95, fill: "#5b8a49", twist: -20 },
  { turn: -22, stem: 2.8, size: 1.05, fill: "#3f6e3a", twist: -10 },
  { turn: -8, stem: 1.6, size: 0.9, fill: "#6b9852", twist: 8 },
  { turn: 6, stem: 3.1, size: 1.1, fill: "#4a7a40", twist: 14 },
  { turn: 20, stem: 2.2, size: 1.0, fill: "#5f8f4a", twist: 24 },
  { turn: 34, stem: 2.7, size: 0.95, fill: "#3b6836", twist: 30 },
  { turn: -50, stem: 1.3, size: 0.8, fill: "#6d9a55", twist: -36 },
  { turn: 48, stem: 1.5, size: 0.85, fill: "#4f8043", twist: 40 },
];

/** Long leaves right in front of the lens, from the bottom left corner. */
const FRONT: Leaf[] = [
  { turn: -12, stem: 1.1, size: 2.3, fill: "#2f5a2c", shape: "long", twist: -8 },
  { turn: 14, stem: 0.9, size: 2.6, fill: "#3b6a34", shape: "long", twist: 18 },
  { turn: 38, stem: 0.6, size: 2.2, fill: "#2a5027", shape: "long", twist: 30 },
  { turn: -34, stem: 0.5, size: 1.9, fill: "#355f30", shape: "long", twist: -22 },
];

/**
 * The portrait, standing in a warm room: window light from the right,
 * a picture on the wall and a plant out of focus behind, a big leaf blurred
 * right in front of the lens. The layers drift a little with the pointer,
 * each by its depth.
 */
function Portrait({ alt }: { alt: string }) {
  const scene = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scene.current;
    if (!el || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return (
    <div ref={scene} className={h.scene}>
      <div aria-hidden className={h.wall} />
      <div aria-hidden className={h.window}>
        <span />
        <span />
      </div>
      <div aria-hidden className={h.frame} />
      <div aria-hidden className={h.shelf}>
        <span className={h.books} />
        <span className={h.vase} />
      </div>
      <Leaves className={h.back} leaves={BACK} />
      <div className={h.figure}>
        <Image src={player} alt={alt} fill unoptimized sizes="(min-width: 768px) 48vw, 100vw" className={h.photo} />
        <span aria-hidden className={h.rim} style={{ WebkitMaskImage: `url(${player.src})`, maskImage: `url(${player.src})` }} />
      </div>
      <Leaves className={h.front} leaves={FRONT} />
      <div aria-hidden className={h.light} />
    </div>
  );
}

/**
 * Who I am, first: my photo in a warm room at the left, at the right the
 * greeting in the big serif, what I do, a line of where I am found, the way
 * into my room and three facts counted from the projects on this site.
 */
export function HeroPanel() {
  const t = useT();
  const ab = t.about;
  const hr = ab.hero;
  const facts = [
    { n: FACTS.live, what: hr.live },
    { n: FACTS.built, what: hr.built },
    { n: FACTS.company, what: hr.company },
  ];
  return (
    <ProjectPanel label={`${hr.hello} ${hr.name}`} className={h.panel}>
      <div className={h.hero}>
        <Portrait alt={ab.photoAlt} />
        <div className={h.copy}>
          <div data-reveal className={h.stack}>
            <p className={a.kicker}>{hr.kicker}</p>
            <h2 className={`${a.display} ${h.title}`}>
              <span className={h.hello}>{hr.hello}</span> <span className={`${a.em} ${h.name}`}>{hr.name}</span>
            </h2>
            <p className={h.motto}>{hr.motto}</p>
            <p className={h.lead}>{hr.lead}</p>
            <p className={h.place}>{hr.place}</p>
          </div>
          <div data-reveal className={h.stack}>
            <p className={h.aside}>
              <svg aria-hidden viewBox="0 0 24 24" fill="none">
                <path d="M4 20c0-9 6-15 16-16-1 10-7 16-16 16Zm0 0 9-9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {hr.aside}
            </p>
            <div className={h.actions}>
              <NextButton label={hr.cta} primary className="mt-0!" />
              <ul className={h.facts}>
                {facts.map((f) => (
                  <li key={f.what}>
                    <span className={h.num}>{f.n}</span>
                    <span className={h.what}>{f.what}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </ProjectPanel>
  );
}
