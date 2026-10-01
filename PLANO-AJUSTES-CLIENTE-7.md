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

Rodada 7 completa.
