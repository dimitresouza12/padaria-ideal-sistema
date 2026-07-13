import { create } from 'zustand';
import type { Perfil } from '@/types';

export type AbaId =
  | 'dashboard'
  | 'vendas'
  | 'produtos'
  | 'comercios'
  | 'metas'
  | 'comissoes'
  | 'lembretes'
  | 'relatorios'
  | 'configuracoes';

export interface AbaDef {
  id: AbaId;
  titulo: string;
  subtitulo: string;
  /** Perfis que enxergam a aba (RBAC de navegação). */
  perfis: Perfil[];
}

export const ABAS: AbaDef[] = [
  { id: 'dashboard', titulo: 'Dashboard', subtitulo: 'Visão consolidada da operação', perfis: ['admin', 'vendedor'] },
  { id: 'vendas', titulo: 'Vendas', subtitulo: 'Registrar venda e consultar o histórico', perfis: ['admin', 'vendedor'] },
  { id: 'produtos', titulo: 'Produtos', subtitulo: 'Catálogo e precificação base', perfis: ['admin'] },
  { id: 'comercios', titulo: 'Clientes / Comércios', subtitulo: 'Cadastro de parceiros B2B', perfis: ['admin'] },
  { id: 'metas', titulo: 'Metas', subtitulo: 'Cadastro e configuração das metas do período', perfis: ['admin'] },
  { id: 'comissoes', titulo: 'Comissões', subtitulo: 'Comissão acumulada por vendedor no período', perfis: ['admin'] },
  { id: 'lembretes', titulo: 'Lembretes de Pagamento', subtitulo: 'Vendas a prazo pendentes de recebimento', perfis: ['admin', 'vendedor'] },
  { id: 'relatorios', titulo: 'Relatórios', subtitulo: 'Exportação de dados para contabilidade', perfis: ['admin'] },
  { id: 'configuracoes', titulo: 'Configurações', subtitulo: 'Equipe e solicitações de acesso', perfis: ['admin'] },
];

export const abasDoPerfil = (perfil: Perfil): AbaDef[] =>
  ABAS.filter((a) => a.perfis.includes(perfil));

interface UiState {
  abaAtiva: AbaId;
  sidebarAberta: boolean; // controle do drawer no mobile
  irPara: (aba: AbaId) => void;
  toggleSidebar: () => void;
  fecharSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  abaAtiva: 'dashboard',
  sidebarAberta: false,
  irPara: (aba) => set({ abaAtiva: aba, sidebarAberta: false }),
  toggleSidebar: () => set((s) => ({ sidebarAberta: !s.sidebarAberta })),
  fecharSidebar: () => set({ sidebarAberta: false }),
}));
