import Link from "next/link";
import { featured } from "@/data/projects";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Work() {
  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-24 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.work.label} />
        </p>
        <h2
          data-lines
          className="headline mb-3 text-bone"
          style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}
        >
          {story.work.heading}
        </h2>
        <p data-lines className="mb-16 max-w-md text-bone-dim">
          {story.work.sub}
        </p>
      </RevealLines>

      <ol>
        {featured.map((p, i) => (
          <li key={p.slug} className="border-t border-stone last:border-b">
            <Link
              href={`/work/${p.slug}`}
              className="group flex flex-col gap-2 py-8 transition-colors md:flex-row md:items-baseline md:gap-8"
            >
              <span className="font-mono text-xs text-bone-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="headline flex-1 text-bone transition-colors group-hover:text-ember"
                style={{ fontSize: "clamp(2rem, 7vw, 5.5rem)" }}
              >
                {p.title}
              </span>
              <span className="max-w-xs font-mono text-xs uppercase tracking-wider text-bone-faint">
                {p.year} · {p.role}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
