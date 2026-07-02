export default function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ground">
      <div className="w-14 h-14 rounded-2xl overflow-hidden animate-pulse">
        <img src="/icons/icon-512.png" alt="Crediário Digital" className="w-full h-full object-cover" />
      </div>
      <p className="text-sm text-ink-muted font-medium">Carregando…</p>
    </div>
  )
}
