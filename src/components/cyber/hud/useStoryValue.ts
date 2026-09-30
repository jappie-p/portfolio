"use client";
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useSim } from "../SimContext";

/** A discrete value derived from the eased scroll progress. Re-renders only
 *  when it changes (a handful of times per scroll), never per frame. */
export function useStoryValue<T>(pick: (p: number) => T): T {
  const { state } = useSim();
  const [value, setValue] = useState(() => pick(state.p));
  const last = useRef(value);
  useFrame(() => {
    const next = pick(state.p);
    if (next !== last.current) {
      last.current = next;
      setValue(next);
    }
  });
  return value;
}
