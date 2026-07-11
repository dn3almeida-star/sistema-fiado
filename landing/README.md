# Landing page — Crediário Digital

Página de venda (marketing) do Crediário Digital. Projeto **isolado** do app:
nada aqui toca o código de `src/` na raiz.

## Onde trocar link e WhatsApp

Tudo centralizado em **`src/config.js`**:

- `URL_DO_APP` — destino do botão "Começar grátis"
  (hoje: `https://sistema-fiado.vercel.app/cadastro`).
- `NUMERO_WHATSAPP` — WhatsApp de contato, formato `55DDDNÚMERO` só dígitos.
  **⚠️ Está com placeholder — trocar antes do deploy.**

## Rodar local

```bash
cd landing
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera dist/
```

## Publicar na Vercel (uma vez)

A landing vira um **segundo projeto** na Vercel (o primeiro é o app):

1. vercel.com → **Add New… → Project** → importe o repositório
   `dn3almeida-star/sistema-fiado` de novo.
2. Em **Root Directory**, clique em *Edit* e escolha **`landing`**.
3. Framework: Vite (detecta sozinho). Não precisa de variável de ambiente.
4. **Deploy.** A URL gerada (ex.: `crediario-digital.vercel.app`) é a página
   de venda — é ela que vai na bio/comentários. Depois dá pra plugar um
   domínio próprio nesse mesmo projeto.

Depois disso, todo push na branch principal que mudar arquivos de `landing/`
redeploya a página automaticamente.
