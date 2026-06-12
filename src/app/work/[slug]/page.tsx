import Link from "next/link";
import { notFound } from "next/navigation";
import { featured } from "@/data/projects";

export function generateStaticParams() {
  return featured.map((p) => ({ slug: p.slug }));
}

export default async function CasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = featured.find((p) => p.slug === slug);
  if (!project) notFound();

  return (
    <main className="flex min-h-screen flex-col justify-center px-6 md:px-14">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ember">
        case study — coming soon
      </p>
      <h1 className="headline text-bone" style={{ fontSize: "clamp(3rem, 12vw, 11rem)" }}>
        {project.title}
      </h1>
      <p className="mt-6 max-w-xl text-bone-dim">{project.tagline}</p>
      <p className="mt-2 font-mono text-xs uppercase tracking-wider text-bone-faint">
        {project.year} · {project.role} · {project.tech.join(" / ")}
      </p>
      <Link href="/#work" className="mt-12 inline-block font-mono text-sm text-ember">
        ← back to the journey
      </Link>
    </main>
  );
}
