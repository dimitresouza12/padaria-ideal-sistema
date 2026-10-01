# Plano de Ajustes — Rodada 7 (desfazer "Marcar Entregue", 01/10/2026)

Cliente mandou mensagem de WhatsApp (30/09) pedindo uma proteção contra clique errado.

## Desfazer "Marcar Entregue" — ✅ CORRIGIDO E TESTADO

> "Será que tinha a opção de colocar um botãozinho de 'desfazer' por uns 10 segundos quando
> eu clico em 'marcar entregue'? As vezes eu aperto sem querer e tenho que repassar a venda
> novamente."

Dimitre pediu análise olhando além do pop-up de 10s — um toast temporário não ajudaria quem
só percebe o erro depois de já ter saído da tela. As duas necessidades (desfazer na hora,
corrigir depois) usam a mesma peça por baixo: uma forma de reverter "Entregue".

Causa: desde a Rodada 4, `marcarEntregueEmLote` era via de mão única — ligava `entregue` e
`entregue_em`, sem nenhum caminho de volta no código ou na UI.

Implementado:
- **`desmarcarEntregueEmLote`** novo (mock + Supabase + store), espelha
  `marcarEntregueEmLote` zerando `entregue`/`entregue_em`. Sem migração — campos já existiam
  desde a Rodada 6.
- **Toast com ação**: `useToastStore`/`Toaster.tsx` ganharam suporte a um botão extra
  (`acao: { rotulo, aoClicar }`) e duração customizável (`duracaoMs`). Ao marcar entregue, o
  toast passa a durar 10s com botão "Desfazer".
- **Controle permanente**: em `Lembretes.tsx`, todo pedido entregue (e ainda não pago) ganhou
  um link "Desmarcar entrega" ao lado da legenda de data, sem prazo — cobre o caso de
  perceber o erro depois do toast sumir. Mesma ação por baixo dos dois caminhos.

Testado ao vivo (mock local): marcar entregue → toast "Desfazer"/"Fechar" aparece, clicar
"Desfazer" reverte (tag volta a "Não entregue", "Dar Baixa" trava de novo, toast de
confirmação "Marcação desfeita."); independentemente do toast, o link "Desmarcar entrega" na
própria linha reverte do mesmo jeito a qualquer momento. Build limpo; `api.ts` revertido pro
Supabase antes do commit.

## Confirmação antes de desmarcar — ✅ CORRIGIDO E TESTADO

Dimitre pediu, ainda na mesma rodada: "acho que seria interessante quando clicasse pra
desmarcar como entregue, tivesse que confirmar, pois acredito que na correria do dia a dia a
pessoa pode vir a se enganar."

Aplicado só ao link permanente "Desmarcar entrega" (clique avulso, fora do contexto de quem
acabou de marcar) — o botão "Desfazer" do toast de 10s continua direto, porque já é reação
imediata à própria ação que a pessoa acabou de fazer, não um clique solto no meio do dia.
Reaproveitado o `ConfirmModal` já usado em Produtos/Comércios/Perdas/Metas/Histórico (mesmo
padrão do projeto, não um confirm() nativo do navegador). Clicar em "Desmarcar entrega" abre
o modal com o nome do cliente; só desfaz a marcação depois de "Desmarcar" confirmado.

Testado ao vivo (mock local): clique abre o modal com o nome correto do comércio; "Cancelar"
fecha sem alterar nada (pedido continua "Entregue"); "Desmarcar" executa a ação, mostra
"Removendo…" durante a chamada, fecha o modal e dispara o toast "Marcação de entregue
desfeita." — pedido volta a "Não entregue". `tsc --noEmit` e `npm run build` limpos; `api.ts`
revertido pro Supabase antes do commit.

Rodada 7 completa.
