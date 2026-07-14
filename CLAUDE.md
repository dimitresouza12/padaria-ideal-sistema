# Padaria Ideal — Sistema de Vendas no Atacado

## Contexto do negócio

A **Padaria Ideal** (desde 1913) vende produtos de panificação (bolachas, biscoitos) no
**atacado** para comércios parceiros B2B (supermercados, mercearias, outras padarias).
Este repositório contém o sistema web para gerenciar essa operação: vendedores,
precificação por volume, contas a prazo, comissões, metas por período e um dashboard
executivo para o gestor.

## Estrutura do repositório

O entregável principal é o app **React (Vite + TypeScript + Tailwind)** na raiz do
repositório — estratégia *frontend-first*: toda a persistência hoje é simulada em
`localStorage` através de uma camada de mock, estruturada com os mesmos campos que o
Supabase usará quando o backend real entrar (ver `docs/plano-implementacao.md`).

| Caminho | O que é |
|---|---|
| `src/` | Código-fonte do app React (types, services/mock, store Zustand, componentes, features por aba). |
| `public/` | `logoIdeal.PNG` e `logo-wheat-icon.png` — logo real do cliente e o ícone de trigo recortado dele. |
| `docs/plano-implementacao.md` | Plano de arquitetura para a versão de produção: stack recomendada, modelagem de dados completa e cronograma por fases. |

O protótipo estático anterior (HTML + Tailwind CDN + JS puro, arquivo único) foi removido
depois da migração para React — continua disponível no histórico do Git (commit
`acc1c13` e seguintes) caso seja preciso consultar o design original.

## Como rodar

```bash
npm install
npm run dev
# abre em http://localhost:5173/
```

`npm run build` roda o typecheck (`tsc --noEmit`) antes do build de produção.

## Autenticação

Login real via **Supabase Auth** (`signInWithPassword`), migrado em 2026-07-14 — ver
"Estado atual" abaixo para o histórico. **O login continua sendo o primeiro nome da
pessoa**, não e-mail: uma RPC pública (`obter_email_por_login`) resolve o e-mail
correspondente antes de chamar o Auth, preservando a UX original. Não há mais senhas de
demonstração fixas — cada conta tem sua própria senha (funcionários novos recebem uma
senha provisória gerada na hora do cadastro, exibida uma única vez para o admin repassar).

## Regras de negócio implementadas

- **Precificação dinâmica**: ao registrar uma venda, se a quantidade for **≥ 10 caixas**,
  o preço de atacado é aplicado automaticamente e o campo fica travado (somente leitura).
  Abaixo de 10, o campo permanece aberto para o vendedor negociar o valor (varejo).
- **Comissão sobre margem**: cada vendedor tem uma taxa de comissão aplicada sobre a
  **margem** da venda (preço − custo), não sobre o faturamento bruto. Aba **Comissões**
  mostra o total a pagar por vendedor no período.
- **Vendas a prazo**: ao marcar pagamento "A Prazo", a venda recebe status `Pendente` e
  uma data de vencimento; vendas vencidas são reclassificadas automaticamente. A aba
  **Lembretes de Pagamento** lista tudo que está pendente/vencido, com botão "Dar Baixa"
  que atualiza o status e os KPIs em tempo real.
- **Metas por período**: o gestor pode ter várias metas simultâneas (mensal, semanal,
  trimestral, personalizada), cada uma com sua própria janela de datas. Uma é marcada
  **principal** e alimenta o KPI de destaque do Dashboard; o "% vs Meta" sempre compara
  contra o faturamento **dentro da janela daquela meta específica**. Cada meta pode ser
  definida por valor geral ou como soma de metas por produto. Gestão centralizada na aba
  **Metas**.
- **Equipe e acessos**: aba **Configurações** permite ao gestor cadastrar um funcionário
  diretamente, ou aprovar/recusar pedidos de acesso enviados pela própria tela de login
  ("Solicitar cadastro"). O login de cada pessoa é derivado do primeiro nome, com
  verificação de duplicidade. O admin troca a própria senha ("Minha Conta", reautenticando
  com a senha atual) e redefine a de qualquer funcionário (botão "Senha" na tabela Equipe,
  sem precisar da senha antiga) — ambas via Supabase Auth de verdade, não mais bcrypt manual.
- **RBAC**: Administrador tem acesso total (9 abas); Vendedor só vê Dashboard, Vendas e
  Lembretes — e o campo "Vendedor responsável" no formulário de venda fica travado no próprio
  usuário logado.
- **Dashboard do Administrador**: 4 KPIs com contexto (Faturamento, % vs Meta, Margem,
  Ticket Médio), gráfico de evolução mensal, ranking de vendedores e regiões em barras (sem
  gráfico de pizza), e 3 insights escritos (o que cresceu / o que preocupa / qual ação
  tomar) gerados dinamicamente a partir dos dados.
- **Dashboard do Vendedor**: vendas do mês, comissão acumulada e barra de progresso contra
  a **meta individual** do vendedor.
- **Vendas**: aba única que junta o lançamento (botão "+ Registrar Venda" → formulário em
  modal) e o histórico logo abaixo. O admin vê todas as vendas com filtros (vendedor, cliente,
  produto, situação); o vendedor vê só as próprias (o filtro de vendedor fica oculto).
- **Relatórios**: exportação em CSV (client-side) de vendas, comissões e catálogo de
  produtos.

## Arquitetura frontend-first e migração futura

```
src/
├─ types/          entidades — mesmos campos que as tabelas do Supabase terão
├─ lib/             funções puras (precificação, formatação, período)
├─ services/
│  ├─ mock/         "banco" simulado — único lugar que muda na virada de chave
│  └─ api.ts        ponto de virada — componentes importam DAQUI, nunca do mock direto
├─ store/           Zustand: useAuthStore, useUiStore, useDataStore
├─ components/       design system (ui.tsx, icons.tsx) + layout (Sidebar, Header)
└─ features/         uma pasta por aba
```

Migração para Supabase: criar `services/supabase/supabaseApi.ts` implementando a mesma
interface `DataApi`, trocar a única linha de export em `services/api.ts`. Nenhum componente
muda.

## Estado e persistência

Os dados de negócio vivem no Supabase (ver seção "Estado atual" abaixo); o mock legado em
`localStorage` (versionado, `padaria_ideal_db_v4`) só é usado se `services/api.ts` apontar para
`services/mock`. Botão "Restaurar dados de exemplo" reseta para o dataset fictício inicial.

**A sessão é gerenciada pelo Supabase Auth** (JWT persistido pelo SDK, renovado sozinho em
background) — um refresh continua logado, mas, diferente do esquema anterior, `useAuthStore.ts`
revalida contra o banco a cada boot e a cada evento de `onAuthStateChange` (não confia cegamente
no JWT): se um admin desativar um funcionário (`ativo=false`), a próxima checagem já derruba a
sessão dele, sem precisar de logout manual (corrigido em 2026-07-14 — antes, com a sessão salva
"na mão" em `localStorage`, a revogação não tinha nenhum efeito prático até o logout).

## Design system

Paleta "Padaria Premium" — abandona o azul genérico de tecnologia:

- Fundo creme (`#faf8f5`), texto café profundo (`#2e2520`), acentos em trigo/dourado fosco
  (`#8c6239` bronze para botões e barras de dados, `#c5a059` dourado para detalhes de marca).
- Verde/vermelho são **reservados exclusivamente** para alertas de dado (acima/abaixo da
  meta, vencido/no prazo) — nunca usados decorativamente.
- Tipografia: Inter (sans, todo o app) + Playfair Display (serifada, só no wordmark do
  login).
- Sem emojis em nenhum ponto da interface; ícones são SVG minimalista (stroke).

### Convenções de layout (desktop + mobile)

- **Cadastro por modal, não por formulário sempre-aberto**: telas de listagem (Produtos,
  Comércios, Equipe) têm um botão `+ Novo …` no topo que abre um `Modal` (`components/ui.tsx`);
  editar reabre o mesmo modal pré-preenchido. Mantém a tabela como protagonista.
- **Tabelas viram cards no mobile**: toda tabela de dados renderiza `<table>` só em `sm+`
  (`hidden sm:block`) e uma lista de `Card` empilhados abaixo de `sm` (`sm:hidden`) — senão as
  colunas da direita (incluindo botões de ação) ficam inalcançáveis no celular. Vale para
  Produtos, Comércios, Equipe, Comissões e Histórico.
- **Sub-abas** (`SubTabs` em `components/ui.tsx`) quebram telas densas em seções: Configurações
  usa Minha Conta · Equipe · Solicitações (com badge de pendências) em vez de empilhar tudo.

## Segurança

Migrado em 2026-07-14 para **Supabase Auth de verdade** (ver "Estado atual" abaixo) — a
validação de login deixou de ser client-side. Itens que seguem fora de escopo, registrados
para uma fase futura caso o sistema cresça além de um time interno pequeno:

- Rate limiting em login/solicitação de acesso (o Supabase Auth já dá alguma proteção nativa
  contra brute-force; não avaliado se é suficiente).
- Reset de senha "esqueci minha senha" self-service (hoje o admin sempre gera/redefine a
  senha manualmente).
- Upload de logo/branding via **object storage** (Supabase Storage/S3) em vez de commitado no
  repositório — não crítico, o logo não muda com frequência.

### Estado atual (Supabase Auth + RLS por role + Edge Function)

- **Autenticação**: `usuarios.auth_user_id` liga cada linha a um usuário real em
  `auth.users`. Login resolve o e-mail a partir do primeiro nome (RPC pública
  `obter_email_por_login`) e chama `supabase.auth.signInWithPassword`. Sessão gerenciada
  pelo SDK (JWT + refresh automático), revalidada contra `usuarios.ativo` a cada boot e a
  cada `onAuthStateChange` — ver `useAuthStore.ts`.
- **RLS por role em todas as 7 tabelas de dados**: a policy única `prototipo_acesso_total`
  (`USING(true)` para `anon`) foi substituída por policies reais. Leitura liberada a
  qualquer `authenticated` ativo; escrita em `produtos`/`comercios`/`metas`/
  `metas_produtos`/`historico_mensal`/`usuarios` exige `is_admin()` (função
  `SECURITY DEFINER` que já embute a checagem de `ativo`); em `vendas`, cada vendedor só
  lê/escreve as próprias (`vendedor_id = usuario_atual_id()`) ou é admin. A `anon key`
  sozinha não lê nem escreve mais nada nessas tabelas via REST.
- **Edge Function `admin-acoes`** (`supabase/functions/admin-acoes/`): única peça de
  servidor do projeto. Substitui as RPCs `criar_funcionario`/`aprovar_solicitacao`/
  `recusar_solicitacao`/`alterar_senha`, que reconfirmavam login+senha do admin a cada
  chamada (necessário antes, porque a `anon key` não carregava identidade). Agora valida o
  JWT do chamador e checa `is_admin()` antes de usar a `service_role` key (Admin API do
  Supabase Auth, que só roda no servidor) para criar/alterar usuários de verdade.
- `credenciais`/`senha_hash` e as RPCs `fazer_login`/`alterar_senha` antigas ficam como
  artefato legado no banco (não expostas por nenhum código novo) — não removidas nesta
  rodada, sem risco adicional (já eram protegidas por GRANT de coluna / SECURITY DEFINER).
- Migração de dados: script one-off `scripts/migrar-para-supabase-auth.mjs`, rodado
  localmente pelo usuário com a `service_role` key (nunca passa pelo assistente).

## Stack recomendada para produção

Next.js + Tailwind + shadcn/ui no front (já em uso), Supabase (PostgreSQL + Auth + RLS +
Realtime + pg_cron) no back, Vercel para hospedagem. Detalhamento completo em
`docs/plano-implementacao.md`.
