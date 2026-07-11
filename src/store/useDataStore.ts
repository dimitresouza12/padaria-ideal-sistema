import { create } from 'zustand';
import type {
  Comercio,
  Meta,
  MetaProduto,
  NovaVendaInput,
  Periodicidade,
  PontoHistorico,
  Produto,
  SolicitacaoAcesso,
  TipoMeta,
  Usuario,
  Venda,
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
  metas: Meta[];
  metasProdutosPorMeta: Record<string, MetaProduto[]>;
  solicitacoes: SolicitacaoAcesso[];
  historico: PontoHistorico[];
  carregado: boolean;

  carregarTudo: () => Promise<void>;
  registrarVenda: (input: NovaVendaInput) => Promise<Venda>;
  darBaixa: (vendaId: string) => Promise<void>;

  criarMeta: (input: { nome: string; periodicidade: Periodicidade; data_inicio: string; data_fim: string }) => Promise<Meta>;
  atualizarMeta: (id: string, valor: number) => Promise<void>;
  removerMeta: (id: string) => Promise<void>;
  definirMetaPrincipal: (id: string) => Promise<void>;
  definirDimensaoMeta: (id: string, dimensao: TipoMeta) => Promise<void>;
  carregarMetasProdutos: (metaId: string) => Promise<void>;
  atualizarMetaProduto: (metaId: string, produtoId: string, valor: number) => Promise<void>;

  criarProduto: (input: Omit<Produto, 'id' | 'ativo'>) => Promise<void>;
  editarProduto: (id: string, input: Omit<Produto, 'id' | 'ativo'>) => Promise<void>;
  removerProduto: (id: string) => Promise<void>;
  criarComercio: (input: Omit<Comercio, 'id' | 'ativo'>) => Promise<void>;

  criarFuncionario: (input: { nome: string; email: string; senha: string; taxa_comissao: number; meta_individual: number }) => Promise<void>;
  atualizarFuncionario: (id: string, input: { taxa_comissao: number; meta_individual: number }) => Promise<void>;
  carregarSolicitacoes: () => Promise<void>;
  aprovarSolicitacao: (id: string, extras: { taxa_comissao: number; meta_individual: number }) => Promise<void>;
  recusarSolicitacao: (id: string) => Promise<void>;

  restaurarExemplo: () => Promise<void>;
}

export const useDataStore = create<DataState>((set, get) => ({
  usuarios: [],
  produtos: [],
  comercios: [],
  vendas: [],
  metas: [],
  metasProdutosPorMeta: {},
  solicitacoes: [],
  historico: [],
  carregado: false,

  carregarTudo: async () => {
    const [usuarios, produtos, comercios, vendas, metas, solicitacoes, historico] = await Promise.all([
      api.listarUsuarios(),
      api.listarProdutos(),
      api.listarComercios(),
      api.listarVendas(),
      api.listarMetas(),
      api.listarSolicitacoes(),
      api.obterHistorico(),
    ]);
    set({ usuarios, produtos, comercios, vendas, metas, solicitacoes, historico, carregado: true });
    // pré-carrega as metas por produto de todas as metas existentes
    await Promise.all(metas.map((m) => get().carregarMetasProdutos(m.id)));
  },

  registrarVenda: async (input) => {
    const venda = await api.registrarVenda(input);
    set({ vendas: await api.listarVendas() });
    return venda;
  },

  darBaixa: async (vendaId) => {
    await api.darBaixaPagamento(vendaId);
    set({ vendas: await api.listarVendas() });
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
    await api.definirDimensaoMeta(id, dimensao);
    set({ metas: await api.listarMetas() });
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

  criarFuncionario: async (input) => {
    await api.criarFuncionario(input);
    set({ usuarios: await api.listarUsuarios() });
  },

  atualizarFuncionario: async (id, input) => {
    await api.atualizarFuncionario(id, input);
    set({ usuarios: await api.listarUsuarios() });
  },

  carregarSolicitacoes: async () => {
    set({ solicitacoes: await api.listarSolicitacoes() });
  },

  aprovarSolicitacao: async (id, extras) => {
    await api.aprovarSolicitacao(id, extras);
    const [usuarios, solicitacoes] = await Promise.all([api.listarUsuarios(), api.listarSolicitacoes()]);
    set({ usuarios, solicitacoes });
  },

  recusarSolicitacao: async (id) => {
    await api.recusarSolicitacao(id);
    set({ solicitacoes: await api.listarSolicitacoes() });
  },

  restaurarExemplo: async () => {
    await api.restaurarExemplo();
    await get().carregarTudo();
  },
}));
