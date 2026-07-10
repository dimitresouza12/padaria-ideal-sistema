import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { Card, Button, Tag } from '@/components/ui';
import { resolverPreco } from '@/lib/pricing';
import { fmtBRL } from '@/lib/format';
import type { FormaPagamento } from '@/types';

export function RegistrarVenda() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { produtos: todosProdutos, comercios, usuarios } = useDataStore();
  const registrarVenda = useDataStore((s) => s.registrarVenda);
  const irPara = useUiStore((s) => s.irPara);

  // Um produto removido (inativo) não pode ser escolhido em vendas novas —
  // vendas já registradas com ele continuam intactas no histórico.
  const produtos = todosProdutos.filter((p) => p.ativo);

  const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');
  const ehVendedor = usuario.perfil === 'vendedor';

  const [vendedorId, setVendedorId] = useState(ehVendedor ? usuario.id : (vendedores[0]?.id ?? ''));
  const [comercioId, setComercioId] = useState(comercios[0]?.id ?? '');
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '');
  const [quantidade, setQuantidade] = useState(1);
  const [precoDigitado, setPrecoDigitado] = useState<string>('');
  const [forma, setForma] = useState<FormaPagamento>('a_vista');
  const [prazo, setPrazo] = useState(7);
  const [salvando, setSalvando] = useState(false);

  const produto = produtos.find((p) => p.id === produtoId);

  // Regra de precificação ao vivo (mesma função usada na "gravação" pelo serviço).
  const preco = useMemo(() => {
    if (!produto) return null;
    const digitado = precoDigitado === '' ? undefined : Number(precoDigitado);
    return resolverPreco(produto, quantidade, digitado);
  }, [produto, quantidade, precoDigitado]);

  const precoUnitario = preco?.preco_unitario ?? 0;
  const total = precoUnitario * quantidade;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produto || quantidade <= 0) return;
    setSalvando(true);
    await registrarVenda({
      vendedor_id: vendedorId,
      comercio_id: comercioId,
      produto_id: produtoId,
      quantidade,
      preco_unitario: preco?.bloqueado ? undefined : precoUnitario,
      forma_pagamento: forma,
      prazo_dias: forma === 'a_prazo' ? prazo : undefined,
    });
    setSalvando(false);
    irPara('lembretes'); // após registrar, mostra o reflexo imediato (a prazo aparece aqui)
  };

  const faltam = produto ? produto.qtd_min_atacado - quantidade : 0;

  return (
    <div className="max-w-2xl">
      <Card className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Vendedor responsável</label>
              <select className="field" value={vendedorId} disabled={ehVendedor} onChange={(e) => setVendedorId(e.target.value)}>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>{v.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label">Cliente (Comércio)</label>
              <select className="field" value={comercioId} onChange={(e) => setComercioId(e.target.value)}>
                {comercios.map((c) => (
                  <option key={c.id} value={c.id}>{c.razao_social}</option>
                ))}
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
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Quantidade (caixas)</label>
              <input
                type="number"
                className="field"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Math.max(0, Number(e.target.value)))}
              />
              {produto && (
                <div className="mt-1.5 text-[11px] text-ink-muted">
                  {preco?.bloqueado
                    ? 'Preço fixo de atacado aplicado automaticamente.'
                    : `Faltam ${faltam} cx para o preço de atacado (${fmtBRL(produto.preco_atacado)}).`}
                </div>
              )}
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
              <div className="mt-1.5 text-[11px] text-ink-muted">
                {preco?.bloqueado ? (
                  <>
                    <Tag tone="good">Atacado — preço travado</Tag> quantidade ≥ {produto?.qtd_min_atacado} cx
                  </>
                ) : (
                  <>
                    <Tag tone="neutral">Varejo — valor editável</Tag> sugerido: {produto ? fmtBRL(produto.preco_varejo) : '—'}
                  </>
                )}
              </div>
            </div>
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

          <div className="flex items-center justify-between border-t border-line pt-4">
            <div className="text-[12.5px] text-ink-muted">
              Total do pedido: <span className="font-bold tabular-nums text-ink">{fmtBRL(total)}</span>
            </div>
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Registrando…' : 'Registrar Venda'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
