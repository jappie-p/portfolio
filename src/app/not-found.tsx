import Link from "next/link";

// Both languages at once: the locale lives in the browser, and a 404 is
// rendered before any of that runs.
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <p className="label text-leaf">404</p>
        <h1 className="hero-name headline mt-4 text-6xl sm:text-7xl">Niet gevonden</h1>
        <p className="mt-4 text-ink-dim">
          Deze pagina bestaat niet. <span className="text-ink-faint">This page doesn&apos;t exist.</span>
        </p>
        <Link href="/" className="btn btn-primary mt-8">
          Terug naar start
          <span aria-hidden>→</span>
        </Link>
      </div>
    </main>
  );
}
