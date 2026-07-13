import { useDataStore } from '@/store/useDataStore';
import { Card } from '@/components/ui';
import { IconDownload } from '@/components/icons';
import { baixarXLSX } from '@/lib/xlsx';
import { fmtData } from '@/lib/format';

export function Relatorios() {
  const { vendas, usuarios, comercios, produtos } = useDataStore();

  const nomeVendedor = (id: string) => usuarios.find((u) => u.id === id)?.nome ?? '';
  const nomeComercio = (id: string) => comercios.find((c) => c.id === id)?.razao_social ?? '';
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? '';

  const exportarVendas = () =>
    baixarXLSX(
      `vendas_${Date.now()}.xlsx`,
      'Vendas',
      [
        { titulo: 'Data', chave: 'data', largura: 12 },
        { titulo: 'Vendedor', chave: 'vendedor', largura: 20 },
        { titulo: 'Cliente', chave: 'cliente', largura: 24 },
        { titulo: 'Produto', chave: 'produto', largura: 26 },
        { titulo: 'Quantidade', chave: 'quantidade', largura: 12 },
        { titulo: 'Preço Unitário', chave: 'preco_unitario', largura: 14, formato: '#,##0.00' },
        { titulo: 'Modo', chave: 'modo', largura: 10 },
        { titulo: 'Valor Total', chave: 'valor_total', largura: 14, formato: '#,##0.00' },
        { titulo: 'Custo Total', chave: 'custo_total', largura: 14, formato: '#,##0.00' },
        { titulo: 'Margem', chave: 'margem', largura: 14, formato: '#,##0.00' },
        { titulo: 'Forma Pagamento', chave: 'forma_pagamento', largura: 16 },
        { titulo: 'Status', chave: 'status', largura: 12 },
      ],
      vendas.map((v) => ({
        data: fmtData(v.data_venda),
        vendedor: nomeVendedor(v.vendedor_id),
        cliente: nomeComercio(v.comercio_id),
        produto: nomeProduto(v.produto_id),
        quantidade: v.quantidade,
        preco_unitario: v.preco_unitario,
        modo: v.modo_preco,
        valor_total: v.valor_total,
        custo_total: v.custo_total,
        margem: v.margem,
        forma_pagamento: v.forma_pagamento,
        status: v.status,
      })),
    );

  const exportarComissoes = () => {
    const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');
    baixarXLSX(
      `comissoes_${Date.now()}.xlsx`,
      'Comissões',
      [
        { titulo: 'Vendedor', chave: 'vendedor', largura: 22 },
        { titulo: 'Pedidos', chave: 'pedidos', largura: 12 },
        { titulo: 'Faturamento', chave: 'faturamento', largura: 14, formato: '#,##0.00' },
        { titulo: 'Margem', chave: 'margem', largura: 14, formato: '#,##0.00' },
        { titulo: 'Taxa (%)', chave: 'taxa', largura: 12, formato: '0.0' },
        { titulo: 'Comissão', chave: 'comissao', largura: 14, formato: '#,##0.00' },
      ],
      vendedores.map((v) => {
        const vendasDoVendedor = vendas.filter((x) => x.vendedor_id === v.id);
        const faturamento = vendasDoVendedor.reduce((a, x) => a + x.valor_total, 0);
        const margem = vendasDoVendedor.reduce((a, x) => a + x.margem, 0);
        return {
          vendedor: v.nome,
          pedidos: vendasDoVendedor.length,
          faturamento,
          margem,
          taxa: v.taxa_comissao * 100,
          comissao: margem * v.taxa_comissao,
        };
      }),
    );
  };

  const exportarProdutos = () =>
    baixarXLSX(
      `produtos_${Date.now()}.xlsx`,
      'Produtos',
      [
        { titulo: 'Nome', chave: 'nome', largura: 28 },
        { titulo: 'SKU', chave: 'sku', largura: 12 },
        { titulo: 'Custo', chave: 'custo', largura: 12, formato: '#,##0.00' },
        { titulo: 'Preço Varejo', chave: 'preco_varejo', largura: 14, formato: '#,##0.00' },
        { titulo: 'Preço Atacado', chave: 'preco_atacado', largura: 14, formato: '#,##0.00' },
        { titulo: 'Qtd. Mín. Atacado', chave: 'qtd_min', largura: 16 },
        { titulo: 'Situação', chave: 'situacao', largura: 12 },
      ],
      produtos.map((p) => ({
        nome: p.nome,
        sku: p.sku,
        custo: p.preco_custo,
        preco_varejo: p.preco_varejo,
        preco_atacado: p.preco_atacado,
        qtd_min: p.qtd_min_atacado,
        situacao: p.ativo ? 'Ativo' : 'Inativo',
      })),
    );

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
        onClick={() => void onExportar()}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13px] font-bold text-white transition hover:bg-accent-dark"
      >
        <IconDownload size={15} />
        Exportar XLSX
      </button>
    </Card>
  );
}
