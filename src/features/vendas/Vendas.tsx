import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useUiStore } from '@/store/useUiStore';
import { Button, Modal, SectionLabel } from '@/components/ui';
import { FormularioVenda } from './RegistrarVenda';
import { FormularioVisita } from './RegistrarVisita';
import { Historico } from '@/features/historico/Historico';

/**
 * Aba "Vendas": botão para registrar uma venda (abre o formulário em modal) e,
 * logo abaixo, o histórico. O admin vê todas as vendas; o vendedor vê apenas as
 * próprias (o filtro de vendedor fica oculto para ele).
 */
export function Vendas() {
  const usuario = useAuthStore((s) => s.usuario)!;
  const irPara = useUiStore((s) => s.irPara);
  const [aberto, setAberto] = useState(false);
  const [visitaAberta, setVisitaAberta] = useState(false);

  const restrito = usuario.perfil === 'vendedor' ? usuario.id : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>{restrito ? 'Minhas vendas' : 'Vendas registradas'}</SectionLabel>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setVisitaAberta(true)}>Passei e não vendi</Button>
          <Button size="sm" onClick={() => setAberto(true)}>+ Registrar Venda</Button>
        </div>
      </div>

      <Historico restritoVendedorId={restrito} />

      <Modal aberto={aberto} titulo="Registrar Venda" onFechar={() => setAberto(false)}>
        <FormularioVenda
          aoIrParaLembretes={() => {
            setAberto(false);
            irPara('lembretes');
          }}
        />
      </Modal>

      <Modal aberto={visitaAberta} titulo="Registrar Visita" onFechar={() => setVisitaAberta(false)}>
        <FormularioVisita onRegistrada={() => setVisitaAberta(false)} />
      </Modal>
    </div>
  );
}
