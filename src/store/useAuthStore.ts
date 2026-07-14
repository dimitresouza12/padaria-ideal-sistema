import { create } from 'zustand';
import type { Perfil, Usuario } from '@/types';
import { api } from '@/services/api';
import { supabase } from '@/services/supabase/supabaseClient';
import { buscarUsuarioAutenticado } from '@/services/supabase/supabaseApi';
import { useUiStore } from './useUiStore';

/**
 * Sessão do usuário logado — Supabase Auth de verdade.
 *
 * O SDK do Supabase já persiste e renova a sessão sozinho (ver
 * `supabaseClient.ts`, `persistSession: true`); este store só espelha esse
 * estado para o resto do app. No boot, `inicializar()` revalida contra o
 * banco (não confia cegamente no JWT) — se o usuário foi desativado
 * (`ativo=false`) enquanto a aba estava aberta ou fechada, a sessão cai na
 * hora. `getSession`/`onAuthStateChange` são específicos do SDK de Auth do
 * Supabase, por isso importados diretamente aqui (não passam pelo seam de
 * `DataApi`, que também precisa funcionar com o mock local).
 */
interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  carregandoSessao: boolean;
  erro: string | null;
  /** `login` é o primeiro nome da pessoa (ver services/mock/mockData.ts). */
  login: (login: string, senha: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  usuario: null,
  carregando: false,
  carregandoSessao: true,
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

  logout: async () => {
    await supabase.auth.signOut();
    set({ usuario: null, erro: null });
    useUiStore.getState().irPara('dashboard'); // limpa a navegação para a próxima sessão
  },
}));

/** Seletor de conveniência: perfil do usuário logado (ou null). */
export const usePerfil = (): Perfil | null => useAuthStore((s) => s.usuario?.perfil ?? null);

// Hidratação inicial: revalida a sessão persistida contra o banco (não só o
// JWT) antes de liberar a UI — é o que fecha a lacuna encontrada no QA (uma
// conta desativada não deveria continuar com acesso só porque o token ainda
// não expirou).
(async () => {
  const usuario = await buscarUsuarioAutenticado();
  if (!usuario) {
    // Sessão inválida, expirada ou de um usuário desativado — encerra de vez.
    const { data } = await supabase.auth.getSession();
    if (data.session) await supabase.auth.signOut();
  }
  useAuthStore.setState({ usuario, carregandoSessao: false });
})();

// Mantém o store em sincronia com eventos do próprio SDK (refresh de token
// em background, logout disparado em outra aba, expiração).
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    void buscarUsuarioAutenticado().then((usuario) => useAuthStore.setState({ usuario }));
  }
});
