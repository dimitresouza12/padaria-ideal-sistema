import type { ModoPreco, Produto } from '@/types';

export interface PrecoResolvido {
  preco_unitario: number;
  modo_preco: ModoPreco;
  /** true quando o preço é fixo de atacado e o campo deve ficar somente-leitura. */
  bloqueado: boolean;
}

/**
 * Regra de precificação dinâmica (fonte única da verdade).
 *
 *   quantidade >= qtd_min_atacado  ->  aplica preco_atacado, campo TRAVADO
 *   quantidade  < qtd_min_atacado  ->  varejo negociável (usa o valor digitado,
 *                                      ou sugere preco_varejo)
 *
 * Mantida pura (sem I/O) para ser reutilizada no formulário (feedback ao vivo)
 * e no serviço de vendas (cálculo autoritativo na "gravação").
 */
export function resolverPreco(
  produto: Produto,
  quantidade: number,
  precoDigitado?: number,
): PrecoResolvido {
  const ehAtacado = quantidade >= produto.qtd_min_atacado;

  if (ehAtacado) {
    return { preco_unitario: produto.preco_atacado, modo_preco: 'atacado', bloqueado: true };
  }

  const preco = precoDigitado != null && precoDigitado > 0 ? precoDigitado : produto.preco_varejo;
  return { preco_unitario: preco, modo_preco: 'varejo', bloqueado: false };
}
