import Link from "next/link";

export default function NotFound() {
  return (
    <section className="grid min-h-[100svh] place-items-center px-6">
      <div className="max-w-lg text-center">
        <p className="label mb-6">404 — Not in the vitrine</p>
        <h1 className="display text-[clamp(2.6rem,8vw,5rem)]">
          This specimen was never <span className="italic text-accent">catalogued.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-sm text-[0.9rem] leading-relaxed text-ink-soft">
          The page you asked for does not exist. Return to the instrument and compose something that
          does.
        </p>
        <Link href="/" className="btn btn-primary mt-9">
          Back to the instrument
        </Link>
      </div>
    </section>
  );
}
