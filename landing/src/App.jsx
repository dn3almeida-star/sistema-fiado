import {
  BookOpenText, Send, Wallet, Droplets, CircleHelp, HeartHandshake,
  PencilLine, Calculator, MessageCircle, ChevronDown, Check, ArrowDown,
} from 'lucide-react'
import { URL_DO_APP, LINK_WHATSAPP } from './config.js'

function BotaoComecar({ children = 'Começar grátis — 30 dias', className = '' }) {
  return (
    <a
      href={URL_DO_APP}
      className={`inline-flex items-center justify-center gap-2 bg-brand text-white font-bold rounded-2xl px-6 py-4 min-h-touch shadow-sm hover:bg-brand-dark active:bg-brand-dark transition-colors ${className}`}
    >
      {children}
    </a>
  )
}

function Cabecalho() {
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-ground/90 backdrop-blur border-b border-line">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="#topo" className="flex items-center gap-2 font-bold text-ink">
          <span className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center">
            <BookOpenText size={17} aria-hidden="true" />
          </span>
          Crediário Digital
        </a>
        <a
          href={URL_DO_APP}
          className="hidden sm:inline-flex items-center bg-brand text-white text-sm font-bold rounded-xl px-4 py-2.5 min-h-touch hover:bg-brand-dark transition-colors"
        >
          Começar grátis
        </a>
      </div>
    </header>
  )
}

function MockupCelular() {
  return (
    <div className="relative mx-auto w-full max-w-xs" aria-hidden="true">
      {/* celular com a lista de fiado */}
      <div className="rounded-[2rem] border-8 border-ink bg-white shadow-xl overflow-hidden">
        <div className="bg-brand text-white px-4 py-3">
          <p className="text-[11px] opacity-80 leading-none">Mercearia do Zé</p>
          <p className="font-bold text-sm mt-1">Na rua: R$ 487,50</p>
        </div>
        <ul className="divide-y divide-line text-sm">
          {[
            ['João da Silva', 'R$ 45,00', 'vence hoje'],
            ['Dona Maria', 'R$ 132,50', 'vence amanhã'],
            ['Seu Antônio', 'R$ 310,00', '3 parcelas'],
          ].map(([nome, valor, obs]) => (
            <li key={nome} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-semibold text-ink">{nome}</p>
                <p className="text-xs text-ink-faint">{obs}</p>
              </div>
              <span className="font-bold text-ink tabular-nums">{valor}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* balão de WhatsApp com a cobrança pronta e o botão de enviar */}
      <div className="absolute -right-3 -bottom-8 sm:-right-10 w-64 rounded-2xl bg-white shadow-xl border border-line p-3">
        <p className="text-[10px] font-bold uppercase tracking-wide text-brand mb-1.5">
          Cobrança pronta
        </p>
        <div className="rounded-xl rounded-bl-sm bg-[#e7f8ee] border border-[#c9ecd8] px-3 py-2 text-[13px] leading-snug text-ink">
          Oi, João! Passando pra lembrar do seu fiado na <em>Mercearia do Zé</em>:
          <strong> R$ 45,00</strong>. Quando puder, é só chamar aqui. Obrigado! 🙏
        </div>
        <div className="mt-2 flex justify-end">
          <span className="inline-flex items-center gap-1.5 bg-whatsapp text-white text-xs font-bold rounded-full px-3 py-2">
            <Send size={13} aria-hidden="true" /> Enviar
          </span>
        </div>
      </div>
    </div>
  )
}

function Heroi() {
  return (
    <section id="topo" className="pt-24 pb-20 px-4">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 md:gap-8 items-center">
        <div className="text-center md:text-left">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-ink text-balance">
            Nunca mais perca dinheiro com fiado.
          </h1>
          <p className="mt-4 text-lg text-ink-muted max-w-prose mx-auto md:mx-0">
            O Crediário Digital anota suas vendas fiado e{' '}
            <strong className="text-ink">
              deixa a cobrança pronta e educada pra você enviar no WhatsApp num toque
            </strong>{' '}
            — sem passar a vergonha de cobrar.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <BotaoComecar />
            <a
              href="#como-funciona"
              className="inline-flex items-center justify-center gap-1.5 text-ink-muted font-semibold px-5 py-4 min-h-touch rounded-2xl border border-line bg-white hover:text-brand transition-colors"
            >
              Ver como funciona <ArrowDown size={16} aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-sm text-ink-faint">
            Sem cartão de crédito · Cancela quando quiser · Feito pra quem vive do balcão
          </p>
        </div>
        <div className="pb-10 md:pb-0">
          <MockupCelular />
        </div>
      </div>
    </section>
  )
}

function Dor() {
  const dores = [
    [Droplets, 'O caderno molhou, rasgou ou sumiu — e o dinheiro sumiu junto.'],
    [HeartHandshake, 'Você tem vergonha de cobrar o vizinho, então deixa a dívida crescer.'],
    [CircleHelp, 'No fim do mês, não sabe quanto tem "na rua" nem quem te deve.'],
  ]
  return (
    <section className="py-16 px-4 bg-white border-y border-line">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink text-center">
          Você reconhece isso?
        </h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {dores.map(([Icone, texto]) => (
            <div key={texto} className="rounded-2xl border border-line bg-ground p-5">
              <Icone className="text-brand" size={26} aria-hidden="true" />
              <p className="mt-3 text-ink font-medium leading-snug">{texto}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-ink-muted max-w-2xl mx-auto">
          O fiado é a alma do comércio de bairro. O problema nunca foi vender fiado —{' '}
          <strong className="text-ink">é controlar e cobrar sem estresse.</strong>
        </p>
      </div>
    </section>
  )
}

function ComoFunciona() {
  const passos = [
    [PencilLine, 'Anota a venda em 2 toques', 'Escolhe o cliente, digita o valor. Pronto.'],
    [Calculator, 'O app soma tudo pra você', 'Total na rua, quem deve o quê, histórico — sempre na palma da mão, sem conta errada.'],
    [Send, 'Na hora de cobrar, a mensagem já vai pronta', 'O app escreve um lembrete educado no WhatsApp do cliente, em nome da sua loja. Você só confere e aperta enviar — sem ter que pensar no que dizer nem encarar ninguém no balcão.'],
  ]
  return (
    <section id="como-funciona" className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink text-center">
          Simples como usar o WhatsApp
        </h2>
        <ol className="mt-10 space-y-6">
          {passos.map(([Icone, titulo, texto], i) => (
            <li key={titulo} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="w-11 h-11 shrink-0 rounded-full bg-brand text-white font-extrabold flex items-center justify-center">
                  {i + 1}
                </span>
                {i < passos.length - 1 && <span className="w-px flex-1 bg-line mt-2" aria-hidden="true" />}
              </div>
              <div className="pb-2">
                <p className="font-bold text-ink text-lg flex items-center gap-2">
                  <Icone size={18} className="text-brand" aria-hidden="true" /> {titulo}
                </p>
                <p className="mt-1 text-ink-muted">{texto}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Diferencial() {
  return (
    <section className="py-16 px-4 bg-brand text-white">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-balance">
          A cobrança que você tem vergonha de fazer, o app escreve por você.
        </h2>
        <p className="mt-4 text-white/85 max-w-2xl mx-auto">
          Cobrar cara a cara com o vizinho estraga a amizade. Por isso a gente deixa
          quieto — e perde dinheiro. O Crediário Digital escreve um lembrete gentil no
          WhatsApp do seu cliente, já pronto, no nome da sua loja. Você dá uma olhada e
          aperta enviar. Ele lembra, paga no Pix, e a relação continua boa.
        </p>
        <div className="mt-8 max-w-sm mx-auto text-left">
          <div className="rounded-2xl rounded-bl-sm bg-white text-ink px-4 py-3 text-sm leading-relaxed shadow-lg">
            Oi, João! Passando pra lembrar do seu fiado na <em>Mercearia do Zé</em>:
            <strong> R$ 45,00</strong>. Quando puder, é só chamar aqui. Obrigado! 🙏
          </div>
          <div className="mt-3 flex justify-end">
            <span className="inline-flex items-center gap-1.5 bg-whatsapp text-white text-sm font-bold rounded-full px-4 py-2.5 shadow-lg">
              <Send size={15} aria-hidden="true" /> Enviar
            </span>
          </div>
        </div>
        <p className="mt-8 text-white/85 max-w-2xl mx-auto">
          E como a mensagem sai do <strong className="text-white">seu</strong> número, é
          pessoal — não é robô, não vira spam. Cobrar assim é{' '}
          <strong className="text-white">menos</strong> constrangedor que cobrar no balcão.
        </p>
      </div>
    </section>
  )
}

function ProvaSocial() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink text-balance">
          Feito por quem vive de mercadinho — não por gente de escritório.
        </h2>
        <figure className="mt-8 rounded-2xl border border-line bg-white p-6 sm:p-8">
          <blockquote className="text-lg text-ink leading-relaxed">
            "Usei caderno por 20 anos. Com o app, recuperei fiado que eu já tinha dado
            por perdido — logo no primeiro mês."
          </blockquote>
          <figcaption className="mt-4 text-sm text-ink-muted font-semibold">
            O primeiro lojista do Crediário Digital — mercadinho de bairro
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function Preco() {
  const gratis = ['Até 20 clientes cadastrados', 'Anota vendas e pagamentos', 'Total "na rua" e histórico']
  const pago = [
    'Clientes ilimitados',
    'Cobrança pronta em 1 toque no WhatsApp',
    'Comprovante em PDF',
    'Relatório do dia',
  ]
  return (
    <section className="py-16 px-4 bg-white border-y border-line">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink text-center">
          Custa menos que um lanche por mês.
        </h2>
        <div className="mt-10 grid sm:grid-cols-2 gap-4 items-stretch">
          <div className="rounded-2xl border border-line bg-ground p-6 flex flex-col">
            <p className="font-bold text-ink">Caderno</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">R$ 0</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-muted flex-1">
              {gratis.map(item => (
                <li key={item} className="flex gap-2">
                  <Check size={17} className="text-brand shrink-0 mt-0.5" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-2xl border-2 border-brand bg-white p-6 flex flex-col shadow-lg">
            <span className="absolute -top-3 left-6 bg-brand text-white text-xs font-bold rounded-full px-3 py-1">
              30 dias grátis, sem cartão
            </span>
            <p className="font-bold text-ink">Caderno + Cobrador</p>
            <p className="mt-1 text-3xl font-extrabold text-ink">
              R$ 19,90<span className="text-base font-semibold text-ink-muted">/mês</span>
            </p>
            <p className="text-xs text-ink-faint">ou R$ 199/ano (2 meses grátis)</p>
            <ul className="mt-4 space-y-2.5 text-sm text-ink flex-1">
              {pago.map((item, i) => (
                <li key={item} className="flex gap-2">
                  <Check size={17} className="text-brand shrink-0 mt-0.5" aria-hidden="true" />
                  {i === 1 ? <strong>{item}</strong> : item}
                </li>
              ))}
            </ul>
            <BotaoComecar className="mt-6 w-full" />
          </div>
        </div>
        <p className="mt-6 text-center text-ink-muted">
          Uma única conta de R$ 30 que você recupera <strong className="text-ink">já pagou o mês.</strong>
        </p>
      </div>
    </section>
  )
}

function Faq() {
  const perguntas = [
    ['Preciso entender de tecnologia?', 'Se você usa WhatsApp, você usa o Crediário Digital. É mais fácil que o caderno.'],
    ['O app envia a cobrança sozinho?', 'Ele deixa a mensagem pronta e educada; você confere e aperta enviar. Assim sai do seu número, pessoal, e você tem sempre o controle.'],
    ['Meu cliente não vai achar ruim ser cobrado?', 'A mensagem é educada e sai em nome da sua loja. É menos constrangedor que cobrar na cara.'],
    ['Preciso instalar da Play Store?', 'Não. É só abrir o link no celular e adicionar à tela inicial. Funciona como um app.'],
    ['Como pago?', 'Por Pix. E os primeiros 30 dias são grátis, sem cartão.'],
    ['Posso cancelar?', 'Quando quiser, sem multa.'],
  ]
  return (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink text-center">
          Perguntas frequentes
        </h2>
        <div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden">
          {perguntas.map(([pergunta, resposta]) => (
            <details key={pergunta} className="group">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-5 py-4 min-h-touch font-semibold text-ink hover:bg-ground transition-colors">
                {pergunta}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-ink-faint transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-5 pb-4 text-ink-muted">{resposta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

function CtaFinal() {
  return (
    <section className="py-20 px-4 bg-white border-t border-line">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-ink text-balance">
          Comece hoje a parar de perder dinheiro com fiado.
        </h2>
        <div className="mt-7">
          <BotaoComecar />
        </div>
        <p className="mt-4 text-sm text-ink-muted">
          ou{' '}
          <a href={LINK_WHATSAPP} className="font-semibold text-brand underline underline-offset-2">
            fale com a gente no WhatsApp
          </a>
        </p>
      </div>
    </section>
  )
}

function Rodape() {
  return (
    <footer className="px-4 py-10 pb-28 sm:pb-10 bg-ground">
      <div className="max-w-5xl mx-auto text-center text-sm text-ink-faint space-y-2">
        <p className="font-bold text-ink">Crediário Digital</p>
        <p>
          <a href={LINK_WHATSAPP} className="inline-flex items-center gap-1.5 text-brand font-semibold">
            <MessageCircle size={15} aria-hidden="true" /> WhatsApp
          </a>
        </p>
        <p>Feito no Brasil, pra quem vende fiado. · {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}

function BarraFixaMobile() {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 bg-ground/95 backdrop-blur border-t border-line sm:hidden">
      <a
        href={URL_DO_APP}
        className="flex items-center justify-center gap-2 w-full bg-brand text-white font-bold rounded-2xl py-4 min-h-touch shadow-sm active:bg-brand-dark"
      >
        <Wallet size={18} aria-hidden="true" /> Começar grátis — 30 dias
      </a>
    </div>
  )
}

export default function App() {
  return (
    <div className="bg-ground text-ink font-sans">
      <Cabecalho />
      <main>
        <Heroi />
        <Dor />
        <ComoFunciona />
        <Diferencial />
        <ProvaSocial />
        <Preco />
        <Faq />
        <CtaFinal />
      </main>
      <Rodape />
      <BarraFixaMobile />
    </div>
  )
}
