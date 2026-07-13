import { useEffect, useMemo, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, Button, Tag, ProgressBar, SectionLabel, EmptyState } from '@/components/ui';
import { fmtBRLCompact, fmtData, fmtPct } from '@/lib/format';
import { rangeParaPeriodicidade, LABEL_PERIODICIDADE } from '@/lib/periodo';
import { HOJE } from '@/services/mock/mockData';
import type { Meta, MetaProduto, Periodicidade, Produto, TipoMeta, Venda } from '@/types';

export function Metas() {
  const { metas, vendas, produtos, metasProdutosPorMeta } = useDataStore();
  const [aberto, setAberto] = useState(false);

  const ordenadas = [...metas].sort((a, b) => (b.principal ? 1 : 0) - (a.principal ? 1 : 0));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <SectionLabel>Cadastro e configuração de metas</SectionLabel>
        <Button type="button" size="sm" variant={aberto ? 'ghost' : 'primary'} onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Cancelar' : '+ Nova Meta'}
        </Button>
      </div>

      {aberto && <NovaMetaForm onFechar={() => setAberto(false)} />}

      {ordenadas.length === 0 ? (
        <Card><EmptyState>Nenhuma meta cadastrada — use "Nova meta" para criar a primeira.</EmptyState></Card>
      ) : (
        <div className="flex flex-col gap-4">
          {ordenadas.map((meta) => (
            <MetaCard
              key={meta.id}
              meta={meta}
              vendas={vendas}
              produtos={produtos.filter((p) => p.ativo)}
              metasProdutos={metasProdutosPorMeta[meta.id] ?? []}
              podeRemover={ordenadas.length > 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NovaMetaForm({ onFechar }: { onFechar: () => void }) {
  const criarMeta = useDataStore((s) => s.criarMeta);
  const atualizarMeta = useDataStore((s) => s.atualizarMeta);

  const [nome, setNome] = useState('');
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('semanal');
  const [valorAlvo, setValorAlvo] = useState('');
  const [dataInicioManual, setDataInicioManual] = useState(HOJE);
  const [dataFimManual, setDataFimManual] = useState(HOJE);
  const [salvando, setSalvando] = useState(false);

  const onCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    const range =
      periodicidade === 'personalizado'
        ? { data_inicio: dataInicioManual, data_fim: dataFimManual }
        : rangeParaPeriodicidade(periodicidade, HOJE);
    const nova = await criarMeta({ nome: nome.trim(), periodicidade, ...range });
    const valor = Number(valorAlvo) || 0;
    if (valor > 0) await atualizarMeta(nova.id, valor);
    onFechar();
  };

  return (
    <Card className="p-5">
      <form onSubmit={onCriar} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="field-label">Nome da meta</label>
            <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Meta da semana" required />
          </div>
          <div>
            <label className="field-label">Periodicidade</label>
            <select className="field" value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as Periodicidade)}>
              {(['semanal', 'mensal', 'trimestral', 'personalizado'] as const).map((p) => (
                <option key={p} value={p}>{LABEL_PERIODICIDADE[p]}</option>
              ))}
            </select>
          </div>
        </div>

        {periodicidade === 'personalizado' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Data início</label>
              <input type="date" className="field" value={dataInicioManual} onChange={(e) => setDataInicioManual(e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Data fim</label>
              <input type="date" className="field" value={dataFimManual} onChange={(e) => setDataFimManual(e.target.value)} required />
            </div>
          </div>
        ) : (
          <div className="text-[11.5px] text-ink-muted">
            Janela calculada automaticamente: {(() => {
              const r = rangeParaPeriodicidade(periodicidade, HOJE);
              return `${fmtData(r.data_inicio)} a ${fmtData(r.data_fim)}`;
            })()}
          </div>
        )}

        <div>
          <label className="field-label">Meta de faturamento (R$)</label>
          <input type="number" className="field sm:w-44" min={0} step={100} value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} />
        </div>

        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Criar Meta'}</Button>
        </div>
      </form>
    </Card>
  );
}

function MetaCard({
  meta,
  vendas,
  produtos,
  metasProdutos,
  podeRemover,
}: {
  meta: Meta;
  vendas: Venda[];
  produtos: Produto[];
  metasProdutos: MetaProduto[];
  podeRemover: boolean;
}) {
  const atualizarMeta = useDataStore((s) => s.atualizarMeta);
  const removerMeta = useDataStore((s) => s.removerMeta);
  const definirMetaPrincipal = useDataStore((s) => s.definirMetaPrincipal);
  const definirDimensaoMeta = useDataStore((s) => s.definirDimensaoMeta);
  const atualizarMetaProduto = useDataStore((s) => s.atualizarMetaProduto);

  const [valorInput, setValorInput] = useState(String(meta.valor_alvo));
  useEffect(() => setValorInput(String(meta.valor_alvo)), [meta.valor_alvo]);

  const vendido = useMemo(
    () => vendas.filter((v) => v.data_venda >= meta.data_inicio && v.data_venda <= meta.data_fim).reduce((a, v) => a + v.valor_total, 0),
    [vendas, meta.data_inicio, meta.data_fim],
  );
  const pct = meta.valor_alvo ? (vendido / meta.valor_alvo) * 100 : 0;

  const salvarValor = (e: React.FormEvent) => {
    e.preventDefault();
    void atualizarMeta(meta.id, Number(valorInput) || 0);
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13.5px] font-bold">{meta.nome}</span>
            {meta.principal && <Tag tone="accent">Principal</Tag>}
            <Tag tone="neutral">{LABEL_PERIODICIDADE[meta.periodicidade]}</Tag>
          </div>
          <div className="mt-0.5 text-xs text-ink-muted">{fmtData(meta.data_inicio)} a {fmtData(meta.data_fim)}</div>
        </div>
        <div className="inline-flex gap-0.5 rounded-lg bg-plane p-0.5">
          {(['geral', 'por_produto'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => void definirDimensaoMeta(meta.id, t as TipoMeta)}
              className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                meta.dimensao === t ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
              }`}
            >
              {t === 'geral' ? 'Valor Geral' : 'Soma por Produto'}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        {meta.dimensao === 'geral' ? (
          <form onSubmit={salvarValor} className="flex w-full items-end gap-3 sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <label className="field-label">Meta de faturamento (R$)</label>
              <input
                type="number"
                className="field sm:w-44"
                value={valorInput}
                min={0}
                step={100}
                onChange={(e) => setValorInput(e.target.value)}
              />
            </div>
            <Button type="submit" size="sm">Atualizar Valor</Button>
          </form>
        ) : (
          <MetasPorProduto
            produtos={produtos}
            metasProdutos={metasProdutos}
            vendas={vendas}
            onSalvar={(produtoId, valor) => atualizarMetaProduto(meta.id, produtoId, valor)}
          />
        )}
      </div>

      {meta.valor_alvo > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <ProgressBar pct={pct} tone={pct >= 100 ? 'good' : 'accent'} />
          <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-muted">
            <span>{fmtBRLCompact(vendido)} de {fmtBRLCompact(meta.valor_alvo)}</span>
            <span>{fmtPct(pct)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2 border-t border-line pt-4">
        {!meta.principal && (
          <Button variant="secondary" size="sm" onClick={() => void definirMetaPrincipal(meta.id)}>
            Tornar principal
          </Button>
        )}
        {!meta.principal && podeRemover && (
          <Button variant="danger" size="sm" onClick={() => confirm(`Remover "${meta.nome}"?`) && void removerMeta(meta.id)}>
            Remover
          </Button>
        )}
      </div>
    </Card>
  );
}

function MetasPorProduto({
  produtos,
  metasProdutos,
  vendas,
  onSalvar,
}: {
  produtos: Produto[];
  metasProdutos: { produto_id: string; valor_alvo: number }[];
  vendas: { produto_id: string; valor_total: number }[];
  onSalvar: (produtoId: string, valor: number) => Promise<void>;
}) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const iniciais: Record<string, string> = {};
    produtos.forEach((p) => {
      const alvo = metasProdutos.find((m) => m.produto_id === p.id)?.valor_alvo;
      iniciais[p.id] = alvo != null ? String(alvo) : '';
    });
    setInputs(iniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtos.length, metasProdutos.length]);

  const vendidoPorProduto = useMemo(() => {
    const mapa: Record<string, number> = {};
    vendas.forEach((v) => {
      mapa[v.produto_id] = (mapa[v.produto_id] ?? 0) + v.valor_total;
    });
    return mapa;
  }, [vendas]);

  const salvarTudo = async () => {
    setSalvando(true);
    for (const p of produtos) {
      const valor = Number(inputs[p.id]) || 0;
      await onSalvar(p.id, valor);
    }
    setSalvando(false);
  };

  return (
    <div>
      <div className="mb-3 text-[11.5px] text-ink-muted">A soma das metas abaixo vira o valor-alvo desta meta.</div>
      <div className="flex flex-col gap-4">
        {produtos.map((p) => {
          const vendido = vendidoPorProduto[p.id] ?? 0;
          const alvo = Number(inputs[p.id]) || 0;
          const pct = alvo ? (vendido / alvo) * 100 : 0;
          return (
            <div key={p.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{p.nome}</span>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-ink-muted">Meta (R$)</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    className="field !w-32"
                    value={inputs[p.id] ?? ''}
                    onChange={(e) => setInputs((s) => ({ ...s, [p.id]: e.target.value }))}
                  />
                </div>
              </div>
              {alvo > 0 && (
                <>
                  <ProgressBar pct={pct} tone={pct >= 100 ? 'good' : 'accent'} />
                  <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-muted">
                    <span>{fmtBRLCompact(vendido)} vendido</span>
                    <span>{fmtPct(pct)} da meta</span>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex justify-end">
        <Button size="sm" disabled={salvando} onClick={salvarTudo}>
          {salvando ? 'Salvando…' : 'Salvar Metas por Produto'}
        </Button>
      </div>
    </div>
  );
}
