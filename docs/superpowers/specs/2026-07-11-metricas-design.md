# Spec — Painel de métricas do funil (só fundador)

Item 5 do GTM (§9): instrumentar as métricas do funil pra decidir com dado, não
no chute. Nível A (interno, sobre o banco existente) — sem ferramenta externa.

## Métricas (gtm §9)
Cadastros, **Ativação** (enviou 1ª cobrança = alguma parcela com `ultimaCobrancaEm`),
Pagantes, Em teste, Indicações (e quantas viraram pagantes). A nº1 do GTM
("comentários FIADO") vive nas redes, fora do app — não medível aqui.

## Design
- **Migração `20260711_metricas.sql`:** função `metricas_funil()` **security
  definer** que agrega as contagens em json. A RLS impede um usuário de ler dados
  dos outros; a função ignora RLS mas **checa `auth.uid()` == id do fundador** e
  dá `raise exception 'nao autorizado'` pro resto. `grant execute` só a
  `authenticated`. A trava real é aqui (não no front).
- **Função pura `src/utils/metricas.js` (TDD):** `taxasFunil(bruto)` adiciona
  `taxaAtivacao`/`taxaPagantes` (% sobre cadastros; sem divisão por zero).
- **`src/utils/admin.js`:** `ID_FUNDADOR` + `ehFundador(usuario)` (não é segredo;
  só decide quem vê o menu).
- **`useMetricas.js`:** `supabase.rpc('metricas_funil')` → aplica taxasFunil.
- **`Metricas.jsx`:** cards (reusa CardResumo); destaque de alerta quando
  ativação < 40% (o sinal do §9); nota sobre as 2 contas semente e o FIADO externo.
- **App:** rota `metricas` (lazy). **PerfilLoja:** link "Métricas do funil"
  visível só pra `ehFundador`.

## Não-objetivos
Analytics de produto externo (PostHog/Plausible/GA), eventos de clique, retenção,
funil visual — nível B, futuro. Séries temporais/gráficos de evolução.

## Critérios de aceite
1. `taxasFunil` testado; suíte verde. 2. RPC responde só pro fundador (outro →
erro). 3. Link e tela aparecem só pra conta do fundador. 4. Build limpo; deploy
junto (a migração da função vai com as demais).
