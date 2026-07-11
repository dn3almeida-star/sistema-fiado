# Spec — Cadastro (signup + teste grátis de 30 dias)

## Contexto
Hoje só existe login (`Login.jsx`, `signInWithPassword`); lojistas são criados
na mão no Supabase. O funil de GTM precisa de autoatendimento: visitante cria
conta sozinho e entra num teste grátis de 30 dias. Destino do botão
"Começar grátis" da futura landing page.

## Objetivos
- Tela de cadastro (nome da loja, email, senha, confirmar senha) com o mesmo
  visual do Login.
- Conta criada via `supabase.auth.signUp` com `nome_loja` nos metadados.
- Profile criado **por trigger no banco** (security definer) no insert em
  `auth.users` — funciona com confirmação de email ligada OU desligada, e não
  depende de sessão no cliente.
- Colunas novas em `profiles`: `plano text default 'teste'`,
  `teste_termina_em date` (= data local SP + 30 dias, calculada no SQL).
- Função pura `validarCadastro` (erros por campo, PT-BR) e
  `calcularFimTeste(hojeISO)` (+30 dias sem toISOString) com testes.
- Navegação login⇄cadastro por estado no `App.jsx` (padrão do projeto, sem
  react-router) + deep link `/cadastro` (pathname) + `vercel.json` com
  rewrite SPA para o link funcionar no Vercel.

## Não-objetivos
Paywall/enforcement, pagamento Pix, push, onboarding pós-cadastro (opcional
descartado por escopo). Nada de mudança no lembrete-diario/login/reset.

## Design por componente
- `src/utils/cadastro.js` — puras: `validarCadastro({nomeLoja,email,senha,confirmarSenha})
  → {valido, erros}`; `calcularFimTeste(hojeISO, dias=30) → 'YYYY-MM-DD'`
  (aritmética de calendário local, padrão `dataVencimento`).
- `supabase/migrations/20260711_cadastro_trial.sql` — colunas + função
  `criar_profile_novo_usuario()` + trigger `on_auth_user_created`
  (`on conflict (id) do nothing`; não toca linhas existentes).
- `useAuth.jsx` — `cadastrar(email, senha, nomeLoja)`; detecta email já
  cadastrado inclusive no caso silencioso do Supabase (user com
  `identities: []` quando confirmação ligada).
- `src/pages/Cadastro.jsx` — form 4 campos, erros por campo, tela de sucesso
  "confirme seu email" quando signup não devolve sessão; usa
  `calcularFimTeste` para mostrar até quando vai o teste.
- `App.jsx` — estado `telaAuth` ('login'|'cadastro'), inicial por
  `location.pathname === '/cadastro'`; `Login.jsx` ganha link "Criar conta
  grátis" via prop `aoCriarConta`.

## Critérios de aceite
Os 7 da spec do usuário (cadastro-spec.md), verificados ao final.
