import { Nav } from "~/app/components/nav";

export default function Loading() {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row gap-10 md:gap-12">
          <div className="flex-1 min-w-0 space-y-8">
            <div className="h-8 w-48 bg-neutral-900 rounded animate-pulse" />
            <div className="h-12 w-80 bg-neutral-900/50 border border-neutral-800 rounded-lg animate-pulse" />
            <div className="h-24 bg-neutral-900/50 border border-neutral-800 rounded-lg animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 w-24 bg-neutral-900 rounded animate-pulse" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-neutral-900/30 border-b border-neutral-800/30 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="w-full md:w-52 shrink-0 space-y-7">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-20 bg-neutral-900 rounded animate-pulse mb-2" />
                <div className="h-6 w-16 bg-neutral-900 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
