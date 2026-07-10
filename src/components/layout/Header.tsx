import { useAuthStore } from '@/store/useAuthStore';
import { ABAS, useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { IconLembrete, IconMenu } from '@/components/icons';
import { iniciais, primeiroNome } from '@/lib/format';

const ROLE_LABEL = { admin: 'Administrador', vendedor: 'Vendedor' } as const;

export function Header() {
  const usuario = useAuthStore((s) => s.usuario);
  const { abaAtiva, irPara, toggleSidebar } = useUiStore();
  const vendas = useDataStore((s) => s.vendas);

  if (!usuario) return null;
  const aba = ABAS.find((a) => a.id === abaAtiva)!;
  const pendencias = vendas.filter((v) => v.status === 'pendente' || v.status === 'vencido').length;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-5 py-3.5 lg:px-7">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="rounded-lg border border-line-strong p-2 text-ink-soft transition hover:bg-plane lg:hidden"
          aria-label="Abrir menu"
        >
          <IconMenu size={16} />
        </button>
        <div>
          <div className="text-[15px] font-bold">{aba.titulo}</div>
          <div className="text-[11.5px] text-ink-muted">{aba.subtitulo}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => irPara('lembretes')}
          className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-bold text-ink-soft transition hover:bg-plane"
        >
          <IconLembrete size={16} />
          <span className="hidden sm:inline">Lembretes</span>
          {pendencias > 0 && (
            <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-bad-strong px-1 text-[10px] font-extrabold text-white">
              {pendencias}
            </span>
          )}
        </button>

        <div className="hidden h-6 w-px bg-line-strong sm:block" />

        <div className="flex items-center gap-2.5">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-gold to-accent text-[12.5px] font-bold text-white">
            {iniciais(usuario.nome)}
          </div>
          <div className="hidden sm:block">
            <div className="text-[12.5px] font-bold leading-tight">{primeiroNome(usuario.nome)}</div>
            <div className="text-[11px] text-ink-muted">{ROLE_LABEL[usuario.perfil]}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
