# Polimento Visual do Crediário Digital — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevar a percepção de qualidade do app (dark mode, animações, skeletons, estados vazios, feedback tátil) sem alterar funcionalidades.

**Architecture:** Cores migram para tokens semânticos via CSS variables, permitindo dark mode com flip de variáveis. Framer Motion adiciona cascata, contador e transições. Lógica pura (tema, haptics) é extraída para utils testáveis; componentes visuais são verificados rodando o app.

**Tech Stack:** React 18, Vite 6, Tailwind 3, Framer Motion, Vitest (só lógica pura), lucide-react.

## Global Constraints

- **Sem mudança de funcionalidade** — apenas apresentação. Nenhum fluxo, cálculo ou chamada Supabase muda de comportamento.
- **Tema claro sem regressão** — após migrar para tokens, o tema claro deve permanecer visualmente equivalente ao atual.
- **Degradação graciosa** — haptics e animações nunca lançam erro onde não há suporte; respeitar `prefers-reduced-motion`.
- **Paleta de marca:** `primary` `#154e30` / `light #1d6840` / `50 #edf4f0`; `accent` `#c97c1a` / `light #fdf3e7`; `danger #dc2626`; `success #16a34a`; `ground #f5f5f3`. Fonte `Plus Jakarta Sans`.
- **Testes:** apenas funções puras via `npm test` (Vitest). Componentes verificados com `npm run dev` + `npm run build`.
- **Diretório de trabalho:** todos os comandos rodam dentro de `sistema-fiado/`.

---

### Task 1: Tokens de cor semânticos (fundação)

Define as CSS variables dos dois temas e as expõe no Tailwind. Ainda sem trocar componentes — só adiciona a infraestrutura. Tema claro reproduz as cores atuais.

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`

**Interfaces:**
- Produces: utilitários Tailwind `bg-surface`, `bg-surface-2`, `bg-ground`, `text-ink`, `text-ink-muted`, `border-border`; classe `dark` no `<html>` alterna os valores.

- [ ] **Step 1: Ativar darkMode por classe e adicionar tokens no Tailwind**

Em `tailwind.config.js`, adicionar `darkMode: 'class'` e as cores semânticas que leem CSS variables. Manter tudo que já existe.

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#154e30',
          light: '#1d6840',
          50: '#edf4f0',
        },
        accent: {
          DEFAULT: '#c97c1a',
          light: '#fdf3e7',
        },
        danger: '#dc2626',
        success: '#16a34a',
        ground: 'rgb(var(--ground) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-muted': 'rgb(var(--ink-muted) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        base: ['1.0625rem', { lineHeight: '1.5' }],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
}
```

- [ ] **Step 2: Definir as variáveis dos dois temas no index.css**

Em `src/index.css`, dentro de `@layer base`, adicionar as variáveis (valores RGB sem vírgula, formato Tailwind). Tema claro replica o atual (`ground #f5f5f3`, cards brancos, texto gray-900/500). Substituir também o `background-color` fixo do `body` por `--ground`.

```css
@layer base {
  :root {
    --ground: 245 245 243;      /* #f5f5f3 */
    --surface: 255 255 255;     /* #ffffff */
    --surface-2: 249 250 251;   /* #f9fafb (gray-50) */
    --border: 229 231 235;      /* #e5e7eb (gray-200) */
    --ink: 17 24 39;            /* #111827 (gray-900) */
    --ink-muted: 107 114 128;   /* #6b7280 (gray-500) */
  }

  .dark {
    --ground: 17 21 19;         /* verde-quase-preto */
    --surface: 26 32 29;
    --surface-2: 34 42 38;
    --border: 48 58 52;
    --ink: 237 244 240;
    --ink-muted: 156 168 161;
  }

  * { touch-action: manipulation; }
  html { scroll-behavior: smooth; }

  body {
    min-height: 100dvh;
    background-color: rgb(var(--ground));
    color: rgb(var(--ink));
    font-family: "Plus Jakarta Sans", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
}
```

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: build conclui sem erros de Tailwind/PostCSS.

- [ ] **Step 4: Verificar visual no claro**

Run: `npm run dev` e abrir no navegador.
Expected: app idêntico ao anterior (nada mudou visualmente ainda; classe `dark` não está aplicada).

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js src/index.css
git commit -m "feat(ui): add semantic color tokens for theming"
```

---

### Task 2: Migrar componentes compartilhados para tokens

Troca cores fixas por tokens nos componentes reutilizáveis. Tema claro deve ficar igual.

**Files:**
- Modify: `src/components/CardResumo.jsx`
- Modify: `src/components/BottomNav.jsx`
- Modify: `src/components/ModalConfirmar.jsx`
- Modify: `src/components/Toast.jsx`

**Interfaces:**
- Consumes: tokens da Task 1.

- [ ] **Step 1: Migrar CardResumo**

Em `src/components/CardResumo.jsx`, trocar `bg-white`→`bg-surface`, `text-gray-500`→`text-ink-muted`, `text-gray-400`→`text-ink-muted`. Manter as cores de status (danger/success/etc). O container vira:

```jsx
<div className="bg-surface rounded-2xl shadow-sm px-4 py-3.5 flex items-center gap-4">
```

E os textos:
```jsx
<p className="text-xs text-ink-muted font-semibold uppercase tracking-wider truncate">{titulo}</p>
```
```jsx
{sub && <p className="text-xs text-ink-muted mt-0.5">{sub}</p>}
```

- [ ] **Step 2: Migrar BottomNav**

Em `src/components/BottomNav.jsx`: `bg-white`→`bg-surface`, `border-gray-100`→`border-border`. Trocar `text-gray-400`/`text-gray-500` das abas inativas por `text-ink-muted`. Manter `text-primary` no ativo. O `<nav>`:

```jsx
<nav className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
```

- [ ] **Step 3: Migrar ModalConfirmar e Toast**

Ler os dois arquivos e aplicar as mesmas substituições: `bg-white`→`bg-surface`, textos escuros→`text-ink`, textos cinza→`text-ink-muted`, bordas→`border-border`. Preservar botões coloridos de ação e overlays (`bg-black/40` fica).

- [ ] **Step 4: Verificar visual no claro**

Run: `npm run dev`
Expected: cards, nav, modal e toast idênticos ao anterior no tema claro.

- [ ] **Step 5: Commit**

```bash
git add src/components/CardResumo.jsx src/components/BottomNav.jsx src/components/ModalConfirmar.jsx src/components/Toast.jsx
git commit -m "refactor(ui): use semantic tokens in shared components"
```

---

### Task 3: Migrar páginas para tokens

Aplica os tokens nas telas. Grande em volume, mecânico em natureza.

**Files:**
- Modify: `src/pages/Dashboard.jsx`, `Clientes.jsx`, `CobrancasHoje.jsx`, `Relatorio.jsx`, `PerfilCliente.jsx`, `PerfilLoja.jsx`
- Modify: `src/App.jsx` (o wrapper usa `bg-ground` — já existe; confirmar)

**Interfaces:**
- Consumes: tokens da Task 1.

- [ ] **Step 1: Substituições padrão em cada página**

Em cada arquivo listado, aplicar as substituições (apenas onde a cor é estrutural, NÃO nas cores de marca/status):
- `bg-white` → `bg-surface`
- `bg-gray-50` (fundos elevados/hover neutro) → `bg-surface-2`
- `text-gray-900` / `text-gray-800` → `text-ink`
- `text-gray-700` / `text-gray-600` / `text-gray-500` / `text-gray-400` → `text-ink-muted`
- `border-gray-200` / `border-gray-100` → `border-border`

Manter: `text-primary`, `text-accent`, `bg-primary`, `text-danger`, `text-success`, `bg-orange-100`/`text-orange-700` (avatares) e demais cores intencionais.

Nota Dashboard: o hero `bg-primary` e seus textos `text-white/*` permanecem (marca). `active:bg-gray-50` dos botões de cobrança vira `active:bg-surface-2`.

- [ ] **Step 2: Confirmar wrapper do App**

Em `src/App.jsx`, o `<div className="flex flex-col min-h-screen bg-ground">` já usa `bg-ground` — nenhuma mudança necessária aqui, apenas confirmar.

- [ ] **Step 3: Verificar visual no claro**

Run: `npm run dev` e navegar por todas as abas.
Expected: todas as telas idênticas ao anterior no tema claro.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ src/App.jsx
git commit -m "refactor(ui): use semantic tokens across pages"
```

---

### Task 4: Hook de tema + alternância

Lógica pura testável + hook fino + botão no Perfil da Loja.

**Files:**
- Create: `src/utils/theme.js`
- Create: `src/utils/theme.test.js`
- Create: `src/hooks/useTheme.js`
- Modify: `src/main.jsx` (aplicar tema no boot, antes do paint)
- Modify: `src/pages/PerfilLoja.jsx` (botão de alternância)

**Interfaces:**
- Produces: `resolveInitialTheme(stored, prefersDark) → 'light' | 'dark'`; `applyTheme(theme)` (adiciona/remove classe `dark` e persiste); hook `useTheme() → { theme, toggle }`.

- [ ] **Step 1: Escrever o teste da lógica pura**

Criar `src/utils/theme.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { resolveInitialTheme } from './theme.js'

describe('resolveInitialTheme', () => {
  it('usa o valor salvo quando existe', () => {
    expect(resolveInitialTheme('dark', false)).toBe('dark')
    expect(resolveInitialTheme('light', true)).toBe('light')
  })

  it('cai na preferência do sistema quando não há valor salvo', () => {
    expect(resolveInitialTheme(null, true)).toBe('dark')
    expect(resolveInitialTheme(null, false)).toBe('light')
  })

  it('ignora valores salvos inválidos', () => {
    expect(resolveInitialTheme('banana', true)).toBe('dark')
  })
})
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `npm test`
Expected: FALHA — `theme.js` não existe / `resolveInitialTheme is not a function`.

- [ ] **Step 3: Implementar theme.js**

Criar `src/utils/theme.js`:

```js
const STORAGE_KEY = 'tema'

export function resolveInitialTheme(stored, prefersDark) {
  if (stored === 'light' || stored === 'dark') return stored
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignora storage indisponível */
  }
}

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function prefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `npm test`
Expected: PASSA.

- [ ] **Step 5: Criar o hook useTheme**

Criar `src/hooks/useTheme.js`:

```js
import { useState, useCallback } from 'react'
import { applyTheme, getStoredTheme, prefersDark, resolveInitialTheme } from '../utils/theme.js'

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    resolveInitialTheme(getStoredTheme(), prefersDark())
  )

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggle }
}
```

- [ ] **Step 6: Aplicar o tema no boot (antes do primeiro paint)**

Em `src/main.jsx`, antes do `createRoot(...).render(...)`, aplicar o tema salvo/preferido para evitar "flash" de tema claro:

```js
import { applyTheme, getStoredTheme, prefersDark, resolveInitialTheme } from './utils/theme.js'

applyTheme(resolveInitialTheme(getStoredTheme(), prefersDark()))
```

- [ ] **Step 7: Adicionar botão de alternância no Perfil da Loja**

Em `src/pages/PerfilLoja.jsx`, importar o hook e `Moon`/`Sun` de `lucide-react`. Adicionar uma linha de configuração (seguir o estilo dos cards da tela):

```jsx
import { useTheme } from '../hooks/useTheme.js'
import { Moon, Sun } from 'lucide-react'
// ...
const { theme, toggle } = useTheme()
// dentro do JSX, uma seção de configurações:
<button
  onClick={toggle}
  className="w-full bg-surface rounded-2xl shadow-sm p-4 flex items-center justify-between active:bg-surface-2 transition-colors"
>
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
      {theme === 'dark' ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
    </div>
    <span className="font-semibold text-ink">Tema {theme === 'dark' ? 'escuro' : 'claro'}</span>
  </div>
  <span className="text-xs text-ink-muted">Tocar para alternar</span>
</button>
```

- [ ] **Step 8: Verificar alternância**

Run: `npm run dev`, ir em Perfil da Loja, tocar no botão.
Expected: app inteiro alterna claro↔escuro; recarregar a página mantém a escolha.

- [ ] **Step 9: Commit**

```bash
git add src/utils/theme.js src/utils/theme.test.js src/hooks/useTheme.js src/main.jsx src/pages/PerfilLoja.jsx
git commit -m "feat(ui): add dark mode toggle with persistence"
```

---

### Task 5: Framer Motion — cascata nas listas

Instala a lib, cria variants reutilizáveis e aplica cascata onde há listas de cards.

**Files:**
- Modify: `package.json` (dependência)
- Create: `src/utils/motion.js`
- Modify: `src/pages/Dashboard.jsx`, `Clientes.jsx`, `CobrancasHoje.jsx`

**Interfaces:**
- Produces: `staggerContainer` e `fadeInUp` (variants Framer Motion) exportados de `motion.js`.

- [ ] **Step 1: Instalar Framer Motion**

Run: `npm install framer-motion`
Expected: adiciona `framer-motion` em dependencies sem erros.

- [ ] **Step 2: Criar variants reutilizáveis**

Criar `src/utils/motion.js`:

```js
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
}

export const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
}
```

- [ ] **Step 3: Aplicar cascata na lista de "Cobranças de Hoje" do Dashboard**

Em `src/pages/Dashboard.jsx`, importar `motion` e os variants. Envolver a lista `space-y-2` num `motion.div` container e cada botão de cobrança num `motion.div` item:

```jsx
import { motion } from 'framer-motion'
import { staggerContainer, fadeInUp } from '../utils/motion.js'
// ...
<motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
  {stats.vencimentosHoje.map(({ cliente, parcela, venda }) => (
    <motion.div variants={fadeInUp} key={`${venda.id}-${parcela.numero}`}>
      {/* botão existente sem alterações internas */}
    </motion.div>
  ))}
</motion.div>
```

- [ ] **Step 4: Aplicar cascata em Clientes e Cobranças**

Nas listas principais de `Clientes.jsx` e `CobrancasHoje.jsx`, aplicar o mesmo padrão: container `motion.div` com `variants={staggerContainer} initial="hidden" animate="show"`, cada item envolvido em `motion.div variants={fadeInUp}` com a `key` movida para o wrapper.

- [ ] **Step 5: Verificar**

Run: `npm run dev`
Expected: ao abrir Dashboard/Clientes/Cobranças, os cartões entram deslizando de baixo em sequência.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/utils/motion.js src/pages/Dashboard.jsx src/pages/Clientes.jsx src/pages/CobrancasHoje.jsx
git commit -m "feat(ui): staggered entrance animations on lists"
```

---

### Task 6: Contador animado no "Total a Receber"

**Files:**
- Create: `src/components/NumeroAnimado.jsx`
- Modify: `src/pages/Dashboard.jsx`

**Interfaces:**
- Consumes: Framer Motion (Task 5).
- Produces: `<NumeroAnimado valor={number} />` — renderiza o número contando de 0 até `valor`, formatado pt-BR com 2 casas.

- [ ] **Step 1: Criar o componente**

Criar `src/components/NumeroAnimado.jsx`:

```jsx
import { useEffect } from 'react'
import { animate, useMotionValue, useTransform, motion } from 'framer-motion'

export default function NumeroAnimado({ valor, className }) {
  const count = useMotionValue(0)
  const texto = useTransform(count, v =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  )

  useEffect(() => {
    const controls = animate(count, valor, { duration: 0.9, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [valor, count])

  return <motion.span className={className}>{texto}</motion.span>
}
```

- [ ] **Step 2: Usar no hero do Dashboard**

Em `src/pages/Dashboard.jsx`, substituir o span estático do total pelo componente:

```jsx
import NumeroAnimado from '../components/NumeroAnimado.jsx'
// ...
<NumeroAnimado
  valor={stats.totalReceber}
  className="text-4xl font-extrabold text-white tabular-nums leading-none"
/>
```

Remover a função `totalFormatado` se ficar sem uso.

- [ ] **Step 3: Verificar**

Run: `npm run dev`
Expected: ao abrir o Dashboard, o valor sobe contando de 0 até o total, formatado com 2 casas.

- [ ] **Step 4: Commit**

```bash
git add src/components/NumeroAnimado.jsx src/pages/Dashboard.jsx
git commit -m "feat(ui): animated counter on total a receber"
```

---

### Task 7: Toque nos botões + transição entre abas

**Files:**
- Modify: `src/App.jsx` (AnimatePresence)
- Modify: `src/components/BottomNav.jsx`, `src/pages/Dashboard.jsx` (whileTap nos principais)

**Interfaces:**
- Consumes: Framer Motion.

- [ ] **Step 1: Transição de página no App**

Em `src/App.jsx`, envolver a área de conteúdo com `AnimatePresence mode="wait"` e um `motion.div` chaveado por `paginaAtiva`:

```jsx
import { motion, AnimatePresence } from 'framer-motion'
// dentro de <main>:
<AnimatePresence mode="wait">
  <motion.div
    key={paginaAtiva}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.2 }}
  >
    {paginaAtiva === 'dashboard' && <Dashboard {...props} />}
    {paginaAtiva === 'clientes' && <Clientes {...props} />}
    {paginaAtiva === 'perfil' && <PerfilCliente {...props} clienteId={clienteAtivoId} />}
    {paginaAtiva === 'nova-venda' && <NovaVenda {...props} clientePreSelecionado={vendaParaCliente} />}
    {paginaAtiva === 'cobrancas' && <CobrancasHoje {...props} />}
    {paginaAtiva === 'relatorio' && <Relatorio {...props} />}
    {paginaAtiva === 'perfil-loja' && <PerfilLoja {...props} />}
  </motion.div>
</AnimatePresence>
```

- [ ] **Step 2: whileTap no FAB e botões de cobrança**

Em `BottomNav.jsx`, trocar o `<button>` central e as abas por `motion.button` com `whileTap={{ scale: 0.92 }}` (FAB) e `whileTap={{ scale: 0.96 }}` (abas). Em `Dashboard.jsx`, os botões de cobrança já estão envolvidos em `motion.div` (Task 5) — adicionar `whileTap={{ scale: 0.98 }}` nesses wrappers.

- [ ] **Step 3: Respeitar prefers-reduced-motion**

Em `src/index.css`, adicionar no fim:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 4: Verificar**

Run: `npm run dev`
Expected: trocar de aba faz fade/slide suave; botões afundam ao toque; com "reduzir movimento" ligado no SO, animações somem.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/BottomNav.jsx src/pages/Dashboard.jsx src/index.css
git commit -m "feat(ui): page transitions and tap feedback"
```

---

### Task 8: Skeleton loaders

Substitui o Splash de tela cheia durante o carregamento de dados por esqueletos.

**Files:**
- Create: `src/components/Skeleton.jsx`
- Modify: `src/App.jsx`

**Interfaces:**
- Produces: `Skeleton` (base), `SkeletonCard`, `SkeletonDashboard` — blocos cinza com pulse.

- [ ] **Step 1: Criar os componentes de skeleton**

Criar `src/components/Skeleton.jsx`:

```jsx
export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-surface-2 rounded-xl ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-2xl shadow-sm p-4 flex items-center gap-4">
      <Skeleton className="w-11 h-11 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-5 w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonDashboard() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
```

- [ ] **Step 2: Trocar o Splash de dados por skeleton no App**

Em `src/App.jsx`, a linha `if (clientesHook.carregandoClientes || vendasHook.carregandoVendas) return <Splash />` passa a renderizar o layout real (nav + main) com `SkeletonDashboard` no lugar do conteúdo. Manter `<Splash />` apenas para `carregandoAuth` e `carregandoProfile` (boot). Exemplo:

```jsx
import { SkeletonDashboard } from './components/Skeleton.jsx'
// ...
const carregandoDados = clientesHook.carregandoClientes || vendasHook.carregandoVendas
// no return, dentro de <main>, quando carregandoDados: mostrar <SkeletonDashboard /> em vez do AnimatePresence
```

- [ ] **Step 3: Verificar**

Run: `npm run dev` (simular rede lenta no DevTools ajuda).
Expected: durante o carregamento de dados aparecem os esqueletos pulsando, não a tela de splash inteira.

- [ ] **Step 4: Commit**

```bash
git add src/components/Skeleton.jsx src/App.jsx
git commit -m "feat(ui): skeleton loaders for data loading"
```

---

### Task 9: Estados vazios ilustrados

**Files:**
- Create: `src/components/EstadoVazio.jsx`
- Modify: `src/pages/Clientes.jsx`, `CobrancasHoje.jsx`, `Relatorio.jsx`, `src/pages/Dashboard.jsx`

**Interfaces:**
- Produces: `<EstadoVazio icone={Icon} titulo descricao acao={{ label, onClick }} />`.

- [ ] **Step 1: Criar o componente**

Criar `src/components/EstadoVazio.jsx`:

```jsx
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
```

- [ ] **Step 2: Aplicar nas telas**

Substituir os blocos "vazio" atuais por `<EstadoVazio>`:
- `Clientes.jsx` sem clientes: título "Nenhum cliente ainda", descrição "Cadastre o primeiro cliente para começar", ação → `navegar('nova-venda')` ou o fluxo de cadastro existente.
- `CobrancasHoje.jsx` sem pendências: "Tudo em dia!", descrição "Nenhuma cobrança pendente."
- `Relatorio.jsx` sem dados: "Sem dados ainda", descrição "Registre vendas para ver o relatório."
- `Dashboard.jsx`: o bloco vazio atual (linhas ~137-142) vira `<EstadoVazio>` com ícone `CalendarCheck`, título "Nenhuma cobrança para hoje".

Usar ícones já importados de `lucide-react` em cada tela (ex.: `Users`, `Bell`, `BarChart2`, `CalendarCheck`).

- [ ] **Step 3: Verificar**

Run: `npm run dev` (numa conta/loja sem dados, ou zerando temporariamente).
Expected: telas vazias mostram ícone + frase + botão de ação (onde aplicável).

- [ ] **Step 4: Commit**

```bash
git add src/components/EstadoVazio.jsx src/pages/Clientes.jsx src/pages/CobrancasHoje.jsx src/pages/Relatorio.jsx src/pages/Dashboard.jsx
git commit -m "feat(ui): illustrated empty states"
```

---

### Task 10: Feedback tátil (haptics)

**Files:**
- Create: `src/utils/haptic.js`
- Create: `src/utils/haptic.test.js`
- Modify: `src/components/ModalConfirmar.jsx` e os pontos de confirmação (dar baixa em parcela, salvar venda)

**Interfaces:**
- Produces: `haptic(padrao?)` — chama `navigator.vibrate` quando disponível; nunca lança.

- [ ] **Step 1: Escrever o teste**

Criar `src/utils/haptic.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest'
import { haptic } from './haptic.js'

afterEach(() => { vi.unstubAllGlobals() })

describe('haptic', () => {
  it('chama navigator.vibrate quando disponível', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic(20)
    expect(vibrate).toHaveBeenCalledWith(20)
  })

  it('não lança quando vibrate não existe', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic()).not.toThrow()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FALHA — `haptic.js` não existe.

- [ ] **Step 3: Implementar**

Criar `src/utils/haptic.js`:

```js
export function haptic(padrao = 15) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(padrao)
    }
  } catch {
    /* sem suporte: ignora */
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASSA.

- [ ] **Step 5: Disparar nas confirmações**

Importar `haptic` e chamar nos pontos de ação: no `onClick` de confirmar do `ModalConfirmar.jsx`, e onde o app dá baixa em parcela / salva venda (procurar por `mostrarToast(...'success')` nesses fluxos em `PerfilCliente.jsx` / `NovaVenda.jsx` e chamar `haptic()` junto). Exemplo:

```jsx
import { haptic } from '../utils/haptic.js'
// no handler de confirmação:
haptic()
```

- [ ] **Step 6: Verificar**

Run: `npm run dev` num celular Android (ou emulador com vibração).
Expected: vibração curta ao confirmar pagamento/venda; sem erro em desktop/iOS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/haptic.js src/utils/haptic.test.js src/components/ModalConfirmar.jsx src/pages/PerfilCliente.jsx src/pages/NovaVenda.jsx
git commit -m "feat(ui): haptic feedback on confirmations"
```

---

## Verificação final

- [ ] `npm test` — todos os testes de lógica pura passam.
- [ ] `npm run build` — build de produção conclui sem erros.
- [ ] `npm run dev` — percorrer todas as abas no tema claro e no escuro; conferir cascata, contador, transições, skeletons, estados vazios.
- [ ] Confirmar que nenhum fluxo funcional (cadastro, venda, baixa de parcela, PDF, WhatsApp) mudou de comportamento.
