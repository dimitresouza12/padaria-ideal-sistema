import { useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Modal, SectionLabel, EmptyState } from '@/components/ui';
import { fmtBRL } from '@/lib/format';
import type { Produto } from '@/types';

const FORM_INICIAL = { nome: '', sku: '', preco_custo: '', preco_varejo: '', preco_atacado: '', qtd_min_atacado: '10' };

export function Produtos() {
  const produtos = useDataStore((s) => s.produtos);
  const criarProduto = useDataStore((s) => s.criarProduto);
  const editarProduto = useDataStore((s) => s.editarProduto);
  const removerProduto = useDataStore((s) => s.removerProduto);
  const notificar = useToastStore((s) => s.notificar);

  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  // O catálogo mostra apenas produtos ativos: ao remover, o item sai da lista
  // na hora (a exclusão é lógica — vendas antigas continuam íntegras).
  const visiveis = produtos.filter((p) => p.ativo);

  const set = (campo: keyof typeof FORM_INICIAL) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const abrirNovo = () => {
    setEditandoId(null);
    setForm(FORM_INICIAL);
    setAberto(true);
  };

  const abrirEdicao = (p: Produto) => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      sku: p.sku,
      preco_custo: String(p.preco_custo),
      preco_varejo: String(p.preco_varejo),
      preco_atacado: String(p.preco_atacado),
      qtd_min_atacado: String(p.qtd_min_atacado),
    });
    setAberto(true);
  };

  const fechar = () => {
    setAberto(false);
    setEditandoId(null);
    setForm(FORM_INICIAL);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      nome: form.nome.trim(),
      sku: form.sku.trim(),
      categoria: null,
      preco_custo: Number(form.preco_custo) || 0,
      preco_varejo: Number(form.preco_varejo) || 0,
      preco_atacado: Number(form.preco_atacado) || 0,
      qtd_min_atacado: Number(form.qtd_min_atacado) || 10,
    };
    if (editandoId) {
      await editarProduto(editandoId, payload);
      notificar('Alterações salvas.');
    } else {
      await criarProduto(payload);
      notificar('Produto cadastrado.');
    }
    fechar();
  };

  const onRemover = async (p: Produto) => {
    if (confirm(`Remover "${p.nome}" do catálogo? Vendas já registradas com este produto não são afetadas.`)) {
      await removerProduto(p.id);
      if (editandoId === p.id) fechar();
      notificar(`"${p.nome}" foi excluído do catálogo.`, 'neutral');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Catálogo de produtos</SectionLabel>
        <Button size="sm" onClick={abrirNovo}>+ Novo Produto</Button>
      </div>

      {visiveis.length === 0 ? (
        <Card><EmptyState>Nenhum produto no catálogo — use "Novo Produto" para cadastrar o primeiro.</EmptyState></Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-5 py-2.5">Produto</th>
                    <th className="px-5 py-2.5">SKU</th>
                    <th className="px-5 py-2.5">Custo</th>
                    <th className="px-5 py-2.5">Preço Varejo</th>
                    <th className="px-5 py-2.5">Preço Atacado</th>
                    <th className="px-5 py-2.5">Qtd. Mín. Atacado</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((p) => (
                    <tr key={p.id} className="border-b border-line text-[13px] last:border-0">
                      <td className="px-5 py-3 font-semibold">{p.nome}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">{p.sku}</td>
                      <td className="px-5 py-3 tabular-nums">{fmtBRL(p.preco_custo)}</td>
                      <td className="px-5 py-3 tabular-nums">{fmtBRL(p.preco_varejo)}</td>
                      <td className="px-5 py-3 font-semibold tabular-nums">{fmtBRL(p.preco_atacado)}</td>
                      <td className="px-5 py-3 tabular-nums">{p.qtd_min_atacado} cx</td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => abrirEdicao(p)}>Editar</Button>
                          <Button variant="danger" size="sm" onClick={() => onRemover(p)}>Remover</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {visiveis.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="mb-2 text-[14px] font-bold">{p.nome}</div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                  <Campo rotulo="SKU" valor={p.sku} />
                  <Campo rotulo="Qtd. mín. atacado" valor={`${p.qtd_min_atacado} cx`} />
                  <Campo rotulo="Custo" valor={fmtBRL(p.preco_custo)} />
                  <Campo rotulo="Varejo" valor={fmtBRL(p.preco_varejo)} />
                  <Campo rotulo="Atacado" valor={fmtBRL(p.preco_atacado)} destaque />
                </dl>
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  <Button variant="secondary" size="sm" className="flex-1" onClick={() => abrirEdicao(p)}>Editar</Button>
                  <Button variant="danger" size="sm" className="flex-1" onClick={() => onRemover(p)}>Remover</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Modal aberto={aberto} titulo={editandoId ? 'Editar Produto' : 'Cadastrar Novo Produto'} onFechar={fechar}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label">Nome do produto</label>
            <input className="field" value={form.nome} onChange={set('nome')} placeholder="Ex: Bolacha de Aveia 300g (cx c/ 20un)" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">SKU</label>
              <input className="field" value={form.sku} onChange={set('sku')} placeholder="Ex: BA-300" required />
            </div>
            <div>
              <label className="field-label">Qtd. mínima para atacado</label>
              <input className="field" type="number" min={1} value={form.qtd_min_atacado} onChange={set('qtd_min_atacado')} required />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="field-label">Custo (R$)</label>
              <input className="field" type="number" step={0.01} min={0} value={form.preco_custo} onChange={set('preco_custo')} required />
            </div>
            <div>
              <label className="field-label">Varejo (R$)</label>
              <input className="field" type="number" step={0.01} min={0} value={form.preco_varejo} onChange={set('preco_varejo')} required />
            </div>
            <div>
              <label className="field-label">Atacado (R$)</label>
              <input className="field" type="number" step={0.01} min={0} value={form.preco_atacado} onChange={set('preco_atacado')} required />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
            <Button type="submit">{editandoId ? 'Salvar Alterações' : 'Cadastrar Produto'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Campo({ rotulo, valor, destaque = false }: { rotulo: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">{rotulo}</dt>
      <dd className={`tabular-nums ${destaque ? 'font-bold' : ''}`}>{valor}</dd>
    </div>
  );
}
