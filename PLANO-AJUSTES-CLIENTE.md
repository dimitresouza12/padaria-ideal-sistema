# Plano de Ajustes — Feedback do Cliente (Matheus / Padaria Ideal)

Origem: 5 áudios + 2 vídeos + 2 prints enviados pelo cliente em 20/07/2026.
Ambiente: produção real (`gestaopadariaideal.com.br`, Supabase `audtpilnovrzwszeubkz`),
pós-migração para Supabase Auth. Testado logado como **vendedor** (Raulino).

> Este documento é **somente o plano**. Nenhum código foi alterado.

---

## Resumo dos pontos levantados

| # | Ponto do cliente | Tipo | Prioridade |
|---|---|---|---|
| 1 | Comissão deve ser sobre **faturamento**, não sobre margem (5% do faturamento) | Regra de negócio | 🔴 Alta |
| 1b | Campo de **margem/custo NÃO obrigatório** ao cadastrar produto | UX / regra | 🟡 Média |
| 2 | Permitir **vários produtos na mesma venda** (mesmo cliente) sem sair e entrar | Feature / modelo de dados | 🟠 Alta (esforço grande) |
| 3 | **Barra de busca** no seletor de cliente (filtra enquanto digita) | UX | 🟡 Média |
| 4 | **BUG:** a partir da 2ª venda o registro falha e não salva; precisa fechar e reabrir | Bug de produção | 🔴 Crítica |

---

## Ponto 4 (CRÍTICO) — Segunda venda em diante falha ao registrar

**O que o cliente relatou (áudio a7 + vídeo v2):**
> "Só consegui registrar uma venda. Depois, ao tentar registrar outras, ficou dando esse
> errinho, não salvou o registro. Tive que sair, fechar, entrar de novo... e de novo na segunda
> deu o erro. Não é a internet, testei outro site e funcionava."

**O que aparece na tela (frame do vídeo):** a primeira venda salva (mostra "1 venda(s) · R$ 46").
Ao clicar em "Registrar Venda" de novo, aparece o toast:
> **"Não foi possível registrar a venda. Verifique sua conexão e tente novamente."** (duas vezes)

**✅ CAUSA RAIZ CONFIRMADA e CORRIGIDA em 21/07/2026:**

A tabela `vendas` tinha duas CHECK constraints (`vendas_valor_consistente` e
`vendas_margem_consistente`) exigindo igualdade **exata** entre o valor calculado em
JavaScript e o recálculo do Postgres em decimal exato:
```sql
CHECK (valor_total = preco_unitario * quantidade)
CHECK (margem = valor_total - custo_total)
```
Só que `preco_unitario * quantidade` em ponto flutuante (JS) quase sempre gera ruído de
sub-centavo — ex.: `5.2 * 3 = 15.600000000000001` em vez de `15.6`. Como as colunas são
`numeric` sem escala fixa, esse valor "sujo" é gravado **literalmente**; a constraint então
recalcula com aritmética decimal exata do Postgres (`5.2 * 3 = 15.6`, limpo) e rejeita o
INSERT por não bater. Testado com os produtos reais do cliente: ~50-70% das combinações de
preço × quantidade caem nessa armadilha (confirmado por script Node reproduzindo os cálculos).
A única venda que o cliente conseguiu gravar (qtd=10 × R$4,60 atacado = R$46,00 exato) foi
uma combinação que por coincidência **não** gera ruído — todas as outras tentativas batiam
na constraint e caíam no `catch` do formulário, mostrando a mensagem genérica "verifique sua
conexão" (mascarando a causa real).

**Correção aplicada (duas camadas):**
1. **App** (`src/services/supabase/supabaseApi.ts`): novo helper `round2()` arredonda
   `valor_total`, `custo_total` e `margem` para 2 casas decimais antes de gravar, em
   `registrarVenda` e `atualizarVenda`.
2. **Banco** (migração `relaxar_checks_consistencia_vendas_arredondamento`, aplicada em
   produção): as duas CHECK constraints agora comparam os valores **arredondados**
   (`round(valor_total,2) = round(preco_unitario*quantidade,2)`, idem para margem) — defesa
   em profundidade para qualquer outro caminho de escrita (Edge Function, SQL direto).
   Testado com INSERT real simulando os valores "sujos" que travavam antes — passou.
   Registro de teste removido em seguida.

**Achado extra corrigido junto:** `HOJE` em `supabaseApi.ts` estava **fixo em
`'2026-07-28'`** (resíduo de teste, 7 dias no futuro) em vez de calcular a data real —
toda venda gravada em produção estava com a data errada. Trocado para `new Date()`.

**Status: ✅ CORRIGIDO, TESTADO E EM PRODUÇÃO** (commit `3111e82`, push feito em 21/07/2026).
A migração do banco já estava em produção antes mesmo do deploy do código (destravava o bug
sozinha); o fix de arredondamento + `HOJE` dinâmico foram commitados e pushados.

**Regressão executada:** 1.500 combinações preço×quantidade simuladas (43,6% quebravam antes,
0% depois); 36 vendas reais gravadas em produção cobrindo os 3 produtos × 12 quantidades
problemáticas (varejo e atacado); fluxos de vencimento, dar baixa e edição cruzando limiar
testados; proteções antigas (quantidade zero/excessiva, valor forjado, preço negativo)
confirmadas intactas. Todos os dados de teste removidos por ID exato ao final.

**Arquivos alterados:** `src/services/supabase/supabaseApi.ts`; migração SQL na tabela
`vendas` (projeto `audtpilnovrzwszeubkz`).

---

## Ponto 1 — Comissão sobre faturamento (não sobre margem) ✅ CORRIGIDO E TESTADO

**Cliente (áudio a1):**
> "A comissão dos vendedores é feita em cima do faturamento, 5% em cima do faturamento, não é
> com base na margem. Precisa ajustar senão o cálculo fica errado."

**Estado atual (confirmado no código):** a comissão é `margem × taxa`. No print do cliente:
margem R$26 × 5% = **R$1,30**. O correto seria faturamento R$46 × 5% = **R$2,30**.

**Onde mudar (`margem` → `faturamento` na base da comissão):**
- `src/features/comissoes/Comissoes.tsx:16` — `const comissao = margem * u.taxa_comissao;`
- `src/features/relatorios/Relatorios.tsx:71` — `comissao: margem * v.taxa_comissao`
- `src/features/dashboard/DashboardVendedor.tsx:14` — `... + v.margem * usuario.taxa_comissao`
- `src/features/dashboard/DashboardVendedor.tsx:43` — rótulo `"...% sobre a margem das vendas"`
  → trocar para "sobre o faturamento".

**Confirmado com o cliente:** a taxa continua **configurável por vendedor** (campo
`taxa_comissao` existente, hoje 5% para todos) — só a base do cálculo muda para faturamento.

**Observação:** a coluna "Margem" pode continuar visível na tabela de Comissões como informação,
mas a coluna "Comissão" passa a derivar do faturamento.

**Testado:** simulação exata do `reduce`/`map` de `Comissoes.tsx` com dados reais do banco —
Raulino (5%, R$46 faturamento, R$26 margem) passou de R$1,30 (antigo, sobre margem) para
R$2,30 (novo, sobre faturamento), batendo com o valor manual esperado. Teste de agregação com
3 vendas sintéticas em 2 vendedores (soma de faturamento/margem/comissão conferida linha a
linha), removidas ao final. `fmtBRL`/`toLocaleString` confirmado arredondando corretamente o
ruído de float da soma (é só exibição, não grava no banco). Também atualizado o comentário em
`types/index.ts` e a regra de negócio no `CLAUDE.md`.

---

## Ponto 1b — Margem/custo não obrigatório no cadastro de produto ✅ CORRIGIDO E TESTADO

**Cliente (áudios a1 + a2):**
> "Não coloca a margem como campo obrigatório ao cadastrar um produto. Nem sempre tenho esse
> número fácil — está na ficha técnica lá no escritório. Não precisa tirar o campo, só não deixa
> obrigatório."

**Estado atual:** em `src/features/produtos/Produtos.tsx:191` o campo **Custo (R$)** é `required`
(é o custo que gera a margem). Também é `required` no schema do formulário.

**Plano:**
1. Remover `required` do campo de custo em `Produtos.tsx`; adicionar rótulo "(opcional)" e
   placeholder tipo "Preencher depois".
2. Tratar custo ausente como `null`/`0` de forma consistente no cálculo de margem
   (`valor_total - custo_total`).
3. **Confirmado com o cliente:** com custo em branco, exibir margem como **"não informada"**
   no Dashboard (em vez de assumir `custo_total = 0` e inflar a margem para 100% do
   faturamento). Isso não afeta a comissão, já que ela passa a ser sobre faturamento (Ponto 1).

**Implementado:** migração no banco (`preco_custo`, `custo_total`, `margem` agora aceitam
`NULL` — as CHECKs existentes já toleravam nulo, sem precisar tocar nelas); tipos TypeScript e
`database.types.ts` regenerado via MCP; `supabaseApi.ts`/`mockData.ts` computam
`custo_total`/`margem` como `null` quando o produto não tem custo; campo "Custo (R$)" virou
opcional em `Produtos.tsx` (placeholder "Definir depois", sem `required`). Exibição segue uma
convenção: células de tabela mostram "—" (Produtos, Histórico, Comissões — mesmo padrão já
usado para outros campos ausentes no app); KPIs agregados (Dashboard, painel de confirmação de
venda, resumo de Comissões) mostram "Não informada" por extenso. Se **qualquer** venda de um
agregado tiver custo desconhecido, o agregado inteiro vira "Não informada" em vez de tratar o
desconhecido como zero (evita inflar a margem/lucro artificialmente). Exportação XLSX
(`Relatorios.tsx`) deixa a célula em branco quando o valor é `null`.

**Testado:** produto real criado com `preco_custo=NULL` e venda com `custo_total`/`margem`
`NULL` gravados em produção sem violar nenhuma CHECK; simulação exata da lógica de agregação
do Dashboard/Comissões com mistura de vendas conhecidas/desconhecidas do mesmo vendedor —
confirmado que vira "Não informada" corretamente; confirmado que a comissão (Ponto 1) continua
calculando normalmente mesmo com margem desconhecida, já que não depende mais dela. Produto e
venda de teste removidos ao final (banco de volta a 1 venda / 3 produtos). Build e typecheck
limpos.

**Arquivos alterados:** `src/types/index.ts`, `src/services/supabase/database.types.ts`,
`src/services/supabase/supabaseApi.ts`, `src/services/mock/mockData.ts`,
`src/features/produtos/Produtos.tsx`, `src/features/dashboard/DashboardAdmin.tsx`,
`src/features/comissoes/Comissoes.tsx`, `src/features/historico/Historico.tsx`,
`src/features/vendas/RegistrarVenda.tsx`, `src/features/relatorios/Relatorios.tsx`,
`src/lib/xlsx.ts`; migração SQL na tabela `produtos`/`vendas`.

---

## Ponto 2 — Vários produtos na mesma venda (mesmo cliente)

**Cliente (áudio a3):**
> "Só consigo registrar uma venda por cliente — um tipo de produto por vez. Para vender dois
> produtos ao mesmo cliente tenho que registrar, sair e iniciar outra venda. Se tivesse um botão
> 'adicionar produto' eu colocava os dois na mesma venda sem sair e entrar de novo."

**Estado atual:** o modelo é **1 venda = 1 produto** (`vendas.produto_id`). O formulário
`RegistrarVenda.tsx` tem um único seletor de produto + quantidade.

**Confirmado com o cliente:** não se importa com o formato no Histórico ("do jeito que você
quiser"), só quer parar de sair/entrar do sistema por produto. **Opção A liberada:**

- No formulário, permitir adicionar vários itens (produto + qtd) a uma lista antes de salvar
  (botão "Adicionar produto", como o próprio cliente sugeriu).
- Ao confirmar, o app grava **N linhas em `vendas`** (uma por item), todas com o mesmo cliente/
  vendedor/data. Preço de cada item continua sendo resolvido pelo `resolverPreco`.
- Vantagem: zero mudança de schema, zero risco em Dashboard/Comissões/Histórico (continuam
  somando por linha). Resolve 100% da dor relatada ("não sair e entrar de novo").
- Itens aparecem como linhas separadas no Histórico (mesma data/cliente) — aceito pelo cliente.

**Arquivos:** `src/features/vendas/RegistrarVenda.tsx`,
`src/store/useDataStore.ts`, `src/services/supabase/supabaseApi.ts` (gravação em lote).

---

## Ponto 3 — Barra de busca no seletor de cliente

**Cliente (áudio a5 + vídeo v1):**
> "Tinha como colocar uma barra de pesquisa na hora de escolher o cliente? São muitos, dá
> trabalho ficar procurando cada um. Queria digitar e ir filtrando até chegar na pessoa."

O vídeo v1 mostra o `<select>` de cliente aberto com uma lista longa de comércios.

**Estado atual:** `RegistrarVenda.tsx:119` usa `<select>` nativo (sem busca). O seletor de
**produto** (linha 129) tem o mesmo problema e ganharia o mesmo benefício.

**Plano:**
1. Substituir o `<select>` de cliente por um **combobox com busca** (input de texto que filtra
   a lista conforme digita, com navegação por teclado e clique para selecionar).
2. Reaproveitar o mesmo componente no seletor de produto.
3. Implementar como componente reutilizável em `src/components/ui.tsx` (ex.: `<ComboBox>`),
   mantendo o estilo do design system. Sem dependência externa (ou uma leve, se preferir).
4. Garantir acessibilidade e o fix de zoom no iOS (input com `text-base` no mobile, já resolvido
   no `.field`).

**Arquivos:** novo componente em `src/components/ui.tsx`; uso em
`src/features/vendas/RegistrarVenda.tsx`.

---

## Ordem de execução sugerida

1. 🔴 **Ponto 4** (bug crítico) — sistema hoje é inutilizável além da 1ª venda. Investigar e
   corrigir primeiro.
2. 🔴 **Ponto 1** (comissão sobre faturamento) — cálculo financeiro errado, mudança pequena e
   localizada.
3. 🟡 **Ponto 1b** (margem opcional) — mudança pequena; alinhar com o Ponto 1.
4. 🟡 **Ponto 3** (busca de cliente) — UX, componente reutilizável.
5. 🟠 **Ponto 2** (multi-produto) — maior esforço; começar pela Opção A após decisão do cliente.

## Decisões confirmadas com o cliente (21/07/2026)

- **Ponto 1 — taxa de comissão:** continua **editável por vendedor** (não vira fixo global).
  Só a **base do cálculo** muda de margem para faturamento.
- **Ponto 1b — margem sem custo:** confirmado — exibir **"não informada"** no Dashboard quando
  o produto não tiver custo cadastrado, em vez de mostrar margem inflada (100%).
- **Ponto 2 — multi-produto:** cliente não se importa com o formato no Histórico ("do jeito que
  você quiser"). **Opção A liberada** (N linhas em `vendas`, um botão "Adicionar produto" no
  formulário). Só quer parar de sair/entrar do sistema por produto.

Sem decisões pendentes — plano liberado para execução.
