import { useEffect, useMemo, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Tag, Button, EmptyState, Modal } from '@/components/ui';
import { resolverPreco } from '@/lib/pricing';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';
import type { FormaPagamento, StatusVenda, Venda } from '@/types';

const TODOS = '__todos__';

export function Historico() {
  const { vendas, usuarios, comercios, produtos } = useDataStore();

  const [vendedorId, setVendedorId] = useState(TODOS);
  const [comercioId, setComercioId] = useState(TODOS);
  const [produtoId, setProdutoId] = useState(TODOS);
  const [status, setStatus] = useState<typeof TODOS | StatusVenda>(TODOS);
  const [selecionada, setSelecionada] = useState<Venda | null>(null);

  const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');
  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '—';
  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '—';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '—';

  const filtradas = useMemo(() => {
    return vendas
      .filter((v) => vendedorId === TODOS || v.vendedor_id === vendedorId)
      .filter((v) => comercioId === TODOS || v.comercio_id === comercioId)
      .filter((v) => produtoId === TODOS || v.produto_id === produtoId)
      .filter((v) => status === TODOS || v.status === status)
      .sort((a, b) => b.data_venda.localeCompare(a.data_venda));
  }, [vendas, vendedorId, comercioId, produtoId, status]);

  // Mantém o modal em sincronia com o dado mais recente (ex.: após salvar).
  const selecionadaAtual = selecionada ? vendas.find((v) => v.id === selecionada.id) ?? null : null;

  const totalFiltrado = filtradas.reduce((a, v) => a + v.valor_total, 0);

  const statusTag = (s: StatusVenda) =>
    s === 'pago' ? <Tag tone="good">Pago</Tag> : s === 'vencido' ? <Tag tone="bad">Vencido</Tag> : <Tag tone="warn">Pendente</Tag>;

  return (
    <div className="flex flex-col gap-5">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="field-label">Vendedor</label>
          <select className="field !w-44" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {vendedores.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Cliente</label>
          <select className="field !w-44" value={comercioId} onChange={(e) => setComercioId(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {comercios.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Produto</label>
          <select className="field !w-44" value={produtoId} onChange={(e) => setProdutoId(e.target.value)}>
            <option value={TODOS}>Todos</option>
            {produtos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Situação</label>
          <select className="field !w-36" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value={TODOS}>Todas</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>
        <div className="ml-auto text-right text-[12.5px] text-ink-muted">
          <div>{filtradas.length} venda(s) · <span className="font-bold tabular-nums text-ink">{fmtBRLCompact(totalFiltrado)}</span></div>
          <div className="text-[11px]">Clique numa venda para ver ou editar.</div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5">Data</th>
                <th className="px-5 py-2.5">Vendedor</th>
                <th className="px-5 py-2.5">Cliente</th>
                <th className="px-5 py-2.5">Produto</th>
                <th className="px-5 py-2.5">Qtd.</th>
                <th className="px-5 py-2.5">Modo</th>
                <th className="px-5 py-2.5">Valor</th>
                <th className="px-5 py-2.5">Pagamento</th>
                <th className="px-5 py-2.5">Situação</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={9}><EmptyState>Nenhuma venda encontrada com esses filtros.</EmptyState></td></tr>
              ) : (
                filtradas.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelecionada(v)}
                    className="cursor-pointer border-b border-line text-[13px] transition last:border-0 hover:bg-plane"
                  >
                    <td className="px-5 py-3 tabular-nums text-ink-muted">{fmtData(v.data_venda)}</td>
                    <td className="px-5 py-3 font-medium">{nomeVendedor(v.vendedor_id)}</td>
                    <td className="px-5 py-3">{nomeComercio(v.comercio_id)}</td>
                    <td className="px-5 py-3">{nomeProduto(v.produto_id)}</td>
                    <td className="px-5 py-3 tabular-nums">{v.quantidade}</td>
                    <td className="px-5 py-3"><Tag tone={v.modo_preco === 'atacado' ? 'accent' : 'neutral'}>{v.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}</Tag></td>
                    <td className="px-5 py-3 font-semibold tabular-nums">{fmtBRL(v.valor_total)}</td>
                    <td className="px-5 py-3">{v.forma_pagamento === 'a_vista' ? 'À Vista' : `A Prazo (${v.prazo_dias}d)`}</td>
                    <td className="px-5 py-3">{statusTag(v.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal aberto={selecionadaAtual !== null} titulo="Venda" onFechar={() => setSelecionada(null)}>
        {selecionadaAtual && (
          <DetalheEEdicaoVenda
            venda={selecionadaAtual}
            onFechar={() => setSelecionada(null)}
            statusTag={statusTag}
          />
        )}
      </Modal>
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

/** Alterna entre visualização e edição/exclusão de uma venda já registrada. */
function DetalheEEdicaoVenda({
  venda,
  onFechar,
  statusTag,
}: {
  venda: Venda;
  onFechar: () => void;
  statusTag: (s: StatusVenda) => React.ReactNode;
}) {
  const { usuarios, comercios, produtos } = useDataStore();
  const atualizarVenda = useDataStore((s) => s.atualizarVenda);
  const removerVenda = useDataStore((s) => s.removerVenda);
  const notificar = useToastStore((s) => s.notificar);

  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Vendedores/produtos podem estar inativos: garante que a opção atual da
  // venda apareça no seletor mesmo assim, para não "sumir" ao abrir a edição.
  const opcoesVendedor = usuarios.filter((u) => u.ativo || u.id === venda.vendedor_id);
  const opcoesComercio = comercios.filter((c) => c.ativo || c.id === venda.comercio_id);
  const opcoesProduto = produtos.filter((p) => p.ativo || p.id === venda.produto_id);

  const [vendedorId, setVendedorId] = useState(venda.vendedor_id);
  const [comercioId, setComercioId] = useState(venda.comercio_id);
  const [produtoId, setProdutoId] = useState(venda.produto_id);
  const [quantidade, setQuantidade] = useState(venda.quantidade);
  const [precoDigitado, setPrecoDigitado] = useState('');
  const [forma, setForma] = useState<FormaPagamento>(venda.forma_pagamento);
  const [prazo, setPrazo] = useState(venda.prazo_dias ?? 7);
  const [dataVenda, setDataVenda] = useState(venda.data_venda);

  // Sempre que a venda selecionada mudar (ou reabrir o modal), reseta o
  // formulário de edição para os valores atuais dela.
  useEffect(() => {
    setEditando(false);
    setErro(null);
    setVendedorId(venda.vendedor_id);
    setComercioId(venda.comercio_id);
    setProdutoId(venda.produto_id);
    setQuantidade(venda.quantidade);
    setPrecoDigitado('');
    setForma(venda.forma_pagamento);
    setPrazo(venda.prazo_dias ?? 7);
    setDataVenda(venda.data_venda);
  }, [venda.id]);

  const produto = produtos.find((p) => p.id === produtoId);
  const preco = produto
    ? resolverPreco(produto, quantidade, precoDigitado === '' ? undefined : Number(precoDigitado))
    : null;
  const precoUnitario = preco?.preco_unitario ?? 0;
  const total = precoUnitario * quantidade;

  const onSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto || quantidade <= 0) return;
    setErro(null);
    setSalvando(true);
    try {
      await atualizarVenda(venda.id, {
        vendedor_id: vendedorId,
        comercio_id: comercioId,
        produto_id: produtoId,
        quantidade,
        preco_unitario: preco?.bloqueado ? undefined : precoUnitario,
        forma_pagamento: forma,
        prazo_dias: forma === 'a_prazo' ? prazo : undefined,
        data_venda: dataVenda,
      });
      notificar('Venda atualizada.');
      setEditando(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.');
    } finally {
      setSalvando(false);
    }
  };

  const onExcluir = async () => {
    if (!confirm('Excluir esta venda definitivamente? Esta ação não pode ser desfeita.')) return;
    setExcluindo(true);
    try {
      await removerVenda(venda.id);
      notificar('Venda excluída.', 'neutral');
      onFechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível excluir a venda.');
      setExcluindo(false);
    }
  };

  if (!editando) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-bold">{produtos.find((p) => p.id === venda.produto_id)?.nome ?? '—'}</div>
          {statusTag(venda.status)}
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
          <Detalhe rotulo="Data da venda" valor={fmtData(venda.data_venda)} />
          <Detalhe rotulo="Vendedor" valor={usuarios.find((u) => u.id === venda.vendedor_id)?.nome ?? '—'} />
          <Detalhe rotulo="Cliente" valor={comercios.find((c) => c.id === venda.comercio_id)?.razao_social ?? '—'} />
          <Detalhe
            rotulo="Quantidade"
            valor={`${venda.quantidade} cx · ${venda.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}`}
          />
          <Detalhe rotulo="Preço unitário" valor={fmtBRL(venda.preco_unitario)} />
          <Detalhe rotulo="Valor total" valor={fmtBRL(venda.valor_total)} forte />
          <Detalhe rotulo="Custo total" valor={fmtBRL(venda.custo_total)} />
          <Detalhe rotulo="Margem" valor={fmtBRL(venda.margem)} />
          <Detalhe
            rotulo="Forma de pagamento"
            valor={venda.forma_pagamento === 'a_vista' ? 'À Vista' : `A Prazo (${venda.prazo_dias}d)`}
          />
          {venda.forma_pagamento === 'a_prazo' && (
            <Detalhe rotulo="Vencimento" valor={fmtData(venda.data_vencimento)} />
          )}
        </dl>

        {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="danger" size="sm" onClick={() => void onExcluir()} disabled={excluindo}>
            {excluindo ? 'Excluindo…' : 'Excluir venda'}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditando(true)}>
            Editar venda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSalvar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">Vendedor responsável</label>
          <select className="field" value={vendedorId} onChange={(e) => setVendedorId(e.target.value)}>
            {opcoesVendedor.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Cliente (Comércio)</label>
          <select className="field" value={comercioId} onChange={(e) => setComercioId(e.target.value)}>
            {opcoesComercio.map((c) => <option key={c.id} value={c.id}>{c.razao_social}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="field-label">Produto</label>
        <select
          className="field"
          value={produtoId}
          onChange={(e) => {
            setProdutoId(e.target.value);
            setPrecoDigitado('');
          }}
        >
          {opcoesProduto.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="field-label">Quantidade (caixas)</label>
          <input
            type="number"
            className="field"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(Math.max(0, Number(e.target.value)))}
          />
        </div>
        <div>
          <label className="field-label">Preço unitário (R$)</label>
          <input
            type="number"
            className="field"
            min={0}
            step={0.01}
            readOnly={preco?.bloqueado}
            value={preco?.bloqueado ? precoUnitario.toFixed(2) : precoDigitado === '' ? (produto?.preco_varejo.toFixed(2) ?? '') : precoDigitado}
            onChange={(e) => setPrecoDigitado(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Data da venda</label>
          <input type="date" className="field" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
        </div>
      </div>
      <div className="text-[11px] text-ink-muted">
        {preco?.bloqueado ? (
          <><Tag tone="good">Atacado — preço travado</Tag> quantidade ≥ {produto?.qtd_min_atacado} cx</>
        ) : (
          <><Tag tone="neutral">Varejo — valor editável</Tag> sugerido: {produto ? fmtBRL(produto.preco_varejo) : '—'}</>
        )}
      </div>

      <div className="border-t border-line pt-4">
        <label className="field-label">Forma de pagamento</label>
        <div className="inline-flex gap-0.5 rounded-lg bg-plane p-0.5">
          {(['a_vista', 'a_prazo'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setForma(f)}
              className={`rounded-md px-3.5 py-1.5 text-[12.5px] font-bold transition ${
                forma === f ? 'bg-white text-ink shadow-sm' : 'text-ink-soft'
              }`}
            >
              {f === 'a_vista' ? 'À Vista' : 'A Prazo'}
            </button>
          ))}
        </div>
        {venda.status === 'pago' && venda.forma_pagamento === 'a_prazo' && forma === 'a_prazo' && (
          <div className="mt-1.5 text-[11px] text-ink-muted">Esta venda já está paga — a situação será mantida.</div>
        )}
      </div>

      {forma === 'a_prazo' && (
        <div>
          <label className="field-label">Prazo para pagamento</label>
          <select className="field" value={prazo} onChange={(e) => setPrazo(Number(e.target.value))}>
            <option value={7}>1 semana (7 dias)</option>
            <option value={15}>15 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </div>
      )}

      {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}

      <div className="flex items-center justify-between border-t border-line pt-4">
        <div className="text-[12.5px] text-ink-muted">
          Total: <span className="font-bold tabular-nums text-ink">{fmtBRL(total)}</span>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditando(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </div>
    </form>
  );
}
