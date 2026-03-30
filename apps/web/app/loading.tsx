import { Nav } from "./components/nav";

export default function Loading() {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="flex items-center gap-2 text-sm text-neutral-600 font-mono">
          <span className="animate-pulse">Loading...</span>
        </div>
      </main>
    </>
  );
}
