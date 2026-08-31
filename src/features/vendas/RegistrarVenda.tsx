import { useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useUiStore } from '@/store/useUiStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Tag, ComboBox } from '@/components/ui';
import { IconLixeira } from '@/components/icons';
import { resolverPreco } from '@/lib/pricing';
import { fmtBRL, fmtData } from '@/lib/format';
import { toISO } from '@/lib/periodo';
import type { FormaPagamento, Produto, Venda } from '@/types';

/** Um item ainda não enviado — produto + quantidade + preço negociado (se houver). */
interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  precoDigitado?: number;
}

/**
 * Formulário de lançamento de venda. Fica dentro de um Modal na aba Vendas
 * (`features/vendas/Vendas.tsx`). `aoIrParaLembretes` é chamado quando o usuário
 * clica em "Ver em Lembretes" na confirmação, para que o pai possa fechar o modal
 * antes de navegar.
 *
 * Permite lançar vários produtos para o mesmo cliente numa única operação: cada
 * "Adicionar produto" empilha o item atual num carrinho; "Registrar Venda" grava
 * uma linha em `vendas` por item (mesmo vendedor/cliente/forma de pagamento).
 */
export function FormularioVenda({ aoIrParaLembretes }: { aoIrParaLembretes?: () => void }) {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { produtos: todosProdutos, comercios: todosComercios, usuarios } = useDataStore();
  const registrarVenda = useDataStore((s) => s.registrarVenda);
  const irPara = useUiStore((s) => s.irPara);
  const notificar = useToastStore((s) => s.notificar);

  // Um produto ou comércio removido (inativo) não pode ser escolhido em vendas
  // novas — vendas já registradas com eles continuam intactas no histórico.
  const produtos = todosProdutos.filter((p) => p.ativo);
  const ehVendedor = usuario.perfil === 'vendedor';
  // Para o vendedor, a própria carteira aparece primeiro na lista — mas sem
  // esconder os demais clientes, porque ele mesmo pode vender fora da
  // carteira (só é raro, não proibido).
  const comercios = ehVendedor
    ? [...todosComercios.filter((c) => c.ativo)].sort((a, b) => {
        const aDele = a.vendedor_id === usuario.id ? 0 : 1;
        const bDele = b.vendedor_id === usuario.id ? 0 : 1;
        return aDele - bDele;
      })
    : todosComercios.filter((c) => c.ativo);

  // O admin também vende: o seletor de responsável inclui os vendedores E o
  // próprio admin logado. Um vendedor fica travado no próprio usuário.
  const opcoesVendedor = ehVendedor
    ? [usuario]
    : usuarios.filter((u) => u.ativo && (u.perfil === 'vendedor' || u.id === usuario.id));

  const [vendedorId, setVendedorId] = useState(usuario.id);
  const [comercioId, setComercioId] = useState(comercios[0]?.id ?? '');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  // Campos do item "em edição" — o próximo a entrar no carrinho (ou o único, no
  // caso comum de uma venda com um produto só).
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '');
  const [quantidade, setQuantidade] = useState(1);
  const [precoDigitado, setPrecoDigitado] = useState<string>('');
  const [forma, setForma] = useState<FormaPagamento>('a_vista');
  const [prazo, setPrazo] = useState(7);
  // Default hoje, mas editável — permite lançar com atraso uma venda feita em
  // dia/mês anterior sem que ela seja contada no período errado (pedido do
  // cliente: vendas de julho lançadas em agosto estavam distorcendo o mês).
  const [dataVenda, setDataVenda] = useState(() => toISO(new Date()));
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<Venda[] | null>(null);
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
  const totalItemAtual = precoUnitario * quantidade;

  const valorItem = (item: ItemCarrinho, p: Produto) => {
    const r = resolverPreco(p, item.quantidade, item.precoDigitado);
    return r.preco_unitario * item.quantidade;
  };
  const totalCarrinho = carrinho.reduce((acc, item) => {
    const p = produtos.find((x) => x.id === item.produto_id);
    return p ? acc + valorItem(item, p) : acc;
  }, 0);
  const totalGeral = totalCarrinho + totalItemAtual;

  const limparItemAtual = () => {
    setProdutoId(produtos[0]?.id ?? '');
    setQuantidade(1);
    setPrecoDigitado('');
  };

  const adicionarAoCarrinho = () => {
    if (!produto || quantidade <= 0) return;
    setCarrinho((c) => [
      ...c,
      { produto_id: produtoId, quantidade, precoDigitado: preco?.bloqueado ? undefined : (precoDigitado === '' ? undefined : Number(precoDigitado)) },
    ]);
    limparItemAtual();
  };

  const removerDoCarrinho = (index: number) => {
    setCarrinho((c) => c.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoRef.current) return;
    // O item em edição entra na lista automaticamente — evita perder dados de
    // quem preencheu só um produto e nunca clicou "Adicionar produto".
    const itens: ItemCarrinho[] = [
      ...carrinho,
      ...(produto && quantidade > 0
        ? [{ produto_id: produtoId, quantidade, precoDigitado: preco?.bloqueado ? undefined : (precoDigitado === '' ? undefined : Number(precoDigitado)) }]
        : []),
    ];
    if (itens.length === 0) return;

    salvandoRef.current = true;
    setSalvando(true);
    const registradas: Venda[] = [];
    const falhas: ItemCarrinho[] = [];
    // Um id de pedido por carrinho enviado — todo item deste envio compartilha
    // o mesmo id, então agruparVendasPorPedido() os mantém juntos, mas dois
    // carrinhos enviados separadamente nunca mais se misturam.
    const pedidoId = crypto.randomUUID();
    for (const item of itens) {
      try {
        const venda = await registrarVenda({
          pedido_id: pedidoId,
          vendedor_id: vendedorId,
          comercio_id: comercioId,
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.precoDigitado,
          forma_pagamento: forma,
          prazo_dias: forma === 'a_prazo' ? prazo : undefined,
          data_venda: dataVenda,
        });
        registradas.push(venda);
      } catch {
        falhas.push(item);
      }
    }

    if (falhas.length === 0) {
      // Sucesso total: confirma e limpa tudo para o próximo lançamento.
      setSucesso(registradas);
      setCarrinho([]);
      limparItemAtual();
      setForma('a_vista');
      setPrazo(7);
      setDataVenda(toISO(new Date()));
    } else if (registradas.length > 0) {
      // Sucesso parcial: confirma o que gravou e devolve ao carrinho só o que
      // falhou — reenviar tudo de novo duplicaria o que já foi salvo.
      setSucesso(registradas);
      setCarrinho(falhas);
      notificar(
        `${registradas.length} de ${itens.length} item(ns) registrado(s). ${falhas.length} falharam — corrija e tente novamente.`,
        'bad',
      );
    } else {
      notificar('Não foi possível registrar a venda. Verifique sua conexão e tente novamente.', 'bad');
    }
    salvandoRef.current = false;
    setSalvando(false);
  };

  const faltam = produto ? produto.qtd_min_atacado - quantidade : 0;

  return (
    <>
      {sucesso && (
        <ConfirmacaoVenda
          vendas={sucesso}
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
              <ComboBox
                value={comercioId}
                onChange={setComercioId}
                opcoes={comercios.map((c) => ({ value: c.id, label: c.razao_social }))}
                placeholder="Buscar cliente…"
              />
            </div>
          </div>

          {carrinho.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-line bg-plane/40 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Produtos adicionados ({carrinho.length})
              </div>
              {carrinho.map((item, i) => {
                const p = produtos.find((x) => x.id === item.produto_id);
                if (!p) return null;
                const r = resolverPreco(p, item.quantidade, item.precoDigitado);
                return (
                  <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px]">
                    <div className="min-w-0">
                      <span className="font-semibold">{p.nome}</span>
                      <span className="text-ink-muted"> · {item.quantidade} cx · {r.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="tabular-nums font-semibold">{fmtBRL(r.preco_unitario * item.quantidade)}</span>
                      <button
                        type="button"
                        onClick={() => removerDoCarrinho(i)}
                        className="text-ink-muted transition hover:text-bad-strong"
                        aria-label={`Remover ${p.nome}`}
                      >
                        <IconLixeira size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <label className="field-label">Produto</label>
            <ComboBox
              value={produtoId}
              onChange={(id) => {
                setProdutoId(id);
                setPrecoDigitado('');
              }}
              opcoes={produtos.map((p) => ({ value: p.id, label: p.nome }))}
              placeholder="Buscar produto…"
            />
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

          <div>
            <Button type="button" variant="secondary" size="sm" onClick={adicionarAoCarrinho} disabled={!produto || quantidade <= 0}>
              + Adicionar produto
            </Button>
          </div>

          <div className="border-t border-line pt-4">
            <label className="field-label">Data da venda</label>
            <input
              type="date"
              className="field"
              max={toISO(new Date())}
              value={dataVenda}
              onChange={(e) => setDataVenda(e.target.value)}
            />
            <div className="mt-1.5 text-[11px] text-ink-muted">
              Lançando com atraso? Ajuste para a data em que a venda foi feita.
            </div>
          </div>

          <div>
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
              Total do pedido: <span className="font-bold tabular-nums text-ink">{fmtBRL(totalGeral)}</span>
              {carrinho.length > 0 && (
                <span className="ml-1">
                  ({carrinho.length + (produto && quantidade > 0 ? 1 : 0)} {carrinho.length + (produto && quantidade > 0 ? 1 : 0) === 1 ? 'item' : 'itens'})
                </span>
              )}
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
  vendas,
  onFechar,
  onVerLembretes,
}: {
  vendas: Venda[];
  onFechar: () => void;
  onVerLembretes: () => void;
}) {
  const { produtos, comercios, usuarios } = useDataStore();
  const primeira = vendas[0];
  const comercio = comercios.find((c) => c.id === primeira.comercio_id);
  const vendedor = usuarios.find((u) => u.id === primeira.vendedor_id);
  const aPrazo = primeira.forma_pagamento === 'a_prazo';
  const valorTotal = vendas.reduce((a, v) => a + v.valor_total, 0);
  const nomeProduto = (id: string) => produtos.find((p) => p.id === id)?.nome ?? 'Produto';

  return (
    <Card className="mb-5 border-l-[3px] border-l-good p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tag tone="good">{vendas.length === 1 ? 'Venda registrada' : `${vendas.length} vendas registradas`}</Tag>
          {vendas.length === 1 && <span className="text-[13.5px] font-bold">{nomeProduto(primeira.produto_id)}</span>}
        </div>
        <button
          type="button"
          onClick={onFechar}
          className="text-[11px] font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
        >
          Fechar
        </button>
      </div>

      {vendas.length > 1 && (
        <ul className="mt-3 flex flex-col gap-1.5 border-b border-line pb-3 text-[12.5px]">
          {vendas.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold">{nomeProduto(v.produto_id)}</span>
                <span className="text-ink-muted"> · {v.quantidade} cx · {v.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}</span>
              </span>
              <span className="shrink-0 tabular-nums font-semibold">{fmtBRL(v.valor_total)}</span>
            </li>
          ))}
        </ul>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">Cliente</dt>
          <dd className="font-semibold">{comercio?.razao_social ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Vendedor</dt>
          <dd className="font-semibold">{vendedor?.nome ?? '—'}</dd>
        </div>
        {vendas.length === 1 && (
          <div>
            <dt className="text-ink-muted">Quantidade</dt>
            <dd className="font-semibold tabular-nums">
              {primeira.quantidade} cx · {primeira.modo_preco === 'atacado' ? 'Atacado' : 'Varejo'}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-ink-muted">Valor total</dt>
          <dd className="font-bold tabular-nums text-ink">{fmtBRL(valorTotal)}</dd>
        </div>
        {vendas.length === 1 && (
          <div>
            <dt className="text-ink-muted">Margem</dt>
            <dd className="font-semibold tabular-nums">{primeira.margem != null ? fmtBRL(primeira.margem) : 'Não informada'}</dd>
          </div>
        )}
        <div>
          <dt className="text-ink-muted">Pagamento</dt>
          <dd className="font-semibold">
            {aPrazo ? (
              <>A prazo · vence {fmtData(primeira.data_vencimento)} <Tag tone="warn">Pendente</Tag></>
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
