import { SplitText } from "@/components/ui/SplitText";

/** A panel's heading: small label, big title, optional lead. */
export function PanelHeading({ label, title, lead, className = "" }: { label: string; title: string; lead?: string; className?: string }) {
  return (
    <div data-reveal className={`flex flex-col items-start ${className}`}>
      <p className="label text-leaf">{label}</p>
      <SplitText as="h2" text={title} className="headline mt-4 text-5xl text-ink sm:text-6xl" />
      {lead && <p className="mt-4 max-w-xl text-lg text-ink-dim">{lead}</p>}
    </div>
  );
}
