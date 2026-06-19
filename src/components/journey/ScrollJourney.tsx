"use client";
import type { ReactNode } from "react";
import { useHorizontalScroll } from "@/lib/scroll/useHorizontalScroll";

export function ScrollJourney({ children }: { children: ReactNode }) {
  const { pinRef, trackRef } = useHorizontalScroll();
  return (
    <div ref={pinRef} className="overflow-hidden">
      <div ref={trackRef} className="flex flex-col lg:h-dvh lg:flex-row lg:flex-nowrap">
        {children}
      </div>
    </div>
  );
}
