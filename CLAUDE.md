# Padaria Ideal — Sistema de Vendas no Atacado

## Contexto do negócio

A **Padaria Ideal** (desde 1913) vende produtos de panificação (bolachas, biscoitos) no
**atacado** para comércios parceiros B2B (supermercados, mercearias, outras padarias).
Este repositório contém o protótipo funcional de um sistema web para gerenciar essa
operação: vendedores, precificação por volume, contas a prazo, comissões e um dashboard
executivo para o gestor.

## Arquivos do repositório

| Arquivo | O que é |
|---|---|
| `padaria-atacado-sistema.html` | **Entregável principal.** SPA completa em arquivo único (HTML + Tailwind CDN + JavaScript puro): login, RBAC (Administrador/Vendedor), CRUD de produtos e clientes, registro de vendas com regra de preço dinâmico, lembretes de pagamento e dashboard por perfil. |
| `logoIdeal.PNG` | Logo real do cliente, usado na tela de login. |
| `logo-wheat-icon.png` | Ícone de trigo recortado do logo original (fundo transparente), usado no badge pequeno da sidebar e no fallback do login. |
| `docs/plano-implementacao.md` | Plano de arquitetura para a versão de produção: stack recomendada, modelagem de dados completa e cronograma por fases. |
| `docs/dashboard-padaria-atacado.html` | Protótipo anterior, **somente o dashboard executivo** (sem login, sem CRUD) — mantido como referência histórica do processo de design. Usa o nome fictício "Padaria São Joaquim" (anterior à integração do logo real do cliente). |

## Como rodar

Arquivo estático, sem build. Basta servir a pasta e abrir no navegador:

```bash
python3 -m http.server 8747
# depois abra http://localhost:8747/padaria-atacado-sistema.html
```

Não usar `file://` diretamente — o `fetch`/carregamento de imagens relativas
(`logoIdeal.PNG`, `logo-wheat-icon.png`) funciona melhor via HTTP.

## Credenciais de demonstração

⚠️ **Hardcoded no JavaScript do cliente** — válido apenas para protótipo/demo, nunca em
produção (ver seção "Segurança" abaixo).

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@padaria.com` | `admin123` |
| Vendedor | `vendedor@padaria.com` | `venda123` |

## Regras de negócio implementadas

- **Precificação dinâmica**: ao registrar uma venda, se a quantidade for **≥ 10 caixas**,
  o preço de atacado é aplicado automaticamente e o campo fica travado (somente leitura).
  Abaixo de 10, o campo permanece aberto para o vendedor negociar o valor (varejo).
- **Comissão sobre margem**: cada vendedor tem uma taxa de comissão aplicada sobre a
  **margem** da venda (preço − custo), não sobre o faturamento bruto.
- **Vendas a prazo**: ao marcar pagamento "A Prazo", a venda recebe status `Pendente` e
  uma data de vencimento. Um job local (`recomputeOverdue`) reclassifica vendas vencidas
  para `Vencido` a cada carregamento. A aba **Lembretes de Pagamento** lista tudo que está
  pendente/vencido, com botão "Dar Baixa" que atualiza o status e os KPIs em tempo real.
- **RBAC**: Administrador tem acesso total (5 abas); Vendedor só vê Dashboard, Registrar
  Venda e Lembretes — e o campo "Vendedor responsável" no formulário de venda fica travado
  no próprio usuário logado.
- **Dashboard do Administrador**: 4 KPIs com contexto (Faturamento, % vs Meta, Margem,
  Ticket Médio), gráfico de evolução mensal em colunas, ranking de vendedores e regiões em
  barras (sem gráfico de pizza), campo para atualizar a Meta do Período, e 3 insights
  escritos (o que cresceu / o que preocupa / qual ação tomar) — gerados dinamicamente a
  partir dos dados, não fixos.
- **Dashboard do Vendedor**: vendas do mês, comissão acumulada e barra de progresso contra
  a **meta individual** do vendedor.

## Estado e persistência

Todo o estado (produtos, clientes, vendedores, vendas, meta geral) vive em um objeto
JavaScript único (`state`) e é persistido em `localStorage` (`padaria_atacado_v1`). Não há
backend — a sessão de login também é só em memória (`session`), por isso um refresh da
página sempre volta para a tela de login. O botão "Restaurar dados de exemplo" reseta o
`localStorage` para o dataset fictício inicial.

## Design system

Paleta "Padaria Premium" — abandona o azul genérico de tecnologia:

- Fundo creme (`#faf8f5`), texto café profundo (`#2e2520`), acentos em trigo/dourado fosco
  (`#8c6239` bronze para botões e barras de dados, `#c5a059` dourado para detalhes de marca).
- Verde/vermelho são **reservados exclusivamente** para alertas de dado (acima/abaixo da
  meta, vencido/no prazo) — nunca usados decorativamente.
- Tipografia: Inter (sans, todo o app) + Playfair Display (serifada, só no wordmark do
  login) — Google Fonts via `<link>`.
- Sem emojis em nenhum ponto da interface; ícones são SVG minimalista (stroke).
- Paleta validada para contraste/CVD com a skill `dataviz` do Claude Code antes da
  implementação (ver histórico do projeto).

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

## Stack recomendada para produção

Ver `docs/plano-implementacao.md` para o detalhamento completo. Resumo: Next.js + Tailwind
+ shadcn/ui no front, Supabase (PostgreSQL + Auth + RLS + Realtime + pg_cron) no back,
Vercel para hospedagem.
