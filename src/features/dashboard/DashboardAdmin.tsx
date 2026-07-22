import { useMemo } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, StatCard, SectionLabel, Tag } from '@/components/ui';
import { IconAlerta } from '@/components/icons';
import { fmtBRLCompact, fmtData, fmtPct } from '@/lib/format';

export function DashboardAdmin() {
  const { vendas, comercios, usuarios, metas, historico } = useDataStore();

  const metaPrincipal = metas.find((m) => m.principal) ?? null;
  const valorAlvo = metaPrincipal?.valor_alvo ?? 0;

  const m = useMemo(() => {
    const faturamento = vendas.reduce((a, v) => a + v.valor_total, 0);
    // Se alguma venda tiver custo desconhecido (produto cadastrado sem custo),
    // a margem do período vira "não informada" em vez de tratar o desconhecido
    // como zero — o que inflaria o número e esconderia a lacuna de dado.
    const custoConhecido = vendas.every((v) => v.custo_total != null);
    const custo = custoConhecido ? vendas.reduce((a, v) => a + (v.custo_total ?? 0), 0) : null;
    const margem = custo != null ? faturamento - custo : null;
    const margemPct = margem != null && faturamento ? (margem / faturamento) * 100 : null;
    const ticket = vendas.length ? faturamento / vendas.length : 0;
    const mesAnterior = historico.at(-1)?.total ?? 0;
    const deltaPct = mesAnterior ? ((faturamento - mesAnterior) / mesAnterior) * 100 : 0;

    // "% vs Meta" compara contra o faturamento DENTRO da janela de datas da
    // meta principal (que pode ser semanal, trimestral etc.) — não contra o
    // faturamento do período inteiro, senão uma meta semanal de R$25 mil
    // pareceria "batida em 340%" comparada ao total do mês inteiro.
    const faturamentoNaJanela = metaPrincipal
      ? vendas
          .filter((v) => v.data_venda >= metaPrincipal.data_inicio && v.data_venda <= metaPrincipal.data_fim)
          .reduce((a, v) => a + v.valor_total, 0)
      : faturamento;
    const metaPct = valorAlvo ? (faturamentoNaJanela / valorAlvo) * 100 : 0;
    const gap = valorAlvo - faturamentoNaJanela;

    return { faturamento, margem, margemPct, ticket, deltaPct, metaPct, gap, pedidos: vendas.length };
  }, [vendas, historico, valorAlvo, metaPrincipal]);

  const ranking = useMemo(() => {
    return usuarios
      .filter((u) => u.perfil === 'vendedor')
      .map((u) => {
        const total = vendas.filter((v) => v.vendedor_id === u.id).reduce((a, v) => a + v.valor_total, 0);
        const pct = u.meta_individual ? (total / u.meta_individual) * 100 : 0;
        return { id: u.id, nome: u.nome, total, pct };
      })
      .sort((a, b) => b.total - a.total);
  }, [usuarios, vendas]);

  const regioes = useMemo(() => {
    const mapa: Record<string, number> = {};
    vendas.forEach((v) => {
      const reg = comercios.find((c) => c.id === v.comercio_id)?.regiao ?? 'Outros';
      mapa[reg] = (mapa[reg] ?? 0) + v.valor_total;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [vendas, comercios]);

  const vencidos = vendas.filter((v) => v.status === 'vencido');
  const totalVencido = vencidos.reduce((a, v) => a + v.valor_total, 0);

  const acimaMeta = m.metaPct >= 100;
  const subiu = m.deltaPct >= 0;
  // Sem meta principal cadastrada, valorAlvo/gap são 0/negativo e não têm
  // leitura de negócio válida — o card deve avisar a ausência, não fingir
  // "faltam R$ -X" (achado do QA: sistema zerado de metas).
  const metaDefinida = metaPrincipal !== null;

  const serie = [...historico, { rotulo: 'Jul', total: m.faturamento, atual: true }];
  // Piso de 1: com o sistema zerado (sem vendas, sem meta), total e valorAlvo
  // são ambos 0 — sem o piso, a divisão 0/0 no gráfico abaixo gera NaN.
  const maxSerie = Math.max(...serie.map((s) => s.total), valorAlvo, 1) * 1.08;
  const maxVend = Math.max(...ranking.map((r) => r.total), 1);
  const maxReg = Math.max(...regioes.map((r) => r[1]), 1);

  return (
    <div className="flex flex-col gap-5">
      {vencidos.length > 0 && (
        <Card className="flex items-center gap-3.5 border-l-4 border-l-bad-strong bg-bad-tint px-5 py-3.5">
          <IconAlerta size={19} className="text-bad-strong" />
          <div className="flex-1 text-[13px] font-semibold text-[#7c1c15]">
            {fmtBRLCompact(totalVencido)} em recebíveis vencidos — {vencidos.length} venda(s) a prazo em atraso.
          </div>
        </Card>
      )}

      {/* KPIs */}
      <div>
        <SectionLabel>Indicadores do período — Julho 2026</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            rotulo="Faturamento"
            valor={fmtBRLCompact(m.faturamento)}
            faixa={subiu ? 'good' : 'bad'}
            contexto={
              <span className="flex items-center gap-1.5">
                <Tag tone={subiu ? 'good' : 'bad'}>{subiu ? '▲' : '▼'} {fmtPct(Math.abs(m.deltaPct))}</Tag>
                vs. mês anterior
              </span>
            }
          />
          <Card className={`border-l-[3px] p-4 ${!metaDefinida ? 'border-l-line-strong' : acimaMeta ? 'border-l-good' : 'border-l-bad-strong'}`}>
            <div className="text-xs font-semibold text-ink-soft">
              % vs {metaPrincipal?.nome ?? 'Meta do Período'}
            </div>
            <div className="mt-1.5 text-[27px] font-extrabold tracking-tight">
              {metaDefinida ? fmtPct(m.metaPct) : '—'}
            </div>
            <div className="my-2.5 h-1.5 overflow-hidden rounded-full bg-[#eceae3]">
              <div
                className={`h-full rounded-full ${!metaDefinida ? '' : acimaMeta ? 'bg-good' : 'bg-bad-strong'}`}
                style={{ width: `${metaDefinida ? Math.min(m.metaPct, 100) : 0}%` }}
              />
            </div>
            <div className="text-xs text-ink-muted">
              {!metaDefinida
                ? 'Nenhuma meta cadastrada para o período'
                : acimaMeta
                  ? `Meta superada em ${fmtBRLCompact(Math.abs(m.gap))}`
                  : `Faltam ${fmtBRLCompact(m.gap)} para a meta`}
              {metaPrincipal && metaPrincipal.periodicidade !== 'mensal' && (
                <> · janela de {fmtData(metaPrincipal.data_inicio)} a {fmtData(metaPrincipal.data_fim)}</>
              )}
            </div>
          </Card>
          <StatCard
            rotulo="Margem"
            valor={m.margemPct != null ? fmtPct(m.margemPct) : 'Não informada'}
            faixa="good"
            contexto={
              m.margem != null
                ? `${fmtBRLCompact(m.margem)} de margem bruta no período`
                : 'Cadastre o custo dos produtos para calcular'
            }
          />
          <StatCard
            rotulo="Ticket Médio"
            valor={fmtBRLCompact(m.ticket)}
            faixa="accent"
            contexto={`${m.pedidos} pedido(s) registrado(s)`}
          />
        </div>
      </div>

      {/* Evolução mensal */}
      <Card className="p-5">
        <div className="text-sm font-bold">Evolução mensal de vendas</div>
        <div className="mb-4 text-xs text-ink-muted">
          Faturamento por mês · Julho é o período corrente (atualiza conforme vendas são registradas).
        </div>
        <div className="overflow-x-auto">
          {(() => {
            const n = serie.length;
            const padX = 34;
            const largura = 700;
            const baseY = 150;
            const topoY = 20;
            const innerW = largura - padX * 2;
            const pontos = serie.map((s, i) => ({
              ...s,
              x: n > 1 ? padX + (i * innerW) / (n - 1) : padX,
              y: baseY - (s.total / maxSerie) * (baseY - topoY),
            }));
            const path = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
            return (
              <svg
                viewBox={`0 0 ${largura} 190`}
                className="w-full min-w-[460px]"
                style={{ aspectRatio: `${largura} / 190` }}
              >
                <path d={path} fill="none" stroke="#8c6239" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
                {pontos.map((p) => {
                  const atual = 'atual' in p && p.atual;
                  return (
                    <g key={p.rotulo}>
                      <circle cx={p.x} cy={p.y} r={atual ? 6 : 4.5} fill={atual ? '#6f4c2a' : '#ffffff'} stroke="#8c6239" strokeWidth={2.5} />
                      <text x={p.x} y={p.y - 14} textAnchor="middle" fontSize={12} fontWeight={700} fill={atual ? '#6f4c2a' : '#6b5d4f'}>
                        {fmtBRLCompact(p.total)}
                      </text>
                      <text x={p.x} y={baseY + 26} textAnchor="middle" fontSize={12.5} fontWeight={600} fill={atual ? '#6f4c2a' : '#9c8e7d'}>
                        {p.rotulo}
                        {atual ? ' (atual)' : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </Card>

      {/* Rankings */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-bold">Ranking de funcionários</div>
          <div className="mb-4 text-xs text-ink-muted">Faturamento no período · marca = % da meta individual.</div>
          <div className="flex flex-col gap-3">
            {ranking.map((r, i) => (
              <div key={r.id}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold">{r.nome}</span>
                  <span className="flex items-center gap-1.5 font-bold tabular-nums">
                    {fmtBRLCompact(r.total)} <Tag tone={r.pct >= 100 ? 'good' : 'bad'}>{fmtPct(r.pct)}</Tag>
                  </span>
                </div>
                <div className="h-5 rounded-md bg-plane">
                  <div
                    className={`h-full rounded ${i === 0 ? 'bg-accent-dark' : 'bg-accent'}`}
                    style={{ width: `${Math.min((r.total / maxVend) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-bold">Faturamento por bairro</div>
          <div className="mb-4 text-xs text-ink-muted">Distribuição por bairro/distrito das vendas do período.</div>
          <div className="flex flex-col gap-3">
            {regioes.map(([reg, total], i) => (
              <div key={reg}>
                <div className="mb-1 flex items-center justify-between text-[12.5px]">
                  <span className="font-semibold">{reg}</span>
                  <span className="font-bold tabular-nums">{fmtBRLCompact(total)}</span>
                </div>
                <div className="h-5 rounded-md bg-plane">
                  <div
                    className={`h-full rounded ${i === 0 ? 'bg-accent-dark' : 'bg-accent'}`}
                    style={{ width: `${(total / maxReg) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Insights */}
      <div>
        <SectionLabel>Conclusões do período</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="border-t-[3px] border-t-good p-4">
            <div className="mb-2 text-[12.5px] font-bold text-good">O que cresceu</div>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Faturamento {fmtPct(Math.abs(m.deltaPct))} {subiu ? 'acima' : 'abaixo'} do mês anterior.
              {ranking[0] && ` ${ranking[0].nome} lidera com ${fmtBRLCompact(ranking[0].total)} (${fmtPct(ranking[0].pct)} da meta individual).`}
              {regioes[0] && ` ${regioes[0][0]} é o bairro de maior faturamento.`}
            </p>
          </Card>
          <Card className="border-t-[3px] border-t-warn p-4">
            <div className="mb-2 text-[12.5px] font-bold text-warn">O que preocupa</div>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {!metaDefinida
                ? 'Nenhuma meta cadastrada para o período — considere criar uma na aba Metas. '
                : acimaMeta
                  ? 'A meta já foi atingida, mas '
                  : `A meta está em ${fmtPct(m.metaPct)} — faltam ${fmtBRLCompact(m.gap)}. `}
              {vencidos.length > 0
                ? `Há ${fmtBRLCompact(totalVencido)} vencidos em ${vencidos.length} venda(s) a prazo.`
                : 'Não há recebíveis vencidos no momento.'}
            </p>
          </Card>
          <Card className="border-t-[3px] border-t-accent p-4">
            <div className="mb-2 text-[12.5px] font-bold text-accent-dark">Qual ação tomar</div>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              {vencidos.length > 0 && 'Cobrar os recebíveis vencidos com prioridade (aba Lembretes). '}
              {regioes.at(-1) && `Reforçar a presença comercial em ${regioes.at(-1)![0]}, bairro de menor faturamento. `}
              {ranking.at(-1) && `Apoiar ${ranking.at(-1)!.nome} para recuperar o ritmo de meta.`}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
