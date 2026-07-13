/**
 * IMPLEMENTAÇÃO SUPABASE da interface `DataApi`.
 *
 * Mesmo contrato do mock (services/mock/mockData.ts): mesmas assinaturas, mesmos
 * tipos de retorno, mesmas mensagens de erro e as MESMAS regras de negócio
 * (precificação, baixa, reclassificação de vencidos, metas). Trocar o export em
 * services/api.ts para `supabaseApi` faz o app inteiro passar a usar o Postgres
 * sem alterar nenhum componente.
 */
import type { PostgrestResponse, PostgrestSingleResponse } from '@supabase/supabase-js';
import type {
  AlertaPagamento,
  Comercio,
  Meta,
  MetaProduto,
  NovaVendaInput,
  Periodicidade,
  PontoHistorico,
  Produto,
  Sessao,
  SolicitacaoAcesso,
  TipoMeta,
  Usuario,
  Venda,
} from '@/types';
import { resolverPreco } from '@/lib/pricing';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type MetaUpdate = Database['public']['Tables']['metas']['Update'];

/**
 * Data de referência do protótipo — idêntica à do mock (mockData.ts).
 * Mantida pinada para que o dataset de exemplo, os períodos de meta e o cálculo
 * de vencidos continuem consistentes. Em produção, troque por `new Date()`.
 */
const HOJE = '2026-07-28';

/* ------------------------------------------------------------------ *
 * Helpers — desembrulham o `{ data, error }` do supabase-js, lançando
 * o erro. Um por formato de resposta para preservar a nulabilidade certa.
 * ------------------------------------------------------------------ */
function rows<T>(res: PostgrestResponse<T>): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
function row<T>(res: PostgrestSingleResponse<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}
// Para `.maybeSingle()`, T já resolve para `Row | null` (ver PostgrestBuilder),
// então basta devolver T — parametrizar como `T | null` faz o TS inferir `never`.
function maybe<T>(res: PostgrestSingleResponse<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const somarDias = (iso: string, dias: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const diasEntre = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/** Reclassifica vendas a prazo pendentes já vencidas (equivale ao normalizarVencidos do mock). */
async function normalizarVencidos(): Promise<void> {
  const { error } = await supabase
    .from('vendas')
    .update({ status: 'vencido' })
    .eq('status', 'pendente')
    .lt('data_vencimento', HOJE);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */
export const supabaseApi = {
  /* auth — login = primeiro nome da pessoa. A verificação da senha (bcrypt)
   * acontece no Postgres, via função SECURITY DEFINER: a tabela `credenciais`
   * e o hash nunca são expostos à API. Retorna 0 ou 1 linha. */
  async login(login: string, senha: string): Promise<Sessao> {
    const { data, error } = await supabase.rpc('fazer_login', { p_login: login, p_senha: senha });
    if (error) throw new Error(error.message);
    const usuario = data?.[0];
    if (!usuario) throw new Error('Credenciais inválidas');
    return { usuario };
  },

  /* usuários / vendedores */
  async listarUsuarios(): Promise<Usuario[]> {
    return rows(await supabase.from('usuarios').select('*').order('criado_em', { ascending: true }));
  },
  async listarVendedores(): Promise<Usuario[]> {
    return rows(
      await supabase
        .from('usuarios')
        .select('*')
        .eq('perfil', 'vendedor')
        .order('criado_em', { ascending: true }),
    );
  },
  async criarFuncionario(input: {
    nome: string;
    email: string;
    senha: string;
    taxa_comissao: number;
    meta_individual: number;
    adminLogin: string;
    adminSenha: string;
  }): Promise<Usuario> {
    // Cria usuário + credencial (senha em hash) numa transação no servidor;
    // a checagem de login duplicado, o hash e a confirmação de que quem chamou
    // é de fato um admin (login+senha revalidados via bcrypt) ficam na função
    // do Postgres — necessário porque a chave anon é pública no bundle e não
    // carrega identidade de sessão nenhuma.
    const { data, error } = await supabase.rpc('criar_funcionario', {
      p_nome: input.nome,
      p_email: input.email,
      p_senha: input.senha,
      p_taxa: input.taxa_comissao,
      p_meta: input.meta_individual,
      p_admin_login: input.adminLogin,
      p_admin_senha: input.adminSenha,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Não foi possível cadastrar o funcionário.');
    return data;
  },
  async alterarSenha(
    loginAlvo: string,
    senhaNova: string,
    adminLogin: string,
    adminSenha: string,
  ): Promise<void> {
    const { error } = await supabase.rpc('alterar_senha', {
      p_login_alvo: loginAlvo,
      p_senha_nova: senhaNova,
      p_admin_login: adminLogin,
      p_admin_senha: adminSenha,
    });
    if (error) throw new Error(error.message);
  },
  async atualizarFuncionario(
    id: string,
    input: { taxa_comissao: number; meta_individual: number },
  ): Promise<Usuario> {
    const usuario = maybe(
      await supabase
        .from('usuarios')
        .update({ taxa_comissao: input.taxa_comissao, meta_individual: input.meta_individual })
        .eq('id', id)
        .select('*')
        .maybeSingle(),
    );
    if (!usuario) throw new Error('Funcionário não encontrado');
    return usuario;
  },

  /* solicitações de acesso — a senha é gravada em hash pela função; a resposta
   * nunca traz o hash (a função retorna só colunas seguras). */
  async solicitarAcesso(nome: string, email: string, senha: string): Promise<SolicitacaoAcesso> {
    const { data, error } = await supabase.rpc('solicitar_acesso', {
      p_nome: nome,
      p_email: email,
      p_senha: senha,
    });
    if (error) throw new Error(error.message);
    const row0 = data?.[0];
    if (!row0) throw new Error('Não foi possível enviar a solicitação.');
    return { ...row0, senha: '' };
  },
  async listarSolicitacoes(): Promise<SolicitacaoAcesso[]> {
    // A coluna senha_hash não é acessível pela API (RLS/grants); só colunas seguras.
    const linhas = rows(
      await supabase
        .from('solicitacoes_acesso')
        .select('id, nome, email, status, criado_em')
        .order('criado_em', { ascending: false }),
    );
    return linhas.map((s) => ({ ...s, senha: '' }));
  },
  async aprovarSolicitacao(
    id: string,
    extras: { taxa_comissao: number; meta_individual: number },
    adminLogin: string,
    adminSenha: string,
  ): Promise<Usuario> {
    // A função cria usuário + credencial reaproveitando o hash já guardado.
    const { data, error } = await supabase.rpc('aprovar_solicitacao', {
      p_id: id,
      p_taxa: extras.taxa_comissao,
      p_meta: extras.meta_individual,
      p_admin_login: adminLogin,
      p_admin_senha: adminSenha,
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('Solicitação não encontrada');
    return data;
  },
  async recusarSolicitacao(id: string, adminLogin: string, adminSenha: string): Promise<void> {
    const { error } = await supabase.rpc('recusar_solicitacao', {
      p_id: id,
      p_admin_login: adminLogin,
      p_admin_senha: adminSenha,
    });
    if (error) throw new Error(error.message);
  },

  /* produtos */
  async listarProdutos(): Promise<Produto[]> {
    return rows(await supabase.from('produtos').select('*').order('id', { ascending: true }));
  },
  async criarProduto(input: Omit<Produto, 'id' | 'ativo'>): Promise<Produto> {
    return row(
      await supabase
        .from('produtos')
        .insert({ ...input, ativo: true })
        .select('*')
        .single(),
    );
  },
  async atualizarProduto(id: string, input: Omit<Produto, 'id' | 'ativo'>): Promise<Produto> {
    const produto = maybe(
      await supabase.from('produtos').update(input).eq('id', id).select('*').maybeSingle(),
    );
    if (!produto) throw new Error('Produto não encontrado');
    return produto;
  },
  async removerProduto(id: string): Promise<void> {
    const produto = maybe(
      await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    );
    if (!produto) throw new Error('Produto não encontrado');
  },

  /* comércios */
  async listarComercios(): Promise<Comercio[]> {
    return rows(await supabase.from('comercios').select('*').order('id', { ascending: true }));
  },
  async criarComercio(input: Omit<Comercio, 'id' | 'ativo'>): Promise<Comercio> {
    return row(
      await supabase
        .from('comercios')
        .insert({ ...input, ativo: true })
        .select('*')
        .single(),
    );
  },

  /* vendas */
  async listarVendas(): Promise<Venda[]> {
    await normalizarVencidos();
    return rows(
      await supabase.from('vendas').select('*').order('data_venda', { ascending: false }),
    );
  },
  async registrarVenda(input: NovaVendaInput): Promise<Venda> {
    const produto = maybe(
      await supabase.from('produtos').select('*').eq('id', input.produto_id).maybeSingle(),
    );
    if (!produto) throw new Error('Produto não encontrado');

    const { preco_unitario, modo_preco } = resolverPreco(
      produto,
      input.quantidade,
      input.preco_unitario,
    );
    const valor_total = preco_unitario * input.quantidade;
    const custo_total = produto.preco_custo * input.quantidade;
    const data_vencimento =
      input.forma_pagamento === 'a_prazo' ? somarDias(HOJE, input.prazo_dias ?? 7) : null;

    return row(
      await supabase
        .from('vendas')
        .insert({
          vendedor_id: input.vendedor_id,
          comercio_id: input.comercio_id,
          produto_id: input.produto_id,
          quantidade: input.quantidade,
          preco_unitario,
          modo_preco,
          valor_total,
          custo_total,
          margem: valor_total - custo_total,
          forma_pagamento: input.forma_pagamento,
          prazo_dias: input.forma_pagamento === 'a_prazo' ? input.prazo_dias ?? 7 : null,
          data_venda: HOJE,
          data_vencimento,
          status: input.forma_pagamento === 'a_prazo' ? 'pendente' : 'pago',
        })
        .select('*')
        .single(),
    );
  },
  async darBaixaPagamento(vendaId: string): Promise<Venda> {
    const venda = maybe(
      await supabase
        .from('vendas')
        .update({ status: 'pago' })
        .eq('id', vendaId)
        .select('*')
        .maybeSingle(),
    );
    if (!venda) throw new Error('Venda não encontrada');
    return venda;
  },
  async listarAlertas(): Promise<AlertaPagamento[]> {
    await normalizarVencidos();
    const abertos = rows(
      await supabase.from('vendas').select('*').in('status', ['pendente', 'vencido']),
    );
    const alertas: AlertaPagamento[] = abertos.map((v) => ({
      venda_id: v.id,
      comercio_id: v.comercio_id,
      vendedor_id: v.vendedor_id,
      valor: v.valor_total,
      data_vencimento: v.data_vencimento!,
      status: v.status as AlertaPagamento['status'],
      dias_atraso:
        v.data_vencimento && v.data_vencimento < HOJE ? diasEntre(v.data_vencimento, HOJE) : 0,
    }));
    alertas.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    return alertas;
  },

  /* metas */
  async listarMetas(): Promise<Meta[]> {
    return rows(await supabase.from('metas').select('*'));
  },
  async criarMeta(input: {
    nome: string;
    periodicidade: Periodicidade;
    data_inicio: string;
    data_fim: string;
  }): Promise<Meta> {
    const { count } = await supabase.from('metas').select('id', { count: 'exact', head: true });
    return row(
      await supabase
        .from('metas')
        .insert({
          nome: input.nome.trim(),
          periodicidade: input.periodicidade,
          data_inicio: input.data_inicio,
          data_fim: input.data_fim,
          dimensao: 'geral',
          valor_alvo: 0,
          principal: (count ?? 0) === 0, // a primeira meta nasce principal
        })
        .select('*')
        .single(),
    );
  },
  async atualizarMeta(
    id: string,
    input: Partial<Pick<Meta, 'nome' | 'data_inicio' | 'data_fim' | 'valor_alvo'>>,
  ): Promise<Meta> {
    const patch: MetaUpdate = { ...input };
    if ('valor_alvo' in input) patch.dimensao = 'geral';
    const meta = maybe(
      await supabase.from('metas').update(patch).eq('id', id).select('*').maybeSingle(),
    );
    if (!meta) throw new Error('Meta não encontrada');
    return meta;
  },
  async removerMeta(id: string): Promise<void> {
    const meta = maybe(await supabase.from('metas').select('principal').eq('id', id).maybeSingle());
    if (!meta) throw new Error('Meta não encontrada');
    if (meta.principal) {
      throw new Error('A meta principal não pode ser removida — torne outra principal primeiro.');
    }
    const { error } = await supabase.from('metas').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },
  async definirMetaPrincipal(id: string): Promise<Meta[]> {
    let res = await supabase.from('metas').update({ principal: false }).neq('id', id);
    if (res.error) throw new Error(res.error.message);
    res = await supabase.from('metas').update({ principal: true }).eq('id', id);
    if (res.error) throw new Error(res.error.message);
    return rows(await supabase.from('metas').select('*'));
  },
  async definirDimensaoMeta(id: string, dimensao: TipoMeta): Promise<Meta> {
    const patch: MetaUpdate = { dimensao };
    if (dimensao === 'por_produto') {
      const linhas = rows(
        await supabase.from('metas_produtos').select('valor_alvo').eq('meta_id', id),
      );
      patch.valor_alvo = linhas.reduce((acc, m) => acc + m.valor_alvo, 0);
    }
    const meta = maybe(
      await supabase.from('metas').update(patch).eq('id', id).select('*').maybeSingle(),
    );
    if (!meta) throw new Error('Meta não encontrada');
    return meta;
  },
  async listarMetasProdutos(metaId: string): Promise<MetaProduto[]> {
    return rows(await supabase.from('metas_produtos').select('*').eq('meta_id', metaId));
  },
  async atualizarMetaProduto(
    metaId: string,
    produtoId: string,
    valor_alvo: number,
  ): Promise<MetaProduto[]> {
    const existente = maybe(
      await supabase
        .from('metas_produtos')
        .select('id')
        .eq('meta_id', metaId)
        .eq('produto_id', produtoId)
        .maybeSingle(),
    );
    if (existente) {
      row(
        await supabase
          .from('metas_produtos')
          .update({ valor_alvo })
          .eq('id', existente.id)
          .select('id')
          .single(),
      );
    } else {
      row(
        await supabase
          .from('metas_produtos')
          .insert({ meta_id: metaId, produto_id: produtoId, valor_alvo })
          .select('id')
          .single(),
      );
    }

    // Se a meta-pai é por produto, o total dela é a soma das linhas.
    const meta = maybe(
      await supabase.from('metas').select('dimensao').eq('id', metaId).maybeSingle(),
    );
    if (meta?.dimensao === 'por_produto') {
      const linhas = rows(
        await supabase.from('metas_produtos').select('valor_alvo').eq('meta_id', metaId),
      );
      const soma = linhas.reduce((acc, m) => acc + m.valor_alvo, 0);
      row(
        await supabase
          .from('metas')
          .update({ valor_alvo: soma })
          .eq('id', metaId)
          .select('id')
          .single(),
      );
    }
    return rows(await supabase.from('metas_produtos').select('*').eq('meta_id', metaId));
  },
  async obterHistorico(): Promise<PontoHistorico[]> {
    const linhas = rows(
      await supabase
        .from('historico_mensal')
        .select('rotulo, total')
        .order('ordem', { ascending: true }),
    );
    return linhas.map((l) => ({ rotulo: l.rotulo, total: l.total }));
  },

  /* utilitário de demonstração — reseta o banco para o seed via função no Postgres */
  async restaurarExemplo(): Promise<void> {
    const { error } = await supabase.rpc('reset_dados_exemplo');
    if (error) throw new Error(error.message);
  },
};

export type SupabaseApi = typeof supabaseApi;
