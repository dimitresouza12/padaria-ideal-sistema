# Plano de Ajustes — Rodada 2 (pedidos do cliente, 31/07/2026)

Origem: 3 áudios de WhatsApp (31/07, 09:32 · 09:43 · 09:46) + 1 mensagem de texto.
Transcrições completas no Anexo A. Data desta análise: 04/08/2026.

São **5 demandas**: 1 bug crítico (relatado por texto) e 4 pedidos de funcionalidade
(relatados por áudio).

| # | Demanda | Tipo | Prioridade | Status |
|---|---|---|---|---|
| 1 | Sistema não virou o mês (Julho → Agosto) | 🔴 Bug | Crítica | ✅ Entregue 04/08 |
| 2 | Apagar cliente (comércio) | Funcionalidade | Alta | ✅ Entregue 04/08 |
| 3 | Atualizar/ampliar lista de bairros | Funcionalidade | Alta | ✅ Entregue 04/08 |
| 4 | Carteira de clientes por vendedor | Funcionalidade | Média | ✅ Entregue 04/08 |
| 5 | Módulo de Perdas/Trocas | Funcionalidade | Média | ✅ Entregue 04/08 |

**Status (04/08/2026):** os 5 itens do plano estão entregues e verificados ao vivo (ver
"Execução"/"Anexo B" em cada seção). Nenhuma pendência restante desta rodada.

**Achado durante a execução do item 3:** 8 comércios reais e ativos no banco usavam
`regiao = 'Padre Assis Monteiro'` — o bairro removido da lista por instrução direta do Dimitre
(trocado por "Várzea"). Confirmado com ele que era o mesmo lugar com nome popular diferente;
os 8 registros foram renomeados no banco para "Várzea" (`UPDATE comercios SET regiao = 'Várzea'
WHERE regiao = 'Padre Assis Monteiro'`), mantendo consistência com a nova lista do dropdown.

---

## 1. 🔴 BUG CRÍTICO — o sistema não vira o mês

> "Vi aqui que o Site não virou o mês de Julho para agosto. Registrei novas vendas e ficou
> acumulando com os números de Julho"

### Diagnóstico (causa raiz confirmada no código)

O cliente está certo, e o problema é maior do que parece: **não existe nenhum filtro de
período nos cálculos**. As telas não estão "presas em julho" — elas somam **todas as vendas
já registradas, desde sempre**. Só parecia certo porque, até agora, todo o histórico do
sistema era julho.

Três defeitos independentes se somam:

**(a) Agregações sem filtro de data.** Todos os totais varrem o array `vendas` inteiro:

| Arquivo | Linha | O que está errado |
|---|---|---|
| `src/features/dashboard/DashboardAdmin.tsx` | 14 | `faturamento` soma todas as vendas |
| `src/features/dashboard/DashboardAdmin.tsx` | 18-22 | margem, custo e ticket médio, idem |
| `src/features/dashboard/DashboardAdmin.tsx` | 41-50 | ranking de vendedores, idem |
| `src/features/dashboard/DashboardAdmin.tsx` | 52-59 | faturamento por bairro, idem |
| `src/features/dashboard/DashboardVendedor.tsx` | 11-18 | "Vendas do mês" e comissão do vendedor, idem |
| `src/features/comissoes/Comissoes.tsx` | 13-14 | comissão a pagar por vendedor, idem |

⚠️ **Consequência financeira:** a aba **Comissões** está somando comissão sobre o
faturamento acumulado de todos os meses. Se ele pagar comissão em agosto pelo que a tela
mostra, **paga julho de novo**. É o efeito mais grave do bug.

A única coisa que já filtra corretamente é o KPI "% vs Meta"
(`DashboardAdmin.tsx:30-34`), que compara dentro da janela de datas da meta principal.

**(b) "Julho 2026" escrito à mão em 5 lugares.** Mesmo que os cálculos fossem corrigidos, os
rótulos continuariam mentindo:

- `DashboardAdmin.tsx:71` — `{ rotulo: 'Jul', total: m.faturamento, atual: true }`
- `DashboardAdmin.tsx:91` — "Indicadores do período — Julho 2026"
- `DashboardAdmin.tsx:151` — "Julho é o período corrente"
- `DashboardVendedor.tsx:34` — "Desempenho individual — Julho de 2026"
- `Comissoes.tsx:33` — "Resumo do período — Julho 2026"

**(c) O gráfico "Evolução mensal" é dado fixo de demonstração.** `obterHistorico()`
(`supabaseApi.ts:615-623`) lê a tabela `historico_mensal`, que foi **populada uma vez no seed
e nunca mais é atualizada** — não é derivada das vendas reais. Ou seja: os meses anteriores
do gráfico são números fictícios, e "vs. mês anterior" (`DashboardAdmin.tsx:23-24`) compara
contra um valor inventado.

### Correção proposta

**Passo 1 — criar um seletor de período global.**
Novo estado em `useUiStore` (`periodo: { inicio, fim }`), padrão = **mês corrente**,
calculado a partir de `new Date()` (reaproveitando `rangeParaPeriodicidade('mensal', hoje)`
que já existe em `src/lib/periodo.ts:27-31`). Um seletor de mês no `Header`, visível para
admin e vendedor, permitindo voltar a julho para conferência/fechamento.

**Passo 2 — filtrar todas as agregações.**
Helper único em `src/lib/periodo.ts`:

```ts
export const noPeriodo = (v: Venda, p: { inicio: string; fim: string }) =>
  v.data_venda >= p.inicio && v.data_venda <= p.fim;
```

Aplicar nos 3 arquivos da tabela acima, sempre no topo do `useMemo`
(`const vendasDoPeriodo = vendas.filter(v => noPeriodo(v, periodo))`), para que ranking,
bairros, ticket e comissão herdem o recorte automaticamente.

**Passo 3 — rótulos derivados da data**, não escritos à mão:
`new Date(periodo.inicio).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })`.

**Passo 4 — histórico real.**
Substituir a leitura de `historico_mensal` por uma agregação sobre `vendas` (últimos 6–12
meses, agrupados por `to_char(data_venda,'YYYY-MM')`). Duas opções:

- **Simples:** agregar no cliente a partir das vendas já carregadas no store — zero mudança
  de banco, funciona bem no volume atual.
- **Robusta:** uma view/RPC `historico_faturamento_mensal` no Postgres — melhor se o volume
  crescer.

Recomendo a **simples** agora, e deixar registrado que vira RPC quando o volume pedir.
A tabela `historico_mensal` fica como artefato legado (não remover na mesma entrega).

### Ponto de atenção — vendas a prazo

Vendas pendentes/vencidas hoje entram no faturamento no **mês da venda**, não no mês do
recebimento. Isso é regime de competência e está correto, mas **vale confirmar com o
cliente** se a comissão dele é paga na venda ou no recebimento — muda quando a comissão
entra no fechamento. Ver "Perguntas ao cliente" no fim.

### Como verificar

1. Registrar uma venda com data de agosto e outra de julho.
2. Dashboard em agosto deve mostrar **só** a de agosto; trocar o seletor para julho mostra
   só a de julho.
3. Comissões: conferir manualmente `faturamento do mês × taxa` para um vendedor.
4. Gráfico: julho deve aparecer com o valor **real**, e agosto como ponto atual.

---

## 2. Apagar cliente (comércio)

> "eu queria que tivesse a opção de apagar cliente, pra quando algum comece a desligar da
> gente, a gente poder excluir ele e não ficar enchendo de coisas [des]necessárias na hora
> de registrar"

### Diagnóstico

Não existe nenhuma forma de remover um comércio: `supabaseApi.ts` tem
`criarComercio`/`atualizarComercio`/`listarComercios`, mas **não tem `removerComercio`**
(compare com `removerProduto`, `supabaseApi.ts:280-291`). A tela `Comercios.tsx` só oferece
o botão de editar.

**Exclusão física não é opção:** a FK `vendas_comercio_id_fkey` é `ON DELETE NO ACTION`
(verificado no QA anterior, item 1.3.1). Apagar um comércio com vendas atreladas destruiria
o histórico — e o Postgres bloqueia, corretamente.

### Correção proposta — exclusão lógica (mesmo padrão dos produtos)

1. **`supabaseApi.removerComercio(id)`** → `update({ ativo: false })`, espelhando
   `removerProduto`. A RLS já exige `is_admin()` para escrita em `comercios`, então só o
   gestor consegue.
2. **`useDataStore.removerComercio`** — nova ação, mesmo formato de `removerProduto`.
3. **`Comercios.tsx`** — botão de remover com modal de confirmação (nome do comércio no
   texto), e a lista passando a mostrar só `ativo`, com um filtro "Mostrar inativos" que
   permite **reativar** — importante, porque "desligar da gente" às vezes volta atrás.

⚠️ **Detalhe que não pode passar batido:** hoje `RegistrarVenda.tsx:38` filtra produtos por
`ativo`, mas **os comércios não são filtrados** — o `select` de cliente monta a lista crua.
Sem corrigir isso, o comércio "apagado" continuaria aparecendo no formulário de venda, que é
exatamente a dor que ele descreveu. `Historico.tsx:205` já trata o caso certo (mostra
inativos só se for o comércio daquela venda) e serve de modelo.

### Como verificar

Apagar um comércio → some da lista de Comércios e do seletor de Registrar Venda; as vendas
antigas dele continuam no Histórico com o nome correto; reativar traz de volta.

**Execução (04/08/2026):** implementado exatamente como proposto — `removerComercio`/
`reativarComercio` em `supabaseApi.ts` e `mockData.ts`, ação espelhada em `useDataStore.ts`,
botão "Remover" + `ConfirmModal` + toggle "Mostrar inativos (N)" com "Reativar" em
`Comercios.tsx`. O ponto de atenção do plano (comércio inativo vazando pro formulário de
venda) foi corrigido em `RegistrarVenda.tsx`. Testado ao vivo (mock local): remover esconde
da lista e do seletor de venda; toast de confirmação aparece; "Mostrar inativos" revela o
removido com badge "Inativo" e botão "Reativar"; histórico de vendas antigas com o comércio
removido continua exibindo o nome corretamente.

---

## 3. Atualizar a lista de bairros

> "eu queria também que você colocasse mais bairros, porque acho que tá meio desatualizada
> aquela lista, não tem [Vásia?], não tem Campo de Aviação, não tem [Aço/Açude Velho?]. Aí
> tenta dar uma atualizada naqueles bairros que tu botou"

### Diagnóstico

A lista de bairros é um array **fixo no código**: `Comercios.tsx:10-36`, 25 bairros e
distritos de Morada Nova (CE). Qualquer bairro novo hoje exige alteração de código + deploy —
por isso ela "envelhece".

⚠️ **Dois dos três nomes citados não deram para transcrever com confiança** (áudio de
WhatsApp, nomes locais): "Vásia" e "Aço de Velho" podem ser Vazantes, Várzea, Açude
Velho… "Campo de Aviação" veio claro, e provavelmente é o nome popular da área hoje
cadastrada como "Planalto Aeroporto (Girão Maia)" — pode ser que ele queira o nome popular,
não um bairro a mais. **Não vou adivinhar nome de bairro** — ver "Perguntas ao cliente".

### Correção proposta — duas camadas

**Camada 1 (imediata, resolve o pedido):** acrescentar os bairros que ele confirmar ao array
de `Comercios.tsx`. É 1 linha por bairro.

**Camada 2 (estrutural, evita a próxima ligação):** tirar a lista do código. Duas opções:

- **A — Campo com autocomplete livre:** trocar o `<select>` por `<input list=…>`
  (`<datalist>` alimentado pelos bairros já usados nos comércios cadastrados). Ele digita
  qualquer bairro novo na hora; os já usados aparecem como sugestão. **Zero mudança de
  banco, ~20 linhas.** ⭐ **Recomendo esta.**
- **B — Tabela `bairros` gerenciável:** aba de cadastro de bairros nas Configurações. Mais
  "certo" e garante grafia padronizada, mas é uma tela nova + migração + RLS para um
  problema que a opção A já resolve.

A opção A tem um risco pequeno: erro de digitação cria bairro duplicado ("Girilandia" vs
"Girilândia") e polui o ranking do Dashboard. Mitigação: normalizar (trim + capitalização)
e casar sugestões ignorando acento/caixa.

---

## 4. Carteira de clientes por vendedor + roteiro do dia

> "cada vendedor tem uma rota fixa, ele tem sua cartela de clientes. Então os meus clientes
> não compram da Tati, eles compram a mim. (…) eu queria que tivesse a opção de registrar que
> esse comerciante pertence ao vendedor X. E quando eu entrar, [conseguir] ver os
> comerciantes que eu tenho que passar do dia (…) me deu um branco na cabeça, eu não lembro
> onde é que eu tenho que passar mais. E no aplicativozinho que eu tinha antes, eu conseguia
> ver exatamente quais eram os comerciantes que eu precisava passar durante o dia (…) [pra
> saber] se eu estou pulando algum"

### Diagnóstico

Hoje `comercios` não tem nenhum vínculo com vendedor (colunas: `id`, `razao_social`, `cnpj`,
`telefone`, `regiao`, `ativo`). Todo vendedor vê todos os clientes no formulário de venda.

### Resposta do cliente (04/08/2026) — escopo menor do que parecia

No áudio original ele descreveu isso como "definir a rota de cada entregador", o que soava
como agendamento de visitas por dia da semana. Perguntei se cada cliente tem dia fixo e se ele
queria marcar "passei e não vendi" — a resposta fechou o escopo:

> "Sobre as rotas, seria mais pra facilitar a ver quem tá vendendo (…) mas quem vai decidir os
> clientes que vão ir no dia é o próprio vendedor (…) isso aí você não precisa fazer não. Eu
> quero apenas que cada cliente tenha o seu vendedor, que é pra facilitar na hora de fazer a
> rota." — e, no áudio seguinte: "se eu decido passar no vendedor A e não no B, aí é escolha
> minha. Mas pelo menos eu sei que eu tenho que passar no A e no B."

Ou seja: **ele não quer que o sistema decida ou agende a rota** — só quer saber, de forma
simples, quais clientes existem e são "dele" para não esquecer nenhum. A decisão de quem
visitar em cada dia continua manual, na cabeça do vendedor. Isso elimina toda a complexidade
de dia-da-semana/agenda que eu tinha esboçado como "Fase B" — não é necessária.

### Correção proposta

1. Migração: `alter table comercios add column vendedor_id text references usuarios(id)`
   (nullable — cliente sem dono é válido e aparece para todos).
2. `Comercios.tsx`: campo "Vendedor responsável" no modal + coluna na tabela + filtro
   "Meus clientes / Todos".
3. `RegistrarVenda.tsx`: para vendedor, o seletor de cliente passa a listar **os dele
   primeiro** — mas sem bloquear os outros, porque ele mesmo disse *"dificilmente,
   raramente"* vende para cliente da Tati. Raramente ≠ nunca; bloquear criaria um beco sem
   saída no meio de uma venda.
4. `DashboardVendedor.tsx`: card "Meus clientes" listando a carteira dele, com destaque para
   quem ainda **não comprou este mês** — é exatamente o "branco na cabeça, será que estou
   pulando algum?" que ele descreveu, sem precisar de agenda nenhuma.

### Ponto de atenção — RLS

A policy de `comercios` hoje libera leitura para qualquer usuário autenticado. Se em algum
momento ele quiser que um vendedor **não veja** a carteira do outro, isso vira mudança de
policy, não só de UI. Pelo que ele descreveu, não é o pedido — ele quer organização, não
sigilo. Registrado para não confundir depois.

### Execução (04/08/2026)

Migração `add_vendedor_id_to_comercios` aplicada (`comercios.vendedor_id text references
usuarios(id)`, nullable). Tipos do Supabase regenerados em `database.types.ts`. Implementado
exatamente como no plano — sem a Fase B (já descartada pela resposta do cliente):
`Comercios.tsx` ganhou o campo "Vendedor responsável" no modal (com nota explicando que é só
organização, não trava vendas cruzadas) e um filtro "Todos os vendedores / Sem vendedor /
<nome>" na listagem; `RegistrarVenda.tsx` ordena o seletor de cliente com a carteira do
vendedor logado primeiro; `DashboardVendedor.tsx` ganhou o card "Meus clientes", ordenado com
quem ainda não comprou no mês selecionado no topo. Testado ao vivo (mock local): atribuir
vendedor a um comércio reflete na tabela e no filtro na hora; card "Meus clientes" mostra
corretamente "Ainda não comprou" (mês corrente, sem vendas) e "Comprou este mês" (mês
anterior, com vendas históricas); seletor de cliente em Registrar Venda lista a carteira da
Ana primeiro, sem esconder os demais. `get_advisors` (security) reexecutado após a migração —
mesmos alertas da linha de base, nenhum novo.

---

## 5. Módulo de Perdas / Trocas

> "a gente trabalha com troca (…) quando o produto vence, a gente substitui por um novo. E
> isso gera um custo pra padaria. Eu queria que você adicionasse um módulozinho de perdas —
> perdas, ou você pode chamar de trocas (…) A gente registraria como se fosse uma venda mesmo,
> só que sem ser uma venda (…) o layout da venda. (…) a gente seleciona o comércio e registra
> quantas perdas tiveram por visita. Visitei um comércio, tem perda tanto. Eu registro, e
> registro o comércio. E a data, obviamente. Aí no final do mês eu conseguiria ver quais os
> comércios que perderam mais, quanto que a gente perdeu em reais, e em pacote de produto,
> qual produto perdeu mais (…) também pra controlar os gastos, porque eu só vejo o
> faturamento, preciso ver também o desperdício"

### O que ele está pedindo, destrinchado

1. Registrar perdas com **o mesmo layout de Registrar Venda** (ele foi explícito) — inclusive
   o carrinho de vários itens, que já existe em `RegistrarVenda.tsx:13-57`.
2. Campos: **comércio, produto, quantidade, data**. Registro por visita.
3. Relatório mensal com 4 recortes: **ranking de comércios** que mais perderam · **total em
   R$** · **total em pacotes/unidades** · **produto que mais perdeu**.
4. Objetivo declarado: enxergar **desperdício**, não só faturamento.

### Resposta do cliente (04/08/2026) — as duas valorações, não uma só

> "Sobre as perdas, pode colocar das duas maneiras. Coloca a perda do custo, no valor de
> custo, você pode colocar a perda também no valor de faturamento. Você pode colocar das duas
> formas, que é importante. E também o número de pacotes, quero que você coloque isso também."

Ele não escolheu uma das duas opções que propus — quer **as três métricas ao mesmo tempo**:
perda em custo (R$), perda em faturamento perdido (R$) e quantidade de pacotes. Isso muda o
desenho da tabela: preciso congelar os dois preços do produto no momento do registro, não só
o custo.

### Proposta

**Banco — nova tabela `perdas`:**

```sql
create table public.perdas (
  id                 text primary key default gen_random_uuid()::text,
  comercio_id        text not null references comercios(id),
  produto_id         text not null references produtos(id),
  vendedor_id        text not null references usuarios(id),  -- quem fez a visita
  quantidade         integer not null check (quantidade > 0),
  custo_unitario     numeric,          -- congelado no momento do registro; null se produto sem custo
  preco_venda_unitario numeric not null, -- idem, preço de venda vigente (varejo) no momento
  valor_custo        numeric,          -- custo_unitario * quantidade (null se custo desconhecido)
  valor_faturamento  numeric not null, -- preco_venda_unitario * quantidade
  data_perda         date not null,
  observacao         text,
  criado_em          timestamptz not null default now()
);
```

`custo_unitario`/`preco_venda_unitario` ficam **congelados na linha** (não lidos do produto na
hora do relatório) pelo mesmo motivo que `vendas` congela `preco_unitario`: se o preço do
produto mudar depois, o histórico não pode mudar junto.

**RLS:** espelhar `vendas` — cada vendedor registra/lê as próprias perdas, admin vê tudo.

⚠️ **Problema conhecido, ainda vale o alerta:** `produtos.preco_custo` é **nullable**
(`types/index.ts:37`) — o sistema já trata "custo não informado" espalhando `null` pela
margem (Dashboard mostra "Margem: Não informada" quando falta custo em qualquer venda). O
módulo de Perdas herda isso só para a coluna de custo: sem custo cadastrado no produto,
`valor_custo` fica `null` e o relatório mostra "—" nessa métrica específica, mas
`valor_faturamento` e a quantidade de pacotes continuam completos normalmente (o preço de
venda não é nullable). Vale avisá-lo que o número de "perda em custo" só fica 100% completo
depois de cadastrar o custo em todos os produtos.

**Frontend:**

- Nova aba **"Perdas"** na Sidebar (visível para admin e vendedor).
- Formulário reaproveitando a estrutura de carrinho de `RegistrarVenda.tsx` — sem forma de
  pagamento, sem prazo, sem preço negociável; com campo de data (a visita pode ser lançada
  no dia seguinte) e observação opcional.
- Listagem/histórico de perdas com os mesmos filtros do Histórico de vendas.
- Relatório mensal com os 4 recortes que ele pediu, respeitando o **seletor de período do
  item 1** (mais uma razão para fazer o item 1 primeiro).

**Impacto no Dashboard (o ganho que ele quer):**

- Novo KPI **"Perdas do período"**, com as 3 métricas pedidas: nº de pacotes, custo (R$) e
  faturamento perdido (R$).
- **"Margem líquida" = margem bruta − perda em custo** (a métrica de custo é o desperdício
  real; a de faturamento fica como informação complementar, não some da margem — somar as
  duas seria descontar o mesmo prejuízo duas vezes) — é isso que transforma o pedido em
  informação de gestão de verdade, em vez de mais uma tabela.
- Insight automático: "o comércio X concentra N% das perdas do mês".

### Como verificar

Registrar perdas em 2 comércios com produtos diferentes → relatório do mês aponta o comércio
e o produto certos no topo; total em custo bate com `Σ custo_unitario × quantidade`, total em
faturamento bate com `Σ preco_venda_unitario × quantidade`; a margem líquida do Dashboard cai
exatamente o valor da perda em custo.

### Execução (04/08/2026)

Tabela `perdas` criada (migração `create_perdas_table`) com RLS espelhando `vendas`
(`vendedor_id = usuario_atual_id() OR is_admin()`). Implementado como desenhado, com as duas
valorações que o cliente pediu (custo e faturamento) mais quantidade de pacotes:

- **Nova aba "Perdas"** na Sidebar (admin e vendedor), com o seletor de período do Header.
- `RegistrarPerda.tsx`: mesmo layout de carrinho de `RegistrarVenda.tsx` (vários produtos por
  visita), sem forma de pagamento/prazo/preço negociável; campos data e observação opcional.
  Congela `custo_unitario` e `preco_venda_unitario` (varejo) do produto no momento do registro.
- `Perdas.tsx`: relatório do mês com os 3 recortes pedidos (pacotes, perda em custo,
  faturamento perdido) + ranking de comércios (por custo) + ranking de produtos (por
  quantidade) + histórico completo com detalhe e exclusão.
- `DashboardAdmin.tsx`: seção "Desperdício do período" (condicional — só aparece com perdas no
  mês) com Perdas/Margem líquida/Comércio com mais perda, e o insight "X concentra N% das
  perdas do mês" incorporado ao card "O que preocupa".

Testado ao vivo (mock local): registrar perda → relatório do mês atualiza na hora; margem
líquida do Dashboard confere exatamente com margem bruta − perda em custo (testado com
R$25.778 − R$468 = R$25.310); ranking de comércio bate com o cálculo manual (36,8% =
R$172/R$468); trocar de mês filtra o relatório corretamente (testado registrando uma perda em
agosto enquanto o relatório de julho continuava intacto); exclusão de perda funciona com
confirmação e recalcula o relatório na hora; vendedor (Ana) só vê "Minhas perdas", sem coluna
de vendedor na tabela. `get_advisors` (security) reexecutado — mesmos alertas da linha de
base, nenhum novo pela tabela/RLS nova.

---

## Riscos e observações gerais

- **O item 1 é pré-requisito dos itens 4 e 5.** Relatório de perdas "do mês" e card "clientes
  que não compraram este mês" dependem de um conceito de período que hoje não existe.
- **Comissão paga a maior:** enquanto o item 1 não sair, a aba Comissões mostra o acumulado
  desde sempre. Vale avisá-lo hoje mesmo, antes do próximo pagamento.
- **Regressão de dado:** os itens 1 e 5 mexem em número que ele usa para pagar gente. Testar
  com dados reais de julho e conferir contra o que ele tem anotado, antes de dar como pronto.
- **Migrações de banco:** os itens 4 e 5 exigem `apply_migration` no Supabase
  (`comercios.vendedor_id` e a tabela `perdas` + RLS). O item 1 não exige nenhuma.
- **Sem impacto no que já foi entregue:** nenhum dos 5 itens altera precificação,
  autenticação ou RLS existente — só acrescenta.

---

## Perguntas ao cliente

1. ~~**Bairros:** confirmar a grafia dos três.~~ **Respondido diretamente pelo Dimitre** (não
   por áudio do cliente): Várzea, Campo de Aviação, Açude Velho — já aplicado.
2. ~~**Perdas:** custo ou venda?~~ **Respondido 04/08:** as duas, mais quantidade de pacotes —
   ver seção 5, já incorporado ao desenho da tabela.
3. ~~**Perdas:** custos cadastrados?~~ Não respondido diretamente, mas irrelevante agora — o
   desenho novo (pergunta 2) garante `valor_faturamento` sempre completo mesmo sem custo;
   só a métrica de custo específica fica "—" nesse caso.
4. ~~**Comissão:** venda feita ou recebida?~~ **Respondido 04/08:** "as vendas que foi feita
   no mês, no ato do pedido (…) mesmo que só entre depois o dinheiro" — confirma o
   comportamento já implementado (regime de competência). Nenhuma mudança de código.
5. ~~**Rota:** dia fixo? "Passei e não vendi"?~~ **Respondido 04/08:** não — ele só quer a
   carteira (cliente ↔ vendedor), a decisão de quem visitar em cada dia continua manual. Ver
   seção 4, Fase B descartada.

---

## Anexo A — Transcrições dos áudios

Transcrição automática (Whisper large-v3-turbo) a partir dos arquivos `.opus` do WhatsApp.
Trechos entre colchetes são de baixa confiança.

### Áudio 1 — 31/07/2026 09:32:48 — Módulo de Perdas

> "[Dimitre], é assim ó, a gente trabalha com troca, certo? O que é a troca? Quando o produto
> vence, a gente substitui por um novo. E isso, claro, gera um custo, né, pra padaria. E eu
> queria que você adicionasse um módulozinho de perdas. Perdas, ou você pode chamar de trocas
> também, tanto faz. E aí o que é que acontece? A gente registraria como se fosse uma venda
> mesmo, só que sem ser uma venda. Registrar, tô dizendo assim, o layout da venda, sabe? Mas
> registrar a perda. Então, a gente seleciona o comércio e a gente registra quantas perdas
> tiveram por visita, entendeu? Visitei um comércio, tem perda tanto. Eu registro e registro
> o comércio. E a data, né, obviamente. Aí no final do mês eu conseguiria ver quais os
> comércios que perderam mais, quanto que a gente perdeu em reais, né? E em pacote de produto,
> qual produto perdeu mais. Então, seria interessante eu ter acesso a isso aí. Também pra
> controlar os gastos, né? Porque eu só vejo o faturamento. Preciso ver também o desperdício."

### Áudio 2 — 31/07/2026 09:43:06 — Apagar cliente + bairros

> "Aí só mais duas coisas: eu queria que tivesse a opção de apagar cliente, pra quando algum
> comece a desligar da gente, a gente poder excluir ele e não ficar enchendo de coisas
> [des]necessárias na hora de registrar. Eu queria também que você colocasse mais bairros,
> porque acho que tá meio desatualizada aquela lista — não tem [Vásia?], não tem Campo de
> Aviação, não tem [Aço de Velho?]. Aí tenta dar uma atualizada naqueles bairros que tu botou."

### Áudio 3 — 31/07/2026 09:46:26 — Rota / carteira por vendedor

> "Outra coisa que ajudaria bastante seria o quê? Definir a rota de cada entregador, certo?
> Em que sentido? Por exemplo, cada vendedor tem uma rota fixa, ele tem sua cartela de
> clientes. Então, os meus clientes não compram da Tati, eles compram a mim. Então, por
> exemplo, dificilmente, raramente eu vou vender alguma coisa para um cliente que é da Tati,
> entendeu? Então, eu queria que tivesse a opção de registrar que esse comerciante pertence ao
> vendedor X, certo? E quando eu entrar, [conseguir] ver os comerciantes que eu tenho que
> passar do dia, entendeu? Porque, por exemplo, eu tô aqui vendendo agora, nesse momento eu
> tô aqui vendendo, certo? Aí me deu um branco na cabeça, eu não lembro onde é que eu tenho
> que passar mais. E no aplicativozinho que eu tinha antes, eu conseguia ver exatamente quais
> eram os comerciantes que eu precisava passar durante o dia. Se ligou? E aí agora eu não
> [sei] se eu tô pulando algum, entendeu?"

### Mensagem de texto — Bug da virada de mês

> "Vi aqui que o Site não virou o mês de Julho para agosto. Registrei novas vendas e ficou
> acumulando com os numeros de Julho"

---

## Anexo B — Respostas do cliente às perguntas em aberto (04/08/2026)

Transcrição automática (Whisper large-v3-turbo) de 3 áudios de WhatsApp recebidos em
04/08/2026, 08:20–08:21, respondendo às "Perguntas ao cliente" da versão anterior deste
plano.

### Áudio 1 — 08:20:32 — Perdas: custo, venda ou os dois?

> "Pronto, sobre as perdas, pode colocar das duas maneiras. Coloca a perda do custo, no valor
> de custo, você pode colocar a perda também no valor de faturamento. Você pode colocar das
> duas formas, que é importante. E também o número de pacotes, certo? Quero que você coloque
> isso também."

### Áudio 2 — 08:21:09 — Rota: agenda ou só carteira?

> "Sobre as rotas, seria mais pra facilitar a ver quem tá vendendo, sabe? Pra ver quem ainda
> falta passar e tal, mas assim, quem vai decidir os clientes que vão ir no dia é o próprio
> vendedor, entendeu? Isso aí você não precisa fazer não. Eu quero apenas que cada cliente
> tenha o seu vendedor, sabe? Que é pra facilitar na hora de fazer a rota."

### Áudio 3 — 08:21:26 — Rota, complemento

> "Aí se eu decido passar no vendedor A e não no vendedor B, aí é escolha minha. Mas pelo
> menos eu sei que eu tenho que passar no A e no B, entendeu?"

### Áudio 4 — 08:35:55 — Comissão: venda feita ou recebida?

> "Não, é as vendas que foi feita no mês. No ato do pedido, a conta já… entendeu? Mesmo que só
> entre depois o dinheiro."
