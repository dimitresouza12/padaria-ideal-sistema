import { useAuthStore } from '@/store/useAuthStore';
import { ABAS, useUiStore } from '@/store/useUiStore';
import { useDataStore } from '@/store/useDataStore';
import { IconChevronDireita, IconChevronEsquerda, IconLembrete, IconMenu } from '@/components/icons';
import { iniciais, primeiroNome } from '@/lib/format';
import { mesAtualISO, mesAnterior, mesSeguinte, rotuloMesExtenso } from '@/lib/periodo';
import { agruparVendasPorPedido } from '@/lib/pedidos';

const ROLE_LABEL = { admin: 'Administrador', vendedor: 'Vendedor' } as const;

export function Header() {
  const usuario = useAuthStore((s) => s.usuario);
  const { abaAtiva, irPara, toggleSidebar, periodoMes, setPeriodoMes } = useUiStore();
  const vendas = useDataStore((s) => s.vendas);

  if (!usuario) return null;
  const aba = ABAS.find((a) => a.id === abaAtiva)!;
  // Conta pedidos (agrupados), não linhas de venda — bate com o que a tela de
  // Lembretes mostra (um mesmo pedido pode ter várias linhas, uma por produto).
  const pendencias = agruparVendasPorPedido(
    vendas.filter((v) => v.status === 'pendente' || v.status === 'vencido'),
  ).length;
  // O seletor de período só faz sentido nas telas que agregam faturamento por
  // mês — nas demais (cadastros, lembretes) ficaria mostrando um filtro que
  // não afeta nada na tela, o que confunde mais do que ajuda.
  const mostraSeletorPeriodo = abaAtiva === 'dashboard' || abaAtiva === 'comissoes' || abaAtiva === 'perdas';
  const ehMesAtual = periodoMes === mesAtualISO();

  return (
    <header className="flex flex-nowrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-3.5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="shrink-0 rounded-lg border border-line-strong p-2 text-ink-soft transition hover:bg-plane lg:hidden"
          aria-label="Abrir menu"
        >
          <IconMenu size={16} />
        </button>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold">{aba.titulo}</div>
          <div className="truncate text-[11.5px] text-ink-muted">{aba.subtitulo}</div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {mostraSeletorPeriodo && (
          <div className="flex items-center gap-1 rounded-lg border border-line-strong px-1 py-1">
            <button
              type="button"
              onClick={() => setPeriodoMes(mesAnterior(periodoMes))}
              aria-label="Mês anterior"
              className="rounded-md p-1.5 text-ink-soft transition hover:bg-plane hover:text-ink"
            >
              <IconChevronEsquerda size={14} />
            </button>
            <span className="min-w-[92px] px-1 text-center text-[12px] font-bold capitalize tabular-nums sm:min-w-[112px]">
              {rotuloMesExtenso(periodoMes)}
            </span>
            <button
              type="button"
              onClick={() => setPeriodoMes(mesSeguinte(periodoMes))}
              disabled={ehMesAtual}
              aria-label="Mês seguinte"
              className="rounded-md p-1.5 text-ink-soft transition hover:bg-plane hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconChevronDireita size={14} />
            </button>
          </div>
        )}

        <button
          onClick={() => irPara('lembretes')}
          aria-label="Lembretes de pagamento"
          className="relative inline-flex items-center gap-2 rounded-lg border border-line-strong p-2 text-ink-soft transition hover:bg-plane sm:px-3 sm:py-1.5"
        >
          <span className="relative inline-flex">
            <IconLembrete size={16} />
            {pendencias > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-bad-strong px-1 text-[9px] font-extrabold text-white">
                {pendencias}
              </span>
            )}
          </span>
          <span className="hidden text-xs font-bold sm:inline">Lembretes</span>
        </button>

        <div className="hidden h-6 w-px bg-line-strong sm:block" />

        <div className="hidden items-center gap-2.5 sm:flex">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-accent text-[11.5px] font-bold text-white">
            {iniciais(usuario.nome)}
          </div>
          <div>
            <div className="text-[12.5px] font-bold leading-tight">{primeiroNome(usuario.nome)}</div>
            <div className="text-[11px] text-ink-muted">{ROLE_LABEL[usuario.perfil]}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
