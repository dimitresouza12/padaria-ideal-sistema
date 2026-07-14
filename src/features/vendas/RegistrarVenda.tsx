import { useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Tag } from '@/components/ui';
import { resolverPreco } from '@/lib/pricing';
import { fmtBRL, fmtData } from '@/lib/format';
import type { FormaPagamento, Venda } from '@/types';

/**
 * Formulário de lançamento de venda. Fica dentro de um Modal na aba Vendas
 * (`features/vendas/Vendas.tsx`). `aoIrParaLembretes` é chamado quando o usuário
 * clica em "Ver em Lembretes" na confirmação, para que o pai possa fechar o modal
 * antes de navegar.
 */
export function FormularioVenda({ aoIrParaLembretes }: { aoIrParaLembretes?: () => void }) {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { produtos: todosProdutos, comercios, usuarios } = useDataStore();
  const registrarVenda = useDataStore((s) => s.registrarVenda);
  const irPara = useUiStore((s) => s.irPara);
  const notificar = useToastStore((s) => s.notificar);

  // Um produto removido (inativo) não pode ser escolhido em vendas novas —
  // vendas já registradas com ele continuam intactas no histórico.
  const produtos = todosProdutos.filter((p) => p.ativo);

  const ehVendedor = usuario.perfil === 'vendedor';
  // O admin também vende: o seletor de responsável inclui os vendedores E o
  // próprio admin logado. Um vendedor fica travado no próprio usuário.
  const opcoesVendedor = ehVendedor
    ? [usuario]
    : usuarios.filter((u) => u.ativo && (u.perfil === 'vendedor' || u.id === usuario.id));

  const [vendedorId, setVendedorId] = useState(usuario.id);
  const [comercioId, setComercioId] = useState(comercios[0]?.id ?? '');
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '');
  const [quantidade, setQuantidade] = useState(1);
  const [precoDigitado, setPrecoDigitado] = useState<string>('');
  const [forma, setForma] = useState<FormaPagamento>('a_vista');
  const [prazo, setPrazo] = useState(7);
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<Venda | null>(null);
  // Ref, não state: `setState` só reflete numa nova closure após o próximo
  // re-render, o que não é rápido o bastante para barrar um duplo clique
  // síncrono (os dois cliques disparam onSubmit na mesma tarefa, lendo a
  // mesma closure com `salvando` ainda antigo). O ref muda de valor na hora.
  const salvandoRef = useRef(false);

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
    if (salvandoRef.current || !produto || quantidade <= 0) return;
    salvandoRef.current = true;
    setSalvando(true);
    try {
      const venda = await registrarVenda({
        vendedor_id: vendedorId,
        comercio_id: comercioId,
        produto_id: produtoId,
        quantidade,
        preco_unitario: preco?.bloqueado ? undefined : precoUnitario,
        forma_pagamento: forma,
        prazo_dias: forma === 'a_prazo' ? prazo : undefined,
      });
      // Em vez de redirecionar, confirma a venda aqui mesmo e limpa o formulário
      // para o próximo lançamento.
      setSucesso(venda);
      setQuantidade(1);
      setPrecoDigitado('');
      setForma('a_vista');
      setPrazo(7);
    } catch {
      notificar('Não foi possível registrar a venda. Verifique sua conexão e tente novamente.', 'bad');
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  const faltam = produto ? produto.qtd_min_atacado - quantidade : 0;

  return (
    <>
      {sucesso && (
        <ConfirmacaoVenda
          venda={sucesso}
          onFechar={() => setSucesso(null)}
          onVerLembretes={aoIrParaLembretes ?? (() => irPara('lembretes'))}
        />
      )}

      <Card className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">Vendedor responsável</label>
              <select className="field" value={vendedorId} disabled={ehVendedor} onChange={(e) => setVendedorId(e.target.value)}>
                {opcoesVendedor.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome}{v.id === usuario.id ? ' (você)' : ''}
                  </option>
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
    </>
  );
}

/** Painel de confirmação exibido após registrar uma venda (substitui o redirect). */
function ConfirmacaoVenda({
  venda,
  onFechar,
  onVerLembretes,
}: {
  venda: Venda;
  onFechar: () => void;
  onVerLembretes: () => void;
}) {
  const { produtos, comercios, usuarios } = useDataStore();
  const produto = produtos.find((p) => p.id === venda.produto_id);
  const comercio = comercios.find((c) => c.id === venda.comercio_id);
  const vendedor = usuarios.find((u) => u.id === venda.vendedor_id);
  const aPrazo = venda.forma_pagamento === 'a_prazo';

  return (
    <Card className="mb-5 border-l-[3px] border-l-good p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag tone="good">Venda registrada</Tag>
          <span className="text-[13.5px] font-bold">{produto?.nome ?? 'Produto'}</span>
        </div>
        <button
          type="button"
          onClick={onFechar}
          className="text-[11px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          Fechar
        </button>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Cliente</dt>
          <dd className="font-semibold">{comercio?.razao_social ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Vendedor</dt>
          <dd className="font-semibold">{vendedor?.nome ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Quantidade</dt>
          <dd className="font-semibold tabular-nums">{venda.quantidade} cx · {venda.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Valor total</dt>
          <dd className="font-bold tabular-nums text-ink">{fmtBRL(venda.valor_total)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Margem</dt>
          <dd className="font-semibold tabular-nums">{fmtBRL(venda.margem)}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Pagamento</dt>
          <dd className="font-semibold">
            {aPrazo ? (
              <>A prazo · vence {fmtData(venda.data_vencimento)} <Tag tone="warn">Pendente</Tag></>
            ) : (
              <>À vista <Tag tone="good">Pago</Tag></>
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
        <Button size="sm" onClick={onFechar}>Registrar outra venda</Button>
        {aPrazo && (
          <Button size="sm" variant="secondary" onClick={onVerLembretes}>
            Ver em Lembretes
          </Button>
        )}
      </div>
    </Card>
  );
}

export { FormularioVenda as RegistrarVenda };
