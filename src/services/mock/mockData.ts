/**
 * CAMADA DE MOCK — banco de dados simulado no frontend.
 *
 * Este módulo é o único ponto que "fala com o banco". Ele:
 *   - mantém um dataset em memória, persistido em localStorage;
 *   - expõe operações assíncronas (Promise) com pequena latência, imitando a
 *     rede — os componentes já são escritos como se falassem com um backend real;
 *   - concentra as regras que o Postgres/Supabase assumirá depois (precificação,
 *     baixa de pagamento, reclassificação de vencidos, metas, onboarding).
 *
 * Virada de chave: criar `services/supabase/supabaseApi.ts` implementando a
 * mesma interface `DataApi` (ver services/api.ts) e trocar o export. Nada nos
 * componentes muda.
 */

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
import { primeiroNome } from '@/lib/format';

/* ------------------------------------------------------------------ *
 * Data de referência do protótipo (período de Julho/2026 quase fechado).
 * ------------------------------------------------------------------ */
export const HOJE = '2026-07-28';

// v4: login passou a ser o primeiro nome (credenciais reindexadas) em vez
// de e-mail — a versão muda para não herdar chaves antigas incompatíveis.
const STORAGE_KEY = 'padaria_ideal_db_v4';

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
const delay = <T>(dado: T, ms = 160): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(dado), ms));

const uid = (p: string): string => `${p}-${Math.random().toString(36).slice(2, 9)}`;

const somarDias = (iso: string, dias: number): string => {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
};

const diasEntre = (a: string, b: string): number =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);

/* ------------------------------------------------------------------ *
 * SEED
 * ------------------------------------------------------------------ */
const USUARIOS_SEED: Usuario[] = [
  { id: 'u-admin', nome: 'Roberto Cavalcante', email: 'admin@padaria.com', perfil: 'admin', taxa_comissao: 0, meta_individual: 0, ativo: true, criado_em: '2026-01-05' },
  { id: 'u1', nome: 'Ana Beatriz Ramos', email: 'vendedor@padaria.com', perfil: 'vendedor', taxa_comissao: 0.14, meta_individual: 42000, ativo: true, criado_em: '2026-01-05' },
  { id: 'u2', nome: 'Carlos Mendes', email: 'carlos@padaria.com', perfil: 'vendedor', taxa_comissao: 0.12, meta_individual: 40000, ativo: true, criado_em: '2026-01-05' },
  { id: 'u3', nome: 'Rafael Lima', email: 'rafael@padaria.com', perfil: 'vendedor', taxa_comissao: 0.12, meta_individual: 30000, ativo: true, criado_em: '2026-01-05' },
  { id: 'u4', nome: 'Juliana Alves', email: 'juliana@padaria.com', perfil: 'vendedor', taxa_comissao: 0.1, meta_individual: 28000, ativo: true, criado_em: '2026-01-05' },
];

/* Credenciais — em produção NUNCA no cliente; validação vai para a API com
 * hash bcrypt (ver docs/plano-implementacao.md). Aqui só demonstra o fluxo,
 * e agora vive no dataset persistido para que funcionários aprovados em
 * Configurações consigam logar depois.
 *
 * Chave = primeiro nome normalizado (minúsculo). O login do sistema é o
 * primeiro nome da pessoa, não o e-mail — o e-mail em `Usuario.email`
 * continua existindo só como contato. */
const CREDENCIAIS_SEED: Record<string, { senha: string; usuario_id: string }> = {
  roberto: { senha: 'admin123', usuario_id: 'u-admin' },
  ana: { senha: 'venda123', usuario_id: 'u1' },
};

const PRODUTOS_SEED: Produto[] = [
  { id: 'p1', nome: 'Bolacha Maria 400g (cx c/ 20un)', sku: 'BM-400', categoria: 'Bolachas', preco_custo: 32, preco_varejo: 58, preco_atacado: 46, qtd_min_atacado: 10, ativo: true },
  { id: 'p2', nome: 'Biscoito Amanteigado 300g (cx c/ 20un)', sku: 'BA-300', categoria: 'Biscoitos', preco_custo: 38, preco_varejo: 68, preco_atacado: 54, qtd_min_atacado: 10, ativo: true },
  { id: 'p3', nome: 'Rosquinha de Coco 350g (cx c/ 20un)', sku: 'RC-350', categoria: 'Biscoitos', preco_custo: 34, preco_varejo: 62, preco_atacado: 49, qtd_min_atacado: 10, ativo: true },
  { id: 'p4', nome: 'Bolacha Recheada 200g (cx c/ 24un)', sku: 'BR-200', categoria: 'Bolachas', preco_custo: 29, preco_varejo: 52, preco_atacado: 41, qtd_min_atacado: 10, ativo: true },
  { id: 'p5', nome: 'Cream Cracker Água e Sal 400g (cx c/ 20un)', sku: 'CC-400', categoria: 'Salgados', preco_custo: 31, preco_varejo: 56, preco_atacado: 44, qtd_min_atacado: 10, ativo: true },
];

const COMERCIOS_SEED: Comercio[] = [
  { id: 'c1', razao_social: 'Supermercado Compre Bem', cnpj: '12.345.678/0001-90', telefone: '(11) 4522-1187', regiao: 'Zona Sul', ativo: true },
  { id: 'c2', razao_social: 'Panificadora Silva', cnpj: '23.456.789/0001-11', telefone: '(11) 3312-7740', regiao: 'Centro', ativo: true },
  { id: 'c3', razao_social: 'Mercado Dia a Dia', cnpj: '34.567.890/0001-22', telefone: '(11) 4987-2231', regiao: 'Zona Norte', ativo: true },
  { id: 'c4', razao_social: 'Empório São Jorge', cnpj: '45.678.901/0001-33', telefone: '(11) 2298-5563', regiao: 'Zona Leste', ativo: true },
  { id: 'c5', razao_social: 'Mercearia Santa Luzia', cnpj: '56.789.012/0001-44', telefone: '(11) 3765-9021', regiao: 'Zona Sul', ativo: true },
];

const HISTORICO_SEED: PontoHistorico[] = [
  { rotulo: 'Jan', total: 92000 },
  { rotulo: 'Fev', total: 101000 },
  { rotulo: 'Mar', total: 97000 },
  { rotulo: 'Abr', total: 112000 },
  { rotulo: 'Mai', total: 121000 },
  { rotulo: 'Jun', total: 129000 },
];

// Meta principal (mensal) — alimenta o KPI de destaque do Dashboard. O gestor
// pode adicionar outras metas (semanal, trimestral...) que rodam em paralelo.
const METAS_SEED: Meta[] = [
  {
    id: 'meta-mensal-jul',
    nome: 'Meta de Julho',
    periodicidade: 'mensal',
    data_inicio: '2026-07-01',
    data_fim: '2026-07-31',
    dimensao: 'geral',
    valor_alvo: 140000,
    principal: true,
  },
];

// Metas por produto de exemplo — ilustra a dimensão "por produto" já com
// dados, associadas à meta mensal principal.
const METAS_PRODUTO_SEED: MetaProduto[] = [
  { id: 'mp1', meta_id: 'meta-mensal-jul', produto_id: 'p1', valor_alvo: 45000 },
  { id: 'mp2', meta_id: 'meta-mensal-jul', produto_id: 'p2', valor_alvo: 40000 },
  { id: 'mp3', meta_id: 'meta-mensal-jul', produto_id: 'p3', valor_alvo: 28000 },
];

// Uma solicitação de acesso de exemplo, para o gestor já ver o fluxo de
// aprovação em Configurações sem precisar simular o pedido primeiro.
const SOLICITACOES_SEED: SolicitacaoAcesso[] = [
  {
    id: 'sol1',
    nome: 'Fernanda Costa',
    email: 'fernanda@padaria.com',
    senha: 'fernanda123',
    status: 'pendente',
    criado_em: somarDias(HOJE, -2) + 'T09:00:00.000Z',
  },
];

/** Specs enxutas; buildVenda calcula preço/margem/status de forma consistente. */
interface VendaSpec {
  id: string;
  vendedor_id: string;
  comercio_id: string;
  produto_id: string;
  quantidade: number;
  forma_pagamento: 'a_vista' | 'a_prazo';
  prazo_dias?: number;
  dias_atras: number; // quantos dias antes de HOJE a venda ocorreu
  preco_varejo?: number; // override quando quantidade < 10
}

const VENDA_SPECS: VendaSpec[] = [
  { id: 'v1', vendedor_id: 'u1', comercio_id: 'c1', produto_id: 'p1', quantidade: 140, forma_pagamento: 'a_vista', dias_atras: 3 },
  { id: 'v2', vendedor_id: 'u1', comercio_id: 'c5', produto_id: 'p2', quantidade: 120, forma_pagamento: 'a_prazo', prazo_dias: 7, dias_atras: 6 },
  { id: 'v3', vendedor_id: 'u1', comercio_id: 'c1', produto_id: 'p3', quantidade: 110, forma_pagamento: 'a_vista', dias_atras: 10 },
  { id: 'v4', vendedor_id: 'u1', comercio_id: 'c4', produto_id: 'p1', quantidade: 130, forma_pagamento: 'a_vista', dias_atras: 14 },
  { id: 'v5', vendedor_id: 'u1', comercio_id: 'c4', produto_id: 'p3', quantidade: 140, forma_pagamento: 'a_prazo', prazo_dias: 7, dias_atras: 24 },
  { id: 'v6', vendedor_id: 'u2', comercio_id: 'c2', produto_id: 'p2', quantidade: 150, forma_pagamento: 'a_vista', dias_atras: 2 },
  { id: 'v7', vendedor_id: 'u2', comercio_id: 'c2', produto_id: 'p4', quantidade: 130, forma_pagamento: 'a_prazo', prazo_dias: 15, dias_atras: 8 },
  { id: 'v8', vendedor_id: 'u2', comercio_id: 'c3', produto_id: 'p1', quantidade: 120, forma_pagamento: 'a_vista', dias_atras: 12 },
  { id: 'v9', vendedor_id: 'u2', comercio_id: 'c2', produto_id: 'p1', quantidade: 100, forma_pagamento: 'a_prazo', prazo_dias: 7, dias_atras: 25 },
  { id: 'v10', vendedor_id: 'u3', comercio_id: 'c3', produto_id: 'p5', quantidade: 130, forma_pagamento: 'a_vista', dias_atras: 4 },
  { id: 'v11', vendedor_id: 'u3', comercio_id: 'c4', produto_id: 'p1', quantidade: 140, forma_pagamento: 'a_prazo', prazo_dias: 7, dias_atras: 9 },
  { id: 'v12', vendedor_id: 'u3', comercio_id: 'c3', produto_id: 'p3', quantidade: 120, forma_pagamento: 'a_vista', dias_atras: 13 },
  { id: 'v13', vendedor_id: 'u4', comercio_id: 'c4', produto_id: 'p3', quantidade: 140, forma_pagamento: 'a_vista', dias_atras: 5 },
  { id: 'v14', vendedor_id: 'u4', comercio_id: 'c5', produto_id: 'p2', quantidade: 100, forma_pagamento: 'a_prazo', prazo_dias: 15, dias_atras: 11 },
  { id: 'v15', vendedor_id: 'u4', comercio_id: 'c4', produto_id: 'p1', quantidade: 6, forma_pagamento: 'a_vista', dias_atras: 19, preco_varejo: 55 },
];

function buildVenda(spec: VendaSpec): Venda {
  const produto = PRODUTOS_SEED.find((p) => p.id === spec.produto_id)!;
  const { preco_unitario, modo_preco } = resolverPreco(produto, spec.quantidade, spec.preco_varejo);
  const valor_total = preco_unitario * spec.quantidade;
  const custo_total = produto.preco_custo * spec.quantidade;
  const data_venda = somarDias(HOJE, -spec.dias_atras);
  const data_vencimento =
    spec.forma_pagamento === 'a_prazo' ? somarDias(data_venda, spec.prazo_dias ?? 7) : null;

  let status: Venda['status'] = 'pago';
  if (spec.forma_pagamento === 'a_prazo') {
    status = data_vencimento && data_vencimento < HOJE ? 'vencido' : 'pendente';
  }

  return {
    id: spec.id,
    vendedor_id: spec.vendedor_id,
    comercio_id: spec.comercio_id,
    produto_id: spec.produto_id,
    quantidade: spec.quantidade,
    preco_unitario,
    modo_preco,
    valor_total,
    custo_total,
    margem: valor_total - custo_total,
    forma_pagamento: spec.forma_pagamento,
    prazo_dias: spec.prazo_dias ?? null,
    data_venda,
    data_vencimento,
    status,
    criado_em: new Date(data_venda).toISOString(),
  };
}

/* ------------------------------------------------------------------ *
 * Estado do "banco" + persistência
 * ------------------------------------------------------------------ */
interface DBShape {
  usuarios: Usuario[];
  produtos: Produto[];
  comercios: Comercio[];
  vendas: Venda[];
  metas: Meta[];
  metasProdutos: MetaProduto[];
  solicitacoes: SolicitacaoAcesso[];
  credenciais: Record<string, { senha: string; usuario_id: string }>;
  historico: PontoHistorico[];
}

function seed(): DBShape {
  return {
    usuarios: structuredClone(USUARIOS_SEED),
    produtos: structuredClone(PRODUTOS_SEED),
    comercios: structuredClone(COMERCIOS_SEED),
    vendas: VENDA_SPECS.map(buildVenda),
    metas: structuredClone(METAS_SEED),
    metasProdutos: structuredClone(METAS_PRODUTO_SEED),
    solicitacoes: structuredClone(SOLICITACOES_SEED),
    credenciais: structuredClone(CREDENCIAIS_SEED),
    historico: structuredClone(HISTORICO_SEED),
  };
}

/** Soma das metas por produto associadas a uma Meta — usada quando dimensao === 'por_produto'. */
function somaMetasProdutos(estado: DBShape, metaId: string): number {
  return estado.metasProdutos
    .filter((m) => m.meta_id === metaId)
    .reduce((acc, m) => acc + m.valor_alvo, 0);
}

// Inicializa com um seed síncrono e válido (sem auto-referência) para não cair
// em temporal dead zone; o boot logo abaixo troca por localStorage se existir.
let db: DBShape = seed();

function persist(next: DBShape = db): void {
  db = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function bootDB(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const carregado = JSON.parse(raw) as Partial<DBShape>;
      // Defensivo: um schema anterior pode não ter todos os campos atuais
      // (o dataset já mudou de formato mais de uma vez). Preenche o que
      // faltar com o seed, em vez de deixar `undefined` estourar em runtime.
      db = normalizarVencidos({ ...seed(), ...carregado } as DBShape);
      return;
    }
  } catch {
    /* ignora e recorre ao seed já atribuído acima */
  }
  persist(db); // primeira execução: grava o seed inicial
}

bootDB();

/** Reclassifica vendas a prazo pendentes que já passaram do vencimento. */
function normalizarVencidos(estado: DBShape): DBShape {
  estado.vendas.forEach((v) => {
    if (v.status === 'pendente' && v.data_vencimento && v.data_vencimento < HOJE) {
      v.status = 'vencido';
    }
  });
  return estado;
}

/* ------------------------------------------------------------------ *
 * API pública do mock (implementa a interface DataApi)
 * ------------------------------------------------------------------ */
export const mockApi = {
  /* auth — o login é o primeiro nome da pessoa (ver comentário em CREDENCIAIS_SEED) */
  async login(login: string, senha: string): Promise<Sessao> {
    const cred = db.credenciais[login.trim().toLowerCase()];
    const usuario = cred && db.usuarios.find((u) => u.id === cred.usuario_id);
    if (!cred || cred.senha !== senha || !usuario) {
      throw new Error('Credenciais inválidas');
    }
    return delay({ usuario });
  },

  /* usuários / vendedores */
  async listarUsuarios(): Promise<Usuario[]> {
    return delay([...db.usuarios]);
  },
  async listarVendedores(): Promise<Usuario[]> {
    return delay(db.usuarios.filter((u) => u.perfil === 'vendedor'));
  },
  /** Cadastro direto de funcionário pelo gestor (Configurações). */
  async criarFuncionario(input: {
    nome: string;
    email: string;
    senha: string;
    taxa_comissao: number;
    meta_individual: number;
  }): Promise<Usuario> {
    const login = primeiroNome(input.nome).toLowerCase();
    if (db.credenciais[login]) {
      throw new Error(`Já existe um funcionário com o login "${primeiroNome(input.nome)}". Ajuste o nome (ex.: acrescente o sobrenome) para diferenciar.`);
    }
    const usuario: Usuario = {
      id: uid('u'),
      nome: input.nome.trim(),
      email: input.email.trim().toLowerCase(),
      perfil: 'vendedor',
      taxa_comissao: input.taxa_comissao,
      meta_individual: input.meta_individual,
      ativo: true,
      criado_em: new Date().toISOString(),
    };
    db.usuarios.push(usuario);
    db.credenciais[login] = { senha: input.senha, usuario_id: usuario.id };
    persist();
    return delay(usuario);
  },
  /** Ajusta comissão e meta individual de um funcionário já cadastrado (aba Configurações). */
  async atualizarFuncionario(
    id: string,
    input: { taxa_comissao: number; meta_individual: number },
  ): Promise<Usuario> {
    const usuario = db.usuarios.find((u) => u.id === id);
    if (!usuario) throw new Error('Funcionário não encontrado');
    usuario.taxa_comissao = input.taxa_comissao;
    usuario.meta_individual = input.meta_individual;
    persist();
    return delay({ ...usuario });
  },

  /* solicitações de acesso (fluxo self-service pelo login) */
  async solicitarAcesso(nome: string, email: string, senha: string): Promise<SolicitacaoAcesso> {
    const login = primeiroNome(nome).toLowerCase();
    if (db.credenciais[login]) {
      throw new Error(`Já existe um funcionário com o login "${primeiroNome(nome)}". Peça ao gestor para cadastrar você com um nome diferenciado.`);
    }
    if (db.solicitacoes.some((s) => s.status === 'pendente' && primeiroNome(s.nome).toLowerCase() === login)) {
      throw new Error('Já existe uma solicitação pendente com esse primeiro nome.');
    }
    const solicitacao: SolicitacaoAcesso = {
      id: uid('sol'),
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha,
      status: 'pendente',
      criado_em: new Date().toISOString(),
    };
    db.solicitacoes.push(solicitacao);
    persist();
    return delay(solicitacao);
  },
  async listarSolicitacoes(): Promise<SolicitacaoAcesso[]> {
    return delay([...db.solicitacoes].sort((a, b) => b.criado_em.localeCompare(a.criado_em)));
  },
  /** Aprova o pedido: cria o Usuario (vendedor) e a credencial, com os parâmetros que o gestor definir. */
  async aprovarSolicitacao(
    id: string,
    extras: { taxa_comissao: number; meta_individual: number },
  ): Promise<Usuario> {
    const solicitacao = db.solicitacoes.find((s) => s.id === id);
    if (!solicitacao) throw new Error('Solicitação não encontrada');
    const usuario = await mockApi.criarFuncionario({
      nome: solicitacao.nome,
      email: solicitacao.email,
      senha: solicitacao.senha,
      taxa_comissao: extras.taxa_comissao,
      meta_individual: extras.meta_individual,
    });
    solicitacao.status = 'aprovado';
    persist();
    return usuario;
  },
  async recusarSolicitacao(id: string): Promise<void> {
    const solicitacao = db.solicitacoes.find((s) => s.id === id);
    if (!solicitacao) throw new Error('Solicitação não encontrada');
    solicitacao.status = 'recusado';
    persist();
    return delay(undefined);
  },

  /* produtos */
  async listarProdutos(): Promise<Produto[]> {
    return delay([...db.produtos]);
  },
  async criarProduto(input: Omit<Produto, 'id' | 'ativo'>): Promise<Produto> {
    const produto: Produto = { ...input, id: uid('p'), ativo: true };
    db.produtos.push(produto);
    persist();
    return delay(produto);
  },
  async atualizarProduto(id: string, input: Omit<Produto, 'id' | 'ativo'>): Promise<Produto> {
    const produto = db.produtos.find((p) => p.id === id);
    if (!produto) throw new Error('Produto não encontrado');
    Object.assign(produto, input);
    persist();
    return delay({ ...produto });
  },
  /**
   * Exclusão lógica: vendas já registradas referenciam produto_id, então o
   * registro nunca é removido de fato — apenas deixa de aparecer no catálogo
   * ativo (seletor de venda, listagem padrão). Corresponde a um `ativo=false`
   * no Postgres, preservando a integridade referencial do histórico.
   */
  async removerProduto(id: string): Promise<void> {
    const produto = db.produtos.find((p) => p.id === id);
    if (!produto) throw new Error('Produto não encontrado');
    produto.ativo = false;
    persist();
    return delay(undefined);
  },

  /* comércios (clientes B2B) */
  async listarComercios(): Promise<Comercio[]> {
    return delay([...db.comercios]);
  },
  async criarComercio(input: Omit<Comercio, 'id' | 'ativo'>): Promise<Comercio> {
    const comercio: Comercio = { ...input, id: uid('c'), ativo: true };
    db.comercios.push(comercio);
    persist();
    return delay(comercio);
  },

  /* vendas */
  async listarVendas(): Promise<Venda[]> {
    return delay([...db.vendas]);
  },
  async registrarVenda(input: NovaVendaInput): Promise<Venda> {
    const produto = db.produtos.find((p) => p.id === input.produto_id);
    if (!produto) throw new Error('Produto não encontrado');

    const { preco_unitario, modo_preco } = resolverPreco(produto, input.quantidade, input.preco_unitario);
    const valor_total = preco_unitario * input.quantidade;
    const custo_total = produto.preco_custo * input.quantidade;
    const data_vencimento =
      input.forma_pagamento === 'a_prazo' ? somarDias(HOJE, input.prazo_dias ?? 7) : null;

    const venda: Venda = {
      id: uid('v'),
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
      criado_em: new Date().toISOString(),
    };
    db.vendas.push(venda);
    persist();
    return delay(venda);
  },
  /**
   * Corrige uma venda já registrada (o gestor pode ter errado quantidade,
   * cliente, produto etc.). Recalcula preço/margem/vencimento com a mesma
   * regra de `registrarVenda`. Se a venda já estava paga (baixa manual) e a
   * forma de pagamento continua "a prazo", preserva o status pago — editar
   * não deve reabrir uma cobrança já quitada.
   */
  async atualizarVenda(vendaId: string, input: NovaVendaInput & { data_venda?: string }): Promise<Venda> {
    const venda = db.vendas.find((v) => v.id === vendaId);
    if (!venda) throw new Error('Venda não encontrada');
    const produto = db.produtos.find((p) => p.id === input.produto_id);
    if (!produto) throw new Error('Produto não encontrado');

    const { preco_unitario, modo_preco } = resolverPreco(produto, input.quantidade, input.preco_unitario);
    const valor_total = preco_unitario * input.quantidade;
    const custo_total = produto.preco_custo * input.quantidade;
    const data_venda = input.data_venda ?? venda.data_venda;
    const data_vencimento =
      input.forma_pagamento === 'a_prazo' ? somarDias(data_venda, input.prazo_dias ?? 7) : null;

    let status: Venda['status'];
    if (input.forma_pagamento === 'a_vista') {
      status = 'pago';
    } else if (venda.status === 'pago') {
      status = 'pago'; // já quitada — editar não reabre a cobrança
    } else {
      status = data_vencimento && data_vencimento < HOJE ? 'vencido' : 'pendente';
    }

    Object.assign(venda, {
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
      data_venda,
      data_vencimento,
      status,
    });
    persist();
    return delay({ ...venda });
  },
  async removerVenda(vendaId: string): Promise<void> {
    const existe = db.vendas.some((v) => v.id === vendaId);
    if (!existe) throw new Error('Venda não encontrada');
    db.vendas = db.vendas.filter((v) => v.id !== vendaId);
    persist();
    return delay(undefined);
  },
  async darBaixaPagamento(vendaId: string): Promise<Venda> {
    const venda = db.vendas.find((v) => v.id === vendaId);
    if (!venda) throw new Error('Venda não encontrada');
    venda.status = 'pago';
    persist();
    return delay(venda);
  },
  async listarAlertas(): Promise<AlertaPagamento[]> {
    const abertos = db.vendas.filter((v) => v.status === 'pendente' || v.status === 'vencido');
    const alertas: AlertaPagamento[] = abertos.map((v) => ({
      venda_id: v.id,
      comercio_id: v.comercio_id,
      vendedor_id: v.vendedor_id,
      valor: v.valor_total,
      data_vencimento: v.data_vencimento!,
      status: v.status as AlertaPagamento['status'],
      dias_atraso: v.data_vencimento && v.data_vencimento < HOJE ? diasEntre(v.data_vencimento, HOJE) : 0,
    }));
    alertas.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    return delay(alertas);
  },

  /* metas — o gestor pode ter várias simultâneas (mensal, semanal...). Só uma
   * é `principal` por vez; é ela que alimenta o KPI de destaque do Dashboard.
   * Em cada uma, a dimensão (geral ou por produto) decide como valor_alvo é
   * calculado — igual funcionava antes, agora por meta em vez de global. */
  async listarMetas(): Promise<Meta[]> {
    return delay([...db.metas]);
  },
  async criarMeta(input: {
    nome: string;
    periodicidade: Periodicidade;
    data_inicio: string;
    data_fim: string;
  }): Promise<Meta> {
    const meta: Meta = {
      id: uid('meta'),
      nome: input.nome.trim(),
      periodicidade: input.periodicidade,
      data_inicio: input.data_inicio,
      data_fim: input.data_fim,
      dimensao: 'geral',
      valor_alvo: 0,
      principal: db.metas.length === 0, // a primeira meta criada nasce principal
    };
    db.metas.push(meta);
    persist();
    return delay(meta);
  },
  /** Edita nome/janela/valor (dimensão 'geral') de uma meta existente. */
  async atualizarMeta(
    id: string,
    input: Partial<Pick<Meta, 'nome' | 'data_inicio' | 'data_fim' | 'valor_alvo'>>,
  ): Promise<Meta> {
    const meta = db.metas.find((m) => m.id === id);
    if (!meta) throw new Error('Meta não encontrada');
    Object.assign(meta, input);
    if ('valor_alvo' in input) meta.dimensao = 'geral';
    persist();
    return delay({ ...meta });
  },
  async removerMeta(id: string): Promise<void> {
    const meta = db.metas.find((m) => m.id === id);
    if (!meta) throw new Error('Meta não encontrada');
    if (meta.principal) throw new Error('A meta principal não pode ser removida — torne outra principal primeiro.');
    db.metas = db.metas.filter((m) => m.id !== id);
    db.metasProdutos = db.metasProdutos.filter((mp) => mp.meta_id !== id);
    persist();
    return delay(undefined);
  },
  async definirMetaPrincipal(id: string): Promise<Meta[]> {
    db.metas.forEach((m) => {
      m.principal = m.id === id;
    });
    persist();
    return delay([...db.metas]);
  },
  /**
   * Alterna a dimensão de uma meta. Ao mudar para 'por_produto', valor_alvo
   * passa a ser recalculado como a soma das metas por produto associadas.
   */
  async definirDimensaoMeta(id: string, dimensao: TipoMeta): Promise<Meta> {
    const meta = db.metas.find((m) => m.id === id);
    if (!meta) throw new Error('Meta não encontrada');
    meta.dimensao = dimensao;
    meta.valor_alvo = dimensao === 'por_produto' ? somaMetasProdutos(db, id) : meta.valor_alvo;
    persist();
    return delay({ ...meta });
  },
  async listarMetasProdutos(metaId: string): Promise<MetaProduto[]> {
    return delay(db.metasProdutos.filter((m) => m.meta_id === metaId));
  },
  /** Upsert da meta de um produto; se a dimensão da meta-pai for 'por_produto', recalcula o total. */
  async atualizarMetaProduto(metaId: string, produtoId: string, valor_alvo: number): Promise<MetaProduto[]> {
    const existente = db.metasProdutos.find((m) => m.meta_id === metaId && m.produto_id === produtoId);
    if (existente) {
      existente.valor_alvo = valor_alvo;
    } else {
      db.metasProdutos.push({ id: uid('mp'), meta_id: metaId, produto_id: produtoId, valor_alvo });
    }
    const meta = db.metas.find((m) => m.id === metaId);
    if (meta?.dimensao === 'por_produto') {
      meta.valor_alvo = somaMetasProdutos(db, metaId);
    }
    persist();
    return delay(db.metasProdutos.filter((m) => m.meta_id === metaId));
  },
  async obterHistorico(): Promise<PontoHistorico[]> {
    return delay([...db.historico]);
  },

  /* utilitário de demonstração */
  async restaurarExemplo(): Promise<void> {
    persist(seed());
    return delay(undefined);
  },
};

export type MockApi = typeof mockApi;
