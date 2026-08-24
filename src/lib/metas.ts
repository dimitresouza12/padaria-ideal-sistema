import type { Comercio, Meta, Perda, Venda, Visita } from '@/types';
import { agruparVendasPorPedido } from './pedidos';
import { noPeriodo } from './periodo';

export interface ProgressoMeta {
  atingido: number;
  pct: number;
}

interface ContextoMetas {
  vendas: Venda[];
  visitas: Visita[];
  perdas: Perda[];
  comercios: Comercio[];
}

/**
 * Calcula o progresso de uma meta, qualquer que seja a métrica. Centraliza o
 * que antes estava duplicado em 5 lugares (Metas.tsx, DashboardAdmin.tsx) —
 * cada duplicata tratava só faturamento e nenhuma filtrava por vendedor.
 */
export function progressoMeta(meta: Meta, ctx: ContextoMetas): ProgressoMeta {
  const doVendedor = (vendedorId: string) => !meta.vendedor_id || vendedorId === meta.vendedor_id;
  const naJanela = (dataISO: string) => noPeriodo(dataISO, meta);

  let atingido = 0;

  if (meta.metrica === 'faturamento') {
    atingido = ctx.vendas
      .filter((v) => naJanela(v.data_venda) && doVendedor(v.vendedor_id))
      .reduce((a, v) => a + v.valor_total, 0);
  } else if (meta.metrica === 'ticket_medio') {
    const vendasNaJanela = ctx.vendas.filter((v) => naJanela(v.data_venda) && doVendedor(v.vendedor_id));
    const faturamento = vendasNaJanela.reduce((a, v) => a + v.valor_total, 0);
    const pedidos = agruparVendasPorPedido(vendasNaJanela);
    atingido = pedidos.length ? faturamento / pedidos.length : 0;
  } else if (meta.metrica === 'visitas') {
    // União deduplicada de vendas + perdas + visitas por comercio_id+data —
    // uma venda e uma perda ao mesmo cliente no mesmo dia contam como 1 visita.
    const chaves = new Set<string>();
    ctx.vendas.forEach((v) => {
      if (naJanela(v.data_venda) && doVendedor(v.vendedor_id)) chaves.add(`${v.comercio_id}|${v.data_venda}`);
    });
    ctx.perdas.forEach((p) => {
      if (naJanela(p.data_perda) && doVendedor(p.vendedor_id)) chaves.add(`${p.comercio_id}|${p.data_perda}`);
    });
    ctx.visitas.forEach((vi) => {
      if (naJanela(vi.data_visita) && doVendedor(vi.vendedor_id)) chaves.add(`${vi.comercio_id}|${vi.data_visita}`);
    });
    atingido = chaves.size;
  } else if (meta.metrica === 'novos_clientes') {
    const comerciosDoVendedor = meta.vendedor_id
      ? ctx.comercios.filter((c) => c.vendedor_id === meta.vendedor_id)
      : ctx.comercios;
    atingido = comerciosDoVendedor.filter((c) => {
      const primeiraVenda = ctx.vendas
        .filter((v) => v.comercio_id === c.id)
        .reduce<string | null>((min, v) => (min === null || v.data_venda < min ? v.data_venda : min), null);
      return primeiraVenda !== null && naJanela(primeiraVenda);
    }).length;
  }

  const pct = meta.valor_alvo ? (atingido / meta.valor_alvo) * 100 : 0;
  return { atingido, pct };
}

export const LABEL_METRICA: Record<Meta['metrica'], string> = {
  faturamento: 'Faturamento',
  visitas: 'Visitas',
  novos_clientes: 'Novos clientes',
  ticket_medio: 'Ticket médio',
};

/** `true` quando a métrica é medida em R$ (faturamento/ticket médio) — as outras são contagem. */
export const metricaEmReais = (metrica: Meta['metrica']): boolean =>
  metrica === 'faturamento' || metrica === 'ticket_medio';
