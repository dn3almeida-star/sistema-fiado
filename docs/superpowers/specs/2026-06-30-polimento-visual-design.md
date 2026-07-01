# Design: Polimento Visual do Crediário Digital

**Data:** 2026-06-30
**App:** sistema-fiado (Crediário Digital / Iran Utilidades)
**Stack:** React 18 + Vite + Tailwind 3 + Framer Motion + Supabase

## Objetivo

Elevar a percepção de qualidade do app ("cara de app profissional e caro") sem
alterar funcionalidades existentes. Foco em: modo escuro, micro-animações,
carregamento com skeletons, estados vazios e feedback tátil.

## Fora de escopo (próximos ciclos)

- Gráficos no Relatório
- Busca e filtros em Clientes
- Lembretes automáticos de WhatsApp / timeline no perfil do cliente

Estes ficam registrados como backlog, não entram neste pacote.

## Decisões tomadas

- **Animações:** Framer Motion (aceito ~50kb extras em troca de qualidade).
- **Dark mode:** incluído neste pacote.

---

## Componentes do design

### 1. Sistema de cores semânticas (fundação do dark mode)

Hoje as cores são hex fixos (`#154e30`, `bg-white`, `text-gray-900`). Para o dark
mode ser mantível, migrar para **tokens semânticos via CSS variables**.

- Em `src/index.css`, definir variáveis para tema claro (`:root`) e escuro (`.dark`):
  - `--surface` — fundo de cards
  - `--surface-2` — fundo elevado / secundário
  - `--ground` — fundo geral da página
  - `--border` — bordas
  - `--ink` — texto principal
  - `--ink-muted` — texto secundário
- Em `tailwind.config.js`, expor como utilitários: `bg-surface`, `bg-ground`,
  `text-ink`, `text-ink-muted`, `border-border`.
- Cores de marca (`primary` verde, `accent` âmbar) permanecem; ajustar levemente
  o brilho no tema escuro para não "queimar".
- Migrar componentes: `bg-white` → `bg-surface`, `text-gray-900` → `text-ink`,
  cinzas de texto → `text-ink-muted`, etc.

Resultado: alternar tema = trocar o valor das variáveis num único lugar.

### 2. Alternância de tema (claro/escuro)

- `darkMode: 'class'` no Tailwind.
- Hook `useTheme` (`src/hooks/useTheme.js`):
  - Lê preferência salva em `localStorage`.
  - Na primeira visita, respeita `prefers-color-scheme` do sistema.
  - Alterna a classe `dark` no elemento `<html>` e persiste.
- Botão de alternância na tela **Perfil da Loja** (`PerfilLoja.jsx`).

### 3. Animações (Framer Motion)

- Instalar `framer-motion`.
- Arquivo `src/utils/motion.js` com variants reutilizáveis: `staggerContainer`,
  `fadeInUp`.
- **Cascata:** listas de cards (Dashboard, Clientes, Cobranças) entram em sequência.
- **Contador animado:** componente `src/components/NumeroAnimado.jsx` para o
  "Total a Receber" contar de 0 até o valor.
- **Toque:** botões/cards principais com `whileTap={{ scale: 0.97 }}`.
- **Transição de página:** `AnimatePresence` no `App.jsx`, transição fade/slide
  leve entre abas.

### 4. Skeleton loaders

- Componentes em `src/components/Skeleton.jsx`: `Skeleton` base + `SkeletonCard`,
  `SkeletonLista`.
- Ajustar `App.jsx`: manter `<Splash>` apenas no boot de autenticação;
  o carregamento de clientes/vendas passa a renderizar o layout real com
  esqueletos pulsando (animação de shimmer/pulse).

### 5. Estados vazios

- Componente `src/components/EstadoVazio.jsx` (`icone`, `titulo`, `descricao`,
  `acao` opcional).
- Aplicar em: Clientes sem cadastro, Cobranças sem pendências, Relatório sem dados.

### 6. Feedback tátil

- Util `src/utils/haptic.js` usando `navigator.vibrate()` (degrada silenciosamente
  onde não houver suporte, ex. iOS Safari/desktop).
- Disparar em ações de confirmação: dar baixa em parcela, salvar venda, confirmar
  no `ModalConfirmar`.

---

## Arquivos afetados (visão geral)

**Novos:**
- `src/hooks/useTheme.js`
- `src/utils/motion.js`
- `src/utils/haptic.js`
- `src/components/NumeroAnimado.jsx`
- `src/components/Skeleton.jsx`
- `src/components/EstadoVazio.jsx`

**Modificados:**
- `tailwind.config.js` (darkMode + tokens)
- `src/index.css` (CSS variables claro/escuro)
- `src/App.jsx` (transição de página, skeletons no lugar do splash de dados)
- `src/pages/Dashboard.jsx`, `Clientes.jsx`, `CobrancasHoje.jsx`, `Relatorio.jsx`,
  `PerfilCliente.jsx`, `PerfilLoja.jsx` (cores semânticas, animações, estados vazios)
- `src/components/CardResumo.jsx`, `BottomNav.jsx`, `ModalConfirmar.jsx` (cores + toque)

## Princípios

- **Nenhuma mudança de funcionalidade** — apenas apresentação.
- **Sem regressão de cor:** o tema claro deve permanecer visualmente equivalente
  ao atual após a migração para tokens.
- **Degradação graciosa:** haptics e animações nunca quebram em navegadores sem
  suporte (respeitar `prefers-reduced-motion`).

## Critérios de sucesso

1. Alternar entre claro/escuro funciona e persiste entre sessões.
2. Cards entram em cascata; "Total a Receber" anima a contagem.
3. Carregamento de dados mostra skeletons, não o splash de tela cheia.
4. Listas vazias mostram estado vazio com ação.
5. Vibração leve nas confirmações (onde suportado).
6. Tema claro permanece visualmente equivalente ao atual.
