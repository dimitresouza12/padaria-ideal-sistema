import { useAuthStore } from '@/store/useAuthStore';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { AppLayout } from '@/components/layout/AppLayout';
import { Toaster } from '@/components/Toaster';

/**
 * Router SPA controlado por estado:
 *   - sem sessão  -> Tela de Login (acesso inicial obrigatório);
 *   - com sessão  -> Layout principal (sidebar + header + aba ativa por perfil).
 *
 * A sessão vive só em memória, então um refresh volta ao login.
 */
export default function App() {
  const autenticado = useAuthStore((s) => s.usuario !== null);
  return (
    <>
      {autenticado ? <AppLayout /> : <LoginScreen />}
      <Toaster />
    </>
  );
}
