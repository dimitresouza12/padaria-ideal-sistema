# Padaria Ideal — Sistema de Vendas no Atacado

Sistema web de gestão de vendas para a **Padaria Ideal** (desde 1913), fabricante de
produtos de panificação (bolachas, biscoitos) que vende no **atacado** para comércios
parceiros B2B (supermercados, mercearias, outras padarias).

Substitui controle manual por um painel único para registrar vendas, acompanhar contas a
prazo, calcular comissão dos vendedores, definir metas por período e visualizar a saúde do
negócio num dashboard executivo.

## Principais funcionalidades

- **Registro de vendas** com precificação dinâmica (atacado a partir de 10 caixas, preço
  travado automaticamente; varejo negociável abaixo disso) e data da venda editável (para
  lançar com atraso sem distorcer o mês).
- **Vendas a prazo**: geram pendência com vencimento, reclassificação automática para
  "vencido" e baixa de pagamento com um clique. Vendas marcadas como pagas por engano podem
  ser reabertas como pendentes na edição.
- **Comissões**: taxa configurável por vendedor, calculada sobre a margem (não o
  faturamento bruto).
- **Metas** por período (mensal, semanal, trimestral ou personalizado), por valor geral ou
  soma por produto, com acompanhamento de "% vs Meta" no dashboard.
- **Dashboard** do administrador (faturamento, margem, ticket médio, ranking de vendedores e
  regiões, insights automáticos) e do vendedor (vendas do mês, comissão, progresso da meta
  individual).
- **Gestão de equipe e acessos**: cadastro de funcionários, aprovação de solicitações de
  acesso, controle de permissões por perfil (Administrador / Vendedor).
- **Relatórios**: exportação em CSV de vendas, comissões e catálogo de produtos.

## Stack

React + TypeScript + Vite + Tailwind no frontend; Supabase (PostgreSQL + Auth + Row Level
Security) como backend, com Edge Function para as ações administrativas sensíveis
(criação de funcionário, aprovação de acesso, redefinição de senha).

## Como rodar localmente

```bash
npm install
npm run dev
# abre em http://localhost:5173/
```

`npm run build` roda o typecheck (`tsc --noEmit`) antes do build de produção.

Documentação técnica completa (arquitetura, regras de negócio, estado da migração de
segurança) em [`CLAUDE.md`](./CLAUDE.md).
