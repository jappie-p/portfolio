import type { ReactNode } from "react";
import type { ChapterId } from "@/lib/chapters";

export function Section({
  id,
  label,
  children,
}: {
  id: ChapterId;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      data-section={id}
      aria-label={label}
      className="journey-panel relative flex min-h-dvh w-screen shrink-0 flex-col items-center justify-center px-6 py-24 lg:min-h-screen"
    >
      {children}
    </section>
  );
}
