import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, StatCard, SectionLabel, Modal, ConfirmModal, EmptyState } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';
import { noPeriodo, rangeDoMes, rotuloMesExtenso } from '@/lib/periodo';
import { FormularioPerda } from './RegistrarPerda';
import type { Perda } from '@/types';

/**
 * Aba "Perdas": registro de trocas de produto vencido por visita (não é
 * venda — não gera receita real) + relatório do período com os 3 recortes
 * pedidos pelo cliente (pacotes, custo, faturamento perdido, por comércio e
 * por produto) + histórico completo.
 */
export function Perdas() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { perdas, comercios, produtos, usuarios } = useDataStore();
  const removerPerda = useDataStore((s) => s.removerPerda);
  const periodoMes = useUiStore((s) => s.periodoMes);
  const notificar = useToastStore((s) => s.notificar);
  const periodo = useMemo(() => rangeDoMes(periodoMes), [periodoMes]);

  const [aberto, setAberto] = useState(false);
  const [selecionada, setSelecionada] = useState<Perda | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const restrito = usuario.perfil === 'vendedor' ? usuario.id : undefined;

  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '—';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—';
  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';

  const minhas = useMemo(
    () => perdas.filter((p) => !restrito || p.vendedor_id === restrito),
    [perdas, restrito],
  );

  const doPeriodo = useMemo(
    () => minhas.filter((p) => noPeriodo(p.data_perda, periodo)),
    [minhas, periodo],
  );

  const relatorio = useMemo(() => {
    const totalPacotes = doPeriodo.reduce((a, p) => a + p.quantidade, 0);
    // Mesmo raciocínio do Dashboard: se algum produto não tem custo
    // cadastrado, o agregado de custo vira "não informado" em vez de tratar
    // o desconhecido como zero (o que esconderia a lacuna de dado).
    const custoConhecido = doPeriodo.every((p) => p.valor_custo != null);
    const totalCusto = custoConhecido ? doPeriodo.reduce((a, p) => a + (p.valor_custo ?? 0), 0) : null;
    const totalFaturamento = doPeriodo.reduce((a, p) => a + p.valor_faturamento, 0);

    const porComercio: Record<string, number> = {};
    doPeriodo.forEach((p) => {
      porComercio[p.comercio_id] = (porComercio[p.comercio_id] ?? 0) + (p.valor_custo ?? 0);
    });
    const rankingComercios = Object.entries(porComercio).sort((a, b) => b[1] - a[1]);

    const porProduto: Record<string, number> = {};
    doPeriodo.forEach((p) => {
      porProduto[p.produto_id] = (porProduto[p.produto_id] ?? 0) + p.quantidade;
    });
    const rankingProdutos = Object.entries(porProduto).sort((a, b) => b[1] - a[1]);

    return { totalPacotes, totalCusto, totalFaturamento, rankingComercios, rankingProdutos };
  }, [doPeriodo]);

  const onExcluir = async () => {
    if (!selecionada) return;
    setExcluindo(true);
    try {
      await removerPerda(selecionada.id);
      notificar('Perda excluída.', 'neutral');
      setSelecionada(null);
      setConfirmandoExclusao(false);
    } finally {
      setExcluindo(false);
    }
  };

  const historico = [...minhas].sort((a, b) => b.data_perda.localeCompare(a.data_perda));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{restrito ? 'Minhas perdas' : 'Perdas registradas'}</SectionLabel>
        <Button size="sm" onClick={() => setAberto(true)}>+ Registrar Perda</Button>
      </div>

      <div>
        <SectionLabel>Relatório do período — {rotuloMesExtenso(periodoMes)}</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            rotulo="Pacotes perdidos"
            valor={String(relatorio.totalPacotes)}
            faixa="bad"
            contexto={`${doPeriodo.length} registro(s) no período`}
          />
          <StatCard
            rotulo="Perda em custo"
            valor={relatorio.totalCusto != null ? fmtBRLCompact(relatorio.totalCusto) : 'Não informada'}
            faixa="bad"
            contexto={relatorio.totalCusto != null ? 'Desperdício real do período' : 'Cadastre o custo dos produtos para calcular'}
          />
          <StatCard
            rotulo="Faturamento perdido"
            valor={fmtBRLCompact(relatorio.totalFaturamento)}
            faixa="accent"
            contexto="Receita que deixou de ser gerada"
          />
        </div>
      </div>

      {doPeriodo.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="text-sm font-bold">Comércios que mais perderam</div>
            <div className="mb-4 text-xs text-ink-muted">Por custo (R$) no período.</div>
            <div className="flex flex-col gap-2.5">
              {relatorio.rankingComercios.slice(0, 5).map(([id, total]) => (
                <div key={id} className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium">{nomeComercio(id)}</span>
                  <span className="font-bold tabular-nums">{fmtBRL(total)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <div className="text-sm font-bold">Produtos que mais perderam</div>
            <div className="mb-4 text-xs text-ink-muted">Por quantidade de pacotes no período.</div>
            <div className="flex flex-col gap-2.5">
              {relatorio.rankingProdutos.slice(0, 5).map(([id, qtd]) => (
                <div key={id} className="flex items-center justify-between text-[12.5px]">
                  <span className="font-medium">{nomeProduto(id)}</span>
                  <span className="font-bold tabular-nums">{qtd} cx</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div>
        <SectionLabel>Histórico completo</SectionLabel>
        {/* Desktop: tabela */}
        <Card className="hidden overflow-hidden sm:block">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                  <th className="px-5 py-2.5">Data</th>
                  {!restrito && <th className="px-5 py-2.5">Vendedor</th>}
                  <th className="px-5 py-2.5">Comércio</th>
                  <th className="px-5 py-2.5">Produto</th>
                  <th className="px-5 py-2.5">Qtd.</th>
                  <th className="px-5 py-2.5">Custo</th>
                  <th className="px-5 py-2.5">Fat. perdido</th>
                </tr>
              </thead>
              <tbody>
                {historico.length === 0 ? (
                  <tr><td colSpan={restrito ? 6 : 7}><EmptyState>Nenhuma perda registrada ainda.</EmptyState></td></tr>
                ) : (
                  historico.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelecionada(p)}
                      className="cursor-pointer border-b border-line text-[13px] transition last:border-0 hover:bg-plane"
                    >
                      <td className="px-5 py-3 tabular-nums text-ink-muted">{fmtData(p.data_perda)}</td>
                      {!restrito && <td className="px-5 py-3 font-medium">{nomeVendedor(p.vendedor_id)}</td>}
                      <td className="px-5 py-3">{nomeComercio(p.comercio_id)}</td>
                      <td className="px-5 py-3">{nomeProduto(p.produto_id)}</td>
                      <td className="px-5 py-3 tabular-nums">{p.quantidade}</td>
                      <td className="px-5 py-3 tabular-nums">{p.valor_custo != null ? fmtBRL(p.valor_custo) : '—'}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{fmtBRL(p.valor_faturamento)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Mobile: cards */}
        <div className="mt-4 flex flex-col gap-3 sm:hidden">
          {historico.length === 0 ? (
            <Card><EmptyState>Nenhuma perda registrada ainda.</EmptyState></Card>
          ) : (
            historico.map((p) => (
              <Card key={p.id} className="cursor-pointer p-4 transition active:bg-plane" onClick={() => setSelecionada(p)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[13.5px] font-semibold">{nomeProduto(p.produto_id)}</div>
                    <div className="text-xs text-ink-muted">{nomeComercio(p.comercio_id)}{!restrito ? ` · ${nomeVendedor(p.vendedor_id)}` : ''}</div>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-[12.5px]">
                  <span className="tabular-nums text-ink-muted">{fmtData(p.data_perda)} · {p.quantidade} cx</span>
                  <span className="font-bold tabular-nums">{fmtBRL(p.valor_faturamento)}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal aberto={aberto} titulo="Registrar Perda" onFechar={() => setAberto(false)}>
        <FormularioPerda onRegistrada={() => setAberto(false)} />
      </Modal>

      <Modal aberto={selecionada !== null} titulo="Detalhes da perda" onFechar={() => setSelecionada(null)}>
        {selecionada && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <Detalhe rotulo="Data" valor={fmtData(selecionada.data_perda)} />
              <Detalhe rotulo="Vendedor" valor={nomeVendedor(selecionada.vendedor_id)} />
              <Detalhe rotulo="Comércio" valor={nomeComercio(selecionada.comercio_id)} />
              <Detalhe rotulo="Produto" valor={nomeProduto(selecionada.produto_id)} />
              <Detalhe rotulo="Quantidade" valor={`${selecionada.quantidade} cx`} />
              <Detalhe rotulo="Custo unitário" valor={selecionada.custo_unitario != null ? fmtBRL(selecionada.custo_unitario) : '—'} />
              <Detalhe rotulo="Custo total" valor={selecionada.valor_custo != null ? fmtBRL(selecionada.valor_custo) : '—'} forte />
              <Detalhe rotulo="Faturamento perdido" valor={fmtBRL(selecionada.valor_faturamento)} forte />
            </dl>
            {selecionada.observacao && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Observação</div>
                <div className="mt-0.5 text-[13px] text-ink-soft">{selecionada.observacao}</div>
              </div>
            )}
            <div className="flex justify-end border-t border-line pt-4">
              <Button variant="danger" size="sm" onClick={() => setConfirmandoExclusao(true)}>
                Excluir perda
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        aberto={confirmandoExclusao}
        titulo="Excluir perda"
        mensagem="Excluir este registro de perda definitivamente? Esta ação não pode ser desfeita."
        onCancelar={() => setConfirmandoExclusao(false)}
        confirmando={excluindo}
        onConfirmar={() => void onExcluir()}
      />
    </div>
  );
}

function Detalhe({ rotulo, valor, forte = false }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">{rotulo}</dt>
      <dd className={`mt-0.5 tabular-nums ${forte ? 'font-bold text-ink' : 'font-medium text-ink-soft'}`}>{valor}</dd>
    </div>
  );
}
