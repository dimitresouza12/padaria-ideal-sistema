import { create } from 'zustand';
import type { Perfil, Usuario } from '@/types';
import { api } from '@/services/api';
import { useUiStore } from './useUiStore';

/**
 * Sessão do usuário logado.
 *
 * Mantida apenas em memória de propósito: um refresh sempre volta ao login
 * (comportamento de protótipo). Na virada para o Supabase, `login`/`logout`
 * passam a chamar `supabase.auth.signInWithPassword` / `signOut`, e a sessão
 * pode ser hidratada de `supabase.auth.getSession()`.
 */
interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
  /** `login` é o primeiro nome da pessoa (ver services/mock/mockData.ts). */
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  carregando: false,
  erro: null,

  login: async (login, senha) => {
    set({ carregando: true, erro: null });
    try {
      const { usuario } = await api.login(login, senha);
      set({ usuario, carregando: false });
      useUiStore.getState().irPara('dashboard'); // toda sessão nova começa no Dashboard
      return true;
    } catch {
      set({ erro: 'Credenciais inválidas. Verifique o usuário e a senha.', carregando: false });
      return false;
    }
  },

  logout: () => {
    set({ usuario: null, erro: null });
    useUiStore.getState().irPara('dashboard'); // limpa a navegação para a próxima sessão
  },
}));

/** Seletor de conveniência: perfil do usuário logado (ou null). */
export const usePerfil = (): Perfil | null => useAuthStore((s) => s.usuario?.perfil ?? null);
