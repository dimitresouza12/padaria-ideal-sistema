import type { Venda } from '@/types';

/**
 * Um "pedido" reconstruído a partir de vendas — o schema não tem id de pedido
 * (cada produto é uma linha própria em `vendas`, ver RegistrarVenda.tsx), mas
 * itens do mesmo carrinho sempre compartilham cliente/vendedor/data/vencimento.
 * Essa chave é suficiente para reagrupar sem migração de banco.
 */
export interface GrupoPedido {
  chave: string;
  comercio_id: string;
  vendedor_id: string;
  data_venda: string;
  data_vencimento: string | null;
  itens: Venda[];
  valor_total: number;
  /** Todos os itens de um grupo compartilham data_vencimento, logo já compartilham status. */
  status: Venda['status'];
  /** true só quando todo item do pedido já foi marcado como entregue. */
  entregue: boolean;
}

const chaveDoGrupo = (v: Venda): string =>
  `${v.comercio_id}|${v.vendedor_id}|${v.data_venda}|${v.data_vencimento ?? ''}`;

export function agruparVendasPorPedido(vendas: Venda[]): GrupoPedido[] {
  const grupos = new Map<string, GrupoPedido>();
  for (const v of vendas) {
    const chave = chaveDoGrupo(v);
    const existente = grupos.get(chave);
    if (existente) {
      existente.itens.push(v);
      existente.valor_total += v.valor_total;
      existente.entregue = existente.entregue && v.entregue;
    } else {
      grupos.set(chave, {
        chave,
        comercio_id: v.comercio_id,
        vendedor_id: v.vendedor_id,
        data_venda: v.data_venda,
        data_vencimento: v.data_vencimento,
        itens: [v],
        valor_total: v.valor_total,
        status: v.status,
        entregue: v.entregue,
      });
    }
  }
  return [...grupos.values()];
}
