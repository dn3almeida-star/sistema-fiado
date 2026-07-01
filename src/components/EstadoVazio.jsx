export default function EstadoVazio({ icone: Icone, titulo, descricao, acao }) {
  return (
    <div className="text-center py-14 px-6">
      {Icone && (
        <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
          <Icone size={30} className="text-primary" strokeWidth={1.8} />
        </div>
      )}
      <p className="font-bold text-ink">{titulo}</p>
      {descricao && <p className="text-sm text-ink-muted mt-1">{descricao}</p>}
      {acao && (
        <button
          onClick={acao.onClick}
          className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm active:bg-primary-light transition-colors"
        >
          {acao.label}
        </button>
      )}
    </div>
  )
}
