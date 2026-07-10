import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, StatCard, SectionLabel } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtPct } from '@/lib/format';

export function Comissoes() {
  const { usuarios, vendas } = useDataStore();

  const linhas = useMemo(() => {
    return usuarios
      .filter((u) => u.perfil === 'vendedor')
      .map((u) => {
        const vendasDoVendedor = vendas.filter((v) => v.vendedor_id === u.id);
        const faturamento = vendasDoVendedor.reduce((a, v) => a + v.valor_total, 0);
        const margem = vendasDoVendedor.reduce((a, v) => a + v.margem, 0);
        const comissao = margem * u.taxa_comissao;
        return { id: u.id, nome: u.nome, taxa: u.taxa_comissao, pedidos: vendasDoVendedor.length, faturamento, margem, comissao };
      })
      .sort((a, b) => b.comissao - a.comissao);
  }, [usuarios, vendas]);

  const totalComissao = linhas.reduce((a, l) => a + l.comissao, 0);
  const totalMargem = linhas.reduce((a, l) => a + l.margem, 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Resumo do período — Julho 2026</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard rotulo="Comissão total a pagar" valor={fmtBRLCompact(totalComissao)} faixa="accent" contexto={`${linhas.length} vendedor(es) com vendas no período`} />
          <StatCard rotulo="Margem bruta gerada" valor={fmtBRLCompact(totalMargem)} faixa="good" contexto="Base de cálculo de todas as comissões" />
        </div>
      </div>

      <Card className="overflow-hidden">
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
                  <td className="px-5 py-3 tabular-nums">{fmtBRL(l.margem)}</td>
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
    </div>
  );
}
