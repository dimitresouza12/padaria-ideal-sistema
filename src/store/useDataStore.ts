import { create } from 'zustand';
import type {
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
  SolicitacaoAcesso,
  TipoMeta,
  Usuario,
  Venda,
  Visita,
} from '@/types';
import { api } from '@/services/api';

/**
 * Estado de dados da aplicação (server-state em cache).
 *
 * As ações delegam para `api` (a camada de serviço) e atualizam o cache local,
 * de modo que uma baixa de pagamento ou nova venda reflete ao vivo em todas as
 * telas. Ao migrar para o Supabase, só a implementação de `api` muda — as ações
 * daqui continuam idênticas. (Em um projeto maior, este store daria lugar ao
 * TanStack Query; para a fundação, um store único mantém tudo explícito.)
 */
interface DataState {
  usuarios: Usuario[];
  produtos: Produto[];
  comercios: Comercio[];
  vendas: Venda[];
  perdas: Perda[];
  visitas: Visita[];
  metas: Meta[];
  metasProdutosPorMeta: Record<string, MetaProduto[]>;
  solicitacoes: SolicitacaoAcesso[];
  carregado: boolean;

  carregarTudo: () => Promise<void>;
  registrarVenda: (input: NovaVendaInput) => Promise<Venda>;
  atualizarVenda: (
    vendaId: string,
    input: NovaVendaInput & { data_venda?: string; status?: 'pago' | 'pendente' },
  ) => Promise<Venda>;
  removerVenda: (vendaId: string) => Promise<void>;
  darBaixa: (vendaId: string) => Promise<void>;
  darBaixaEmLote: (vendaIds: string[]) => Promise<void>;
  marcarEntregue: (vendaIds: string[]) => Promise<void>;

  registrarPerda: (input: NovaPerdaInput) => Promise<Perda>;
  removerPerda: (id: string) => Promise<void>;

  registrarVisita: (input: NovaVisitaInput) => Promise<Visita>;
  removerVisita: (id: string) => Promise<void>;

  criarMeta: (input: {
    nome: string;
    periodicidade: Periodicidade;
    data_inicio: string;
    data_fim: string;
    metrica?: MetricaMeta;
    vendedor_id?: string | null;
  }) => Promise<Meta>;
  atualizarMeta: (id: string, valor: number) => Promise<void>;
  removerMeta: (id: string) => Promise<void>;
  definirMetaPrincipal: (id: string) => Promise<void>;
  definirDimensaoMeta: (id: string, dimensao: TipoMeta) => Promise<void>;
  carregarMetasProdutos: (metaId: string) => Promise<void>;
  atualizarMetaProduto: (metaId: string, produtoId: string, valor: number) => Promise<void>;
  atualizarMetaIndividualVendedor: (metaId: string, vendedorId: string, valor: number) => Promise<void>;

  criarProduto: (input: Omit<Produto, 'id' | 'ativo'>) => Promise<void>;
  editarProduto: (id: string, input: Omit<Produto, 'id' | 'ativo'>) => Promise<void>;
  removerProduto: (id: string) => Promise<void>;
  criarComercio: (input: Omit<Comercio, 'id' | 'ativo'>) => Promise<void>;
  atualizarComercio: (id: string, input: Omit<Comercio, 'id' | 'ativo'>) => Promise<void>;
  removerComercio: (id: string) => Promise<void>;
  reativarComercio: (id: string) => Promise<void>;

  criarFuncionario: (input: { nome: string; email: string; senha: string; taxa_comissao: number; meta_individual: number; adminLogin: string }) => Promise<void>;
  atualizarFuncionario: (id: string, input: { taxa_comissao: number; meta_individual: number }) => Promise<void>;
  alterarMinhaSenha: (senhaAtual: string, senhaNova: string, loginAtual: string) => Promise<void>;
  alterarSenhaFuncionario: (usuarioId: string, senhaNova: string) => Promise<void>;
  carregarSolicitacoes: () => Promise<void>;
  aprovarSolicitacao: (id: string, extras: { taxa_comissao: number; meta_individual: number }, adminLogin: string) => Promise<string | undefined>;
  recusarSolicitacao: (id: string, adminLogin: string) => Promise<void>;

  restaurarExemplo: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  usuarios: [],
  produtos: [],
  comercios: [],
  vendas: [],
  perdas: [],
  visitas: [],
  metas: [],
  metasProdutosPorMeta: {},
  solicitacoes: [],
  carregado: false,

  carregarTudo: async () => {
    const [usuarios, produtos, comercios, vendas, perdas, visitas, metas, solicitacoes] = await Promise.all([
      api.listarUsuarios(),
      api.listarProdutos(),
      api.listarComercios(),
      api.listarVendas(),
      api.listarPerdas(),
      api.listarVisitas(),
      api.listarMetas(),
      api.listarSolicitacoes(),
    ]);
    set({ usuarios, produtos, comercios, vendas, perdas, visitas, metas, solicitacoes, carregado: true });
    // pré-carrega as metas por produto de todas as metas existentes
    await Promise.all(metas.map((m) => get().carregarMetasProdutos(m.id)));
  },

  registrarVenda: async (input) => {
    const venda = await api.registrarVenda(input);
    set({ vendas: await api.listarVendas() });
    return venda;
  },

  atualizarVenda: async (vendaId, input) => {
    const venda = await api.atualizarVenda(vendaId, input);
    set({ vendas: await api.listarVendas() });
    return venda;
  },

  removerVenda: async (vendaId) => {
    await api.removerVenda(vendaId);
    set({ vendas: await api.listarVendas() });
  },

  darBaixa: async (vendaId) => {
    await api.darBaixaPagamento(vendaId);
    set({ vendas: await api.listarVendas() });
  },

  darBaixaEmLote: async (vendaIds) => {
    await api.darBaixaPagamentoEmLote(vendaIds);
    set({ vendas: await api.listarVendas() });
  },

  marcarEntregue: async (vendaIds) => {
    await api.marcarEntregueEmLote(vendaIds);
    set({ vendas: await api.listarVendas() });
  },

  registrarPerda: async (input) => {
    const perda = await api.registrarPerda(input);
    set({ perdas: await api.listarPerdas() });
    return perda;
  },

  removerPerda: async (id) => {
    await api.removerPerda(id);
    set({ perdas: await api.listarPerdas() });
  },

  registrarVisita: async (input) => {
    const visita = await api.registrarVisita(input);
    set({ visitas: await api.listarVisitas() });
    return visita;
  },

  removerVisita: async (id) => {
    await api.removerVisita(id);
    set({ visitas: await api.listarVisitas() });
  },

  criarMeta: async (input) => {
    const nova = await api.criarMeta(input);
    set({ metas: await api.listarMetas() });
    return nova;
  },

  atualizarMeta: async (id, valor) => {
    await api.atualizarMeta(id, { valor_alvo: valor });
    set({ metas: await api.listarMetas() });
  },

  removerMeta: async (id) => {
    await api.removerMeta(id);
    set((s) => {
      const { [id]: _removida, ...restoMetasProdutos } = s.metasProdutosPorMeta;
      return { metasProdutosPorMeta: restoMetasProdutos };
    });
    set({ metas: await api.listarMetas() });
  },

  definirMetaPrincipal: async (id) => {
    const metas = await api.definirMetaPrincipal(id);
    set({ metas });
  },

  definirDimensaoMeta: async (id, dimensao) => {
    // Otimista: a troca de modo (Valor Geral / Soma por Produto) precisa parecer
    // instantânea, como um tab switch — não vale esperar a viagem ao Supabase.
    set((s) => ({ metas: s.metas.map((m) => (m.id === id ? { ...m, dimensao } : m)) }));
    await api.definirDimensaoMeta(id, dimensao);
  },

  carregarMetasProdutos: async (metaId) => {
    const lista = await api.listarMetasProdutos(metaId);
    set((s) => ({ metasProdutosPorMeta: { ...s.metasProdutosPorMeta, [metaId]: lista } }));
  },

  atualizarMetaProduto: async (metaId, produtoId, valor) => {
    await api.atualizarMetaProduto(metaId, produtoId, valor);
    const [lista, metas] = await Promise.all([api.listarMetasProdutos(metaId), api.listarMetas()]);
    set((s) => ({ metasProdutosPorMeta: { ...s.metasProdutosPorMeta, [metaId]: lista }, metas }));
  },

  atualizarMetaIndividualVendedor: async (metaId, vendedorId, valor) => {
    await api.atualizarMetaIndividualVendedor(metaId, vendedorId, valor);
    const [usuarios, metas] = await Promise.all([api.listarUsuarios(), api.listarMetas()]);
    set({ usuarios, metas });
  },

  criarProduto: async (input) => {
    await api.criarProduto(input);
    set({ produtos: await api.listarProdutos() });
  },

  editarProduto: async (id, input) => {
    await api.atualizarProduto(id, input);
    set({ produtos: await api.listarProdutos() });
  },

  removerProduto: async (id) => {
    await api.removerProduto(id);
    set({ produtos: await api.listarProdutos() });
  },

  criarComercio: async (input) => {
    await api.criarComercio(input);
    set({ comercios: await api.listarComercios() });
  },

  atualizarComercio: async (id, input) => {
    await api.atualizarComercio(id, input);
    set({ comercios: await api.listarComercios() });
  },

  removerComercio: async (id) => {
    await api.removerComercio(id);
    set({ comercios: await api.listarComercios() });
  },

  reativarComercio: async (id) => {
    await api.reativarComercio(id);
    set({ comercios: await api.listarComercios() });
  },

  criarFuncionario: async (input) => {
    await api.criarFuncionario(input);
    set({ usuarios: await api.listarUsuarios() });
  },

  atualizarFuncionario: async (id, input) => {
    await api.atualizarFuncionario(id, input);
    set({ usuarios: await api.listarUsuarios() });
  },

  alterarMinhaSenha: async (senhaAtual, senhaNova, loginAtual) => {
    await api.alterarMinhaSenha(senhaAtual, senhaNova, loginAtual);
  },

  alterarSenhaFuncionario: async (usuarioId, senhaNova) => {
    await api.alterarSenhaFuncionario(usuarioId, senhaNova);
  },

  carregarSolicitacoes: async () => {
    set({ solicitacoes: await api.listarSolicitacoes() });
  },

  aprovarSolicitacao: async (id, extras, adminLogin) => {
    const { senhaTemporaria } = await api.aprovarSolicitacao(id, extras, adminLogin);
    const [usuarios, solicitacoes] = await Promise.all([api.listarUsuarios(), api.listarSolicitacoes()]);
    set({ usuarios, solicitacoes });
    return senhaTemporaria;
  },

  recusarSolicitacao: async (id, adminLogin) => {
    await api.recusarSolicitacao(id, adminLogin);
    set({ solicitacoes: await api.listarSolicitacoes() });
  },

  restaurarExemplo: async () => {
    await api.restaurarExemplo();
    await get().carregarTudo();
  },
}));
