/**
 * Modelagem de domínio.
 *
 * Os campos usam snake_case propositalmente: são exatamente as colunas que as
 * tabelas do Supabase (PostgreSQL) terão. Assim, quando a camada de mock for
 * trocada pelo cliente do Supabase, o formato dos objetos não muda — os
 * componentes continuam consumindo os mesmos campos.
 *
 * Convenção de tabelas no Supabase (futuro):
 *   usuarios · produtos · comercios · vendas · metas
 * "AlertaPagamento" é uma projeção derivada de `vendas` (uma view), não uma
 * tabela própria.
 */

export type Perfil = 'admin' | 'vendedor';
export type FormaPagamento = 'a_vista' | 'a_prazo';
export type StatusVenda = 'pago' | 'pendente' | 'vencido';
export type ModoPreco = 'atacado' | 'varejo';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  taxa_comissao: number; // fração aplicada sobre o FATURAMENTO da venda (ex.: 0.14 = 14%)
  meta_individual: number; // meta de faturamento do vendedor no período (R$)
  ativo: boolean;
  criado_em: string; // ISO 8601
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoria: string | null;
  /** null quando o custo ainda não foi informado (ex.: fica só na ficha técnica do escritório). */
  preco_custo: number | null;
  preco_varejo: number;
  preco_atacado: number;
  qtd_min_atacado: number; // limite que dispara o preço de atacado (padrão 10)
  ativo: boolean;
}

export interface Comercio {
  id: string;
  razao_social: string;
  cnpj: string;
  telefone: string;
  regiao: string;
  /** Vendedor "dono" da carteira deste cliente — null quando ainda não atribuído. */
  vendedor_id: string | null;
  ativo: boolean;
}

export interface Venda {
  id: string;
  vendedor_id: string;
  comercio_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  modo_preco: ModoPreco;
  valor_total: number;
  /** null quando o produto vendido não tem custo cadastrado — margem também fica null. */
  custo_total: number | null;
  margem: number | null;
  forma_pagamento: FormaPagamento;
  prazo_dias: number | null;
  data_venda: string; // ISO date (YYYY-MM-DD)
  data_vencimento: string | null;
  status: StatusVenda;
  criado_em: string;
}

/** Projeção derivada de `vendas` para a tela de Lembretes (recebíveis em aberto). */
export interface AlertaPagamento {
  venda_id: string;
  comercio_id: string;
  vendedor_id: string;
  valor: number;
  data_vencimento: string;
  status: Extract<StatusVenda, 'pendente' | 'vencido'>;
  dias_atraso: number;
}

/**
 * Perda/troca registrada numa visita — quando um produto vence no ponto de
 * venda e é substituído por um novo. Não é uma venda (não gera receita nem
 * faturamento real), mas usa o mesmo layout de lançamento por pedido do
 * cliente. `custo_unitario`/`preco_venda_unitario` ficam congelados no
 * momento do registro (mesmo raciocínio de `Venda.preco_unitario`): se o
 * preço do produto mudar depois, o histórico de perdas não pode mudar junto.
 */
export interface Perda {
  id: string;
  comercio_id: string;
  produto_id: string;
  vendedor_id: string;
  quantidade: number;
  /** null quando o produto não tinha custo cadastrado no momento do registro. */
  custo_unitario: number | null;
  preco_venda_unitario: number;
  /** custo_unitario * quantidade — null se custo_unitario for null. */
  valor_custo: number | null;
  /** preco_venda_unitario * quantidade — receita que deixou de ser gerada. */
  valor_faturamento: number;
  data_perda: string; // ISO date (YYYY-MM-DD)
  observacao: string | null;
  criado_em: string;
}

/** Payload aceito ao registrar uma perda (o serviço deriva custo/preço/valores). */
export interface NovaPerdaInput {
  comercio_id: string;
  produto_id: string;
  vendedor_id: string;
  quantidade: number;
  data_perda: string;
  observacao?: string;
}

/**
 * Dimensão escolhida pelo gestor para compor uma Meta:
 *   'geral'        -> um valor único, definido diretamente.
 *   'por_produto'  -> a soma das metas individuais de `MetaProduto` (ver abaixo).
 *   'por_vendedor' -> a soma de `usuarios.meta_individual` dos vendedores ativos
 *                     (mesmo campo usado no progresso individual do Dashboard do
 *                     Vendedor — não é um valor à parte por período).
 * `valor_alvo` sempre reflete o número final usado no cálculo de progresso,
 * qualquer que seja a dimensão escolhida.
 */
export type TipoMeta = 'geral' | 'por_produto' | 'por_vendedor';

/**
 * Periodicidade da meta. O gestor pode ter várias metas simultâneas com
 * janelas diferentes (ex.: uma mensal e uma semanal correndo em paralelo) —
 * por isso `data_inicio`/`data_fim` são explícitos em vez de um rótulo fixo
 * como 'YYYY-MM'. 'personalizado' permite qualquer intervalo escolhido à mão.
 */
export type Periodicidade = 'semanal' | 'mensal' | 'trimestral' | 'personalizado';

export interface Meta {
  id: string;
  nome: string; // rótulo livre, ex.: "Meta de Julho", "Meta da semana"
  periodicidade: Periodicidade;
  data_inicio: string; // YYYY-MM-DD, inclusive
  data_fim: string; // YYYY-MM-DD, inclusive
  dimensao: TipoMeta;
  valor_alvo: number;
  /** Só uma meta é principal por vez — é ela que alimenta o KPI de destaque do Dashboard. */
  principal: boolean;
}

/** Meta de faturamento por produto, associada a uma Meta específica (via meta_id). */
export interface MetaProduto {
  id: string;
  meta_id: string;
  produto_id: string;
  valor_alvo: number;
}

/**
 * Pedido de acesso enviado pela tela de login por quem ainda não tem conta.
 * Fica pendente até o gestor aprovar (vira Usuario + credencial) ou recusar.
 */
export type StatusSolicitacao = 'pendente' | 'aprovado' | 'recusado';

export interface SolicitacaoAcesso {
  id: string;
  nome: string;
  email: string;
  /** Em produção nunca fica em texto puro — aqui só demonstra o fluxo (ver docs/plano-implementacao.md). */
  senha: string;
  status: StatusSolicitacao;
  criado_em: string;
}

/** Payload aceito ao registrar uma venda (o serviço deriva preço/margem/status). */
export interface NovaVendaInput {
  vendedor_id: string;
  comercio_id: string;
  produto_id: string;
  quantidade: number;
  /** Só usado quando quantidade < qtd_min_atacado (preço de varejo negociado). */
  preco_unitario?: number;
  forma_pagamento: FormaPagamento;
  prazo_dias?: number;
}

export interface Sessao {
  usuario: Usuario;
}
