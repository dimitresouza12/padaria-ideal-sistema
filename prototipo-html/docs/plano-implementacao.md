# Sistema de Gestão de Vendas no Atacado — Padaria (SPA + Plano)

## Contexto

O cliente (padaria que vende bolachas/biscoitos no atacado para comércios B2B) precisa de
um sistema web para operar vendas, precificação por volume, controle de recebimentos a
prazo, comissões e um dashboard executivo. Esta entrega tem **dois artefatos**:

1. **Plano de Implementação** (produção real): arquitetura/stack, modelagem de dados e
   cronograma por fases.
2. **Protótipo SPA funcional**: um único arquivo HTML (Tailwind + JavaScript puro) que
   demonstra na prática todas as regras de negócio, com sidebar, estado centralizado e
   alternador de perfil.

Continuação da sessão anterior (já entreguei um dashboard estático). Reaproveito a
**linguagem visual validada** (paleta testada por script, ERP claro) e agora construo o
sistema completo de 5 abas.

### Decisões de produto confirmadas com o usuário
- **Comissão = % sobre a MARGEM** (preço − custo). Exige `custo` por produto. Acumula na
  hora do registro da venda.
- **Persistência = localStorage** + botão "Restaurar dados de exemplo".
- **Barra de progresso do vendedor = meta INDIVIDUAL** (vendas dele ÷ cota dele).
- Assunção (não perguntada): gráfico de evolução mensal usa meses anteriores em *seed* e o
  mês corrente atualiza ao vivo conforme vendas são registradas.

### Diretrizes de design inegociáveis (do briefing)
- **Sem emojis** em lugar nenhum (UI, botões, abas, logs). Ícones = SVG minimalista (stroke).
- **Textos secos de ERP**: "Confirmar Recebimento", "Atualizar Meta do Período", "Venda
  Registrada", "Dar Baixa". Nada de "Painel Inteligente"/"Sucesso total".
- **Light mode premium**: Inter, alta legibilidade, sombras sutis, cor cirúrgica só para
  alerta de dado (verde acima da meta / vermelho abaixo).
- Nomes fictícios reais do varejo BR: "Supermercado Compre Bem", "Panificadora Silva", etc.
- **Proibido gráfico de pizza.**

---

## ENTREGÁVEL 1 — Plano de Implementação

### 1.1 Arquitetura & Stack (produção)

| Camada | Recomendado | Racional |
|---|---|---|
| App web+mobile | **Next.js (React) + TypeScript como PWA instalável** | Um código serve navegador e celular do vendedor. |
| UI | Tailwind + shadcn/ui; Recharts no app real | Consistente, acessível, rápido. |
| Backend + Banco | **Supabase (PostgreSQL gerenciado)** | Auth + RLS (RBAC no banco) + Realtime + cron numa stack só; ideal p/ PME. |
| RBAC | Supabase Auth + Row Level Security por `role` | Vendedor só vê as próprias vendas; gestor vê tudo — regra no banco. |
| Jobs (vencimento a prazo) | **pg_cron** / Scheduled Edge Function | Varredura diária vira Pendente→Vencido. |
| Tempo real / push | Supabase Realtime + Web Push (FCM) | Lembrete aparece sem refresh e notifica no celular. |
| Hospedagem | Vercel (front) + Supabase (back) | Custo baixo, deploy contínuo. |

Alternativa self-hosted: **NestJS + PostgreSQL + Redis/BullMQ (jobs) + React**. Mais
controle, mais operação — não recomendado no estágio atual.

### 1.2 Modelagem de Dados (entidades · atributos · relacionamentos)

- **users** (id, nome, email, role[`admin`|`seller`], `commission_rate` sobre margem,
  `individual_goal`, ativo) — 1:N com sales e commissions.
- **products** (id, nome, sku, categoria, `cost_price`, `retail_price`, `wholesale_price`,
  `min_wholesale_qty` default 10, ativo). Os 3 preços + o limite sustentam a regra dinâmica.
- **partners/clients** (id, razao_social, cnpj, telefone, `region`, limite_credito, ativo).
- **sales** (id, seller_id→users, client_id→partners, data, total, cost_total, margin_value,
  `payment_method`[`cash`|`term`], `payment_term_days`, `due_date`,
  `status`[`paid`|`pending`|`overdue`]).
- **sale_items** (id, sale_id→sales, product_id→products, quantity, `price_mode`
  [`wholesale`|`retail`], `is_price_locked` bool, `unit_price` snapshot, line_total). ← aqui
  vive a regra <10 / ≥10.
- **commissions** (id, sale_id, seller_id, base=`margin_value`, rate, amount,
  status[`provisioned`|`released`|`paid`]).
- **goals** (id, period, `general_target`; opcional per-seller via users.individual_goal).
- **payment_reminders** (id, sale_id, partner_id, seller_id, amount, due_date,
  status[`pending`|`overdue`|`settled`], days_overdue) — pode ser view sobre sales.

**Regra de preço (no servidor):** `qty >= min_wholesale_qty` → `unit_price=wholesale_price`,
`price_mode=wholesale`, `is_price_locked=true`; senão `unit_price` = livre (sugere
`retail_price`), `price_mode=retail`, `is_price_locked=false`. `unit_price` gravado como
snapshot (auditoria).

**Comissão:** `amount = margin_value * commission_rate` (base margem, não faturamento).

### 1.3 Cronograma por Fases

- **Fase 1 — MVP & Core de Vendas (~2–3 sem):** Auth/RBAC, CRUD Produtos e Clientes,
  Registrar Venda com regra de preço dinâmico, estado e listagens.
- **Fase 2 — Regras de Negócio & Financeiro (~2 sem):** venda A Prazo (status Pendente),
  aba Lembretes + "Dar Baixa", comissão sobre margem, Meta Geral + metas individuais, job
  diário de vencimento.
- **Fase 3 — Dashboard Executivo & Homologação (~2 sem):** 4 KPIs com contexto, gráficos de
  barras (evolução mensal + ranking), 3 insights, alertas por cor, testes/UAT e deploy.
- **Fase 4 (opcional):** PWA/push, relatórios exportáveis, multiusuário avançado.

---

## ENTREGÁVEL 2 — Protótipo SPA (arquivo único)

**Arquivo novo:** `/Users/dimitre/padaria-atacado-sistema.html` (não altera o dashboard
anterior). Roda no navegador; usa Tailwind Play CDN + fonte Inter (fallback system-sans);
JS puro em um `<script>`; sem framework.

### App shell
- **Sidebar fixa à esquerda** (branca, borda hairline) com 5 itens + ícones SVG stroke:
  Dashboard, Registrar Venda, Produtos, Clientes / Comércios, Lembretes de Pagamento.
  Navegação SPA (mostra/oculta `<section>`, sem reload). Item ativo destacado.
- **Topbar discreta** com o alternador de perfil: segmented control
  **Administrador | Funcionário**. Em modo Funcionário, um `select` discreto escolhe o
  vendedor logado. Badge de contagem de pendências.

### Estado centralizado (JS) + persistência
- Objeto `state = { profile, currentSellerId, products[], clients[], sellers[], sales[],
  generalGoal, monthlyHistory[] }`.
- `save()` grava em `localStorage`; `load()` restaura; `seed()` popula dados de exemplo;
  botão **"Restaurar dados de exemplo"**.
- Uma função `render()` central re-desenha a aba ativa; toda mutação chama `save()`+`render()`
  para atualização em tempo real entre telas.

### Dados de exemplo (seed) — nomes reais BR
- Clientes: Supermercado Compre Bem, Panificadora Silva, Mercado Dia a Dia, Empório São
  Jorge, Mercearia Santa Luzia (com CNPJ formatado fictício, telefone, região).
- Produtos (com cost/retail/wholesale/min 10): Bolacha Maria 400g, Biscoito Amanteigado
  300g, Rosquinha de Coco 350g, Bolacha Recheada, Cream Cracker Água e Sal 400g.
- Vendedores: Ana Beatriz Ramos, Carlos Mendes, Rafael Lima, Juliana Alves (rate s/ margem +
  meta individual). Vendas seed (mix à vista/Pago e a prazo/Pendente) + `monthlyHistory`
  Jan–Mai; Jun calculado ao vivo.

### Abas (comportamento e regras)
1. **Dashboard (dinâmico por perfil)**
   - *Administrador:* 4 KPIs com **contexto de comparação** — Faturamento (vs mês anterior),
     % vs Meta (vs Meta Geral), Margem, Ticket Médio. Cor automática: verde ≥ meta /
     vermelho < meta. Gráfico de **colunas** de evolução mensal + **barras** horizontais do
     ranking de funcionários (sem pizza). Campo input **"Atualizar Meta do Período"**
     (edita `generalGoal`, recalcula tudo). Bloco final com **3 insights escritos**
     data-driven: O que cresceu / O que preocupa / Qual ação tomar.
   - *Funcionário:* vendas do mês dele, **comissão acumulada** (Σ margem×rate) e **barra de
     progresso** = vendas dele ÷ **meta individual** dele.
2. **Registrar Venda** — form: Cliente, Produto, Quantidade, Preço Unitário, Forma de
   Pagamento. **Regra JS ao mudar produto/quantidade:** `qty>=10` → aplica
   `wholesale_price` e **bloqueia o campo (readonly)** com etiqueta "Atacado"; `qty<10` →
   sugere `retail_price` e mantém **campo aberto** para negociar. Se pagamento = "A Prazo",
   salva `status='Pendente'` com vencimento; senão "Pago". Feedback: "Venda Registrada".
3. **Produtos** — tabela (nome, custo, preço varejo, preço atacado, qtd mín. atacado) +
   formulário de novo produto.
4. **Clientes / Comércios** — tabela (Nome, CNPJ, Telefone, Região) + formulário de cadastro.
5. **Lembretes de Pagamento** — lista das vendas A Prazo `Pendente` (cliente, vendedor,
   valor, vencimento) com botão **"Dar Baixa"** → `status='Pago'`; atualiza KPIs do
   Dashboard e o badge imediatamente.

### Design tokens (reuso da paleta validada)
- Superfície #ffffff sobre plano #f4f3ef; ink #161511 / #565349 / muted #8b887e; hairline
  #e7e5dd. Acento azul #2a78d6 (dados). Status: verde #0f7a2e / vermelho #b3261e / âmbar
  #8a5a00. Barras usam **um único azul** (comprimento = magnitude; degradê multi-tom foi
  reprovado no validador). Verde/vermelho reservados a meta/inadimplência.

---

## Verificação (após aprovação)

Servir o arquivo por HTTP local (padrão do `.claude/launch.json` — `python3 -m http.server`)
e validar com as ferramentas de preview:
1. Screenshot desktop: sidebar + topbar + dashboard admin (4 KPIs, colunas, ranking, meta,
   3 insights) sem emojis, light mode.
2. Alternar perfil Administrador↔Funcionário: confere painel do vendedor (comissão + barra
   de meta individual).
3. Registrar Venda com `qty=12` → preço trava em atacado (readonly); com `qty=5` → editável.
4. Registrar venda "A Prazo" → aparece em Lembretes como Pendente; "Dar Baixa" → vira Pago e
   os KPIs/badge atualizam ao vivo.
5. Alterar Meta do Período → % vs Meta e cores recalculam.
6. `preview_eval`/`preview_inspect` para confirmar estados de dados e ausência de emojis;
   `preview_resize` mobile para checar responsividade da sidebar.
7. Recarregar a página → dados persistem (localStorage); testar "Restaurar dados de exemplo".
```
