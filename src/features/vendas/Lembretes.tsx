import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Tag, EmptyState } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';

export function Lembretes() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { vendas, comercios, usuarios } = useDataStore();
  const darBaixa = useDataStore((s) => s.darBaixa);
  const notificar = useToastStore((s) => s.notificar);

  const lista = useMemo(() => {
    return vendas
      .filter((v) => v.status === 'pendente' || v.status === 'vencido')
      .filter((v) => usuario.perfil === 'admin' || v.vendedor_id === usuario.id)
      .sort((a, b) => (a.data_vencimento ?? '').localeCompare(b.data_vencimento ?? ''));
  }, [vendas, usuario]);

  const totalVencido = lista.filter((v) => v.status === 'vencido').reduce((a, v) => a + v.valor_total, 0);
  const totalPendente = lista.filter((v) => v.status === 'pendente').reduce((a, v) => a + v.valor_total, 0);

  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '—';
  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-[3px] border-l-bad-strong p-4">
          <div className="text-xs font-semibold text-ink-soft">Vencido</div>
          <div className="mt-1 text-[22px] font-extrabold">{fmtBRLCompact(totalVencido)}</div>
        </Card>
        <Card className="border-l-[3px] border-l-warn p-4">
          <div className="text-xs font-semibold text-ink-soft">A vencer</div>
          <div className="mt-1 text-[22px] font-extrabold">{fmtBRLCompact(totalPendente)}</div>
        </Card>
        <Card className="border-l-[3px] border-l-ink-muted p-4">
          <div className="text-xs font-semibold text-ink-soft">Total em aberto</div>
          <div className="mt-1 text-[22px] font-extrabold">{fmtBRLCompact(totalVencido + totalPendente)}</div>
        </Card>
      </div>

      {lista.length === 0 ? (
        <Card><EmptyState>Nenhum pagamento pendente. Todas as vendas a prazo estão quitadas.</EmptyState></Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-5 py-2.5">Cliente</th>
                    <th className="px-5 py-2.5">Vendedor</th>
                    <th className="px-5 py-2.5">Valor</th>
                    <th className="px-5 py-2.5">Vencimento</th>
                    <th className="px-5 py-2.5">Situação</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {lista.map((v) => (
                    <tr key={v.id} className="border-b border-line text-[13px] last:border-0">
                      <td className="px-5 py-3 font-semibold">{nomeComercio(v.comercio_id)}</td>
                      <td className="px-5 py-3">{nomeVendedor(v.vendedor_id)}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{fmtBRL(v.valor_total)}</td>
                      <td className="px-5 py-3 tabular-nums">{fmtData(v.data_vencimento)}</td>
                      <td className="px-5 py-3">
                        {v.status === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="good" size="sm" onClick={() => void darBaixa(v.id).then(() => notificar('Pagamento confirmado.'))}>
                          Dar Baixa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {lista.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold">{nomeComercio(v.comercio_id)}</div>
                    <div className="text-xs text-ink-muted">{nomeVendedor(v.vendedor_id)}</div>
                  </div>
                  {v.status === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>}
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[12.5px]">
                  <span className="tabular-nums text-ink-muted">Vence {fmtData(v.data_vencimento)}</span>
                  <span className="font-bold tabular-nums">{fmtBRL(v.valor_total)}</span>
                </div>
                <Button
                  variant="good"
                  size="sm"
                  className="mt-3 w-full"
                  onClick={() => void darBaixa(v.id).then(() => notificar('Pagamento confirmado.'))}
                >
                  Dar Baixa
                </Button>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
