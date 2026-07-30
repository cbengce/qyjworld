"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 py-20 text-center text-forest">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-gold">Something went wrong</p>
        <h1 className="mt-5 font-serif text-6xl font-semibold leading-none md:text-7xl">Please try again</h1>
        <p className="mt-6 text-lg leading-8 text-forest/65">
          The page could not finish loading. Refresh this experience and continue from where you were.
        </p>
        <button
          className="focus-ring mt-9 inline-flex min-h-12 items-center justify-center rounded-full bg-forest px-7 text-sm font-bold text-white shadow-[0_16px_42px_rgba(18,60,47,0.16)] transition duration-300 hover:-translate-y-0.5 hover:bg-ink"
          onClick={() => reset()}
          type="button"
        >
          Try Again
        </button>
      </div>
    </main>
  );
}
