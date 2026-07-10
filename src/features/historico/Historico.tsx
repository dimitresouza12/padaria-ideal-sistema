import { useMemo, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, Tag, EmptyState } from '@/components/ui';
import { fmtBRL, fmtBRLCompact, fmtData } from '@/lib/format';
import type { StatusVenda } from '@/types';

const TODOS = '__todos__';

export function Historico() {
  const { vendas, usuarios, comercios, produtos } = useDataStore();

  const [vendedorId, setVendedorId] = useState(TODOS);
  const [comercioId, setComercioId] = useState(TODOS);
  const [produtoId, setProdutoId] = useState(TODOS);
  const [status, setStatus] = useState<typeof TODOS | StatusVenda>(TODOS);

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
        <div className="ml-auto text-[12.5px] text-ink-muted">
          {filtradas.length} venda(s) · <span className="font-bold tabular-nums text-ink">{fmtBRLCompact(totalFiltrado)}</span>
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
                  <tr key={v.id} className="border-b border-line text-[13px] last:border-0">
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
    </div>
  );
}
