import { useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { abasDoPerfil, useUiStore, type AbaId } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardAdmin } from '@/features/dashboard/DashboardAdmin';
import { DashboardVendedor } from '@/features/dashboard/DashboardVendedor';
import { Vendas } from '@/features/vendas/Vendas';
import { Perdas } from '@/features/perdas/Perdas';
import { Lembretes } from '@/features/vendas/Lembretes';
import { Produtos } from '@/features/produtos/Produtos';
import { Comercios } from '@/features/comercios/Comercios';
import { Configuracoes } from '@/features/configuracoes/Configuracoes';
import { Metas } from '@/features/metas/Metas';
import { Comissoes } from '@/features/comissoes/Comissoes';
import { Relatorios } from '@/features/relatorios/Relatorios';

export function AppLayout() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const abaAtiva = useUiStore((s) => s.abaAtiva);
  const carregarTudo = useDataStore((s) => s.carregarTudo);
  const carregarSolicitacoes = useDataStore((s) => s.carregarSolicitacoes);
  const carregado = useDataStore((s) => s.carregado);

  useEffect(() => {
    void carregarTudo();
  }, [carregarTudo]);

  // Notificação de novas solicitações de acesso: o gestor recebe o pedido sem
  // precisar recarregar a página (o badge na Sidebar atualiza). Prototipo usa
  // polling leve; em produção, trocar por Supabase Realtime.
  useEffect(() => {
    if (usuario.perfil !== 'admin') return;
    const id = setInterval(() => void carregarSolicitacoes(), 20000);
    return () => clearInterval(id);
  }, [usuario.perfil, carregarSolicitacoes]);

  // RBAC: se o perfil não pode ver a aba ativa, cai no dashboard.
  const permitido = abasDoPerfil(usuario.perfil).some((a) => a.id === abaAtiva);
  const aba: AbaId = permitido ? abaAtiva : 'dashboard';

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-[1240px] flex-1 overflow-y-auto px-4 py-6 lg:px-7">
          {!carregado ? (
            <div className="px-4 py-16 text-center text-sm text-ink-muted">Carregando dados da operação…</div>
          ) : (
            renderAba(aba, usuario.perfil)
          )}
        </main>
      </div>
    </div>
  );
}

function renderAba(aba: AbaId, perfil: 'admin' | 'vendedor') {
  switch (aba) {
    case 'dashboard':
      return perfil === 'admin' ? <DashboardAdmin /> : <DashboardVendedor />;
    case 'vendas':
      return <Vendas />;
    case 'perdas':
      return <Perdas />;
    case 'produtos':
      return <Produtos />;
    case 'comercios':
      return <Comercios />;
    case 'metas':
      return <Metas />;
    case 'comissoes':
      return <Comissoes />;
    case 'lembretes':
      return <Lembretes />;
    case 'relatorios':
      return <Relatorios />;
    case 'configuracoes':
      return <Configuracoes />;
  }
}
