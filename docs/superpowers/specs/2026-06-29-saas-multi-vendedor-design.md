# Design — SaaS Multi-Vendedor (login, dados na nuvem, logo da loja)

**Data:** 2026-06-29
**Projeto:** Iran Utilidades / sistema-fiado
**Status:** Aprovado (design) — aguardando revisão da spec

---

## Objetivo

Transformar o app (hoje um caderno de fiado de um único usuário, com dados no
`localStorage`) em um **SaaS multi-vendedor**:

- Cada vendedor faz **login com email e senha** e vê apenas os próprios dados.
- Os dados ficam na **nuvem (Supabase)**, isolados por vendedor.
- Cada vendedor tem um **perfil de loja com logo personalizada**, que aparece no
  topo do carnê PDF.

## Decisões tomadas

| Tema | Decisão |
|---|---|
| Modelo | SaaS multi-vendedor. "Cliente" continua sendo quem compra fiado. "Logo" é a da loja do vendedor. |
| Backend | **Supabase** (Auth + Postgres + Storage). |
| Dados atuais (localStorage) | São testes — **começar do zero**, sem migração. |
| Cadastro | **Admin cria as contas** (sem auto-cadastro). Mudável depois. |
| Primeiro acesso | No 1º login, vendedor completa o perfil da loja (nome + logo) antes de entrar. |
| Offline | Fora de escopo nesta entrega (online primeiro). Fica como fase futura. |

## Arquitetura

```
┌─────────────────────────────┐
│   App React (SPA, Vite)     │
│   + Login                   │
│   + Perfil da Loja          │
│   telas atuais (quase iguais)│
└──────────────┬──────────────┘
               │  HTTPS (supabase-js)
┌──────────────▼──────────────┐
│          SUPABASE           │
│  Auth     → email + senha   │
│  Postgres → profiles,       │
│             clientes, vendas│
│  Storage  → bucket "logos"  │
│  RLS      → isolamento/usuário│
└─────────────────────────────┘
```

Segurança central: **Row Level Security (RLS)** no Postgres. Toda política exige
`user_id = auth.uid()`, então o servidor garante que um vendedor nunca lê ou
escreve dados de outro — independente do que o app cliente tente fazer.

## Modelo de dados

### `profiles` (perfil da loja, 1 linha por vendedor)
| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid (PK) | igual a `auth.users.id` |
| `nome_loja` | text | obrigatório para entrar no app |
| `telefone` | text | aparece no rodapé do carnê |
| `logo_url` | text | URL pública no Storage (pode ser null) |
| `criado_em` | timestamptz | default now() |

RLS: `id = auth.uid()` para select/insert/update.

### `clientes`
| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid (PK) | default gen_random_uuid() |
| `user_id` | uuid | dono (FK → auth.users) |
| `nome` | text | obrigatório |
| `telefone` | text | |
| `endereco` | text | |
| `bairro` | text | |
| `observacoes` | text | |
| `criado_em` | timestamptz | default now() |

RLS: `user_id = auth.uid()`.

### `vendas`
| Coluna | Tipo | Observação |
|---|---|---|
| `id` | uuid (PK) | default gen_random_uuid() |
| `user_id` | uuid | dono |
| `cliente_id` | uuid | FK → clientes (on delete cascade) |
| `itens` | text | descrição |
| `valor_total` | numeric | |
| `entrada` | numeric | |
| `parcelas` | jsonb | **lista** `[{numero, valor, vencimento, pago, pagoEm}]` |
| `criada_em` | timestamptz | default now() |

RLS: `user_id = auth.uid()`.

**Por que parcelas em JSONB:** mantém a mesma estrutura que o app já usa hoje
(`venda.parcelas` é um array). As telas iteram esse array em memória; nenhuma
consulta SQL por parcela é necessária. Isso minimiza mudanças nas telas atuais.

### Storage — bucket `logos`
- Caminho: `{user_id}/logo.<ext>`.
- Leitura pública (para renderizar em `<img>` e no PDF).
- Escrita/remoção restrita ao dono (`auth.uid()` = primeira pasta do caminho).

## Mudanças no frontend

### Arquivos novos
- `src/lib/supabase.js` — cliente Supabase, lê `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_ANON_KEY` do `.env`.
- `src/hooks/useAuth.js` — provê sessão, `login`, `logout`, estado de
  carregamento. (Sem `signup` — admin cria contas.)
- `src/pages/Login.jsx` — email + senha + "esqueci a senha" (opcional).
- `src/pages/PerfilLoja.jsx` — editar nome_loja, telefone e **upload de logo**.
  Reaproveitada como tela de "complete seu perfil" no primeiro acesso.
- `.env.example` — documenta as variáveis necessárias.

### Arquivos alterados
- `src/hooks/useClientes.js` e `src/hooks/useVendas.js` — passam a ler/gravar no
  Supabase, **mantendo a mesma interface** (`clientes`, `adicionarCliente`, …)
  para que as telas mudem o mínimo. Viram assíncronos e expõem `carregando`.
- `src/App.jsx` — porteiro de autenticação: sem sessão → `Login`; sem perfil de
  loja → `PerfilLoja` (modo "completar"); senão → app normal. Adiciona logout e
  atalho para o perfil da loja.
- `src/utils/gerarPDF.js` — desenha a logo da loja no topo e o
  telefone/contato do vendedor no rodapé.
- Telas (`Dashboard`, `Clientes`, `PerfilCliente`, `CobrancasHoje`,
  `Relatorio`, `NovaVenda`) — ajustes pequenos: tratar `carregando`, usar dados
  vindos do Supabase (mesmos nomes de campo onde possível).

### Loading e erros
- Hooks expõem `carregando`; telas mostram um indicador enquanto buscam.
- Falhas (rede, permissão) são mostradas via o sistema de **toast** já existente,
  com mensagem clara e em português.

## Fluxo de autenticação

1. App abre → `useAuth` verifica sessão.
2. Sem sessão → tela **Login** (email + senha). Admin já criou a conta no Supabase.
3. Login OK → busca `profiles`:
   - Sem linha / sem `nome_loja` → tela **Perfil da Loja** ("complete seu perfil"):
     vendedor informa nome da loja (obrigatório) e, opcional, telefone e logo.
   - Com perfil → entra no app normalmente.
4. Logout volta para Login.

## Segredos / configuração

- `.env` (não versionado) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
  A anon key é segura no cliente (a proteção real é a RLS).
- `.env.example` versionado, sem valores reais.
- Passo manual do admin (documentado): criar projeto Supabase, rodar o SQL das
  tabelas + políticas RLS, criar o bucket `logos`, e criar usuários vendedores.

## Plano de entrega (3 fases)

1. **Fase 1 — Login**
   Cliente Supabase, `useAuth`, tela de Login, porteiro de auth no `App`,
   logout. Resultado: dá pra logar/deslogar; app travado atrás do login.
   (Dados ainda podem estar vazios.)

2. **Fase 2 — Dados na nuvem**
   Tabelas `clientes`/`vendas` + RLS; reescrever `useClientes`/`useVendas` para
   o Supabase mantendo a interface; loading + erros via toast. Resultado:
   cadastro/edição de clientes e vendas persistem na nuvem, isolados por vendedor.

3. **Fase 3 — Loja + logo**
   Tabela `profiles` + bucket `logos`; tela Perfil da Loja com upload; fluxo de
   primeiro acesso; logo no carnê PDF. Resultado: cada vendedor com identidade
   própria no app e no carnê.

Cada fase é testável de forma independente.

## Fora de escopo (futuro)

- Modo offline / sincronização.
- Auto-cadastro aberto (trivial de habilitar depois).
- Recuperação de senha self-service (pode entrar na Fase 1 se desejado).
- Migração de dados do localStorage (decidido: começar do zero).

## Riscos / pontos de atenção

- **RLS mal configurada** = vazamento de dados entre vendedores. Mitigação:
  políticas explícitas por tabela e teste manual com 2 contas.
- **Dependência de internet**: sem conexão, o app não abre dados. Aceito nesta
  entrega; offline é fase futura.
- **Tamanho/recorte da logo**: validar tipo e tamanho no upload para não quebrar
  o PDF. Redimensionar/limitar no cliente antes de enviar.
