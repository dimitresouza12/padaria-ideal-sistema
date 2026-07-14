import { useAuthStore } from '@/store/useAuthStore';
import { abasDoPerfil, useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { iconePorAba, IconSair } from '@/components/icons';

export function Sidebar() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const { abaAtiva, irPara, sidebarAberta, fecharSidebar } = useUiStore();
  const solicitacoes = useDataStore((s) => s.solicitacoes);

  if (!usuario) return null;
  const abas = abasDoPerfil(usuario.perfil);
  // Notificação de pedidos de acesso aguardando aprovação (aba Configurações).
  const pendentesAcesso = solicitacoes.filter((s) => s.status === 'pendente').length;

  return (
    <>
      {/* backdrop mobile */}
      {sidebarAberta && (
        <div className="fixed inset-0 z-[110] bg-black/30 lg:hidden" onClick={fecharSidebar} />
      )}

      <aside
        className={`fixed z-[120] flex h-full w-60 shrink-0 flex-col border-r border-line bg-white transition-transform lg:static lg:translate-x-0 ${
          sidebarAberta ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-5">
          <img src="/logo-wheat-icon.png" alt="" className="h-9 w-auto" />
          <div>
            <div className="text-[13.5px] font-bold leading-tight">Padaria Ideal</div>
            <div className="text-[11px] font-medium text-ink-muted">Atacado &amp; Distribuição</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {abas.map((aba) => {
            const Icone = iconePorAba[aba.id];
            const ativo = aba.id === abaAtiva;
            const badge = aba.id === 'configuracoes' ? pendentesAcesso : 0;
            return (
              <button
                key={aba.id}
                onClick={() => irPara(aba.id)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition ${
                  ativo ? 'bg-accent-wash text-accent-dark' : 'text-ink-soft hover:bg-plane hover:text-ink'
                }`}
              >
                <Icone size={17} />
                <span className="flex-1">{aba.titulo}</span>
                {badge > 0 && (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad-strong px-1 text-[10px] font-extrabold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-line px-4 py-4">
          <button
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-xs font-bold text-ink-soft transition hover:bg-plane"
          >
            <IconSair size={15} />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
