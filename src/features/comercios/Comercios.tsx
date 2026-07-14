import { useEffect, useRef, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useToastStore } from '@/store/useToastStore';
import { Card, Button, Modal, SectionLabel, EmptyState } from '@/components/ui';
import { IconEditar } from '@/components/icons';
import type { Comercio } from '@/types';

// Bairros e distritos de Morada Nova (CE). O campo continua chamado `regiao`
// no tipo/banco (Comercio.regiao) — só a lista de opções e o rótulo mudaram.
const REGIOES = [
  'Centro',
  'Girilândia',
  'Padre Assis Monteiro',
  'Hermógenes Henrique Girão',
  'São José',
  'Nossa Senhora da Conceição',
  'Planalto Aeroporto (Girão Maia)',
  'Júlia Santiago',
  'São Francisco',
  'Nova Morada (Antônio Raulino)',
  'Divino Espírito Santo',
  'Alto Tiradentes',
  'Irapuan Nobre',
  'Dois de Agosto',
  'Cristo Rei',
  'Granville',
  'Vazantes',
  'Populares',
  'São João do Aruaru (Aruaru)',
  'Uiraponga',
  'Pedras',
  'Lagoa Grande',
  'Juazeiro da Quintina',
  'Roldão',
  'Boa Água',
];
const FORM_INICIAL = { razao_social: '', telefone: '', regiao: 'Centro' };

export function Comercios() {
  const comercios = useDataStore((s) => s.comercios);
  const [novoAberto, setNovoAberto] = useState(false);
  const [editando, setEditando] = useState<Comercio | null>(null);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel>Comércios parceiros</SectionLabel>
        <Button size="sm" onClick={() => setNovoAberto(true)}>+ Novo Comércio</Button>
      </div>

      {comercios.length === 0 ? (
        <Card><EmptyState>Nenhum comércio cadastrado — use "Novo Comércio" para cadastrar o primeiro.</EmptyState></Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                    <th className="px-5 py-2.5">Nome do Comércio</th>
                    <th className="px-5 py-2.5">Telefone</th>
                    <th className="px-5 py-2.5">Bairro/Distrito</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {comercios.map((c) => (
                    <tr key={c.id} className="border-b border-line text-[13px] last:border-0">
                      <td className="px-5 py-3 font-semibold">{c.razao_social}</td>
                      <td className="px-5 py-3 tabular-nums text-ink-muted">{c.telefone || '—'}</td>
                      <td className="px-5 py-3">{c.regiao}</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditando(c)}
                          aria-label={`Editar ${c.razao_social}`}
                          className="inline-flex items-center justify-center rounded-lg border border-line-strong p-1.5 text-ink-soft transition hover:bg-plane hover:text-ink"
                        >
                          <IconEditar size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {comercios.map((c) => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-[14px] font-bold">{c.razao_social}</div>
                  <button
                    type="button"
                    onClick={() => setEditando(c)}
                    aria-label={`Editar ${c.razao_social}`}
                    className="inline-flex items-center justify-center rounded-lg border border-line-strong p-1.5 text-ink-soft transition active:bg-plane"
                  >
                    <IconEditar size={14} />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[12.5px] text-ink-soft">
                  <span className="tabular-nums">{c.telefone || '—'}</span>
                  <span className="rounded-full bg-plane px-2.5 py-1 text-[11px] font-semibold text-ink-soft">{c.regiao}</span>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ModalComercio aberto={novoAberto} alvo={null} onFechar={() => setNovoAberto(false)} />
      <ModalComercio aberto={editando !== null} alvo={editando} onFechar={() => setEditando(null)} />
    </div>
  );
}

function ModalComercio({ aberto, alvo, onFechar }: { aberto: boolean; alvo: Comercio | null; onFechar: () => void }) {
  const criarComercio = useDataStore((s) => s.criarComercio);
  const atualizarComercio = useDataStore((s) => s.atualizarComercio);
  const notificar = useToastStore((s) => s.notificar);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  // Ref, não state: evita duplo clique síncrono barrando na mesma closure.
  const salvandoRef = useRef(false);

  // Preenche o formulário com os dados do alvo ao abrir para editar; limpa ao
  // abrir para cadastrar um novo.
  useEffect(() => {
    if (!aberto) return;
    setForm(
      alvo
        ? { razao_social: alvo.razao_social, telefone: alvo.telefone, regiao: alvo.regiao }
        : FORM_INICIAL,
    );
  }, [aberto, alvo]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvandoRef.current) return;
    salvandoRef.current = true;
    setSalvando(true);
    const dados = {
      razao_social: form.razao_social.trim(),
      cnpj: alvo?.cnpj ?? '', // campo removido do cadastro; coluna permanece no banco por compatibilidade
      telefone: form.telefone.trim(),
      regiao: form.regiao,
    };
    try {
      if (alvo) {
        await atualizarComercio(alvo.id, dados);
        notificar('Alterações salvas.');
      } else {
        await criarComercio(dados);
        notificar('Comércio cadastrado.');
      }
      onFechar();
    } catch {
      notificar('Não foi possível salvar o comércio. Verifique sua conexão e tente novamente.', 'bad');
    } finally {
      salvandoRef.current = false;
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo={alvo ? `Editar ${alvo.razao_social}` : 'Cadastrar Novo Comércio'} onFechar={onFechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Razão social / Nome fantasia</label>
          <input
            className="field"
            value={form.razao_social}
            onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
            placeholder="Ex: Mercado Boa Vista"
            required
          />
        </div>
        <div>
          <label className="field-label">Telefone <span className="font-normal normal-case text-ink-muted">(opcional)</span></label>
          <input
            className="field"
            value={form.telefone}
            onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
            placeholder="(11) 0000-0000"
          />
        </div>
        <div>
          <label className="field-label">Bairro/Distrito</label>
          <select
            className="field"
            value={form.regiao}
            onChange={(e) => setForm((f) => ({ ...f, regiao: e.target.value }))}
          >
            {REGIOES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={onFechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>
            {salvando ? 'Salvando…' : alvo ? 'Salvar Alterações' : 'Cadastrar Comércio'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
