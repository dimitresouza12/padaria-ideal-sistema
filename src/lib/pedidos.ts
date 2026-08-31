import type { Venda } from '@/types';

/**
 * Um "pedido" — todo item com o mesmo `pedido_id` veio do mesmo carrinho
 * enviado (ver RegistrarVenda.tsx). Pedidos diferentes nunca se misturam,
 * mesmo quando são do mesmo cliente/vendedor no mesmo dia.
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

export function agruparVendasPorPedido(vendas: Venda[]): GrupoPedido[] {
  const grupos = new Map<string, GrupoPedido>();
  for (const v of vendas) {
    const existente = grupos.get(v.pedido_id);
    if (existente) {
      existente.itens.push(v);
      existente.valor_total += v.valor_total;
      existente.entregue = existente.entregue && v.entregue;
    } else {
      grupos.set(v.pedido_id, {
        chave: v.pedido_id,
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
