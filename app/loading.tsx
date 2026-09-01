export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold-500/25 border-t-gold-400" />
        <p className="text-sm uppercase tracking-[0.28em] text-gold-500/70">Carregando</p>
      </div>
    </main>
  );
}
