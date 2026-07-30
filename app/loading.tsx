export default function Loading() {
  return (
    <main className="min-h-screen bg-paper px-5 py-24 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="h-3 w-32 animate-pulse bg-gold/40" />
        <div className="mt-8 h-20 max-w-2xl animate-pulse bg-forest/10" />
        <div className="mt-6 h-5 max-w-lg animate-pulse bg-forest/10" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="h-72 animate-pulse bg-white shadow-[0_20px_55px_rgba(10,24,20,0.07)]" key={item} />
          ))}
        </div>
      </div>
    </main>
  );
}
