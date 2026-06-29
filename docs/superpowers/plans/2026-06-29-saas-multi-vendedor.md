# SaaS Multi-Vendedor — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o sistema-fiado de app local (1 usuário, localStorage) em um SaaS multi-vendedor com login, dados isolados por vendedor na nuvem (Supabase) e perfil de loja com logo personalizada.

**Architecture:** SPA React (Vite) existente ganha uma camada Supabase: Auth (email/senha), Postgres com Row Level Security por `user_id`, e Storage para logos. Os hooks `useClientes`/`useVendas` são reescritos para falar com o Supabase mantendo a mesma interface, então as telas mudam pouco. `App.jsx` vira um porteiro: sem sessão → Login; sem perfil de loja → completar perfil; senão → app.

**Tech Stack:** React 18, Vite 6, Tailwind 3, lucide-react, jsPDF, `@supabase/supabase-js` (novo).

## Global Constraints

- Idioma de toda a UI e mensagens: **português do Brasil**.
- Cor primária da marca: **forest green `#154e30`** (RGB 21, 78, 48); accent `#c97c1a`. Aplicar inclusive no PDF.
- Isolamento de dados: **toda** query depende de RLS com `user_id = auth.uid()`. Nunca filtrar isolamento só no cliente.
- Cadastro: **sem auto-cadastro**. Admin cria contas no painel Supabase. App só faz login.
- Segredos: nunca commitar `.env`. A anon key vai no `.env` local; `.env.example` versionado sem valores.
- Feedback: toda ação de escrita mostra toast de sucesso/erro via `mostrarToast` já existente em `App.jsx`.
- Valores monetários e datas: usar os formatadores existentes (`formatarMoeda`, `formatarData`).

## Abordagem de testes

O projeto **não tem framework de teste unitário** e a maior parte deste plano é
integração com um serviço externo (Supabase) que exige o projeto na nuvem
provisionado pelo usuário. Portanto:

- **Lógica pura nova** (ex.: `perfilCompleto`) recebe teste unitário com Vitest.
- **Auth, CRUD, upload e PDF** usam **verificação manual** com passos exatos e
  resultado esperado (a app rodando + projeto Supabase real). Cada task de
  integração lista exatamente o que clicar e o que observar.

Isso é uma decisão deliberada registrada aqui — não ausência de verificação.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `.env` / `.env.example` | Credenciais Supabase | Criar |
| `src/lib/supabase.js` | Instância única do cliente Supabase | Criar |
| `src/hooks/useAuth.js` | Sessão, login, logout (Context) | Criar |
| `src/hooks/useProfile.js` | Perfil da loja + upload de logo | Criar |
| `src/utils/perfil.js` | `perfilCompleto(profile)` (lógica pura) | Criar |
| `src/pages/Login.jsx` | Tela de login (email/senha) | Criar |
| `src/pages/PerfilLoja.jsx` | Editar loja + logo; modo "completar" | Criar |
| `src/components/Splash.jsx` | Tela de carregamento inicial | Criar |
| `src/hooks/useClientes.js` | CRUD clientes via Supabase | Reescrever |
| `src/hooks/useVendas.js` | CRUD vendas via Supabase | Reescrever |
| `src/main.jsx` | Envolver app em `AuthProvider` | Modificar |
| `src/App.jsx` | Porteiro de auth + perfil; logout; rota loja | Modificar |
| `src/components/BottomNav.jsx` | Item de menu para Perfil da Loja | Modificar |
| `src/utils/gerarPDF.js` | Logo no topo + cor forest + contato no rodapé | Modificar |
| `package.json` | Dependência supabase-js + Vitest | Modificar |

---

## FASE 0 — Provisionar Supabase (passo manual do usuário)

Esta fase não tem código no app; é configuração na nuvem. O implementador entrega
ao usuário estas instruções e aguarda os 2 valores (URL e anon key).

- [ ] **Passo 1: Criar projeto**
  - Acessar https://supabase.com → New project. Escolher nome, senha do banco e região (South America / São Paulo se disponível).

- [ ] **Passo 2: Rodar o SQL** (Supabase → SQL Editor → New query → colar e Run):

```sql
-- PROFILES (perfil da loja, 1 por vendedor)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome_loja text,
  telefone text,
  logo_url text,
  criado_em timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid());

-- CLIENTES
create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  telefone text,
  endereco text,
  bairro text,
  observacoes text,
  criado_em timestamptz not null default now()
);
alter table public.clientes enable row level security;
create policy "clientes_all_own" on public.clientes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- VENDAS (parcelas como JSONB)
create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  itens text not null,
  valor_total numeric not null default 0,
  entrada numeric not null default 0,
  parcelas jsonb not null default '[]'::jsonb,
  criada_em timestamptz not null default now()
);
alter table public.vendas enable row level security;
create policy "vendas_all_own" on public.vendas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- STORAGE: bucket público "logos"
insert into storage.buckets (id, name, public)
  values ('logos', 'logos', true) on conflict (id) do nothing;
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');
create policy "logos_owner_insert" on storage.objects
  for insert with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_owner_update" on storage.objects
  for update using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos_owner_delete" on storage.objects
  for delete using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
```

- [ ] **Passo 3: Criar um usuário de teste**
  - Authentication → Users → Add user → email + senha. Marcar "Auto confirm user".

- [ ] **Passo 4: Pegar as credenciais**
  - Project Settings → API → copiar **Project URL** e a chave **anon public**.
  - Entregar esses 2 valores para usar na Fase 1.

**Verificação:** No SQL Editor, rodar `select * from public.clientes;` deve retornar
0 linhas sem erro (tabela existe). Em Storage, o bucket `logos` aparece na lista.

---

## FASE 1 — Login

### Task 1: Setup do projeto (git, dependências, cliente Supabase, .env)

**Files:**
- Create: `.env`, `.env.example`, `src/lib/supabase.js`
- Modify: `package.json` (via npm install)

**Interfaces:**
- Produces: `supabase` (instância de `@supabase/supabase-js`) exportada de `src/lib/supabase.js`.

- [ ] **Step 1: Inicializar git (projeto ainda não é repositório)**

```bash
cd "sistema-fiado"
git init
printf "node_modules\ndist\n.env\n" > .gitignore
git add -A && git commit -m "chore: init git repo"
```

- [ ] **Step 2: Instalar supabase-js e Vitest**

```bash
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 3: Adicionar script de teste no package.json**

Em `package.json`, dentro de `"scripts"`, adicionar:

```json
"test": "vitest run"
```

- [ ] **Step 4: Criar `.env.example` (versionado, sem valores)**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 5: Criar `.env` (NÃO versionado) com os valores reais da Fase 0**

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA-ANON-KEY
```

- [ ] **Step 6: Criar `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env'
  )
}

export const supabase = createClient(url, anonKey)
```

- [ ] **Step 7: Verificar que o app ainda sobe**

Run: `npm run dev`
Expected: servidor inicia sem erro; abrir http://localhost:5173 mostra o app
atual (ainda sem login). Sem erro no console sobre variáveis de ambiente.

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat: add supabase client and env config"
```

---

### Task 2: Hook de autenticação (`useAuth`)

**Files:**
- Create: `src/hooks/useAuth.js`

**Interfaces:**
- Consumes: `supabase` de `src/lib/supabase.js`.
- Produces:
  - `AuthProvider` (componente que envolve a árvore).
  - `useAuth()` → `{ session, usuario, carregando, login(email, senha), logout() }`.
  - `login` lança erro (Error) em falha; `logout` resolve sempre.

- [ ] **Step 1: Criar `src/hooks/useAuth.js`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, novaSessao) => {
      setSession(novaSessao)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function login(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  const valor = {
    session,
    usuario: session?.user ?? null,
    carregando,
    login,
    logout,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Envolver o app no `AuthProvider` em `src/main.jsx`**

Substituir o conteúdo de `src/main.jsx` por:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './hooks/useAuth.js'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
```

- [ ] **Step 3: Verificar que não quebrou**

Run: `npm run dev`
Expected: app carrega normal (AuthProvider ainda não altera a UI). Sem erro no console.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add useAuth context and wrap app in AuthProvider"
```

---

### Task 3: Tela de Login + Splash

**Files:**
- Create: `src/pages/Login.jsx`, `src/components/Splash.jsx`

**Interfaces:**
- Consumes: `useAuth()` (`login`, `carregando`).
- Produces:
  - `Login` (componente sem props; usa `useAuth` internamente).
  - `Splash` (componente sem props; tela de carregamento).

- [ ] **Step 1: Criar `src/components/Splash.jsx`**

```jsx
import { BookOpen } from 'lucide-react'

export default function Splash() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-ground">
      <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center animate-pulse">
        <BookOpen size={26} className="text-white" />
      </div>
      <p className="text-sm text-gray-400 font-medium">Carregando…</p>
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/pages/Login.jsx`**

```jsx
import { useState } from 'react'
import { BookOpen, LogIn } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setErro('')
    if (!email.trim() || !senha) {
      setErro('Informe email e senha')
      return
    }
    setEnviando(true)
    try {
      await login(email, senha)
      // sucesso: o porteiro em App.jsx troca a tela automaticamente
    } catch {
      setErro('Email ou senha incorretos')
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 bg-ground">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-sm">
          <BookOpen size={30} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Caderno Digital</h1>
        <p className="text-sm text-gray-500 mt-1">Entre para acessar seus clientes</p>
      </div>

      <form onSubmit={entrar} className="space-y-3">
        {erro && (
          <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl text-center">{erro}</p>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Email</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Senha</span>
          <input
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            placeholder="••••••••"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <LogIn size={18} />
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Ligar o porteiro mínimo em `App.jsx` (temporário, só auth)**

No topo do componente `App`, logo após os hooks existentes, adicionar import e gate.
Adicionar ao bloco de imports de `src/App.jsx`:

```jsx
import { useAuth } from './hooks/useAuth.js'
import Login from './pages/Login.jsx'
import Splash from './components/Splash.jsx'
```

E no início da função `App()`, antes de `const clientesHook = ...`:

```jsx
  const { session, carregando: carregandoAuth } = useAuth()
```

Logo antes do `return (` principal, inserir:

```jsx
  if (carregandoAuth) return <Splash />
  if (!session) return <Login />
```

- [ ] **Step 4: Verificação manual — login**

Run: `npm run dev` e abrir http://localhost:5173
1. Deve aparecer a tela de **Login** (não o app).
2. Digitar email/senha errados → clicar Entrar → mensagem "Email ou senha incorretos".
3. Digitar o usuário de teste criado na Fase 0 → Entrar → o app (Dashboard) aparece.
4. Recarregar a página → continua logado (sessão persistida), mostra o app direto.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add login screen and auth gate"
```

---

### Task 4: Logout

**Files:**
- Modify: `src/pages/Dashboard.jsx` (botão de sair no header)

**Interfaces:**
- Consumes: `useAuth()` (`logout`).

- [ ] **Step 1: Adicionar botão Sair no header do Dashboard**

Em `src/pages/Dashboard.jsx`, adicionar ao import do lucide o ícone `LogOut`:

```jsx
import { AlertCircle, Clock, CalendarCheck, BookOpen, LogOut } from 'lucide-react'
```

Adicionar import do hook:

```jsx
import { useAuth } from '../hooks/useAuth.js'
```

Dentro do componente, no topo:

```jsx
  const { logout } = useAuth()
```

Substituir o quadrado do ícone `BookOpen` no header (o `<div className="w-10 h-10 rounded-xl bg-primary ...">`) por este bloco com os dois botões:

```jsx
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <BookOpen size={20} className="text-white" strokeWidth={2} />
          </div>
          <button
            onClick={logout}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 active:bg-gray-50"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </div>
```

- [ ] **Step 2: Verificação manual — logout**

1. Logado, no Dashboard, clicar no botão Sair (ícone de saída).
2. Deve voltar para a tela de Login.
3. Recarregar a página → continua na tela de Login (sessão encerrada).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add logout button to dashboard header"
```

---

## FASE 2 — Dados na nuvem

### Task 5: Reescrever `useClientes` para Supabase

**Files:**
- Rewrite: `src/hooks/useClientes.js`

**Interfaces:**
- Consumes: `supabase`.
- Produces: `useClientes()` → `{ clientes, carregandoClientes, adicionarCliente(dados)→Promise<id>, atualizarCliente(id, patch)→Promise, removerCliente(id)→Promise }`.
  Campos de cliente em **camelCase** na app: `id, nome, telefone, endereco, bairro, observacoes`. (Colunas do banco são iguais; `criado_em` não é usado na UI.)

- [ ] **Step 1: Substituir todo o conteúdo de `src/hooks/useClientes.js`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, telefone, endereco, bairro, observacoes')
      .order('nome', { ascending: true })
    if (!error) setClientes(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  async function adicionarCliente(dados) {
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: dados.nome,
        telefone: dados.telefone ?? '',
        endereco: dados.endereco ?? '',
        bairro: dados.bairro ?? '',
        observacoes: dados.observacoes ?? '',
      })
      .select('id, nome, telefone, endereco, bairro, observacoes')
      .single()
    if (error) throw error
    setClientes(prev =>
      [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
    )
    return data.id
  }

  async function atualizarCliente(id, patch) {
    const { error } = await supabase.from('clientes').update(patch).eq('id', id)
    if (error) throw error
    setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
  }

  async function removerCliente(id) {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) throw error
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  return {
    clientes,
    carregandoClientes: carregando,
    adicionarCliente,
    atualizarCliente,
    removerCliente,
  }
}
```

- [ ] **Step 2: Tornar `salvarCliente` assíncrono com toast de erro em `Clientes.jsx`**

Em `src/pages/Clientes.jsx`, substituir a função `salvarCliente` por:

```jsx
  async function salvarCliente() {
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    try {
      await adicionarCliente({ ...form, nome: form.nome.trim() })
      setForm(FORM_INICIAL)
      setMostrarForm(false)
      setErro('')
      mostrarToast('✓ Cliente salvo')
    } catch {
      mostrarToast('Erro ao salvar cliente. Tente de novo.', 'error')
    }
  }
```

- [ ] **Step 3: Verificação manual — clientes na nuvem**

1. Logar, ir em Clientes → Novo → preencher nome e salvar.
2. Toast "✓ Cliente salvo"; cliente aparece na lista.
3. No painel Supabase → Table editor → `clientes`: a linha existe com o `user_id`
   do usuário logado.
4. Recarregar a página da app → cliente continua na lista (veio da nuvem).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: migrate clientes to supabase"
```

---

### Task 6: Reescrever `useVendas` para Supabase

**Files:**
- Rewrite: `src/hooks/useVendas.js`

**Interfaces:**
- Consumes: `supabase`.
- Produces: `useVendas()` → `{ vendas, carregandoVendas, adicionarVenda(dados)→Promise<id>, marcarParcelaPaga(vendaId, numero)→Promise, desmarcarParcelaPaga(vendaId, numero)→Promise, removerVenda(id)→Promise }`.
  Campos de venda em **camelCase** na app via alias: `id, clienteId, itens, valorTotal, entrada, parcelas, criadaEm`. `parcelas` é array `[{numero, valor, vencimento, pago, pagoEm}]`.

- [ ] **Step 1: Substituir todo o conteúdo de `src/hooks/useVendas.js`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

const SELECT = 'id, clienteId:cliente_id, itens, valorTotal:valor_total, entrada, parcelas, criadaEm:criada_em'

export function useVendas() {
  const [vendas, setVendas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('vendas')
      .select(SELECT)
      .order('criada_em', { ascending: false })
    if (!error) setVendas(data ?? [])
    setCarregando(false)
  }, [])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  async function adicionarVenda(dados) {
    const { data, error } = await supabase
      .from('vendas')
      .insert({
        cliente_id: dados.clienteId,
        itens: dados.itens,
        valor_total: dados.valorTotal,
        entrada: dados.entrada ?? 0,
        parcelas: dados.parcelas ?? [],
      })
      .select(SELECT)
      .single()
    if (error) throw error
    setVendas(prev => [data, ...prev])
    return data.id
  }

  async function atualizarParcelas(vendaId, novasParcelas) {
    const { error } = await supabase
      .from('vendas')
      .update({ parcelas: novasParcelas })
      .eq('id', vendaId)
    if (error) throw error
    setVendas(prev =>
      prev.map(v => (v.id === vendaId ? { ...v, parcelas: novasParcelas } : v))
    )
  }

  async function marcarParcelaPaga(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela
        ? { ...p, pago: true, pagoEm: new Date().toISOString() }
        : p
    )
    await atualizarParcelas(vendaId, novas)
  }

  async function desmarcarParcelaPaga(vendaId, numeroParcela) {
    const venda = vendas.find(v => v.id === vendaId)
    if (!venda) return
    const novas = venda.parcelas.map(p =>
      p.numero === numeroParcela ? { ...p, pago: false, pagoEm: null } : p
    )
    await atualizarParcelas(vendaId, novas)
  }

  async function removerVenda(id) {
    const { error } = await supabase.from('vendas').delete().eq('id', id)
    if (error) throw error
    setVendas(prev => prev.filter(v => v.id !== id))
  }

  return {
    vendas,
    carregandoVendas: carregando,
    adicionarVenda,
    marcarParcelaPaga,
    desmarcarParcelaPaga,
    removerVenda,
  }
}
```

- [ ] **Step 2: Tornar `salvar` assíncrono em `NovaVenda.jsx`**

Em `src/pages/NovaVenda.jsx`, substituir a função `salvar` por:

```jsx
  async function salvar() {
    if (!validar()) return
    try {
      await adicionarVenda({
        clienteId,
        itens: form.itens.trim(),
        valorTotal: parseFloat(form.valorTotal),
        entrada: parseFloat(form.entrada) || 0,
        parcelas: parcelasPreview,
      })
      setSucesso(true)
      setTimeout(() => navegar('perfil', { clienteId }), 1200)
    } catch {
      setErro('Erro ao salvar a venda. Verifique a conexão e tente de novo.')
    }
  }
```

- [ ] **Step 3: Mostrar erro nas ações de parcela/remoção em `PerfilCliente.jsx`**

Em `src/pages/PerfilCliente.jsx`, envolver as chamadas async em try/catch.
Substituir `confirmarMarcarPago`:

```jsx
  async function confirmarMarcarPago() {
    if (!modalPago) return
    try {
      await marcarParcelaPaga(modalPago.vendaId, modalPago.numeroParcela)
      setModalPago(null)
      mostrarToast('✓ Parcela marcada como paga')
    } catch {
      mostrarToast('Erro ao atualizar a parcela.', 'error')
    }
  }
```

Substituir `confirmarRemoverVenda`:

```jsx
  async function confirmarRemoverVenda() {
    if (!modalRemover) return
    try {
      await removerVenda(modalRemover)
      setModalRemover(null)
      mostrarToast('Venda removida', 'info')
    } catch {
      mostrarToast('Erro ao remover a venda.', 'error')
    }
  }
```

Substituir o `onClick` do botão de desmarcar parcela (o ramo `else` que chama `desmarcarParcelaPaga`) por:

```jsx
                                  else {
                                    desmarcarParcelaPaga(venda.id, p.numero)
                                      .then(() => mostrarToast('Parcela desmarcada', 'info'))
                                      .catch(() => mostrarToast('Erro ao atualizar a parcela.', 'error'))
                                  }
```

- [ ] **Step 4: Verificação manual — vendas na nuvem**

1. Abrir um cliente → Nova Venda → preencher itens, valor, parcelas → Salvar.
2. "Venda registrada!" e redireciona ao perfil; a venda aparece no histórico.
3. Marcar uma parcela como paga (confirmar no modal) → toast de sucesso; status muda.
4. Recarregar a página → venda e status da parcela persistem.
5. Supabase → `vendas`: a linha existe; coluna `parcelas` tem o array com `pago: true`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: migrate vendas to supabase"
```

---

### Task 7: Loading inicial no `App` (dados prontos antes de renderizar telas)

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `carregandoClientes` (de useClientes), `carregandoVendas` (de useVendas).

- [ ] **Step 1: Usar os flags de carregamento no `App.jsx`**

Em `src/App.jsx`, após `const clientesHook = useClientes()` e
`const vendasHook = useVendas()`, e depois do gate de auth, adicionar:

```jsx
  if (clientesHook.carregandoClientes || vendasHook.carregandoVendas) {
    return <Splash />
  }
```

(Colocar essa linha depois de `if (!session) return <Login />`.)

- [ ] **Step 2: Verificação manual**

1. Recarregar a app logado → aparece brevemente o Splash "Carregando…", depois o
   Dashboard já com os números corretos (sem piscar lista vazia).
2. Dashboard, Clientes, Relatório mostram os dados vindos da nuvem.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: show splash until cloud data loaded"
```

---

## FASE 3 — Perfil da loja + logo

### Task 8: Helper puro `perfilCompleto` (com teste unitário)

**Files:**
- Create: `src/utils/perfil.js`, `src/utils/perfil.test.js`

**Interfaces:**
- Produces: `perfilCompleto(profile)` → boolean. `true` somente se `profile`
  existe e `profile.nome_loja` é string não-vazia (após trim).

- [ ] **Step 1: Escrever o teste que falha — `src/utils/perfil.test.js`**

```js
import { describe, it, expect } from 'vitest'
import { perfilCompleto } from './perfil.js'

describe('perfilCompleto', () => {
  it('false quando profile é null', () => {
    expect(perfilCompleto(null)).toBe(false)
  })
  it('false quando nome_loja está vazio', () => {
    expect(perfilCompleto({ nome_loja: '' })).toBe(false)
    expect(perfilCompleto({ nome_loja: '   ' })).toBe(false)
  })
  it('true quando nome_loja tem conteúdo', () => {
    expect(perfilCompleto({ nome_loja: 'Iran Utilidades' })).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL — `Failed to resolve import './perfil.js'` (arquivo ainda não existe).

- [ ] **Step 3: Implementar `src/utils/perfil.js`**

```js
export function perfilCompleto(profile) {
  return Boolean(profile && typeof profile.nome_loja === 'string' && profile.nome_loja.trim())
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS — 3 testes verdes.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add perfilCompleto helper with tests"
```

---

### Task 9: Hook `useProfile` (perfil + upload de logo)

**Files:**
- Create: `src/hooks/useProfile.js`

**Interfaces:**
- Consumes: `supabase`, objeto `usuario` (de `useAuth`).
- Produces: `useProfile(usuario)` → `{ profile, carregandoProfile, salvarProfile(dados)→Promise, enviarLogo(file)→Promise<url> }`.
  `profile` tem colunas snake_case do banco: `id, nome_loja, telefone, logo_url`.

- [ ] **Step 1: Criar `src/hooks/useProfile.js`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase.js'

export function useProfile(usuario) {
  const [profile, setProfile] = useState(null)
  const [carregando, setCarregando] = useState(true)

  const recarregar = useCallback(async () => {
    if (!usuario) {
      setProfile(null)
      setCarregando(false)
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, nome_loja, telefone, logo_url')
      .eq('id', usuario.id)
      .maybeSingle()
    setProfile(data ?? null)
    setCarregando(false)
  }, [usuario])

  useEffect(() => {
    setCarregando(true)
    recarregar()
  }, [recarregar])

  async function salvarProfile(dados) {
    const payload = { id: usuario.id, ...dados }
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select('id, nome_loja, telefone, logo_url')
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  async function enviarLogo(file) {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase()
    const caminho = `${usuario.id}/logo.${ext}`
    const { error } = await supabase.storage
      .from('logos')
      .upload(caminho, file, { upsert: true, contentType: file.type })
    if (error) throw error
    const { data } = supabase.storage.from('logos').getPublicUrl(caminho)
    const url = `${data.publicUrl}?t=${Date.now()}`
    await salvarProfile({ logo_url: url })
    return url
  }

  return { profile, carregandoProfile: carregando, salvarProfile, enviarLogo }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add useProfile hook with logo upload"
```

---

### Task 10: Tela `PerfilLoja` + porteiro de perfil no `App`

**Files:**
- Create: `src/pages/PerfilLoja.jsx`
- Modify: `src/App.jsx`, `src/components/BottomNav.jsx`

**Interfaces:**
- Consumes: `useProfile`, `perfilCompleto`, `mascaraTelefone`.
- `PerfilLoja` props: `{ profile, salvarProfile, enviarLogo, mostrarToast, modoInicial, onConcluir, navegar }`.
  - `modoInicial=true` mostra texto de boas-vindas e, ao salvar, chama `onConcluir`.

- [ ] **Step 1: Criar `src/pages/PerfilLoja.jsx`**

```jsx
import { useState } from 'react'
import { ArrowLeft, Store, Upload } from 'lucide-react'
import { mascaraTelefone } from '../utils/formatadores.js'

export default function PerfilLoja({ profile, salvarProfile, enviarLogo, mostrarToast, modoInicial = false, onConcluir, navegar }) {
  const [nomeLoja, setNomeLoja] = useState(profile?.nome_loja ?? '')
  const [telefone, setTelefone] = useState(profile?.telefone ?? '')
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url ?? '')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [enviandoLogo, setEnviandoLogo] = useState(false)

  async function trocarLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      mostrarToast('Selecione um arquivo de imagem.', 'error')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      mostrarToast('Imagem muito grande (máx. 2 MB).', 'error')
      return
    }
    setEnviandoLogo(true)
    try {
      const url = await enviarLogo(file)
      setLogoUrl(url)
      mostrarToast('✓ Logo atualizada')
    } catch {
      mostrarToast('Erro ao enviar a logo.', 'error')
    } finally {
      setEnviandoLogo(false)
    }
  }

  async function salvar() {
    if (!nomeLoja.trim()) {
      setErro('Informe o nome da loja')
      return
    }
    setSalvando(true)
    try {
      await salvarProfile({ nome_loja: nomeLoja.trim(), telefone })
      mostrarToast('✓ Perfil salvo')
      if (modoInicial && onConcluir) onConcluir()
    } catch {
      setErro('Erro ao salvar. Tente de novo.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen pb-6">
      <div className="bg-primary text-white px-4 pt-4 pb-6">
        {!modoInicial && (
          <button
            onClick={() => navegar('dashboard')}
            className="flex items-center gap-2 text-white/70 mb-3 min-h-touch hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Início</span>
          </button>
        )}
        <h1 className="text-xl font-bold">{modoInicial ? 'Bem-vindo!' : 'Perfil da Loja'}</h1>
        {modoInicial && (
          <p className="text-white/70 text-sm mt-1">Antes de começar, conte sobre a sua loja.</p>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Logo */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Store size={28} className="text-primary" />
            )}
          </div>
          <label className="flex-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Logo da loja</span>
            <div className="mt-1.5 flex items-center gap-2 bg-primary-50 text-primary px-4 py-2.5 rounded-xl font-semibold text-sm cursor-pointer active:bg-primary/10 transition-colors w-fit">
              <Upload size={16} />
              {enviandoLogo ? 'Enviando…' : 'Escolher imagem'}
            </div>
            <input type="file" accept="image/*" onChange={trocarLogo} className="hidden" disabled={enviandoLogo} />
          </label>
        </div>

        {erro && <p className="text-sm text-danger bg-red-50 px-3 py-2 rounded-xl">{erro}</p>}

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Nome da loja *</span>
          <input
            type="text"
            value={nomeLoja}
            onChange={e => setNomeLoja(e.target.value)}
            placeholder="Ex: Iran Utilidades"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Telefone / WhatsApp</span>
          <input
            type="tel"
            inputMode="numeric"
            value={telefone}
            onChange={e => setTelefone(mascaraTelefone(e.target.value))}
            placeholder="(00) 00000-0000"
            className="mt-1.5 w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </label>

        <button
          onClick={salvar}
          disabled={salvando}
          className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-base active:bg-primary-light transition-colors shadow-sm disabled:opacity-60"
        >
          {salvando ? 'Salvando…' : modoInicial ? 'Começar a usar' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Integrar `useProfile` + porteiro + rota no `App.jsx`**

Adicionar aos imports de `src/App.jsx`:

```jsx
import PerfilLoja from './pages/PerfilLoja.jsx'
import { useProfile } from './hooks/useProfile.js'
import { perfilCompleto } from './utils/perfil.js'
```

No corpo de `App()`, após obter `usuario` do auth (ajustar a desestruturação para
incluir `usuario`):

```jsx
  const { session, usuario, carregando: carregandoAuth } = useAuth()
  const profileHook = useProfile(usuario)
```

Ajustar os gates (substituir o bloco de gates existente) para a ordem correta:

```jsx
  if (carregandoAuth) return <Splash />
  if (!session) return <Login />
  if (profileHook.carregandoProfile) return <Splash />
  if (!perfilCompleto(profileHook.profile)) {
    return (
      <PerfilLoja
        profile={profileHook.profile}
        salvarProfile={profileHook.salvarProfile}
        enviarLogo={profileHook.enviarLogo}
        mostrarToast={mostrarToast}
        modoInicial
        onConcluir={() => setPaginaAtiva('dashboard')}
      />
    )
  }
  if (clientesHook.carregandoClientes || vendasHook.carregandoVendas) {
    return <Splash />
  }
```

Adicionar `profile` e as ações ao `props` repassado às páginas:

```jsx
  const props = {
    navegar,
    mostrarToast,
    profile: profileHook.profile,
    salvarProfile: profileHook.salvarProfile,
    enviarLogo: profileHook.enviarLogo,
    ...clientesHook,
    ...vendasHook,
  }
```

Adicionar a rota da página de perfil da loja ao `<main>` (junto das outras):

```jsx
        {paginaAtiva === 'perfil-loja' && <PerfilLoja {...props} />}
```

- [ ] **Step 3: Adicionar acesso ao Perfil da Loja na navegação**

Em `src/components/BottomNav.jsx`, trocar o ícone/aba `relatorio` não — em vez
disso, adicionar entrada ao Dashboard. Mais simples: no header do Dashboard, tornar
o quadrado da logo clicável para abrir o perfil da loja.
Em `src/pages/Dashboard.jsx`, transformar o `<div>` da logo `BookOpen` em botão:

```jsx
          <button
            onClick={() => navegar('perfil-loja')}
            className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm overflow-hidden"
            aria-label="Perfil da loja"
          >
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="Logo" className="w-full h-full object-cover" />
              : <BookOpen size={20} className="text-white" strokeWidth={2} />}
          </button>
```

E adicionar `profile` à desestruturação de props do `Dashboard`:

```jsx
export default function Dashboard({ clientes, vendas, navegar, profile }) {
```

- [ ] **Step 4: Verificação manual — primeiro acesso e edição**

1. Criar um **novo** usuário de teste no Supabase (sem profile).
2. Logar com ele → cai na tela **"Bem-vindo!"** (modoInicial), não no Dashboard.
3. Tentar salvar sem nome → erro "Informe o nome da loja".
4. Escolher uma imagem de logo → preview aparece; toast "✓ Logo atualizada".
5. Preencher nome e telefone → "Começar a usar" → vai ao Dashboard; a logo aparece
   no quadrado do header.
6. Clicar na logo do header → abre "Perfil da Loja" (modo edição, com botão Voltar).
7. Recarregar a app → entra direto no Dashboard (perfil já completo).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add store profile screen, logo upload and profile gate"
```

---

### Task 11: Logo e identidade no carnê PDF

**Files:**
- Modify: `src/utils/gerarPDF.js`, e a chamada em `src/pages/PerfilCliente.jsx`

**Interfaces:**
- `gerarCarnetPDF(cliente, venda, loja)` onde `loja = { nome_loja, telefone, logo_url }`.

- [ ] **Step 1: Atualizar `gerarPDF.js` — cor forest, logo e contato**

Em `src/utils/gerarPDF.js`, substituir a assinatura e o bloco de cabeçalho/rodapé.
Trocar a linha da função:

```js
export async function gerarCarnetPDF(cliente, venda, loja = {}) {
```

Substituir o bloco "Cabeçalho" (as linhas que usam `setFillColor(30, 58, 95)` e os
dois `text` do título) por:

```js
  // Cabeçalho (forest green)
  doc.setFillColor(21, 78, 48)
  doc.rect(0, 0, 210, 28, 'F')

  // Logo da loja (se houver)
  if (loja.logo_url) {
    try {
      const resp = await fetch(loja.logo_url)
      const blob = await resp.blob()
      const dataUrl = await new Promise(res => {
        const fr = new FileReader()
        fr.onload = () => res(fr.result)
        fr.readAsDataURL(blob)
      })
      doc.addImage(dataUrl, 'PNG', margem, 4, 20, 20)
    } catch {
      // sem logo se falhar o carregamento
    }
  }

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(loja.nome_loja || 'Caderno Digital', 105, 13, { align: 'center' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('Carnê de Pagamento', 105, 21, { align: 'center' })
```

Substituir as outras duas ocorrências de `setFillColor(30, 58, 95)` (cabeçalho da
seção e cabeçalho da tabela) e a `setDrawColor(30, 58, 95)` por `21, 78, 48`.

Substituir o bloco "Rodapé" por:

```js
  // Rodapé
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  const contato = loja.telefone ? `${loja.nome_loja || 'Vendedor'} — ${loja.telefone}` : (loja.nome_loja || 'Vendedor')
  doc.text(contato, 105, 285, { align: 'center' })
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 105, 290, { align: 'center' })
```

- [ ] **Step 2: Atualizar a chamada em `PerfilCliente.jsx`**

Em `src/pages/PerfilCliente.jsx`, adicionar `profile` à desestruturação de props:

```jsx
export default function PerfilCliente({ clienteId, clientes, vendas, marcarParcelaPaga, desmarcarParcelaPaga, removerVenda, removerCliente, navegar, mostrarToast, profile }) {
```

Trocar a chamada do botão "Gerar Carnê PDF":

```jsx
                          onClick={() => gerarCarnetPDF(cliente, venda, profile || {})}
```

- [ ] **Step 3: Verificação manual — PDF com identidade**

1. Em um cliente com venda, clicar "Gerar Carnê PDF".
2. O PDF baixa; o cabeçalho está **verde** (forest), com o **nome da loja** ao centro.
3. Se a loja tem logo, ela aparece no canto esquerdo do cabeçalho.
4. O rodapé mostra "Nome da loja — telefone".

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: brand carnê PDF with store logo and contact"
```

---

## Self-Review (cobertura do spec)

- **Login email/senha, sem auto-cadastro** → Tasks 2, 3 (sem signup). ✅
- **Logout** → Task 4. ✅
- **RLS por vendedor** → Fase 0 (políticas SQL `user_id = auth.uid()`). ✅
- **clientes na nuvem** → Task 5. ✅
- **vendas com parcelas JSONB na nuvem** → Task 6. ✅
- **loading + erros via toast** → Tasks 5–7 (try/catch + toast; Splash no App). ✅
- **profiles + perfil da loja + logo (Storage)** → Tasks 8–10. ✅
- **fluxo de primeiro acesso (completar perfil)** → Task 10 (gate + modoInicial). ✅
- **logo no carnê PDF + cor forest + contato** → Task 11. ✅
- **segredos via .env / .env.example** → Task 1. ✅
- **começar do zero (sem migração)** → respeitado (nenhuma task migra localStorage). ✅

Itens fora de escopo do spec (offline, auto-cadastro, recuperação de senha) — não
incluídos, conforme combinado.
