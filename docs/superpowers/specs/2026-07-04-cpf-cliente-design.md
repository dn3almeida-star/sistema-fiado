# Design: Campo CPF em Clientes

**Data:** 2026-07-04
**App:** sistema-fiado (Crediário Digital / Iran Utilidades)
**Stack:** React 18 + Vite + Tailwind 3 + Framer Motion + Supabase

## Objetivo

Permitir que o lojista cadastre o CPF do cliente, com formatação automática,
validação de dígito verificador, checagem de unicidade (nenhum outro cliente
pode ter o mesmo CPF) e busca por CPF na lista de clientes.

## Comportamento decidido

- **Opcional:** só Nome continua obrigatório. CPF vazio é permitido.
- **Formatação:** máscara `000.000.000-00` aplicada enquanto o usuário digita,
  igual ao padrão já existente de `mascaraTelefone` para telefone.
- **Validação:** se preenchido, o CPF precisa ser matematicamente válido
  (dígitos verificadores corretos) e não pode ser uma sequência repetida
  (`111.111.111-11`, `000.000.000-00`, etc. — sempre inválidas mesmo com
  dígito verificador "batendo").
- **Unicidade:** escopo **global** na tabela (o app hoje não tem separação
  visível de loja/tenant no código nem no schema conhecido). Nenhum outro
  cliente pode ter o mesmo CPF.
- **Onde aparece:** formulário de novo cliente, formulário de edição
  (PerfilCliente), cabeçalho do perfil do cliente (pastilha, modo leitura),
  PDF do carnê, e busca/filtro da lista de clientes.

## Arquitetura

### 1. Banco de dados (Supabase, executado manualmente pelo usuário)

```sql
ALTER TABLE clientes ADD COLUMN cpf text;
ALTER TABLE clientes ADD CONSTRAINT clientes_cpf_unique UNIQUE (cpf);
```

Postgres permite múltiplos `NULL` em uma coluna `UNIQUE` sem conflito — vários
clientes sem CPF continuam podendo coexistir.

### 2. `src/utils/formatadores.js` (modificado)

Duas novas funções, ao lado de `mascaraTelefone`:

- `mascaraCPF(valor)`: mesma técnica de `mascaraTelefone` — extrai dígitos
  (`replace(/\D/g, '')`, `slice(0, 11)`) e insere pontuação progressivamente
  conforme o comprimento (`000`, `000.000`, `000.000.000`, `000.000.000-00`).
- `validarCPF(cpf)`: recebe o valor formatado ou só dígitos, extrai os 11
  dígitos, rejeita sequências repetidas (todos os dígitos iguais) e calcula
  os dois dígitos verificadores pelo algoritmo padrão de CPF (módulo 11).
  Retorna `boolean`. CPF vazio/undefined retorna `true` (campo opcional —
  quem decide se é obrigatório preencher é a tela, não o validador).

### 3. `src/hooks/useClientes.js` (modificado)

- `select` em `recarregar`, `insert` em `adicionarCliente` e o retorno de
  `atualizarCliente` passam a incluir `cpf`.
- **Checagem proativa de unicidade**, dentro do próprio hook (não na UI):
  - `adicionarCliente(dados)`: se `dados.cpf` (dígitos) não vazio, consulta
    `supabase.from('clientes').select('id, nome').eq('cpf', cpfDigitos)`
    antes do insert. Se achar alguém, lança erro com
    `{ tipo: 'cpf_duplicado', nome: <nome do cliente encontrado> }`.
  - `atualizarCliente(id, patch)`: mesma consulta, mas exclui o próprio
    `id` (`.neq('id', id)`) — editar um cliente sem mudar o CPF, ou
    mudando para um CPF livre, não deve disparar falso positivo.
  - Ambas ainda podem receber o erro de constraint do Postgres (código
    `23505`) como rede de segurança contra corrida; nesse caso a função
    relança um erro genérico `{ tipo: 'cpf_duplicado', nome: null }`.
- CPF é armazenado apenas como dígitos (`replace(/\D/g, '')`) no banco —
  a formatação visual é responsabilidade da UI, não do dado persistido.

### 4. `src/pages/Clientes.jsx` (modificado)

- `FORM_INICIAL` ganha `cpf: ''`.
- Novo campo no formulário "Novo Cliente", entre Telefone e Endereço:
  label "CPF", `inputMode="numeric"`, aplica `mascaraCPF` no `onChange`.
- `salvarCliente()`: se `form.cpf` preenchido e `!validarCPF(form.cpf)`,
  bloqueia com `setErro('CPF inválido')` (mesmo padrão do erro de nome
  vazio). Se `adicionarCliente` lançar erro `cpf_duplicado`, mostra
  `CPF já cadastrado para ${nome}` (ou mensagem genérica se `nome` for
  `null`, vindo da rede de segurança do banco).
- Busca (`busca` state, dentro do `useMemo` de filtragem): adiciona
  comparação por CPF. Extrai dígitos da busca
  (`busca.replace(/\D/g, '')`) e, se não vazia, compara contra os dígitos
  do CPF do cliente (`(c.cpf || '').includes(buscaDigitos)`) — em paralelo
  à busca textual já existente por nome/bairro/endereço (que continua
  usando o texto bruto da busca, sem stripar dígitos). Cliente aparece na
  lista se **qualquer um** dos critérios bater.

### 5. `src/pages/PerfilCliente.jsx` (modificado)

- Estado do formulário de edição ganha `cpf`, inicializado de
  `cliente.cpf ?? ''`.
- Campo CPF no modo de edição, mesmo padrão de máscara/validação/erro de
  duplicidade do item 4.
- Modo leitura (cabeçalho): nova pastilha (mesmo estilo das de
  telefone/endereço/bairro) mostrando `mascaraCPF(cliente.cpf)`, renderizada
  só se `cliente.cpf` existir.

### 6. `src/utils/gerarPDF.js` (modificado)

Nova linha no cabeçalho do carnê, ao lado das de Telefone/Bairro já
existentes, mostrando `CPF: ${mascaraCPF(cliente.cpf)}` — só se
`cliente.cpf` existir; caso contrário a linha não aparece (não mostra
"CPF: -").

## Casos de borda

- **CPF com todos os dígitos iguais** (`111.111.111-11` etc.): sempre
  inválido, mesmo que o cálculo de dígito verificador "aceitasse" — é uma
  sequência claramente falsa, bloqueada explicitamente.
- **Editar cliente sem tocar no CPF:** a checagem de unicidade exclui o
  próprio id (`neq('id', id)`), então salvar sem mudar o CPF nunca conflita
  consigo mesmo.
- **Dois clientes sem CPF:** permitido — `UNIQUE` do Postgres não considera
  `NULL` como valor colidente.
- **Buscar por CPF parcial** (ex: só os 3 primeiros dígitos): funciona, pois
  a comparação é `includes`, não igualdade exata.

## Fora de escopo

- Separação de unicidade por loja/tenant (não existe hoje no schema
  conhecido; se a separação multi-tenant for implementada depois, esta
  constraint precisará ser revisitada).
- Máscara/validação de outros documentos (CNPJ, RG).
- Autocompletar dados a partir do CPF (consulta a serviço externo).

## Testes

`src/utils/formatadores.test.js` (arquivo já existente, adicionar casos):

1. `mascaraCPF`: formata progressivamente conforme a quantidade de dígitos
   digitados (3, 6, 9, 11 dígitos), ignora caracteres não numéricos, corta
   em 11 dígitos.
2. `validarCPF`: aceita CPF válido conhecido; rejeita dígito verificador
   errado; rejeita sequência repetida (`000.000.000-00` a `999.999.999-99`);
   aceita vazio/undefined como válido (campo opcional).

## Critérios de sucesso

1. Cadastrar cliente com CPF válido funciona; CPF inválido bloqueia com
   mensagem clara.
2. Cadastrar/editar cliente com CPF já usado por outro cliente bloqueia,
   nomeando o cliente conflitante quando possível.
3. Dois clientes sem CPF coexistem sem erro.
4. Buscar pelo CPF (completo ou parcial, com ou sem pontuação) encontra o
   cliente na lista.
5. CPF aparece no perfil do cliente e no PDF do carnê quando preenchido, e
   simplesmente não aparece quando vazio.
6. Testes novos de `mascaraCPF`/`validarCPF` passam; build e suíte existente
   continuam verdes.
