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
Supabase usará quando o backend real entrar (ver `docs/plano-implementacao.md`, dentro de
`prototipo-html/`).

| Caminho | O que é |
|---|---|
| `src/` | Código-fonte do app React (types, services/mock, store Zustand, componentes, features por aba). |
| `public/` | `logoIdeal.PNG` e `logo-wheat-icon.png` — logo real do cliente e o ícone de trigo recortado dele. |
| `prototipo-html/` | **Protótipo anterior** (HTML + Tailwind CDN + JS puro, arquivo único) — mantido como referência histórica do design e das regras de negócio antes da migração para React. Inclui também o plano de implementação original (`docs/plano-implementacao.md`) e um protótipo ainda mais antigo, só do dashboard (`docs/dashboard-padaria-atacado.html`). |

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
  verificação de duplicidade.
- **RBAC**: Administrador tem acesso total (10 abas); Vendedor só vê Dashboard, Registrar
  Venda e Lembretes — e o campo "Vendedor responsável" no formulário de venda fica travado
  no próprio usuário logado.
- **Dashboard do Administrador**: 4 KPIs com contexto (Faturamento, % vs Meta, Margem,
  Ticket Médio), gráfico de evolução mensal, ranking de vendedores e regiões em barras (sem
  gráfico de pizza), e 3 insights escritos (o que cresceu / o que preocupa / qual ação
  tomar) gerados dinamicamente a partir dos dados.
- **Dashboard do Vendedor**: vendas do mês, comissão acumulada e barra de progresso contra
  a **meta individual** do vendedor.
- **Histórico de Vendas**: ledger completo com filtros por vendedor, cliente, produto e
  situação.
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

## Segurança — o que MUDA em produção

Este protótipo faz a validação de login **no navegador**, só para demonstrar o fluxo de
UI. Isso é inseguro por definição e **não deve ir para produção assim**. O plano em
`prototipo-html/docs/plano-implementacao.md` detalha a arquitetura real:

- Senhas com hash **bcrypt** (cost ≥ 12) ou Argon2id — nunca texto puro nem validação
  client-side.
- Autenticação via API com **JWT** (expiração curta) + refresh token em cookie
  `httpOnly, Secure, SameSite`.
- **Row Level Security** no PostgreSQL (recomendação: Supabase) como camada final de RBAC,
  independente da validação da API.
- Upload de logo/branding via **object storage** (Supabase Storage/S3), nunca commitado no
  repositório de código.

## Stack recomendada para produção

Next.js + Tailwind + shadcn/ui no front (já em uso), Supabase (PostgreSQL + Auth + RLS +
Realtime + pg_cron) no back, Vercel para hospedagem. Detalhamento completo em
`prototipo-html/docs/plano-implementacao.md`.
