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

## Credenciais de demonstração

⚠️ **Login validado no navegador** — só para demonstrar o fluxo de UI, nunca assim em
produção (ver seção "Segurança" abaixo). **O login é o primeiro nome da pessoa**, não
e-mail — o e-mail em `Usuario.email` existe só como contato.

| Perfil | Login | Senha |
|---|---|---|
| Administrador | `Roberto` | `admin123` |
| Vendedor | `Ana` | `venda123` |

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
  verificação de duplicidade. O admin também troca a própria senha ("Minha Conta") e a de
  qualquer funcionário (botão "Senha" na tabela Equipe) — ambas exigem reconfirmar a senha
  atual do admin, checada com bcrypt no Postgres.
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

Todo o estado vive em `localStorage`, versionado (`padaria_ideal_db_v4` atualmente) — a
versão muda sempre que o formato dos dados muda, para não herdar um shape incompatível. A
sessão de login é só em memória; um refresh sempre volta para a tela de login. Botão
"Restaurar dados de exemplo" reseta para o dataset fictício inicial.

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

## Segurança — o que MUDA em produção

Este protótipo faz a validação de login **no navegador**, só para demonstrar o fluxo de
UI. Isso é inseguro por definição e **não deve ir para produção assim**. O plano em
`docs/plano-implementacao.md` detalha a arquitetura real:

- Senhas com hash **bcrypt** (cost ≥ 12) ou Argon2id — nunca texto puro nem validação
  client-side.
- Autenticação via API com **JWT** (expiração curta) + refresh token em cookie
  `httpOnly, Secure, SameSite`.
- **Row Level Security** no PostgreSQL (recomendação: Supabase) como camada final de RBAC,
  independente da validação da API.
- Upload de logo/branding via **object storage** (Supabase Storage/S3), nunca commitado no
  repositório de código.

### Estado atual (Supabase real já conectado, sem backend próprio)

O app fala direto com o Postgres via `anon key` (pública no bundle) — não existe camada de
servidor. Bcrypt já está em uso (senhas com hash, verificadas em função `SECURITY DEFINER` no
Postgres). Ações administrativas sensíveis (`criar_funcionario`, `aprovar_solicitacao`,
`recusar_solicitacao`) agora exigem reconfirmar login+senha do admin dentro da própria função
(verificado com bcrypt), já que a `anon key` sozinha não carrega identidade nenhuma. A função de
demo `reset_dados_exemplo` teve o `EXECUTE` revogado de `public` — não é mais alcançável pela API.

Risco residual, aceito por ora: as tabelas (`produtos`, `vendas`, `comercios`, `metas`, etc.) têm
policy `USING(true)` para `anon` — sem uma sessão real (Supabase Auth/JWT), não dá para
restringir por role no banco. Qualquer um com a `anon key` (pública) pode ler/escrever essas
tabelas direto via REST, contornando a UI. Fechar isso de verdade exige adotar Supabase Auth (ver
plano acima) — projeto futuro, não feito nesta rodada.

## Stack recomendada para produção

Next.js + Tailwind + shadcn/ui no front (já em uso), Supabase (PostgreSQL + Auth + RLS +
Realtime + pg_cron) no back, Vercel para hospedagem. Detalhamento completo em
`docs/plano-implementacao.md`.
