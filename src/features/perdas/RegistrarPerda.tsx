import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Button, ComboBox } from '@/components/ui';
import { IconLixeira } from '@/components/icons';
import { fmtBRL } from '@/lib/format';
import type { Produto } from '@/types';

/** Um item ainda não enviado — produto + quantidade. */
interface ItemCarrinhoPerda {
  produto_id: string;
  quantidade: number;
}

/**
 * Formulário de registro de perda/troca (produto vencido substituído numa
 * visita). Mesmo layout de carrinho de `RegistrarVenda.tsx` — o cliente pediu
 * explicitamente o mesmo padrão — mas sem forma de pagamento, prazo ou preço
 * negociável: não é uma venda, é desperdício.
 */
export function FormularioPerda({ onRegistrada }: { onRegistrada?: () => void }) {
  const usuario = useAuthStore((s) => s.usuario)!;
  const { produtos: todosProdutos, comercios: todosComercios, usuarios } = useDataStore();
  const registrarPerda = useDataStore((s) => s.registrarPerda);
  const notificar = useToastStore((s) => s.notificar);

  const produtos = todosProdutos.filter((p) => p.ativo);
  const ehVendedor = usuario.perfil === 'vendedor';
  // Mesma priorização de carteira usada em Registrar Venda.
  const comercios = ehVendedor
    ? [...todosComercios.filter((c) => c.ativo)].sort((a, b) => {
        const aDele = a.vendedor_id === usuario.id ? 0 : 1;
        const bDele = b.vendedor_id === usuario.id ? 0 : 1;
        return aDele - bDele;
      })
    : todosComercios.filter((c) => c.ativo);
  const opcoesVendedor = ehVendedor
    ? [usuario]
    : usuarios.filter((u) => u.ativo && (u.perfil === 'vendedor' || u.id === usuario.id));

  const [vendedorId, setVendedorId] = useState(usuario.id);
  const [comercioId, setComercioId] = useState(comercios[0]?.id ?? '');
  const [dataPerda, setDataPerda] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinhoPerda[]>([]);
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? '');
  const [quantidade, setQuantidade] = useState(1);
  const [salvando, setSalvando] = useState(false);
  // Ref, não state: evita duplo clique síncrono barrando na mesma closure.
  const salvandoRef = useRef(false);

  const produto = produtos.find((p) => p.id === produtoId);

  const valorItem = (item: ItemCarrinhoPerda, p: Produto) => p.preco_varejo * item.quantidade;
  const totalCarrinho = carrinho.reduce((acc, item) => {
    const p = produtos.find((x) => x.id === item.produto_id);
    return p ? acc + valorItem(item, p) : acc;
  }, 0);
  const totalItemAtual = produto ? produto.preco_varejo * quantidade : 0;
  const totalGeral = totalCarrinho + totalItemAtual;
  const totalItens = carrinho.length + (produto && quantidade > 0 ? 1 : 0);

  const limparItemAtual = () => {
    setProdutoId(produtos[0]?.id ?? '');
    setQuantidade(1);
  };

  const adicionarAoCarrinho = () => {
    if (!produto || quantidade <= 0) return;
    setCarrinho((c) => [...c, { produto_id: produtoId, quantidade }]);
    limparItemAtual();
  };

  const removerDoCarrinho = (index: number) => {
    setCarrinho((c) => c.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoRef.current || !comercioId) return;
    // O item em edição entra na lista automaticamente — evita perder dados de
    // quem preencheu só um produto e nunca clicou "Adicionar produto".
    const itens: ItemCarrinhoPerda[] = [
      ...carrinho,
      ...(produto && quantidade > 0 ? [{ produto_id: produtoId, quantidade }] : []),
    ];
    if (itens.length === 0) return;

    salvandoRef.current = true;
    setSalvando(true);
    let sucessos = 0;
    const falhas: ItemCarrinhoPerda[] = [];
    for (const item of itens) {
      try {
        await registrarPerda({
          comercio_id: comercioId,
          produto_id: item.produto_id,
          vendedor_id: vendedorId,
          quantidade: item.quantidade,
          data_perda: dataPerda,
          observacao: observacao.trim() || undefined,
        });
        sucessos += 1;
      } catch {
        falhas.push(item);
      }
    }

    if (falhas.length === 0) {
      notificar(sucessos === 1 ? 'Perda registrada.' : `${sucessos} perdas registradas.`);
      setCarrinho([]);
      limparItemAtual();
      setObservacao('');
      onRegistrada?.();
    } else if (sucessos > 0) {
      setCarrinho(falhas);
      notificar(
        `${sucessos} de ${itens.length} item(ns) registrado(s). ${falhas.length} falharam — corrija e tente novamente.`,
        'bad',
      );
    } else {
      notificar('Não foi possível registrar a perda. Verifique sua conexão e tente novamente.', 'bad');
    }
    salvandoRef.current = false;
    setSalvando(false);
  };

  return (
    <>
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
            <label className="field-label">Comércio visitado</label>
            <ComboBox
              value={comercioId}
              onChange={setComercioId}
              opcoes={comercios.map((c) => ({ value: c.id, label: c.razao_social }))}
              placeholder="Buscar comércio…"
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
              return (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[12.5px]">
                  <div className="min-w-0">
                    <span className="font-semibold">{p.nome}</span>
                    <span className="text-ink-muted"> · {item.quantidade} cx</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tabular-nums font-semibold">{fmtBRL(valorItem(item, p))}</span>
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
            onChange={setProdutoId}
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
          </div>
          <div>
            <label className="field-label">Data da perda</label>
            <input type="date" className="field" value={dataPerda} onChange={(e) => setDataPerda(e.target.value)} />
          </div>
        </div>

        <div>
          <Button type="button" variant="secondary" size="sm" onClick={adicionarAoCarrinho} disabled={!produto || quantidade <= 0}>
            + Adicionar produto
          </Button>
        </div>

        <div>
          <label className="field-label">Observação <span className="font-normal normal-case text-ink-muted">(opcional)</span></label>
          <input
            className="field"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: caixa avariada no transporte"
          />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <div className="text-[12.5px] text-ink-muted">
            Faturamento perdido no pedido: <span className="font-bold tabular-nums text-ink">{fmtBRL(totalGeral)}</span>
            {totalItens > 0 && <span className="ml-1">({totalItens} {totalItens === 1 ? 'item' : 'itens'})</span>}
          </div>
          <Button type="submit" disabled={salvando || !comercioId}>
            {salvando ? 'Registrando…' : 'Registrar Perda'}
          </Button>
        </div>
      </form>
    </>
  );
}
