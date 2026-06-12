import { archive } from "@/data/projects";
import { story } from "@/data/story";
import RevealLines from "@/components/ui/RevealLines";
import ScrambleLabel from "@/components/ui/ScrambleLabel";

export default function Contact() {
  return (
    <div className="flex min-h-full flex-col justify-end px-6 pb-16 pt-24 md:px-14">
      <RevealLines>
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
          <ScrambleLabel text={story.contact.label} />
        </p>
        <h2
          data-lines
          className="headline mb-4 text-bone"
          style={{ fontSize: "clamp(3rem, 10vw, 9rem)" }}
        >
          {story.contact.heading}
        </h2>
        <p data-lines className="mb-10 max-w-md text-bone-dim">
          {story.contact.sub}
        </p>
      </RevealLines>

      <div className="mb-20 flex flex-wrap gap-8 font-mono text-sm">
        <a
          href={`mailto:${story.contact.email}`}
          className="border-b border-ember pb-1 text-bone transition-colors hover:text-ember"
        >
          {story.contact.email}
        </a>
        <a
          href={story.contact.github}
          target="_blank"
          rel="noreferrer"
          className="border-b border-stone pb-1 text-bone-dim transition-colors hover:text-ember"
        >
          github.com/jappie-p
        </a>
      </div>

      <div className="border-t border-stone pt-8">
        <h3 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-bone-faint">
          archive
        </h3>
        <ul className="grid gap-x-12 gap-y-3 md:grid-cols-2">
          {archive.map((a) => (
            <li
              key={a.title}
              className="flex items-baseline justify-between gap-4 text-sm"
            >
              <span className="text-bone-dim">
                {a.href ? (
                  <a href={a.href} target="_blank" rel="noreferrer" className="hover:text-ember">
                    {a.title}
                  </a>
                ) : (
                  a.title
                )}
              </span>
              <span className="font-mono text-[10px] text-bone-faint">
                {a.year} · {a.tech.join(" / ")}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.3em] text-bone-faint">
          © 2026 jasper pathuis — built from scratch, runs on my own server
        </p>
      </div>
    </div>
  );
}
