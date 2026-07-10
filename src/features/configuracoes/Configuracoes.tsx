import { useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { Card, Button, Tag, EmptyState, SectionLabel } from '@/components/ui';
import { fmtData, primeiroNome } from '@/lib/format';

const FUNCIONARIO_INICIAL = { nome: '', email: '', senha: '', taxa_comissao: '10', meta_individual: '' };

export function Configuracoes() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <SectionLabel>Solicitações de acesso</SectionLabel>
        <SolicitacoesPendentes />
      </div>
      <div>
        <SectionLabel>Equipe</SectionLabel>
        <CadastrarFuncionario />
      </div>
    </div>
  );
}

function SolicitacoesPendentes() {
  const solicitacoes = useDataStore((s) => s.solicitacoes);
  const aprovarSolicitacao = useDataStore((s) => s.aprovarSolicitacao);
  const recusarSolicitacao = useDataStore((s) => s.recusarSolicitacao);

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [extras, setExtras] = useState({ taxa_comissao: '10', meta_individual: '20000' });

  const confirmarAprovacao = async (id: string) => {
    await aprovarSolicitacao(id, {
      taxa_comissao: (Number(extras.taxa_comissao) || 0) / 100,
      meta_individual: Number(extras.meta_individual) || 0,
    });
    setAprovando(null);
  };

  return (
    <Card className="overflow-hidden">
      {pendentes.length === 0 ? (
        <EmptyState>Nenhuma solicitação pendente no momento.</EmptyState>
      ) : (
        <div className="divide-y divide-line">
          {pendentes.map((s) => (
            <div key={s.id} className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[13.5px] font-semibold">{s.nome}</div>
                  <div className="text-xs text-ink-muted">
                    login <b className="text-accent-dark">{primeiroNome(s.nome)}</b> · {s.email} · solicitado em {fmtData(s.criado_em.slice(0, 10))}
                  </div>
                </div>
                {aprovando !== s.id ? (
                  <div className="flex gap-2">
                    <Button variant="good" size="sm" onClick={() => setAprovando(s.id)}>Aprovar</Button>
                    <Button variant="danger" size="sm" onClick={() => void recusarSolicitacao(s.id)}>Recusar</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => setAprovando(null)}>Cancelar</Button>
                )}
              </div>

              {aprovando === s.id && (
                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-plane p-4">
                  <div>
                    <label className="field-label">Comissão sobre a margem (%)</label>
                    <input
                      type="number"
                      className="field !w-32"
                      min={0}
                      max={100}
                      value={extras.taxa_comissao}
                      onChange={(e) => setExtras((x) => ({ ...x, taxa_comissao: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="field-label">Meta individual do período (R$)</label>
                    <input
                      type="number"
                      className="field !w-40"
                      min={0}
                      value={extras.meta_individual}
                      onChange={(e) => setExtras((x) => ({ ...x, meta_individual: e.target.value }))}
                    />
                  </div>
                  <Button size="sm" onClick={() => void confirmarAprovacao(s.id)}>Confirmar Aprovação</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function CadastrarFuncionario() {
  const criarFuncionario = useDataStore((s) => s.criarFuncionario);
  const usuarios = useDataStore((s) => s.usuarios);
  const [form, setForm] = useState(FUNCIONARIO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');

  const set = (campo: keyof typeof FUNCIONARIO_INICIAL) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      await criarFuncionario({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        taxa_comissao: (Number(form.taxa_comissao) || 0) / 100,
        meta_individual: Number(form.meta_individual) || 0,
      });
      setForm(FUNCIONARIO_INICIAL);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível cadastrar o funcionário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line-strong text-left text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
                <th className="px-5 py-2.5">Nome</th>
                <th className="px-5 py-2.5">Login</th>
                <th className="px-5 py-2.5">E-mail</th>
                <th className="px-5 py-2.5">Comissão</th>
                <th className="px-5 py-2.5">Meta individual</th>
                <th className="px-5 py-2.5">Situação</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((v) => (
                <tr key={v.id} className="border-b border-line text-[13px] last:border-0">
                  <td className="px-5 py-3 font-semibold">{v.nome}</td>
                  <td className="px-5 py-3 tabular-nums text-accent-dark">{primeiroNome(v.nome)}</td>
                  <td className="px-5 py-3 text-ink-muted">{v.email}</td>
                  <td className="px-5 py-3 tabular-nums">{(v.taxa_comissao * 100).toLocaleString('pt-BR')}%</td>
                  <td className="px-5 py-3 tabular-nums">{v.meta_individual.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3"><Tag tone={v.ativo ? 'good' : 'neutral'}>{v.ativo ? 'Ativo' : 'Inativo'}</Tag></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="max-w-xl p-5">
        <div className="mb-4 text-sm font-bold">Cadastrar Novo Funcionário</div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div>
            <label className="field-label">Nome completo</label>
            <input className="field" value={form.nome} onChange={set('nome')} placeholder="Ex: Fernanda Costa" required />
            {form.nome.trim() && (
              <div className="mt-1.5 text-[11px] text-ink-muted">
                Login de acesso: <b className="text-accent-dark">{primeiroNome(form.nome)}</b>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">E-mail (contato)</label>
              <input className="field" type="email" value={form.email} onChange={set('email')} placeholder="nome@padaria.com" required />
            </div>
            <div>
              <label className="field-label">Senha provisória</label>
              <input className="field" type="text" value={form.senha} onChange={set('senha')} placeholder="Definida pelo gestor" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label">Comissão sobre a margem (%)</label>
              <input className="field" type="number" min={0} max={100} value={form.taxa_comissao} onChange={set('taxa_comissao')} required />
            </div>
            <div>
              <label className="field-label">Meta individual do período (R$)</label>
              <input className="field" type="number" min={0} value={form.meta_individual} onChange={set('meta_individual')} required />
            </div>
          </div>
          {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar Funcionário'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
