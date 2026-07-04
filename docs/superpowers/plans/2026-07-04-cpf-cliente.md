# Campo CPF em Clientes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar campo CPF opcional ao cadastro de clientes, com máscara, validação de dígito verificador, unicidade global e busca por CPF.

**Architecture:** Funções puras (`mascaraCPF`, `validarCPF`) em `formatadores.js`, testadas isoladamente. O hook `useClientes` faz a checagem proativa de unicidade e normaliza o CPF para dígitos (ou `null`). Os formulários (`Clientes.jsx`, `PerfilCliente.jsx`) consomem as puras; o perfil e o PDF exibem quando existe.

**Tech Stack:** React 18, Vite, Tailwind 3, Supabase (Postgres), Vitest.

## Global Constraints

- CPF é **opcional**: só `nome` é obrigatório. CPF vazio é permitido.
- CPF é armazenado no banco **apenas como 11 dígitos**, sem pontuação; quando vazio, gravado como **`null`** (nunca `''`) — a constraint `UNIQUE` do Postgres ignora `null`, mas colidiria em strings vazias repetidas.
- Máscara de exibição: `000.000.000-00`. A formatação visual é responsabilidade da UI, o dado persistido é só dígitos.
- Unicidade é **global** (toda a tabela `clientes`), não por loja/tenant.
- Seguir o padrão visual e de código já existente em cada arquivo (mesmas classes Tailwind, mesmo estilo de erro via `setErro`, mesmo `inputMode="numeric"` do telefone).
- CPF com todos os 11 dígitos iguais (`111.111.111-11` etc.) é sempre inválido.
- O teste de aceitação usa o CPF válido `529.982.247-25` (dígitos `52998224725`).

---

## Pré-requisito manual (fora do código, feito pelo usuário no Supabase)

Antes de a feature funcionar em runtime, rodar no editor SQL do Supabase:

```sql
ALTER TABLE clientes ADD COLUMN cpf text;
ALTER TABLE clientes ADD CONSTRAINT clientes_cpf_unique UNIQUE (cpf);
```

O código não roda esse SQL. As tasks de código podem ser implementadas e ter seus testes unitários passando sem essa coluna existir (Task 1 é pura; Tasks 2–5 só falham em runtime real contra o banco). Registrar no ledger que o deploy depende deste passo manual.

---

## Task 1: Funções puras `mascaraCPF` e `validarCPF`

**Files:**
- Modify: `src/utils/formatadores.js` (adicionar 2 funções ao final, após `formatarCompacto`)
- Create: `src/utils/cpf.test.js`

**Interfaces:**
- Produces:
  - `mascaraCPF(valor: string) => string` — formata progressivamente, ignora não-dígitos, corta em 11 dígitos.
  - `validarCPF(cpf: string) => boolean` — `true` para vazio (opcional) ou CPF válido; `false` para comprimento ≠ 11, dígitos repetidos, ou dígito verificador errado.

- [ ] **Step 1: Escrever os testes que falham**

Criar `src/utils/cpf.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mascaraCPF, validarCPF } from './formatadores.js'

describe('mascaraCPF', () => {
  it('formata progressivamente conforme digita', () => {
    expect(mascaraCPF('123')).toBe('123')
    expect(mascaraCPF('123456')).toBe('123.456')
    expect(mascaraCPF('123456789')).toBe('123.456.789')
    expect(mascaraCPF('12345678901')).toBe('123.456.789-01')
  })
  it('ignora caracteres não numéricos', () => {
    expect(mascaraCPF('abc123def456')).toBe('123.456')
    expect(mascaraCPF('529.982.247-25')).toBe('529.982.247-25')
  })
  it('corta em 11 dígitos', () => {
    expect(mascaraCPF('123456789012345')).toBe('123.456.789-01')
  })
  it('vazio retorna vazio', () => {
    expect(mascaraCPF('')).toBe('')
    expect(mascaraCPF(null)).toBe('')
  })
})

describe('validarCPF', () => {
  it('aceita CPF válido', () => {
    expect(validarCPF('529.982.247-25')).toBe(true)
    expect(validarCPF('52998224725')).toBe(true)
  })
  it('aceita vazio (campo opcional)', () => {
    expect(validarCPF('')).toBe(true)
    expect(validarCPF(null)).toBe(true)
    expect(validarCPF(undefined)).toBe(true)
  })
  it('rejeita dígito verificador errado', () => {
    expect(validarCPF('529.982.247-24')).toBe(false)
    expect(validarCPF('529.982.247-20')).toBe(false)
  })
  it('rejeita comprimento diferente de 11 dígitos', () => {
    expect(validarCPF('123')).toBe(false)
    expect(validarCPF('5299822472')).toBe(false)
    expect(validarCPF('529982247250')).toBe(false)
  })
  it('rejeita sequência de dígitos repetidos', () => {
    expect(validarCPF('111.111.111-11')).toBe(false)
    expect(validarCPF('000.000.000-00')).toBe(false)
    expect(validarCPF('999.999.999-99')).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar os testes e confirmar que falham**

Run: `npm test -- cpf.test.js`
Expected: FAIL — `mascaraCPF`/`validarCPF` não existem (import undefined).

- [ ] **Step 3: Implementar as funções**

Adicionar ao final de `src/utils/formatadores.js` (depois de `formatarCompacto`):

```js
export function mascaraCPF(valor) {
  const d = (valor || '').replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function validarCPF(cpf) {
  const d = (cpf || '').replace(/\D/g, '')
  if (d.length === 0) return true // campo opcional
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false // todos os dígitos iguais
  let soma = 0
  for (let i = 0; i < 9; i++) soma += parseInt(d[i], 10) * (10 - i)
  let dv1 = (soma * 10) % 11
  if (dv1 === 10) dv1 = 0
  if (dv1 !== parseInt(d[9], 10)) return false
  soma = 0
  for (let i = 0; i < 10; i++) soma += parseInt(d[i], 10) * (11 - i)
  let dv2 = (soma * 10) % 11
  if (dv2 === 10) dv2 = 0
  if (dv2 !== parseInt(d[10], 10)) return false
  return true
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

Run: `npm test -- cpf.test.js`
Expected: PASS — todos os casos verdes.

- [ ] **Step 5: Rodar a suíte inteira (garantir que nada quebrou)**

Run: `npm test`
Expected: PASS — suíte anterior intacta + novos testes.

- [ ] **Step 6: Commit**

```bash
git add src/utils/formatadores.js src/utils/cpf.test.js
git commit -m "feat(clientes): mascaraCPF e validarCPF — funções puras testadas"
```

---

## Task 2: Persistência e unicidade no hook `useClientes`

**Files:**
- Modify: `src/hooks/useClientes.js`

**Interfaces:**
- Consumes: nada de Task 1 (o hook trabalha com dígitos crus; a máscara/validação são da UI).
- Produces:
  - `adicionarCliente(dados)` — agora normaliza `dados.cpf` para dígitos-ou-`null`, faz checagem proativa de unicidade e persiste `cpf`. Lança `Error` com `.tipo === 'cpf_duplicado'` e `.nome` (nome do cliente conflitante, ou `null` se veio da constraint do banco) em caso de CPF repetido.
  - `atualizarCliente(id, patch)` — se `patch.cpf` presente, normaliza para dígitos-ou-`null` e checa unicidade excluindo o próprio `id`; mesma semântica de erro.

Não há infraestrutura de teste para hooks neste projeto (nenhum hook tem `.test.js`); a verificação desta task é `npm run build` verde + review de código. O comportamento de runtime é validado manualmente após o SQL do Supabase.

- [ ] **Step 1: Incluir `cpf` no `select` de `recarregar`**

Em `src/hooks/useClientes.js`, trocar a linha 16:

```js
      .select('id, nome, telefone, endereco, bairro, observacoes')
```

por:

```js
      .select('id, nome, telefone, endereco, bairro, observacoes, cpf')
```

- [ ] **Step 2: Reescrever `adicionarCliente` com normalização + checagem de unicidade**

Substituir a função `adicionarCliente` inteira (linhas 27–44) por:

```js
  async function adicionarCliente(dados) {
    const cpfDigitos = (dados.cpf || '').replace(/\D/g, '')
    if (cpfDigitos) {
      const { data: existentes } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('cpf', cpfDigitos)
        .limit(1)
      if (existentes && existentes.length > 0) {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = existentes[0].nome
        throw err
      }
    }
    const { data, error } = await supabase
      .from('clientes')
      .insert({
        nome: dados.nome,
        telefone: dados.telefone ?? '',
        endereco: dados.endereco ?? '',
        bairro: dados.bairro ?? '',
        observacoes: dados.observacoes ?? '',
        cpf: cpfDigitos || null,
      })
      .select('id, nome, telefone, endereco, bairro, observacoes, cpf')
      .single()
    if (error) {
      if (error.code === '23505') {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = null
        throw err
      }
      throw error
    }
    setClientes(prev =>
      [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome))
    )
    return data.id
  }
```

- [ ] **Step 3: Reescrever `atualizarCliente` com normalização + checagem de unicidade**

Substituir a função `atualizarCliente` inteira (linhas 46–50) por:

```js
  async function atualizarCliente(id, patch) {
    const patchFinal = { ...patch }
    if ('cpf' in patchFinal) {
      const cpfDigitos = (patchFinal.cpf || '').replace(/\D/g, '')
      patchFinal.cpf = cpfDigitos || null
      if (cpfDigitos) {
        const { data: existentes } = await supabase
          .from('clientes')
          .select('id, nome')
          .eq('cpf', cpfDigitos)
          .neq('id', id)
          .limit(1)
        if (existentes && existentes.length > 0) {
          const err = new Error('cpf_duplicado')
          err.tipo = 'cpf_duplicado'
          err.nome = existentes[0].nome
          throw err
        }
      }
    }
    const { error } = await supabase.from('clientes').update(patchFinal).eq('id', id)
    if (error) {
      if (error.code === '23505') {
        const err = new Error('cpf_duplicado')
        err.tipo = 'cpf_duplicado'
        err.nome = null
        throw err
      }
      throw error
    }
    setClientes(prev => prev.map(c => (c.id === id ? { ...c, ...patchFinal } : c)))
  }
```

- [ ] **Step 4: Verificar o build**

Run: `npm run build`
Expected: PASS — sem erros de compilação.

- [ ] **Step 5: Rodar a suíte (garantir que nada quebrou)**

Run: `npm test`
Expected: PASS — nada regrediu.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useClientes.js
git commit -m "feat(clientes): useClientes persiste cpf e checa unicidade global"
```

---

## Task 3: Campo, validação, erro de duplicidade e busca em `Clientes.jsx`

**Files:**
- Modify: `src/pages/Clientes.jsx`

**Interfaces:**
- Consumes: `mascaraCPF`, `validarCPF` de `src/utils/formatadores.js` (Task 1); `adicionarCliente` que lança `err.tipo === 'cpf_duplicado'` (Task 2).

Verificação: `npm run build` verde + `npm test` verde. Comportamento visual validado manualmente.

- [ ] **Step 1: Importar `mascaraCPF` e `validarCPF`**

Trocar a linha 4:

```js
import { mascaraTelefone, hoje } from '../utils/formatadores.js'
```

por:

```js
import { mascaraTelefone, mascaraCPF, validarCPF, hoje } from '../utils/formatadores.js'
```

- [ ] **Step 2: Adicionar `cpf` ao `FORM_INICIAL`**

Trocar a linha 10:

```js
const FORM_INICIAL = { nome: '', telefone: '', endereco: '', bairro: '', observacoes: '' }
```

por:

```js
const FORM_INICIAL = { nome: '', telefone: '', cpf: '', endereco: '', bairro: '', observacoes: '' }
```

- [ ] **Step 3: Validar CPF e tratar duplicidade em `salvarCliente`**

Substituir a função `salvarCliente` inteira (linhas 46–60) por:

```js
  async function salvarCliente() {
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório')
      return
    }
    if (form.cpf.trim() && !validarCPF(form.cpf)) {
      setErro('CPF inválido')
      return
    }
    try {
      await adicionarCliente({ ...form, nome: form.nome.trim() })
      setForm(FORM_INICIAL)
      setMostrarForm(false)
      setErro('')
      mostrarToast('✓ Cliente salvo')
    } catch (e) {
      if (e && e.tipo === 'cpf_duplicado') {
        setErro(e.nome ? `CPF já cadastrado para ${e.nome}` : 'Este CPF já está cadastrado')
      } else {
        mostrarToast('Erro ao salvar cliente. Tente de novo.', 'error')
      }
    }
  }
```

- [ ] **Step 4: Adicionar CPF à busca**

No `useMemo` de filtragem, dentro do `.filter` de busca (linhas 33–40), o código atual é:

```js
      .filter(x => {
        const c = x.cliente
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.bairro || '').toLowerCase().includes(q) ||
          (c.endereco || '').toLowerCase().includes(q)
        )
      })
```

Logo antes desse `.filter`, o `q` é definido na linha 21 (`const q = busca.toLowerCase()`). Adicionar, imediatamente após a linha 21, a extração de dígitos da busca:

```js
    const qDigits = busca.replace(/\D/g, '')
```

E trocar o `.filter` acima por:

```js
      .filter(x => {
        const c = x.cliente
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.bairro || '').toLowerCase().includes(q) ||
          (c.endereco || '').toLowerCase().includes(q) ||
          (qDigits !== '' && (c.cpf || '').includes(qDigits))
        )
      })
```

Nota: `qDigits !== ''` evita que uma busca textual (sem dígitos) faça o critério de CPF casar com todo mundo via `includes('')`.

- [ ] **Step 5: Adicionar o campo CPF ao formulário (entre Telefone e Endereço)**

No JSX do formulário, o campo Telefone termina na linha 125 (`</label>`) e o campo Endereço começa na linha 127. Inserir entre eles um novo `<label>`:

```jsx
            <label className="block">
              <span className="text-[11px] font-mono font-medium text-ink-muted uppercase tracking-wide">CPF</span>
              <input
                type="text"
                inputMode="numeric"
                value={form.cpf}
                onChange={e => setForm(f => ({ ...f, cpf: mascaraCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                className="mt-1.5 w-full px-4 py-3 border border-border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </label>
```

- [ ] **Step 6: Verificar o build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/Clientes.jsx
git commit -m "feat(clientes): campo CPF no cadastro, validação, erro de duplicidade e busca por CPF"
```

---

## Task 4: Campo de edição e pastilha de leitura em `PerfilCliente.jsx`

**Files:**
- Modify: `src/pages/PerfilCliente.jsx`

**Interfaces:**
- Consumes: `mascaraCPF`, `validarCPF` de `formatadores.js` (Task 1); `atualizarCliente` que lança `err.tipo === 'cpf_duplicado'` (Task 2).

Verificação: `npm run build` verde + `npm test` verde. Visual validado manualmente.

- [ ] **Step 1: Importar `mascaraCPF` e `validarCPF`**

Trocar a linha 8:

```js
import { formatarMoeda, formatarData, statusParcela, formatarTelefone, mascaraTelefone } from '../utils/formatadores.js'
```

por:

```js
import { formatarMoeda, formatarData, statusParcela, formatarTelefone, mascaraTelefone, mascaraCPF, validarCPF } from '../utils/formatadores.js'
```

- [ ] **Step 2: Incluir `cpf` no estado de edição em `abrirEdicao`**

Na função `abrirEdicao` (linhas 25–34), o `setForm({...})` recebe os campos. Adicionar `cpf` (após `telefone`):

```js
  function abrirEdicao() {
    setForm({
      nome: cliente.nome,
      telefone: mascaraTelefone(cliente.telefone ?? ''),
      cpf: mascaraCPF(cliente.cpf ?? ''),
      endereco: cliente.endereco ?? '',
      bairro: cliente.bairro ?? '',
      observacoes: cliente.observacoes ?? '',
    })
    setEditando(true)
  }
```

- [ ] **Step 3: Validar e persistir CPF em `salvarEdicao`**

Substituir a função `salvarEdicao` inteira (linhas 41–60) por:

```js
  async function salvarEdicao() {
    if (!form.nome.trim()) return
    if (form.cpf.trim() && !validarCPF(form.cpf)) {
      mostrarToast('CPF inválido', 'error')
      return
    }
    setSalvando(true)
    try {
      await atualizarCliente(clienteId, {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        cpf: form.cpf.trim(),
        endereco: form.endereco.trim(),
        bairro: form.bairro.trim(),
        observacoes: form.observacoes.trim(),
      })
      setEditando(false)
      setForm(null)
      mostrarToast('✓ Cliente atualizado')
    } catch (e) {
      if (e && e.tipo === 'cpf_duplicado') {
        mostrarToast(e.nome ? `CPF já cadastrado para ${e.nome}` : 'Este CPF já está cadastrado', 'error')
      } else {
        mostrarToast('Erro ao salvar alterações.', 'error')
      }
    } finally {
      setSalvando(false)
    }
  }
```

- [ ] **Step 4: Adicionar o campo CPF ao formulário de edição (entre Telefone e Endereço)**

No bloco `editando ?` do JSX, o input de telefone termina na linha 162 (`/>`) e o input de endereço começa na linha 163. Inserir entre eles:

```jsx
            <input
              type="text"
              inputMode="numeric"
              value={form.cpf}
              onChange={e => setForm(f => ({ ...f, cpf: mascaraCPF(e.target.value) }))}
              placeholder="CPF (000.000.000-00)"
              className="w-full bg-white/15 text-white placeholder-white/50 px-4 py-3 rounded-xl text-base outline-none focus:bg-white/25 transition-colors"
            />
```

- [ ] **Step 5: Adicionar a pastilha de CPF no modo leitura**

No bloco de leitura, dentro do `<div className="mt-4 flex flex-wrap gap-2">`, a pastilha de bairro termina na linha 219 (`)}`). A condição que envolve o `<div>` (linha 197) é `{(cliente.telefone || cliente.endereco) && (`. Trocar essa condição (linha 197) para incluir CPF:

```jsx
            {(cliente.telefone || cliente.endereco || cliente.cpf) && (
```

E, logo após a pastilha de bairro (depois da linha 219, ainda dentro do `<div>` de pastilhas), adicionar a pastilha de CPF:

```jsx
                {cliente.cpf && (
                  <span className="flex items-center gap-1.5 bg-white/10 text-white/80 px-3 py-2 rounded-xl text-sm">
                    <FileText size={14} />
                    {mascaraCPF(cliente.cpf)}
                  </span>
                )}
```

Nota: `FileText` já está importado na linha 2 (usado em outros pontos do arquivo), não precisa novo import.

- [ ] **Step 6: Verificar o build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 7: Rodar a suíte**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/pages/PerfilCliente.jsx
git commit -m "feat(clientes): CPF na edição e no cabeçalho do perfil do cliente"
```

---

## Task 5: CPF no PDF do carnê

**Files:**
- Modify: `src/utils/gerarPDF.js`

**Interfaces:**
- Consumes: `mascaraCPF` de `formatadores.js` (Task 1).

Verificação: `npm run build` verde + `npm test` verde. O PDF em si é validado manualmente.

- [ ] **Step 1: Importar `mascaraCPF` em `gerarPDF.js`**

A linha 1 já importa de `./formatadores.js`. Trocar:

```js
import { formatarData, formatarMoeda } from './formatadores.js'
```

por:

```js
import { formatarData, formatarMoeda, mascaraCPF } from './formatadores.js'
```

- [ ] **Step 2: Adicionar a linha de CPF no cabeçalho do cliente**

No trecho de dados do cliente (linhas 53–55):

```js
  doc.text(`Cliente: ${cliente.nome}`, margem, 44)
  doc.text(`Telefone: ${cliente.telefone || '-'}`, margem, 50)
  doc.text(`Bairro: ${cliente.bairro || '-'}`, 110, 44)
```

Adicionar, logo após a linha do Bairro, a linha de CPF (só quando existir), na coluna direita, abaixo do Bairro:

```js
  if (cliente.cpf) {
    doc.text(`CPF: ${mascaraCPF(cliente.cpf)}`, 110, 50)
  }
```

- [ ] **Step 3: Verificar o build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Rodar a suíte**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/gerarPDF.js
git commit -m "feat(clientes): incluir CPF no cabeçalho do PDF do carnê"
```

---

## Notas de execução

- **O SQL do Supabase (pré-requisito) é manual.** Nenhuma task de código o executa. Depois de todas as tasks, lembrar o usuário de rodar os dois `ALTER TABLE` antes do deploy, senão salvar cliente quebra em runtime.
- **Ordem obrigatória:** Task 1 antes de todas (as outras importam `mascaraCPF`/`validarCPF`). Task 2 antes de 3 e 4 (elas dependem do erro `cpf_duplicado`). Task 5 depende só de Task 1.
- **Higiene de git:** commitar apenas os arquivos listados em cada task. Nunca `git add .` — há arquivos soltos no repo que não fazem parte desta feature.
