import { Nav } from "./components/nav";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-6xl font-black tracking-tighter font-mono text-neutral-300 mb-4">
          404
        </h1>
        <p className="text-sm text-neutral-600 font-mono">
          This gear doesn&apos;t exist yet.
        </p>
      </main>
    </>
  );
}
