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
  MetricaMeta,
  NovaPerdaInput,
  NovaVendaInput,
  NovaVisitaInput,
  Perda,
  Periodicidade,
  Produto,
  Sessao,
  SolicitacaoAcesso,
  TipoMeta,
  Usuario,
  Venda,
  Visita,
} from '@/types';
import { resolverPreco } from '@/lib/pricing';
import { supabase } from './supabaseClient';
import type { Database } from './database.types';

type MetaUpdate = Database['public']['Tables']['metas']['Update'];

/** Data de hoje (America/Sao_Paulo seria mais preciso, mas o servidor roda em UTC
 * e a granularidade de dia já é suficiente para vencimento/lembretes). */
const HOJE = new Date().toISOString().slice(0, 10);

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

/**
 * Arredonda para 2 casas decimais antes de gravar valores monetários.
 * Sem isso, `preco_unitario * quantidade` em ponto flutuante pode gerar ruído
 * (ex.: 5.2 * 3 = 15.600000000000001) que o Postgres grava literalmente na
 * coluna `numeric` (sem escala fixa) — e a CHECK `vendas_valor_consistente`
 * rejeita o insert porque `preco_unitario * quantidade`, recalculado pelo
 * Postgres com aritmética decimal exata, não bate byte a byte com o valor
 * "sujo" enviado pelo JS.
 */
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Reclassifica vendas a prazo pendentes já vencidas (equivale ao normalizarVencidos do mock). */
async function normalizarVencidos(): Promise<void> {
  const { error } = await supabase
    .from('vendas')
    .update({ status: 'vencido' })
    .eq('status', 'pendente')
    .lt('data_vencimento', HOJE);
  if (error) throw new Error(error.message);
}

/** Soma de `meta_individual` dos vendedores ativos — usada pela dimensão "por_vendedor". */
async function somaMetaIndividualVendedores(): Promise<number> {
  const linhas = rows(
    await supabase.from('usuarios').select('meta_individual').eq('perfil', 'vendedor').eq('ativo', true),
  );
  return linhas.reduce((acc, u) => acc + u.meta_individual, 0);
}

/**
 * Invoca a Edge Function `admin-acoes` (única peça de servidor do projeto) —
 * usada para as ações que precisam da Admin API do Supabase Auth
 * (service_role), que não pode rodar no navegador. O JWT da sessão atual é
 * anexado automaticamente pelo supabase-js; a função valida no servidor que
 * quem chama é de fato um admin ativo antes de fazer qualquer coisa.
 */
async function chamarAdminAcoes<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-acoes', {
    body: { action, ...payload },
  });
  if (error) {
    // FunctionsHttpError traz a resposta original (com a mensagem amigável)
    // em `context`; cai para a mensagem genérica só se não conseguir lê-la.
    const context = (error as { context?: Response }).context;
    if (context) {
      try {
        const body = await context.clone().json();
        if (body?.error) throw new Error(body.error);
      } catch {
        /* segue para o erro genérico abaixo */
      }
    }
    throw new Error(error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data as T;
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */
export const supabaseApi = {
  /* auth — login = primeiro nome da pessoa. Um RPC público resolve o e-mail
   * correspondente (o Supabase Auth exige e-mail), depois a sessão real é
   * aberta via signInWithPassword — o JWT resultante é o que autoriza tudo
   * daqui pra frente (RLS por role, Edge Function). */
  async login(login: string, senha: string): Promise<Sessao> {
    const { data: email, error: lookupError } = await supabase.rpc('obter_email_por_login', {
      p_login: login,
    });
    if (lookupError || !email) throw new Error('Credenciais inválidas');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });
    if (authError || !authData.user) throw new Error('Credenciais inválidas');

    const usuario = maybe(
      await supabase.from('usuarios').select('*').eq('auth_user_id', authData.user.id).maybeSingle(),
    );
    if (!usuario || !usuario.ativo) {
      await supabase.auth.signOut();
      throw new Error('Credenciais inválidas');
    }
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
  /** `adminLogin` não é mais verificado aqui — a identidade de quem chama já
   * vem do JWT da sessão, checado dentro da Edge Function (`admin-acoes`),
   * que usa a service_role key para criar o usuário real no Supabase Auth
   * (Admin API, só roda no servidor). */
  async criarFuncionario(input: {
    nome: string;
    email: string;
    senha: string;
    taxa_comissao: number;
    meta_individual: number;
    adminLogin: string;
  }): Promise<Usuario> {
    const { usuario } = await chamarAdminAcoes<{ usuario: Usuario }>('criar_funcionario', {
      nome: input.nome,
      email: input.email,
      senha: input.senha,
      taxa_comissao: input.taxa_comissao,
      meta_individual: input.meta_individual,
    });
    return usuario;
  },
  /** Troca da própria senha: reautentica com a senha atual antes de trocar
   * (equivalente a exigir a senha atual, mas via Supabase Auth de verdade). */
  async alterarMinhaSenha(senhaAtual: string, senhaNova: string, loginAtual: string): Promise<void> {
    const { data: email, error: lookupError } = await supabase.rpc('obter_email_por_login', {
      p_login: loginAtual,
    });
    if (lookupError || !email) throw new Error('Não foi possível confirmar sua identidade.');
    const { error: reauthError } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
    if (reauthError) throw new Error('Senha atual incorreta.');
    const { error } = await supabase.auth.updateUser({ password: senhaNova });
    if (error) throw new Error(error.message);
  },
  /** Admin redefine a senha de um funcionário — via Edge Function (Admin API,
   * service_role), já que só ela pode alterar a senha de outra pessoa. */
  async alterarSenhaFuncionario(usuarioId: string, senhaNova: string): Promise<void> {
    await chamarAdminAcoes('alterar_senha_funcionario', { usuarioId, senhaNova });
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
    _adminLogin: string,
  ): Promise<{ usuario: Usuario; senhaTemporaria?: string }> {
    // A senha que a pessoa escolheu ao pedir acesso virou hash bcrypt
    // (irrecuperável) — a Edge Function gera uma senha provisória nova para
    // a conta real do Supabase Auth e devolve aqui para o admin repassar.
    return chamarAdminAcoes('aprovar_solicitacao', {
      id,
      taxa_comissao: extras.taxa_comissao,
      meta_individual: extras.meta_individual,
    });
  },
  async recusarSolicitacao(id: string, _adminLogin: string): Promise<void> {
    await chamarAdminAcoes('recusar_solicitacao', { id });
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
  async atualizarComercio(id: string, input: Omit<Comercio, 'id' | 'ativo'>): Promise<Comercio> {
    const comercio = maybe(
      await supabase.from('comercios').update(input).eq('id', id).select('*').maybeSingle(),
    );
    if (!comercio) throw new Error('Comércio não encontrado');
    return comercio;
  },
  async removerComercio(id: string): Promise<void> {
    const comercio = maybe(
      await supabase
        .from('comercios')
        .update({ ativo: false })
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    );
    if (!comercio) throw new Error('Comércio não encontrado');
  },
  async reativarComercio(id: string): Promise<void> {
    const comercio = maybe(
      await supabase
        .from('comercios')
        .update({ ativo: true })
        .eq('id', id)
        .select('id')
        .maybeSingle(),
    );
    if (!comercio) throw new Error('Comércio não encontrado');
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
    const valor_total = round2(preco_unitario * input.quantidade);
    const custo_total = produto.preco_custo != null ? round2(produto.preco_custo * input.quantidade) : null;
    const data_venda = input.data_venda ?? HOJE;
    const data_vencimento =
      input.forma_pagamento === 'a_prazo' ? somarDias(data_venda, input.prazo_dias ?? 7) : null;

    return row(
      await supabase
        .from('vendas')
        .insert({
          pedido_id: input.pedido_id ?? crypto.randomUUID(),
          vendedor_id: input.vendedor_id,
          comercio_id: input.comercio_id,
          produto_id: input.produto_id,
          quantidade: input.quantidade,
          preco_unitario,
          modo_preco,
          valor_total,
          custo_total,
          margem: custo_total != null ? round2(valor_total - custo_total) : null,
          forma_pagamento: input.forma_pagamento,
          prazo_dias: input.forma_pagamento === 'a_prazo' ? input.prazo_dias ?? 7 : null,
          data_venda,
          data_vencimento,
          status: input.forma_pagamento === 'a_prazo' ? 'pendente' : 'pago',
          entregue: input.forma_pagamento !== 'a_prazo',
          data_pagamento: input.forma_pagamento === 'a_prazo' ? null : data_venda,
        })
        .select('*')
        .single(),
    );
  },
  /**
   * Corrige uma venda já registrada. Recalcula preço/margem/vencimento com a
   * mesma regra de `registrarVenda`. Se a venda já estava paga (baixa manual)
   * e a forma de pagamento continua "a prazo", preserva o status pago —
   * editar não deve reabrir uma cobrança já quitada.
   */
  async atualizarVenda(
    vendaId: string,
    input: NovaVendaInput & { data_venda?: string; status?: 'pago' | 'pendente' },
  ): Promise<Venda> {
    const vendaAtual = maybe(
      await supabase.from('vendas').select('*').eq('id', vendaId).maybeSingle(),
    );
    if (!vendaAtual) throw new Error('Venda não encontrada');
    const produto = maybe(
      await supabase.from('produtos').select('*').eq('id', input.produto_id).maybeSingle(),
    );
    if (!produto) throw new Error('Produto não encontrado');

    const { preco_unitario, modo_preco } = resolverPreco(
      produto,
      input.quantidade,
      input.preco_unitario,
    );
    const valor_total = round2(preco_unitario * input.quantidade);
    const custo_total = produto.preco_custo != null ? round2(produto.preco_custo * input.quantidade) : null;
    const data_venda = input.data_venda ?? vendaAtual.data_venda;
    const data_vencimento =
      input.forma_pagamento === 'a_prazo' ? somarDias(data_venda, input.prazo_dias ?? 7) : null;

    let status: Venda['status'];
    if (input.forma_pagamento === 'a_vista') {
      status = 'pago';
    } else if (input.status === 'pendente') {
      status = data_vencimento && data_vencimento < HOJE ? 'vencido' : 'pendente';
    } else if (input.status === 'pago' || vendaAtual.status === 'pago') {
      status = 'pago';
    } else {
      status = data_vencimento && data_vencimento < HOJE ? 'vencido' : 'pendente';
    }
    // Mesma lógica de `entregue`: pagamento e venda são o mesmo evento quando
    // vira à vista; reabrir como pendente limpa a data; ficar pago preserva a
    // data já registrada (não é um pagamento novo acontecendo agora).
    const data_pagamento: string | null =
      status !== 'pago' ? null : input.forma_pagamento === 'a_vista' ? data_venda : vendaAtual.status === 'pago' ? vendaAtual.data_pagamento : HOJE;

    const venda = maybe(
      await supabase
        .from('vendas')
        .update({
          vendedor_id: input.vendedor_id,
          comercio_id: input.comercio_id,
          produto_id: input.produto_id,
          quantidade: input.quantidade,
          preco_unitario,
          modo_preco,
          valor_total,
          custo_total,
          margem: custo_total != null ? round2(valor_total - custo_total) : null,
          forma_pagamento: input.forma_pagamento,
          prazo_dias: input.forma_pagamento === 'a_prazo' ? input.prazo_dias ?? 7 : null,
          data_venda,
          data_vencimento,
          status,
          entregue: input.forma_pagamento !== 'a_prazo' ? true : vendaAtual.entregue,
          data_pagamento,
        })
        .eq('id', vendaId)
        .select('*')
        .maybeSingle(),
    );
    if (!venda) throw new Error('Venda não encontrada');
    return venda;
  },
  async removerVenda(vendaId: string): Promise<void> {
    const { error, count } = await supabase
      .from('vendas')
      .delete({ count: 'exact' })
      .eq('id', vendaId);
    if (error) throw new Error(error.message);
    if (!count) throw new Error('Venda não encontrada');
  },
  async darBaixaPagamento(vendaId: string): Promise<Venda> {
    const venda = maybe(
      await supabase
        .from('vendas')
        .update({ status: 'pago', data_pagamento: HOJE })
        .eq('id', vendaId)
        .select('*')
        .maybeSingle(),
    );
    if (!venda) throw new Error('Venda não encontrada');
    return venda;
  },
  async darBaixaPagamentoEmLote(vendaIds: string[]): Promise<void> {
    const { data, error } = await supabase
      .from('vendas')
      .update({ status: 'pago', data_pagamento: HOJE })
      .in('id', vendaIds)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length !== vendaIds.length) throw new Error('Venda não encontrada');
  },
  async marcarEntregueEmLote(vendaIds: string[]): Promise<void> {
    const { data, error } = await supabase
      .from('vendas')
      .update({ entregue: true })
      .in('id', vendaIds)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length !== vendaIds.length) throw new Error('Venda não encontrada');
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

  /* perdas — trocas de produto vencido registradas em visita (não é venda) */
  async listarPerdas(): Promise<Perda[]> {
    return rows(
      await supabase.from('perdas').select('*').order('data_perda', { ascending: false }),
    );
  },
  async registrarPerda(input: NovaPerdaInput): Promise<Perda> {
    const produto = maybe(
      await supabase.from('produtos').select('*').eq('id', input.produto_id).maybeSingle(),
    );
    if (!produto) throw new Error('Produto não encontrado');

    // Congela os preços vigentes do produto na linha — igual a `vendas`, para
    // que uma mudança futura de preço não reescreva o histórico de perdas.
    // Preço de venda de referência é o varejo (perda não é negociada como uma
    // venda real).
    const custo_unitario = produto.preco_custo;
    const preco_venda_unitario = produto.preco_varejo;
    const valor_custo = custo_unitario != null ? round2(custo_unitario * input.quantidade) : null;
    const valor_faturamento = round2(preco_venda_unitario * input.quantidade);

    return row(
      await supabase
        .from('perdas')
        .insert({
          comercio_id: input.comercio_id,
          produto_id: input.produto_id,
          vendedor_id: input.vendedor_id,
          quantidade: input.quantidade,
          custo_unitario,
          preco_venda_unitario,
          valor_custo,
          valor_faturamento,
          data_perda: input.data_perda,
          observacao: input.observacao?.trim() || null,
        })
        .select('*')
        .single(),
    );
  },
  async removerPerda(id: string): Promise<void> {
    const { error, count } = await supabase.from('perdas').delete({ count: 'exact' }).eq('id', id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error('Perda não encontrada');
  },

  /* visitas — "passei e não vendi", registrado à parte de venda/perda. A meta
   * de visitas soma as três fontes (ver src/lib/metas.ts). */
  async listarVisitas(): Promise<Visita[]> {
    return rows(await supabase.from('visitas').select('*').order('data_visita', { ascending: false }));
  },
  async registrarVisita(input: NovaVisitaInput): Promise<Visita> {
    return row(
      await supabase
        .from('visitas')
        .insert({
          comercio_id: input.comercio_id,
          vendedor_id: input.vendedor_id,
          data_visita: input.data_visita,
          observacao: input.observacao?.trim() || null,
        })
        .select('*')
        .single(),
    );
  },
  async removerVisita(id: string): Promise<void> {
    const { error, count } = await supabase.from('visitas').delete({ count: 'exact' }).eq('id', id);
    if (error) throw new Error(error.message);
    if (!count) throw new Error('Visita não encontrada');
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
    metrica?: MetricaMeta;
    vendedor_id?: string | null;
  }): Promise<Meta> {
    const ehFaturamento = input.metrica === undefined || input.metrica === 'faturamento';
    // Só concorre a "principal" com as demais metas de faturamento — o KPI de
    // destaque do Dashboard é sempre em R$.
    const { count } = ehFaturamento
      ? await supabase.from('metas').select('id', { count: 'exact', head: true }).eq('metrica', 'faturamento')
      : { count: 1 };
    return row(
      await supabase
        .from('metas')
        .insert({
          nome: input.nome.trim(),
          periodicidade: input.periodicidade,
          data_inicio: input.data_inicio,
          data_fim: input.data_fim,
          dimensao: 'geral',
          metrica: input.metrica ?? 'faturamento',
          vendedor_id: input.vendedor_id ?? null,
          valor_alvo: 0,
          principal: ehFaturamento && (count ?? 0) === 0,
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
    const { error } = await supabase.from('metas').delete().eq('id', id);
    if (error) throw new Error(error.message);
    // Se a removida era a principal, promove outra restante (a mais recente) —
    // senão o Dashboard fica sem KPI de destaque sem nenhum aviso.
    if (meta.principal) {
      const outra = maybe(
        await supabase.from('metas').select('id').order('data_inicio', { ascending: false }).limit(1).maybeSingle(),
      );
      if (outra) {
        const { error: promErr } = await supabase.from('metas').update({ principal: true }).eq('id', outra.id);
        if (promErr) throw new Error(promErr.message);
      }
    }
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
    } else if (dimensao === 'por_vendedor') {
      patch.valor_alvo = await somaMetaIndividualVendedores();
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
  /**
   * Meta individual por vendedor — reaproveita `usuarios.meta_individual`
   * (mesmo campo do progresso no Dashboard do Vendedor) em vez de uma tabela
   * própria por meta: não é um valor por período, é a cota corrente da
   * pessoa. Editar aqui atualiza o mesmo número em qualquer outra meta
   * "por_vendedor".
   */
  async atualizarMetaIndividualVendedor(metaId: string, vendedorId: string, valorAlvo: number): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ meta_individual: valorAlvo })
      .eq('id', vendedorId);
    if (error) throw new Error(error.message);

    const meta = maybe(await supabase.from('metas').select('dimensao').eq('id', metaId).maybeSingle());
    if (meta?.dimensao === 'por_vendedor') {
      const soma = await somaMetaIndividualVendedores();
      const { error: updErr } = await supabase.from('metas').update({ valor_alvo: soma }).eq('id', metaId);
      if (updErr) throw new Error(updErr.message);
    }
  },
  /* utilitário de demonstração — reseta o banco para o seed via função no Postgres */
  async restaurarExemplo(): Promise<void> {
    const { error } = await supabase.rpc('reset_dados_exemplo');
    if (error) throw new Error(error.message);
  },
};

export type SupabaseApi = typeof supabaseApi;

/**
 * Usado pelo useAuthStore para hidratar/revalidar a sessão a partir do
 * Supabase Auth (no boot e a cada onAuthStateChange) — busca a linha de
 * `usuarios` do usuário autenticado, revalidando `ativo` a cada chamada. É
 * isso que fecha, de fato, a lacuna encontrada no QA: revogar acesso
 * (`ativo=false`) agora vale na próxima checagem, não só no próximo login.
 */
export async function buscarUsuarioAutenticado(): Promise<Usuario | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const authUser = sessionData.session?.user;
  if (!authUser) return null;
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (error || !usuario || !usuario.ativo) return null;
  return usuario;
}
