import type { ReactNode } from "react";

/** Lets a screenshot stage float gently, in a little depth so a phone frame
 *  can sit in front of its browser window. */
export function FloatStage({ children, className = "", innerClassName = "" }: { children: ReactNode; className?: string; innerClassName?: string }) {
  return (
    <div className={`float-stage ${className}`}>
      <div className={`float-inner ${innerClassName}`}>{children}</div>
    </div>
  );
}
