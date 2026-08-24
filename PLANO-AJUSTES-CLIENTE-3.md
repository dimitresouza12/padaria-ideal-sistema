# Plano de Ajustes — Rodada 3 (pedidos do cliente, 17-24/08/2026)

Cliente mandou um print do Dashboard marcado à mão + 3 áudios de WhatsApp (17 e 22/08)
pedindo 3 mudanças. Alinhamento e confirmação de escopo via mensagem de texto + 3 áudios de
resposta (24/08). Plano completo (diagnóstico, proposta técnica e arquivos tocados) está no
histórico de planejamento da sessão — este documento registra o essencial e o estado de
execução, no mesmo formato das rodadas anteriores.

## 1. Lembretes de Pagamento agrupados por pedido — ✅ CORRIGIDO E TESTADO

> "ele registra produto por produto, venda, né? E eu queria que fosse, assim, pelo cliente
> (...) eu vou olhar aqui e Lembretes de Pagamento, aí tem nove. Aí é como se tivesse nove
> clientes que devem (...) só que não, aqui são só quatro, entendeu? Só que ele tá dividido,
> destrinchado."

Causa: cada `Venda` é uma linha por produto — sem id de pedido no schema. `Lembretes.tsx`
listava uma linha por venda; o mesmo pedido com 2-3 produtos aparecia repetido.

Correção: novo helper `src/lib/pedidos.ts` (`agruparVendasPorPedido`) reconstrói o pedido pela
chave `comercio_id + vendedor_id + data_venda + data_vencimento` (todo item do mesmo carrinho
compartilha esses 4 campos). `Lembretes.tsx` passou a exibir uma linha por pedido, com toggle
para expandir os itens; "Dar Baixa" agora quita todos os itens do pedido de uma vez (novo
método `darBaixaPagamentoEmLote`, mock + Supabase + store). Badge do sino (`Header.tsx`) e o
Ticket Médio do Dashboard (`DashboardAdmin.tsx`) também passaram a contar pedidos, não linhas
— o Ticket Médio tinha o mesmo bug estrutural (dividia faturamento pelo nº de linhas de
produto, não de pedidos).

Confirmado com o cliente (áudio 24/08): "é isso aí mesmo (...) quando eu for dar baixa,
debaixo tudo de uma vez."

Testado ao vivo (mock local): pedido de 3 produtos ao mesmo cliente apareceu como 1 linha
"3 produtos" com o valor somado; expandir mostrou os 3 itens; "Dar Baixa" quitou os 3 de uma
vez e a linha sumiu da lista; Ticket Médio do mês passou a mostrar "1 pedido(s)" em vez de 3.
Build (`tsc --noEmit` + `vite build`) limpo.

## 2. Indicador de recompra — ⏳ PENDENTE

> "eu queria ver a possibilidade de você colocar um indicador de recompra (...) pra que eu
> conseguisse identificar os clientes que reduziram a frequência de pedido, há quanto tempo
> eles não pedem."

Limiares confirmados com o cliente (áudio 24/08): atenção a partir de **15 dias** sem comprar,
crítico a partir de **45 dias**.

Proposta (não implementada ainda): `diasDesde()` novo em `src/lib/periodo.ts`; última compra
por comércio derivada de `vendas` (sem migração de schema); seção nova no Dashboard ("Clientes
em risco"), colunas novas em Clientes/Comércios, e o card "Meus clientes" do Dashboard do
Vendedor passa a mostrar "há N dias" em vez do binário atual.

## 3. Metas de visitas / novos clientes / ticket médio + registro de visita — ⏳ PENDENTE

> "a meta que tu colocou lá é sobre faturamento (...) meta de visitas, de novos clientes e de
> ticket médio. Eu queria criar essas metas para os meus vendedores."

Escopo confirmado com o cliente (áudio 24/08): as metas novas nascem **por vendedor** desde o
início — "prefiro esperar mais, sempre que seja individual, para vendedor". Recusou
explicitamente a alternativa de entregar primeiro uma versão "geral" mais rápida.

Proposta (não implementada ainda):
- Nova entidade `Visita` (mesmo padrão de `Perda`: tabela, RLS, CRUD, formulário mínimo +
  botão "Passei e não vendi" em `Vendas.tsx`). Sem escrita automática em venda/perda — a meta
  de visitas soma vendas+perdas+visitas por `comercio_id+data`, deduplicado, na hora do cálculo.
- `Meta` ganha `metrica` (`faturamento`/`visitas`/`novos_clientes`/`ticket_medio`, default
  `faturamento`) e `vendedor_id` (nullable — `null` continua sendo meta geral, só usado por
  faturamento; as 3 métricas novas sempre têm vendedor).
- `src/lib/metas.ts` novo — centraliza o cálculo de progresso (hoje duplicado em 5 lugares),
  corrigindo de quebra um bug já confirmado: progresso por produto/vendedor não filtra pela
  janela da meta.

## Ordem de execução

1. Lembretes agrupados + Ticket Médio — ✅ feito.
2. Recompra — próximo.
3. Visitas + metas por métrica — maior escopo, única com migração de schema nova.

---

## Anexo — Transcrições dos áudios

### Áudio 1 — 17/08, 17:04 — Lembretes agrupados

> "Masha, que é no sistema de... dos lembrantes do pagamento, teria como tu ver se tu
> consegue ajustar aí pra... Porque, por exemplo, aqui ele registra produto por produto,
> venda, né? E eu queria que fosse, assim, pelo cliente. Por exemplo, perceba que aí na foto
> repete os clientes, né? Sendo que o pedido é o mesmo. Mas por que que repete? Porque quando
> eu lançar a bolacha de papel, né? Um exemplo, depois eu lanço outro produto, aí eu entendo
> que foi duas vendas, mas na verdade é uma venda só, entendeu? Será que tu conseguia ver isso
> aí pra deixar agrupado? Porque, por exemplo, eu vou olhar aqui e lembrei de pagamento, aí tem
> nove. Aí é como se tivesse nove clientes que devem vender a gente, me preocupo logo. Só que
> não, aqui é só, por exemplo, um, dois, três, aqui são só quatro, entendeu? Só que ele tá
> dividido aqui, destrinchado."

### Áudio 2 — 22/08, 11:48 — Metas por métrica

> "Ah, Moncho, outra coisa que eu queria ver contigo era sobre as metas, que eu vi que a meta
> que tu colocou lá é sobre faturamento, né? Será que tu conseguia desenrolar esses outros
> indicadores que eu vou te passar? Que seria meta de visitas, de novos clientes e de ticket
> médio. Eu queria criar essas metas para os meus vendedores, entendeu?"

### Áudio 3 — 22/08, 11:49 — Indicador de recompra

> "E eu queria ver a possibilidade de você colocar um indicador de recompra, como seria isso?
> Pra que eu conseguisse identificar os clientes que reduziram a frequência de pedido, há
> quanto tempo eles não pedem, enfim, nesse sentido assim."

### Respostas de confirmação — 24/08, 10:28-10:30

> "Você pode colocar a partir de 15 dias e o crítico você pode botar a partir de 45 dias."

> "Não tem problema não se demorar, eu prefiro, eu prefiro esperar mais, sempre que seja
> individual, entendeu, para vendedor, para vendedor."

> "E sobre o lembrete de pagamento é isso aí mesmo. Quando eu for para baixo, debaixo tudo de
> uma vez, entendeu?"
