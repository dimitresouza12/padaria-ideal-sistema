import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Button, ComboBox } from '@/components/ui';

/**
 * "Passei e não vendi" — registra uma visita sem venda, para a meta de
 * visitas enxergar o cliente visitado mesmo sem faturamento (venda e perda já
 * contam como visita automaticamente; este formulário cobre só a lacuna).
 */
export function FormularioVisita({ onRegistrada }: { onRegistrada?: () => void }) {
  const usuario = useAuthStore((s) => s.usuario)!;
  const comerciosTodos = useDataStore((s) => s.comercios);
  const registrarVisita = useDataStore((s) => s.registrarVisita);
  const notificar = useToastStore((s) => s.notificar);

  const ehVendedor = usuario.perfil === 'vendedor';
  const comercios = ehVendedor
    ? [...comerciosTodos.filter((c) => c.ativo)].sort((a, b) => {
        const aDele = a.vendedor_id === usuario.id ? 0 : 1;
        const bDele = b.vendedor_id === usuario.id ? 0 : 1;
        return aDele - bDele;
      })
    : comerciosTodos.filter((c) => c.ativo);

  const [comercioId, setComercioId] = useState(comercios[0]?.id ?? '');
  const [dataVisita, setDataVisita] = useState(() => new Date().toISOString().slice(0, 10));
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  // Ref, não state: evita duplo clique síncrono barrando na mesma closure.
  const salvandoRef = useRef(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoRef.current || !comercioId) return;
    salvandoRef.current = true;
    setSalvando(true);
    try {
      await registrarVisita({
        comercio_id: comercioId,
        vendedor_id: usuario.id,
        data_visita: dataVisita,
        observacao: observacao.trim() || undefined,
      });
      notificar('Visita registrada.');
      onRegistrada?.();
    } catch {
      notificar('Não foi possível registrar a visita. Verifique sua conexão e tente novamente.', 'bad');
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="field-label">Comércio visitado</label>
        <ComboBox
          value={comercioId}
          onChange={setComercioId}
          opcoes={comercios.map((c) => ({ value: c.id, label: c.razao_social }))}
          placeholder="Buscar comércio…"
        />
      </div>

      <div>
        <label className="field-label">Data da visita</label>
        <input
          type="date"
          className="field"
          max={new Date().toISOString().slice(0, 10)}
          value={dataVisita}
          onChange={(e) => setDataVisita(e.target.value)}
        />
      </div>

      <div>
        <label className="field-label">Observação <span className="font-normal normal-case text-ink-muted">(opcional)</span></label>
        <input
          className="field"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Ex: cliente sem estoque no momento"
        />
      </div>

      <div className="flex justify-end border-t border-line pt-4">
        <Button type="submit" disabled={salvando || !comercioId}>
          {salvando ? 'Registrando…' : 'Registrar Visita'}
        </Button>
      </div>
    </form>
  );
}
