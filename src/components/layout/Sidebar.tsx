import { useAuthStore } from '@/store/useAuthStore';
import { abasDoPerfil, useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { iconePorAba, IconRestaurar, IconSair } from '@/components/icons';

export function Sidebar() {
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const { abaAtiva, irPara, sidebarAberta, fecharSidebar } = useUiStore();
  const restaurarExemplo = useDataStore((s) => s.restaurarExemplo);

  if (!usuario) return null;
  const abas = abasDoPerfil(usuario.perfil);

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-line-strong bg-accent-wash">
            <img src="/logo-wheat-icon.png" alt="" className="h-5 w-auto" />
          </div>
          <div>
            <div className="text-[13.5px] font-bold leading-tight">Padaria Ideal</div>
            <div className="text-[11px] font-medium text-ink-muted">Atacado &amp; Distribuição</div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {abas.map((aba) => {
            const Icone = iconePorAba[aba.id];
            const ativo = aba.id === abaAtiva;
            return (
              <button
                key={aba.id}
                onClick={() => irPara(aba.id)}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition ${
                  ativo ? 'bg-accent-wash text-accent-dark' : 'text-ink-soft hover:bg-plane hover:text-ink'
                }`}
              >
                <Icone size={17} />
                <span>{aba.titulo}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2 border-t border-line px-4 py-4">
          <button
            onClick={() => {
              if (confirm('Restaurar todos os dados de exemplo? As alterações desta sessão serão perdidas.'))
                void restaurarExemplo();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-xs font-bold text-ink-soft transition hover:bg-plane"
          >
            <IconRestaurar size={15} />
            Restaurar dados de exemplo
          </button>
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
