import { Centerpiece } from "@/components/centerpiece";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-24">
      <Centerpiece />
      <p className="mt-16 font-mono text-sm tracking-widest opacity-[var(--latent)]">
        latent · developing
      </p>
    </main>
  );
}
