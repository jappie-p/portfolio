import type { ElementType, ReactNode } from "react";

export function Glass({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={`glass ${className}`}>{children}</Tag>;
}
