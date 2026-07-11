import { useMemo, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, Tag, EmptyState, Modal } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';
import type { StatusVenda, Venda } from '@/types';

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
          <div className="text-[11px]">Clique numa venda para ver os detalhes.</div>
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

      <Modal aberto={selecionada !== null} titulo="Detalhes da venda" onFechar={() => setSelecionada(null)}>
        {selecionada && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="text-[15px] font-bold">{nomeProduto(selecionada.produto_id)}</div>
              {statusTag(selecionada.status)}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px]">
              <Detalhe rotulo="Data da venda" valor={fmtData(selecionada.data_venda)} />
              <Detalhe rotulo="Vendedor" valor={nomeVendedor(selecionada.vendedor_id)} />
              <Detalhe rotulo="Cliente" valor={nomeComercio(selecionada.comercio_id)} />
              <Detalhe
                rotulo="Quantidade"
                valor={`${selecionada.quantidade} cx · ${selecionada.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}`}
              />
              <Detalhe rotulo="Preço unitário" valor={fmtBRL(selecionada.preco_unitario)} />
              <Detalhe rotulo="Valor total" valor={fmtBRL(selecionada.valor_total)} forte />
              <Detalhe rotulo="Custo total" valor={fmtBRL(selecionada.custo_total)} />
              <Detalhe rotulo="Margem" valor={fmtBRL(selecionada.margem)} />
              <Detalhe
                rotulo="Forma de pagamento"
                valor={selecionada.forma_pagamento === 'a_vista' ? 'À Vista' : `A Prazo (${selecionada.prazo_dias}d)`}
              />
              {selecionada.forma_pagamento === 'a_prazo' && (
                <Detalhe rotulo="Vencimento" valor={fmtData(selecionada.data_vencimento)} />
              )}
            </dl>
          </div>
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
