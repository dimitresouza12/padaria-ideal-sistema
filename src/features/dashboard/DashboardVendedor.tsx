import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { Card, StatCard, ProgressBar, Tag } from '@/components/ui';
import { fmtBRLCompact, fmtData, primeiroNome } from '@/lib/format';
import { noPeriodo, rangeDoMes, rotuloMesExtenso } from '@/lib/periodo';

export function DashboardVendedor() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { vendas, comercios, produtos } = useDataStore();
  const periodoMes = useUiStore((s) => s.periodoMes);
  const periodo = useMemo(() => rangeDoMes(periodoMes), [periodoMes]);

  // Sem esse filtro, o card de "vendas do mês" soma o histórico inteiro do
  // vendedor desde sempre — o mesmo bug de virada de mês do Dashboard do
  // Admin, corrigido do mesmo jeito.
  const minhas = useMemo(
    () => vendas.filter((v) => v.vendedor_id === usuario.id && noPeriodo(v.data_venda, periodo)),
    [vendas, usuario.id, periodo],
  );

  const faturamento = minhas.reduce((a, v) => a + v.valor_total, 0);
  const comissao = faturamento * usuario.taxa_comissao;
  const pct = usuario.meta_individual ? (faturamento / usuario.meta_individual) * 100 : 0;
  const acima = pct >= 100;
  // Pendente de recebimento é saldo em aberto HOJE, não uma métrica do mês
  // selecionado — uma venda de junho ainda não paga continua pendente mesmo
  // olhando o Dashboard de agosto, então usa `vendas` (todo o histórico do
  // vendedor), não `minhas`.
  const pendentes = vendas.filter((v) => v.vendedor_id === usuario.id && (v.status === 'pendente' || v.status === 'vencido'));
  const totalPendente = pendentes.reduce((a, v) => a + v.valor_total, 0);

  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '—';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—';
  const statusTag = (s: string) =>
    s === 'pago' ? <Tag tone="good">Pago</Tag> : s === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>;

  const recentes = [...minhas].sort((a, b) => b.data_venda.localeCompare(a.data_venda)).slice(0, 6);

  // Carteira do vendedor — resolve o "branco na cabeça, será que estou
  // pulando algum cliente?" sem precisar de agenda/rota (o cliente pediu só
  // a carteira, a decisão de quem visitar em cada dia continua manual).
  const minhaCarteira = useMemo(
    () =>
      comercios
        .filter((c) => c.ativo && c.vendedor_id === usuario.id)
        .map((c) => ({
          comercio: c,
          comprouEsteMes: minhas.some((v) => v.comercio_id === c.id),
        }))
        .sort((a, b) => Number(a.comprouEsteMes) - Number(b.comprouEsteMes)),
    [comercios, minhas, usuario.id],
  );

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-6">
        <div className="text-[20px] font-extrabold">
          <span className="text-xs font-semibold text-ink-soft">Bem-vindo(a), </span>
          {primeiroNome(usuario.nome)}
        </div>
        <div className="mt-1 text-xs text-ink-muted">Desempenho individual — {rotuloMesExtenso(periodoMes)}</div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard rotulo="Vendas do mês" valor={fmtBRLCompact(faturamento)} faixa="accent" contexto={`${minhas.length} pedido(s) registrado(s)`} />
        <StatCard
          rotulo="Comissão acumulada"
          valor={fmtBRLCompact(comissao)}
          faixa="good"
          contexto={`${(usuario.taxa_comissao * 100).toLocaleString('pt-BR')}% sobre o faturamento`}
        />
        <StatCard
          rotulo="Pendente de recebimento"
          valor={fmtBRLCompact(totalPendente)}
          faixa={pendentes.length ? 'bad' : 'good'}
          contexto={`${pendentes.length} venda(s) a prazo em aberto`}
        />
      </div>

      <Card className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-bold">Progresso da meta individual</div>
          <Tag tone={acima ? 'good' : 'bad'}>{pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</Tag>
        </div>
        <div className="mb-3 text-xs text-ink-muted">Meta definida pelo gestor: {fmtBRLCompact(usuario.meta_individual)}</div>
        <ProgressBar pct={pct} tone={acima ? 'good' : 'accent'} />
        <div className="mt-2 flex justify-between text-[11.5px] text-ink-muted">
          <span>{fmtBRLCompact(faturamento)} vendido</span>
          <span>
            {acima
              ? `Meta superada em ${fmtBRLCompact(faturamento - usuario.meta_individual)}`
              : `Faltam ${fmtBRLCompact(usuario.meta_individual - faturamento)}`}
          </span>
        </div>
      </Card>

      {minhaCarteira.length > 0 && (
        <Card className="p-5">
          <div className="mb-1 text-sm font-bold">Meus clientes</div>
          <div className="mb-3 text-xs text-ink-muted">
            {minhaCarteira.filter((c) => !c.comprouEsteMes).length} de {minhaCarteira.length} ainda sem compra em{' '}
            {rotuloMesExtenso(periodoMes)} — quem falta aparece primeiro.
          </div>
          <div className="flex flex-col gap-1.5">
            {minhaCarteira.map(({ comercio, comprouEsteMes }) => (
              <div key={comercio.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2 text-[12.5px]">
                <span className="font-medium">{comercio.razao_social}</span>
                <Tag tone={comprouEsteMes ? 'good' : 'neutral'}>{comprouEsteMes ? 'Comprou este mês' : 'Ainda não comprou'}</Tag>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="px-5 pb-1 pt-4 text-sm font-bold">Últimas vendas registradas</div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">Produto</th>
                <th className="px-5 py-2.5">Qtd.</th>
                <th className="px-5 py-2.5">Valor</th>
                <th className="px-5 py-2.5">Situação</th>
              </tr>
            </thead>
            <tbody>
              {recentes.map((v) => (
                <tr key={v.id} className="border-b border-line text-[13px] last:border-0">
                  <td className="px-5 py-2.5 tabular-nums text-ink-muted">{fmtData(v.data_venda)}</td>
                  <td className="px-5 py-2.5 font-medium">{nomeComercio(v.comercio_id)}</td>
                  <td className="px-5 py-2.5">{nomeProduto(v.produto_id)}</td>
                  <td className="px-5 py-2.5 tabular-nums">{v.quantidade}</td>
                  <td className="px-5 py-2.5 font-semibold tabular-nums">{fmtBRLCompact(v.valor_total)}</td>
                  <td className="px-5 py-2.5">{statusTag(v.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
