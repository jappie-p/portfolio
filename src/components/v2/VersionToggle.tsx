"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Lets Jasper flip between the v1 world-walkthrough (/) and the v2
// scrub-choreographed cut (/v2) to compare. Remove once a winner is chosen.
export default function VersionToggle() {
  const pathname = usePathname();
  const onV2 = pathname?.startsWith("/v2");

  return (
    <div className="fixed right-5 top-5 z-[70] flex items-center gap-1 rounded-full border border-stone bg-void/70 p-1 font-mono text-[10px] uppercase tracking-[0.2em] backdrop-blur">
      <Link
        href="/"
        className={`rounded-full px-3 py-1 transition-colors ${
          onV2 ? "text-bone-faint hover:text-bone" : "bg-ember text-void"
        }`}
      >
        v1
      </Link>
      <Link
        href="/v2"
        className={`rounded-full px-3 py-1 transition-colors ${
          onV2 ? "bg-ember text-void" : "text-bone-faint hover:text-bone"
        }`}
      >
        v2
      </Link>
    </div>
  );
}
