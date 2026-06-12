import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";
import ParallaxDrift from "@/components/ui/ParallaxDrift";

export default function Turn() {
  return (
    <div className="sticky top-0 flex h-screen items-center justify-end px-6 md:px-14">
      <ParallaxDrift from={90} to={-90}>
      <RevealLines className="max-w-2xl text-right">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.turn.label} />
        </p>
        {story.turn.lines.map((line, i) => (
          <p
            key={i}
            data-lines
            className={
              i === 0
                ? "headline mb-6 text-bone"
                : "mb-5 text-xl leading-relaxed text-bone-dim md:text-2xl"
            }
            style={i === 0 ? { fontSize: "clamp(2.4rem, 6vw, 5rem)" } : undefined}
          >
            {line}
          </p>
        ))}
      </RevealLines>
      </ParallaxDrift>
    </div>
  );
}
