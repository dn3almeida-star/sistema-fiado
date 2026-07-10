-- Corrige a unicidade de CPF em public.clientes: de GLOBAL para POR LOJA.
--
-- Problema (achado #4 da auditoria multi-loja): a constraint atual
-- `clientes_cpf_unique` é `unique (cpf)` — vale para a tabela inteira, não por
-- loja. Efeitos:
--   a) Duas lojas diferentes não conseguem cadastrar o mesmo cliente (mesmo
--      CPF) cada uma na sua própria carteira — falso conflito, já que lojas
--      são inquilinos (tenants) independentes.
--   b) Vira um "oráculo de existência" cross-loja: quando a loja B tenta
--      inserir um CPF que já existe em QUALQUER OUTRA loja, o erro 23505
--      (unique_violation) vaza a informação de que aquele CPF já está
--      cadastrado em algum lugar do sistema — um vazamento de dados entre
--      lojas que não deveriam saber nada uma da outra.
--
-- Correção: trocar por `unique (user_id, cpf)` — único dentro da loja
-- (user_id), permitindo o mesmo CPF em lojas diferentes. CPF nulo continua
-- permitido em múltiplos registros (Postgres trata cada NULL como distinto
-- em constraints/índices UNIQUE, com ou sem a coluna user_id na chave).
--
-- Segurança da migração (verificado em produção, read-only, antes de aplicar):
-- não existe hoje nenhum CPF compartilhado por mais de um user_id — o que é
-- esperado, já que a constraint global impede isso. Logo trocar para
-- unique(user_id, cpf) é estritamente mais permissiva: nenhuma linha existente
-- entra em conflito com a nova regra.
--
-- Compatibilidade com o código (src/hooks/useClientes.js): a checagem proativa
-- de duplicidade (`adicionarCliente`/`atualizarCliente`, via `.eq('cpf', ...)`)
-- já é implicitamente filtrada por RLS (policy `*_all_own`, `user_id =
-- auth.uid()`), então já opera por loja. O catch do erro 23505 continua
-- funcionando sem alterações — só passa a disparar quando o CPF duplicado é da
-- MESMA loja, que é o comportamento correto. Nenhum ajuste de código necessário.

-- 1) Remove a constraint (e o índice único homônimo que a implementa) global.
alter table public.clientes
  drop constraint if exists clientes_cpf_unique;

-- 2) Cria a unicidade por loja: mesmo CPF pode existir em lojas diferentes,
--    mas não duas vezes na mesma loja. NULLs seguem livres (múltiplos
--    clientes sem CPF cadastrado, na mesma loja ou não).
alter table public.clientes
  add constraint clientes_cpf_unique_por_loja unique (user_id, cpf);
