import { create } from 'zustand';
import type { Perfil, Usuario } from '@/types';
import { api } from '@/services/api';
import { useUiStore } from './useUiStore';

/**
 * Sessão do usuário logado.
 *
 * Persistida em localStorage (só o objeto Usuario, sem senha — a senha nunca
 * passa pelo client) para sobreviver a um refresh. Na virada para o Supabase
 * Auth de verdade, `login`/`logout` passam a chamar
 * `supabase.auth.signInWithPassword` / `signOut`, e a sessão é hidratada de
 * `supabase.auth.getSession()` em vez deste storage manual.
 */
const STORAGE_KEY = 'padaria_ideal_sessao_v1';

function lerSessaoSalva(): Usuario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}

interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  erro: string | null;
  /** `login` é o primeiro nome da pessoa (ver services/mock/mockData.ts). */
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: lerSessaoSalva(),
  carregando: false,
  erro: null,

  login: async (login, senha) => {
    set({ carregando: true, erro: null });
    try {
      const { usuario } = await api.login(login, senha);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(usuario));
      set({ usuario, carregando: false });
      useUiStore.getState().irPara('dashboard'); // toda sessão nova começa no Dashboard
      return true;
    } catch {
      set({ erro: 'Credenciais inválidas. Verifique o usuário e a senha.', carregando: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ usuario: null, erro: null });
    useUiStore.getState().irPara('dashboard'); // limpa a navegação para a próxima sessão
  },
}));

/** Seletor de conveniência: perfil do usuário logado (ou null). */
export const usePerfil = (): Perfil | null => useAuthStore((s) => s.usuario?.perfil ?? null);
