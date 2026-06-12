import { skills, stats } from "@/data/skills";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Craft() {
  return (
    <div className="sticky top-0 flex h-screen flex-col justify-center px-6 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.craft.label} />
        </p>
        <h2
          data-lines
          className="headline mb-12 text-bone"
          style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
        >
          {story.craft.heading}
        </h2>
      </RevealLines>

      <div className="grid gap-8 md:grid-cols-5">
        {skills.map((s) => (
          <div key={s.cluster} className="border-t border-stone pt-4">
            <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-ember">
              {s.cluster}
            </h3>
            <ul className="space-y-1 text-sm text-bone-dim">
              {s.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-16 flex gap-12">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="headline text-ember" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
              {s.value}
              {s.suffix}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-bone-faint">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
