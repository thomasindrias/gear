import { Nav } from "./components/nav";

export default function NotFound() {
  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-neutral-400 text-lg">
          This gear doesn&apos;t exist yet.
        </p>
      </main>
    </>
  );
}
