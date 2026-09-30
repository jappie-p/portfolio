"use client";
import { useEffect } from "react";
import { useJourney } from "@/lib/store";

/** Drives the 2-D journeyStore from native scroll: topic via a viewport-centered
 *  IntersectionObserver, project via a per-track IntersectionObserver, continuous
 *  projectProgress via a RAF-coalesced scroll listener. Also wires arrow keys. */
export function JourneyObserver() {
  useEffect(() => {
    const root = document.getElementById("journey-root");
    if (!root) return;
    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-section]"));
    const trackOf = (row: HTMLElement) => row.querySelector<HTMLElement>(".project-track");
    const panelsOf = (row: HTMLElement) => Array.from(row.querySelectorAll<HTMLElement>(".project-panel"));
    const { setTopic, setProject, setProjectProgress, markEntered } = useJourney.getState();
    const cleanups: Array<() => void> = [];

    // --- topic axis: which row is centered in the viewport ---
    const topicIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = rows.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          const count = panelsOf(rows[i]).length || 1;
          setTopic(i, count);
          markEntered(i);
          // the sideways position belongs to the topic: pick up this row's own
          const track = trackOf(rows[i]);
          const max = track ? track.scrollWidth - track.clientWidth : 0;
          setProjectProgress(track && max > 0 ? track.scrollLeft / max : 0);
          setProject(track && track.clientWidth > 0 ? Math.round(track.scrollLeft / track.clientWidth) : 0);
        }
      },
      { root: null, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    rows.forEach((r) => topicIO.observe(r));
    cleanups.push(() => topicIO.disconnect());

    // --- project axis: per-track panel observer (only updates the active topic) ---
    rows.forEach((row, topicIndex) => {
      const track = trackOf(row);
      if (!track) return;
      const panels = panelsOf(row);
      const projectIO = new IntersectionObserver(
        (entries) => {
          if (useJourney.getState().topic !== topicIndex) return;
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            const i = panels.indexOf(e.target as HTMLElement);
            if (i >= 0) setProject(i);
          }
        },
        { root: track, threshold: 0.6 },
      );
      panels.forEach((p) => projectIO.observe(p));
      cleanups.push(() => projectIO.disconnect());

      let raf = 0;
      const onScroll = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          if (useJourney.getState().topic !== topicIndex) return;
          const max = track.scrollWidth - track.clientWidth;
          setProjectProgress(max > 0 ? track.scrollLeft / max : 0);
        });
      };
      track.addEventListener("scroll", onScroll, { passive: true });
      cleanups.push(() => {
        track.removeEventListener("scroll", onScroll);
        if (raf) cancelAnimationFrame(raf);
      });
    });

    // --- keyboard: arrows move within the grid ---
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const { topic } = useJourney.getState();
      const row = rows[topic];
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        rows[Math.min(topic + 1, rows.length - 1)]?.scrollIntoView({ behavior: "smooth", block: "start" });
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        rows[Math.max(topic - 1, 0)]?.scrollIntoView({ behavior: "smooth", block: "start" });
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const track = trackOf(row);
        const panels = panelsOf(row);
        if (!track || panels.length < 2) return;
        const cur = useJourney.getState().project;
        const next = e.key === "ArrowRight" ? Math.min(cur + 1, panels.length - 1) : Math.max(cur - 1, 0);
        panels[next]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    cleanups.push(() => window.removeEventListener("keydown", onKey));

    return () => cleanups.forEach((c) => c());
  }, []);

  return null;
}
