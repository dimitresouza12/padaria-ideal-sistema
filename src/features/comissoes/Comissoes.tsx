import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { Card, StatCard, SectionLabel } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtPct } from '@/lib/format';
import { noPeriodo, rangeDoMes, rotuloMesExtenso } from '@/lib/periodo';

export function Comissoes() {
  const { usuarios, vendas } = useDataStore();
  const periodoMes = useUiStore((s) => s.periodoMes);
  const periodo = useMemo(() => rangeDoMes(periodoMes), [periodoMes]);

  // Comissão é paga por período de fechamento (o mês selecionado no Header) —
  // sem esse filtro, o total a pagar acumula o histórico inteiro desde
  // sempre, e um pagamento em agosto cobraria julho de novo (bug relatado
  // pelo cliente: o sistema nunca teve virada de mês).
  const linhas = useMemo(() => {
    return usuarios
      .filter((u) => u.perfil === 'vendedor')
      .map((u) => {
        const vendasDoVendedor = vendas.filter((v) => v.vendedor_id === u.id && noPeriodo(v.data_venda, periodo));
        const faturamento = vendasDoVendedor.reduce((a, v) => a + v.valor_total, 0);
        // Se qualquer venda tiver custo desconhecido, a margem do vendedor vira
        // "não informada" — somar tratando o desconhecido como zero inflaria o
        // número e esconderia a lacuna de dado (mesmo raciocínio do Dashboard).
        const margemConhecida = vendasDoVendedor.every((v) => v.margem != null);
        const margem = margemConhecida ? vendasDoVendedor.reduce((a, v) => a + (v.margem ?? 0), 0) : null;
        const comissao = faturamento * u.taxa_comissao;
        return { id: u.id, nome: u.nome, taxa: u.taxa_comissao, pedidos: vendasDoVendedor.length, faturamento, margem, comissao };
      })
      .sort((a, b) => b.comissao - a.comissao);
  }, [usuarios, vendas, periodo]);

  const totalComissao = linhas.reduce((a, l) => a + l.comissao, 0);
  const margemTotalConhecida = linhas.every((l) => l.margem != null);
  const totalMargem = margemTotalConhecida ? linhas.reduce((a, l) => a + (l.margem ?? 0), 0) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Resumo do período — {rotuloMesExtenso(periodoMes)}</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard rotulo="Comissão total a pagar" valor={fmtBRLCompact(totalComissao)} faixa="accent" contexto={`${linhas.length} vendedor(es) com vendas no período`} />
          <StatCard
            rotulo="Margem bruta gerada"
            valor={totalMargem != null ? fmtBRLCompact(totalMargem) : 'Não informada'}
            faixa="good"
            contexto="Lucro bruto do período (não é mais a base da comissão)"
          />
        </div>
      </div>

      {/* Desktop: tabela */}
      <Card className="hidden overflow-hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5">Vendedor</th>
                <th className="px-5 py-2.5">Pedidos</th>
                <th className="px-5 py-2.5">Faturamento</th>
                <th className="px-5 py-2.5">Margem</th>
                <th className="px-5 py-2.5">Taxa</th>
                <th className="px-5 py-2.5">Comissão</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-b border-line text-[13px] last:border-0">
                  <td className="px-5 py-3 font-semibold">{l.nome}</td>
                  <td className="px-5 py-3 tabular-nums">{l.pedidos}</td>
                  <td className="px-5 py-3 tabular-nums">{fmtBRL(l.faturamento)}</td>
                  <td className="px-5 py-3 tabular-nums">{l.margem != null ? fmtBRL(l.margem) : '—'}</td>
                  <td className="px-5 py-3 tabular-nums">{fmtPct(l.taxa * 100)}</td>
                  <td className="px-5 py-3 font-bold tabular-nums text-accent-dark">{fmtBRL(l.comissao)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line-strong text-[13px]">
                <td className="px-5 py-3 font-bold" colSpan={5}>Total</td>
                <td className="px-5 py-3 font-bold tabular-nums text-accent-dark">{fmtBRL(totalComissao)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {linhas.map((l) => (
          <Card key={l.id} className="p-4">
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-[14px] font-bold">{l.nome}</div>
              <div className="text-[15px] font-bold tabular-nums text-accent-dark">{fmtBRL(l.comissao)}</div>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Pedidos</dt>
                <dd className="tabular-nums">{l.pedidos}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Taxa</dt>
                <dd className="tabular-nums">{fmtPct(l.taxa * 100)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Faturamento</dt>
                <dd className="tabular-nums">{fmtBRL(l.faturamento)}</dd>
              </div>
              <div>
                <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Margem</dt>
                <dd className="tabular-nums">{l.margem != null ? fmtBRL(l.margem) : '—'}</dd>
              </div>
            </dl>
          </Card>
        ))}
        <Card className="flex items-center justify-between p-4">
          <div className="text-[13px] font-bold">Total a pagar</div>
          <div className="text-[15px] font-bold tabular-nums text-accent-dark">{fmtBRL(totalComissao)}</div>
        </Card>
      </div>
    </div>
  );
}
