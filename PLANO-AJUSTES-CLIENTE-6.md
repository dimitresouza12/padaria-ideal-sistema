# Plano de Ajustes — Rodada 6 (data de entrega registrada, 08/09/2026)

Cliente mandou áudio (08/09) pedindo uma melhoria pontual na tela de Lembretes.

## Data de entrega registrada — ✅ CORRIGIDO E TESTADO

> "Tinha como você ajustar pra quando eu marcar como entregue um pedido — que eu tenho que
> marcar como entregue pra depois dar baixa nos pendentes — o site registrar essa informação à
> data? Tipo assim, eu marco como entregue, aí se eu não der baixa, eu gostaria que ele dissesse
> assim, é entregue dia tal do tal, entendeu, pra eu ir acompanhando há quantos dias esse pedido
> foi entregue."

Causa: desde a Rodada 4, a tela de Lembretes já distingue "Entregue" de "Não entregue" (Tag),
mas não guardava **quando** a marcação aconteceu — só um booleano. O cliente quer acompanhar há
quanto tempo um pedido entregue está esperando pagamento.

Implementado: `Venda` ganhou `entregue_em` (data, nullable) — grava a data no momento em que
"Marcar Entregue" é clicado (mesmo padrão de `entregue`/`data_pagamento` das rodadas
anteriores). Migração no Supabase com backfill: vendas à vista (evento atômico, entrega e venda
no mesmo momento) recebem `entregue_em = data_venda`; vendas a prazo já marcadas como entregues
antes desta rodada ficam com `entregue_em = null` (não há como saber retroativamente quando
foram marcadas — a tela simplesmente não mostra a legenda nesses casos, sem inventar uma data).
Dali em diante, todo clique em "Marcar Entregue" grava a data real.

`Lembretes.tsx`: quando o pedido está entregue e a data é conhecida, mostra uma legenda abaixo
da Tag "Entregue": `{data} · há {N} dia(s)` (reaproveita `diasDesde`, já usado no indicador de
recompra da Rodada 2).

Testado ao vivo (mock local): marcar um pedido como entregue e não dar baixa → tag "Entregue"
some, "Dar Baixa" libera (comportamento já existente), e aparece "28/07/2026 · há 43 dia(s)"
logo abaixo — usando a data fixa `HOJE` do mock, mas a mesma lógica grava a data real de hoje em
produção. Migração aplicada em produção (Supabase `audtpilnovrzwszeubkz`). Build limpo.

Rodada 6 completa.
