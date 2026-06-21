import type { ReactNode } from "react";

export function Glass({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`glass ${className}`}>{children}</div>;
}
