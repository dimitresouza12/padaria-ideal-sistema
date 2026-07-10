import { useDataStore } from '@/store/useDataStore';
import { Card } from '@/components/ui';
import { IconDownload } from '@/components/icons';
import { baixarCSV } from '@/lib/csv';
import { fmtData } from '@/lib/format';

export function Relatorios() {
  const { vendas, usuarios, comercios, produtos } = useDataStore();

  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '';
  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '';

  const exportarVendas = () => {
    baixarCSV(
      `vendas_${Date.now()}.csv`,
      ['Data', 'Vendedor', 'Cliente', 'Produto', 'Quantidade', 'Preço Unitário', 'Modo', 'Valor Total', 'Custo Total', 'Margem', 'Forma Pagamento', 'Status'],
      vendas.map((v) => [
        fmtData(v.data_venda),
        nomeVendedor(v.vendedor_id),
        nomeComercio(v.comercio_id),
        nomeProduto(v.produto_id),
        v.quantidade,
        v.preco_unitario.toFixed(2),
        v.modo_preco,
        v.valor_total.toFixed(2),
        v.custo_total.toFixed(2),
        v.margem.toFixed(2),
        v.forma_pagamento,
        v.status,
      ]),
    );
  };

  const exportarComissoes = () => {
    const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');
    baixarCSV(
      `comissoes_${Date.now()}.csv`,
      ['Vendedor', 'Pedidos', 'Faturamento', 'Margem', 'Taxa (%)', 'Comissão'],
      vendedores.map((v) => {
        const vendasDoVendedor = vendas.filter((x) => x.vendedor_id === v.id);
        const faturamento = vendasDoVendedor.reduce((a, x) => a + x.valor_total, 0);
        const margem = vendasDoVendedor.reduce((a, x) => a + x.margem, 0);
        return [v.nome, vendasDoVendedor.length, faturamento.toFixed(2), margem.toFixed(2), (v.taxa_comissao * 100).toFixed(1), (margem * v.taxa_comissao).toFixed(2)];
      }),
    );
  };

  const exportarProdutos = () => {
    baixarCSV(
      `produtos_${Date.now()}.csv`,
      ['Nome', 'SKU', 'Custo', 'Preço Varejo', 'Preço Atacado', 'Qtd. Mín. Atacado', 'Situação'],
      produtos.map((p) => [p.nome, p.sku, p.preco_custo.toFixed(2), p.preco_varejo.toFixed(2), p.preco_atacado.toFixed(2), p.qtd_min_atacado, p.ativo ? 'Ativo' : 'Inativo']),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <RelatorioCard
        titulo="Vendas do período"
        descricao="Todas as vendas registradas, com vendedor, cliente, produto, valores e status de pagamento."
        onExportar={exportarVendas}
      />
      <RelatorioCard
        titulo="Comissões por vendedor"
        descricao="Faturamento, margem e comissão calculada de cada vendedor no período."
        onExportar={exportarComissoes}
      />
      <RelatorioCard
        titulo="Catálogo de produtos"
        descricao="Preços de custo, varejo e atacado de todos os produtos cadastrados."
        onExportar={exportarProdutos}
      />
    </div>
  );
}

function RelatorioCard({ titulo, descricao, onExportar }: { titulo: string; descricao: string; onExportar: () => void }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <div className="text-[13.5px] font-bold">{titulo}</div>
        <div className="mt-0.5 text-xs text-ink-muted">{descricao}</div>
      </div>
      <button
        type="button"
        onClick={onExportar}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent-dark"
      >
        <IconDownload size={15} />
        Exportar CSV
      </button>
    </Card>
  );
}
