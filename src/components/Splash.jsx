import { BookOpen } from 'lucide-react'

export default function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ground">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
        <BookOpen size={26} className="text-white" />
      </div>
      <p className="text-sm text-ink-muted font-medium">Carregando…</p>
    </div>
  )
}
