import { useAuthStore } from '@/store/useAuthStore';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/Toaster';

/**
 * Router SPA controlado por estado:
 *   - carregando sessão -> tela em branco (evita "piscar" a tela de login
 *     enquanto a sessão do Supabase Auth é revalidada contra o banco);
 *   - sem sessão  -> Tela de Login (acesso inicial obrigatório);
 *   - com sessão  -> Layout principal (sidebar + header + aba ativa por perfil).
 */
export default function App() {
  const autenticado = useAuthStore((s) => s.usuario !== null);
  const carregandoSessao = useAuthStore((s) => s.carregandoSessao);

  if (carregandoSessao) return null;

  return (
    <>
      {autenticado ? <AppLayout /> : <LoginScreen />}
      <Toaster />
    </>
  );
}
