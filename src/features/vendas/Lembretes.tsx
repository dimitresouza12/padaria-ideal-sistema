import { Fragment, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Tag, EmptyState } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';
import { agruparVendasPorPedido, type GrupoPedido } from '@/lib/pedidos';

export function Lembretes() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { vendas, comercios, usuarios, produtos } = useDataStore();
  const darBaixaEmLote = useDataStore((s) => s.darBaixaEmLote);
  const marcarEntregue = useDataStore((s) => s.marcarEntregue);
  const notificar = useToastStore((s) => s.notificar);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [entregando, setEntregando] = useState<string | null>(null);

  const lista = useMemo(() => {
    return vendas
      .filter((v) => v.status === 'pendente' || v.status === 'vencido')
      .filter((v) => usuario.perfil === 'admin' || v.vendedor_id === usuario.id);
  }, [vendas, usuario]);

  const grupos = useMemo(
    () =>
      agruparVendasPorPedido(lista).sort((a, b) => (a.data_vencimento ?? '').localeCompare(b.data_vencimento ?? '')),
    [lista],
  );

  const totalVencido = grupos.filter((g) => g.status === 'vencido').reduce((a, g) => a + g.valor_total, 0);
  const totalPendente = grupos.filter((g) => g.status === 'pendente').reduce((a, g) => a + g.valor_total, 0);

  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '—';
  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—';

  const onDarBaixa = async (grupo: GrupoPedido) => {
    setBaixando(grupo.chave);
    try {
      await darBaixaEmLote(grupo.itens.map((v) => v.id));
      notificar('Pagamento confirmado.');
    } catch {
      notificar('Não foi possível confirmar o pagamento. Verifique sua conexão e tente novamente.', 'bad');
    } finally {
      setBaixando(null);
    }
  };

  const onMarcarEntregue = async (grupo: GrupoPedido) => {
    setEntregando(grupo.chave);
    try {
      await marcarEntregue(grupo.itens.map((v) => v.id));
      notificar('Pedido marcado como entregue.');
    } catch {
      notificar('Não foi possível marcar como entregue. Verifique sua conexão e tente novamente.', 'bad');
    } finally {
      setEntregando(null);
    }
  };

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

      {grupos.length === 0 ? (
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
                    <th className="px-5 py-2.5">Itens</th>
                    <th className="px-5 py-2.5">Valor</th>
                    <th className="px-5 py-2.5">Vencimento</th>
                    <th className="px-5 py-2.5">Situação</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g) => (
                    <Fragment key={g.chave}>
                      <tr className="border-b border-line text-[13px] last:border-0">
                        <td className="px-5 py-3 font-semibold">{nomeComercio(g.comercio_id)}</td>
                        <td className="px-5 py-3">{nomeVendedor(g.vendedor_id)}</td>
                        <td className="px-5 py-3">
                          {g.itens.length === 1 ? (
                            nomeProduto(g.itens[0].produto_id)
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandido(expandido === g.chave ? null : g.chave)}
                              className="font-semibold text-accent-dark underline-offset-2 hover:underline"
                            >
                              {g.itens.length} produtos{expandido === g.chave ? ' ▴' : ' ▾'}
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3 font-semibold tabular-nums">{fmtBRL(g.valor_total)}</td>
                        <td className="px-5 py-3 tabular-nums">{fmtData(g.data_vencimento)}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-col items-start gap-1">
                            {g.status === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>}
                            {g.entregue ? <Tag tone="good">Entregue</Tag> : <Tag tone="neutral">Não entregue</Tag>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex gap-2">
                              {!g.entregue && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  disabled={entregando === g.chave}
                                  onClick={() => void onMarcarEntregue(g)}
                                >
                                  {entregando === g.chave ? 'Marcando…' : 'Marcar Entregue'}
                                </Button>
                              )}
                              <Button
                                variant="good"
                                size="sm"
                                disabled={!g.entregue || baixando === g.chave}
                                onClick={() => void onDarBaixa(g)}
                              >
                                {baixando === g.chave ? 'Confirmando…' : 'Dar Baixa'}
                              </Button>
                            </div>
                            {!g.entregue && (
                              <span className="text-[11px] text-ink-muted">Marque como entregue para liberar</span>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandido === g.chave && g.itens.length > 1 && (
                        <tr className="border-b border-line bg-plane/40 text-[12.5px]">
                          <td colSpan={7} className="px-5 py-3">
                            <div className="flex flex-col gap-1">
                              {g.itens.map((v) => (
                                <div key={v.id} className="flex items-center justify-between text-ink-soft">
                                  <span>{nomeProduto(v.produto_id)} · {v.quantidade} cx</span>
                                  <span className="tabular-nums font-medium">{fmtBRL(v.valor_total)}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {grupos.map((g) => (
              <Card key={g.chave} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold">{nomeComercio(g.comercio_id)}</div>
                    <div className="text-xs text-ink-muted">{nomeVendedor(g.vendedor_id)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {g.status === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>}
                    {g.entregue ? <Tag tone="good">Entregue</Tag> : <Tag tone="neutral">Não entregue</Tag>}
                  </div>
                </div>
                <div className="mt-2 text-xs text-ink-muted">
                  {g.itens.length === 1 ? (
                    nomeProduto(g.itens[0].produto_id)
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandido(expandido === g.chave ? null : g.chave)}
                      className="font-semibold text-accent-dark underline-offset-2 hover:underline"
                    >
                      {g.itens.length} produtos{expandido === g.chave ? ' ▴' : ' ▾'}
                    </button>
                  )}
                </div>
                {expandido === g.chave && g.itens.length > 1 && (
                  <div className="mt-2 flex flex-col gap-1 rounded-lg bg-plane/40 p-2.5 text-[12px]">
                    {g.itens.map((v) => (
                      <div key={v.id} className="flex items-center justify-between text-ink-soft">
                        <span>{nomeProduto(v.produto_id)} · {v.quantidade} cx</span>
                        <span className="tabular-nums font-medium">{fmtBRL(v.valor_total)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[12.5px]">
                  <span className="tabular-nums text-ink-muted">Vence {fmtData(g.data_vencimento)}</span>
                  <span className="font-bold tabular-nums">{fmtBRL(g.valor_total)}</span>
                </div>
                {!g.entregue && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={entregando === g.chave}
                    onClick={() => void onMarcarEntregue(g)}
                  >
                    {entregando === g.chave ? 'Marcando…' : 'Marcar Entregue'}
                  </Button>
                )}
                <Button
                  variant="good"
                  size="sm"
                  className="mt-2 w-full"
                  disabled={!g.entregue || baixando === g.chave}
                  onClick={() => void onDarBaixa(g)}
                >
                  {baixando === g.chave ? 'Confirmando…' : 'Dar Baixa'}
                </Button>
                {!g.entregue && (
                  <div className="mt-1.5 text-center text-[11px] text-ink-muted">Marque como entregue para liberar</div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
