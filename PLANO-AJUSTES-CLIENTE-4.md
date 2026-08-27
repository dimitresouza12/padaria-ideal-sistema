# Plano de Ajustes — Rodada 4 (separar "Entregue" de "Pago", 27/08/2026)

Cliente mandou um áudio de WhatsApp (27/08) explicando um problema no fluxo de Lembretes de
Pagamento, e dois áudios curtos de resposta confirmando as decisões de produto levantadas.
Este documento registra o essencial e o estado de execução, no mesmo formato das rodadas
anteriores (`PLANO-AJUSTES-CLIENTE.md`, `PLANO-AJUSTES-CLIENTE-2.md`, `PLANO-AJUSTES-CLIENTE-3.md`).

## Separar "Entregue" de "Pago" — ✅ CORRIGIDO E TESTADO

> "Assim que a gente pega o pedido do cliente, a gente já lança logo (...) como não é o
> dinheiro que entrou, a gente sempre tá colocando (...) vender a prazo (...) eu tô começando
> a confundir vendas que já foram entregues e o cliente ainda não pagou, e vendas que não
> foram entregues (...) talvez se você conseguisse colocar uma opção (...) um outro botão do
> lado, eu clicar assim, entregue, e se for o caso dele não pagar, eu não clico em dar baixa,
> só clico como entregue (...) tem 13 pedidos aqui (...) só que eu não sei quais que foram
> entregues já, os que ainda faltam entregar."

Causa: o cliente lança a venda no sistema assim que fecha o pedido, antes de entregar (pra não
esquecer). Isso significa que `status = 'pendente'` sempre misturou dois eventos de negócio
diferentes — entrega e pagamento — no mesmo campo, e a tela de Lembretes não deixava distinguir
"já entreguei, só falta pagar" de "ainda nem entreguei".

Duas decisões de produto foram confirmadas por áudio do cliente (27/08):

> "Pode deixar esse botão bloqueado, viu, de dar baixa. E tu não precisa colocar não, viu?
> Pode deixar que eu faça manualmente aqui, se for entregue ou não."

1. Nenhum pedido — novo ou já existente — nasce pré-marcado como entregue; o cliente confirma
   manualmente cada um.
2. "Dar Baixa" fica bloqueado até o pedido ser marcado como entregue.

Correção: `Venda` ganhou um campo novo e independente de `status`: `entregue: boolean`
(migração `alter table vendas add column entregue boolean not null default false` — nenhum
pedido antigo nasce marcado). Regra de preenchimento em `registrarVenda`/`atualizarVenda` (mock
+ Supabase): vendas **à vista** sempre `entregue = true` (pagamento e entrega já são tratados
como evento atômico, igual já acontecia com `status`); vendas **a prazo** nascem
`entregue = false` e, ao editar, preservam o valor atual em vez de resetar.

Novo método em lote `marcarEntregueEmLote` (mock + Supabase + store), espelhando
`darBaixaPagamentoEmLote` da Rodada 3 — a tela de Lembretes já opera por pedido reconstruído
(`agruparVendasPorPedido`), então a ação também é em lote. `GrupoPedido` ganhou
`entregue: boolean` (true só quando todo item do pedido está marcado).

`Lembretes.tsx`: cada pedido mostra uma segunda Tag ("Entregue"/"Não entregue") ao lado da
situação de pagamento; botão "Marcar Entregue" visível enquanto não entregue; "Dar Baixa" fica
desabilitado até a marcação, com a legenda "Marque como entregue para liberar".

Testado ao vivo (mock local): os 13 pedidos pendentes existentes nasceram todos como "Não
entregue" com "Dar Baixa" bloqueado; "Marcar Entregue" liberou o botão e o pagamento foi
confirmado normalmente; um pedido novo registrado a prazo nasceu "Não entregue" (venda à vista
não aparece em Lembretes, como sempre). Migração aplicada em produção
(Supabase `audtpilnovrzwszeubkz`); `get_advisors` (security) reexecutado, sem alertas novos.
Build limpo.

Rodada 4 completa.

---

## Anexo — Transcrições dos áudios

### Áudio 1 — 27/08, 1min25s — Separar entregue de pago

> "Deixa eu te falar, no sitezinho, o que acontece? Assim que a gente pega o pedido do cliente,
> a gente já lança logo, certo? No aplicativo, que é pra a gente não esquecer, certo? E aí o que
> acontece? Como não é o dinheiro que entrou, a gente sempre tá colocando, tipo, como vender a
> prazo, né? Que a pessoa ainda vai pagar. E, tipo assim, eu tô percebendo que isso não é o
> ideal, porque eu tô começando a confundir vendas que já foram entregues e o cliente ainda não
> pagou, e vendas que não foram entregues e que o cliente, obviamente, não pagou porque não foi
> entregue. E aí, tipo assim, talvez se você conseguisse colocar uma opção, tipo assim, aqui tem
> um botão verdezinho da baixa, né? Podia ter, tipo assim, eu colocar assim, entregue do lado,
> tipo um outro botão do lado, eu clicar assim, entregue, e se for o caso dele não pagar, eu não
> clico em dar baixa, só clico como entregue. E posteriormente eu clico em dar baixa, entendeu?
> Que é pra eu separar aqui. Porque, por exemplo, tem pedido aqui, assim, que tem um 10, certo?
> Tem 13 pedidos aqui como pra dar baixa. Só que eu não sei quais que foram entregues já, os que
> ainda faltam entregar, entendeu?"

### Resposta de confirmação — 27/08

> "Pode deixar esse botão bloqueado, viu, de dar baixa. E tu não precisa colocar não, viu? Pode
> deixar que eu faça manualmente aqui, se for entregue ou não."
