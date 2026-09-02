# Plano de Ajustes — Rodada 5 (id de pedido real + regime de caixa, 31/08/2026)

Cliente mandou um documento (via `/model`, sem áudio) com regras de negócio e métricas de
Dashboard. Alinhamento e confirmação de escopo via pergunta direta antes de planejar (a leitura
literal de um dos pedidos colidiria com o agrupamento por pedido confirmado na Rodada 3).

## 1. `pedido_id` real — ✅ CORRIGIDO E TESTADO

> "A volumetria não deve ser agrupada por cliente. Cada transação de venda deve ser
> contabilizada individualmente no total do mês, garantindo que o volume real de saídas seja
> medido corretamente."

Causa: desde a Rodada 3, `agruparVendasPorPedido` juntava vendas por
`comercio_id|vendedor_id|data_venda|data_vencimento` — funciona bem para separar produtos de
um mesmo carrinho, mas colapsava dois pedidos genuinamente separados ao mesmo cliente no mesmo
dia (duas visitas, dois carrinhos) num registro só, subcontando a volumetria.

Correção: `Venda` ganhou `pedido_id` (uuid), gerado uma vez por carrinho enviado
(`RegistrarVenda.tsx`) e reutilizado em todos os itens daquele envio. Migração de duas etapas
no Supabase — backfill de um `pedido_id` por grupo já existente (preserva os pedidos antigos
corretamente agrupados) antes de tornar a coluna `not null`. `agruparVendasPorPedido`
(`src/lib/pedidos.ts`) passou a agrupar por essa chave direta em vez da chave composta — todos
os consumidores (Lembretes, Header, Ticket Médio, meta de ticket médio) continuaram
funcionando sem alteração.

Bônus de consistência: 3 lugares diziam "pedido(s)" mas contavam linhas de produto
(`DashboardVendedor.tsx`, `Comissoes.tsx`, `Relatorios.tsx`) — mesmo tipo de inconsistência já
corrigida no Ticket Médio na Rodada 3. Agora usam o mesmo helper.

Testado ao vivo (mock local): 2 carrinhos separados ao mesmo cliente no mesmo dia apareceram
como 2 linhas distintas em Lembretes (antes colapsavam em 1); 1 carrinho com 2 produtos
continuou como 1 linha só ("2 produtos"), confirmando que o agrupamento intra-carrinho da
Rodada 3 não foi afetado.

## 2. Regime de caixa — ✅ CORRIGIDO E TESTADO

> "Faturamento Previsto (Regime de Competência): somar tudo que foi vendido no mês, quitado ou
> não (...) Faturamento Real (Regime de Caixa): somar estritamente o dinheiro que entrou no
> caixa no mês (...) Clientes Previstos (...) Clientes Reais: apenas os que pagaram no mês."

Diagnóstico: dois itens do pedido já eram verdade no sistema sem precisar de mudança —
"Registro de Baixa" (bloqueado até "Entregue") já resolvido na Rodada 4; "Desmembramento
Temporal" (baixa nunca move `data_venda`) já era o comportamento existente, e é a premissa que
permite medir competência e caixa separadamente.

Faltava o dado que habilita o regime de caixa: a data em que cada pagamento entrou. `Venda`
ganhou `data_pagamento` (nullable). Preenchimento: à vista → data da venda (evento atômico,
mesmo raciocínio já usado para `entregue` na Rodada 4); a prazo → `null` até a baixa; baixa
(`darBaixaPagamento`/`EmLote`) grava a data real do evento; reabertura manual em Histórico
limpa a data. Backfill do histórico (vendas já pagas antes da coluna existir): à vista = data
da venda (exata); a prazo já paga = data de vencimento (melhor estimativa disponível).

Novo bloco no Dashboard do Administrador, "Faturamento — Previsto x Realizado": Faturamento
Previsto (mesmo valor do KPI "Faturamento" já existente), Faturamento Real, Clientes Previstos
(comércios distintos que compraram no período) e Clientes Reais.

Migrações aplicadas em produção (Supabase `audtpilnovrzwszeubkz`); `get_advisors` (security)
reexecutado, sem alertas novos. Build limpo.

### 2.1 Ajuste pós-feedback — Faturamento/Clientes Real atribuídos ao mês da venda

Cliente testou em produção e reportou (print + áudio, 02/09): um pagamento de agosto dado em
setembro estava contando no Faturamento Real de **setembro**, não de agosto — implementação
original, fiel à leitura literal do pedido escrito ("regime de caixa": dinheiro atribuído ao
mês em que entra).

> "Eu prefiro que fique separado isso aí, prefiro que não entre no mês de setembro (...) tudo
> que for de agosto, você bota pertencendo a agosto (...) esse valor, sempre que eu der baixa,
> ele é pra cair lá no mês de agosto (...) e não fique a morte na tabela de setembro."

Ou seja: ele não quer caixa por data de recebimento — quer "de tudo que vendi naquele mês,
quanto já foi pago até agora", sempre atribuído ao mês da **venda**, nunca ao mês da baixa.
Confirmado com o cliente antes de mexer (pergunta direta via WhatsApp).

Correção em `DashboardAdmin.tsx`: o memo `caixa` deixou de somar por `data_pagamento` dentro do
período e passou a filtrar `vendasDoPeriodo` (já filtrado por `data_venda`) por
`status === 'pago'` — mais simples que a versão original, e não depende mais do histórico
inteiro de `vendas`, só do período selecionado. `data_pagamento` continua sendo gravada em cada
venda (pode servir para outra necessidade futura), só não é mais usada para decidir o mês deste
indicador específico.

Testado ao vivo (mock local): venda lançada em junho, a prazo — Faturamento Real de junho
começou em R$0 (Clientes Reais 0); dada a baixa (que no mock acontece na data fixa `HOJE`,
28/07), o Faturamento Real de **junho** passou a refletir o valor pago, e o de **julho**
permaneceu inalterado — confirma que o valor não "foge" para o mês da baixa.

Rodada 5 completa (com correção pós-feedback do cliente).
