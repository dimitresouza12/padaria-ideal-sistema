import { useEffect, useState } from 'react';
import { useDataStore } from '@/store/useDataStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Card, Button, Tag, EmptyState, Modal, SubTabs } from '@/components/ui';
import { fmtData, primeiroNome } from '@/lib/format';
import type { Usuario } from '@/types';

/** Percentual "limpo" (sem ruído de ponto flutuante) a partir da fração salva. */
const fracaoParaPct = (fracao: number): string => String(+(fracao * 100).toFixed(2));

const FUNCIONARIO_INICIAL = { nome: '', email: '', senha: '', taxa_comissao: '10', meta_individual: '', senhaAdmin: '' };

type SubAba = 'conta' | 'equipe' | 'solicitacoes';

export function Configuracoes() {
  const carregarSolicitacoes = useDataStore((s) => s.carregarSolicitacoes);
  const solicitacoes = useDataStore((s) => s.solicitacoes);
  const [aba, setAba] = useState<SubAba>('conta');

  // Ao abrir a aba, busca as solicitações mais recentes (o gestor pode ter
  // recebido pedidos novos desde que entrou no sistema).
  useEffect(() => {
    void carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente').length;

  return (
    <div className="flex flex-col gap-5">
      <SubTabs
        ativa={aba}
        onSelecionar={(id) => setAba(id as SubAba)}
        abas={[
          { id: 'conta', titulo: 'Minha Conta' },
          { id: 'equipe', titulo: 'Equipe' },
          { id: 'solicitacoes', titulo: 'Solicitações', badge: pendentes },
        ]}
      />
      {aba === 'conta' && <MinhaSenha />}
      {aba === 'equipe' && <Equipe />}
      {aba === 'solicitacoes' && <SolicitacoesPendentes />}
    </div>
  );
}

function MinhaSenha() {
  const alterarSenha = useDataStore((s) => s.alterarSenha);
  const usuario = useAuthStore((s) => s.usuario);
  const adminLogin = usuario ? primeiroNome(usuario.nome) : '';

  const [senhaAtual, setSenhaAtual] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [senhaNovaConfirma, setSenhaNovaConfirma] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(false);
    if (senhaNova !== senhaNovaConfirma) {
      setErro('A confirmação não bate com a nova senha.');
      return;
    }
    setSalvando(true);
    try {
      await alterarSenha(adminLogin, senhaNova, adminLogin, senhaAtual);
      setSenhaAtual('');
      setSenhaNova('');
      setSenhaNovaConfirma('');
      setSucesso(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="max-w-xl p-5">
      <div className="mb-4 text-sm font-bold">Alterar minha senha</div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="field-label">Senha atual</label>
            <input className="field" type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Nova senha</label>
            <input className="field" type="password" value={senhaNova} onChange={(e) => setSenhaNova(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Confirmar nova senha</label>
            <input className="field" type="password" value={senhaNovaConfirma} onChange={(e) => setSenhaNovaConfirma(e.target.value)} required />
          </div>
        </div>
        {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}
        {sucesso && <div className="rounded-lg bg-good-tint px-3 py-2.5 text-[12.5px] font-semibold text-good">Senha alterada com sucesso.</div>}
        <div className="flex justify-end border-t border-line pt-4">
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Alterar Minha Senha'}</Button>
        </div>
      </form>
    </Card>
  );
}

function SolicitacoesPendentes() {
  const solicitacoes = useDataStore((s) => s.solicitacoes);
  const aprovarSolicitacao = useDataStore((s) => s.aprovarSolicitacao);
  const recusarSolicitacao = useDataStore((s) => s.recusarSolicitacao);
  const usuario = useAuthStore((s) => s.usuario);
  const adminLogin = usuario ? primeiroNome(usuario.nome) : '';

  const pendentes = solicitacoes.filter((s) => s.status === 'pendente');
  const [aprovando, setAprovando] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [extras, setExtras] = useState({ taxa_comissao: '10', meta_individual: '20000' });
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const abrirAprovacao = (id: string) => {
    setRecusando(null);
    setErro(null);
    setSenhaAdmin('');
    setAprovando(id);
  };
  const abrirRecusa = (id: string) => {
    setAprovando(null);
    setErro(null);
    setSenhaAdmin('');
    setRecusando(id);
  };

  const confirmarAprovacao = async (id: string) => {
    setErro(null);
    try {
      await aprovarSolicitacao(
        id,
        { taxa_comissao: (Number(extras.taxa_comissao) || 0) / 100, meta_individual: Number(extras.meta_individual) || 0 },
        adminLogin,
        senhaAdmin,
      );
      setAprovando(null);
      setSenhaAdmin('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível aprovar.');
    }
  };

  const confirmarRecusa = async (id: string) => {
    setErro(null);
    try {
      await recusarSolicitacao(id, adminLogin, senhaAdmin);
      setRecusando(null);
      setSenhaAdmin('');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível recusar.');
    }
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
                {aprovando !== s.id && recusando !== s.id ? (
                  <div className="flex gap-2">
                    <Button variant="good" size="sm" onClick={() => abrirAprovacao(s.id)}>Aprovar</Button>
                    <Button variant="danger" size="sm" onClick={() => abrirRecusa(s.id)}>Recusar</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => { setAprovando(null); setRecusando(null); }}>Cancelar</Button>
                )}
              </div>

              {aprovando === s.id && (
                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-plane p-4">
                  <div>
                    <label className="field-label">Comissão sobre a margem (%)</label>
                    <input type="number" className="field !w-32" min={0} max={100} value={extras.taxa_comissao} onChange={(e) => setExtras((x) => ({ ...x, taxa_comissao: e.target.value }))} />
                  </div>
                  <div>
                    <label className="field-label">Meta individual do período (R$)</label>
                    <input type="number" className="field !w-40" min={0} value={extras.meta_individual} onChange={(e) => setExtras((x) => ({ ...x, meta_individual: e.target.value }))} />
                  </div>
                  <div>
                    <label className="field-label">Confirme sua senha de admin</label>
                    <input type="password" className="field !w-40" value={senhaAdmin} onChange={(e) => setSenhaAdmin(e.target.value)} />
                  </div>
                  <Button size="sm" onClick={() => void confirmarAprovacao(s.id)} disabled={!senhaAdmin}>Confirmar Aprovação</Button>
                  {erro && <div className="w-full text-[12.5px] font-semibold text-bad">{erro}</div>}
                </div>
              )}

              {recusando === s.id && (
                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-lg bg-plane p-4">
                  <div>
                    <label className="field-label">Confirme sua senha de admin</label>
                    <input type="password" className="field !w-40" value={senhaAdmin} onChange={(e) => setSenhaAdmin(e.target.value)} />
                  </div>
                  <Button variant="danger" size="sm" onClick={() => void confirmarRecusa(s.id)} disabled={!senhaAdmin}>Confirmar Recusa</Button>
                  {erro && <div className="w-full text-[12.5px] font-semibold text-bad">{erro}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Equipe() {
  const usuarios = useDataStore((s) => s.usuarios);
  const usuarioLogado = useAuthStore((s) => s.usuario);
  const adminLogin = usuarioLogado ? primeiroNome(usuarioLogado.nome) : '';

  const [modalNovo, setModalNovo] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [senhaAlvo, setSenhaAlvo] = useState<Usuario | null>(null);

  const vendedores = usuarios.filter((u) => u.perfil === 'vendedor');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Equipe de vendas</div>
        <Button size="sm" onClick={() => setModalNovo(true)}>+ Novo Funcionário</Button>
      </div>

      {vendedores.length === 0 ? (
        <Card><EmptyState>Nenhum funcionário cadastrado.</EmptyState></Card>
      ) : (
        <>
          {/* Desktop: tabela */}
          <Card className="hidden overflow-hidden sm:block">
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
                    <th className="px-5 py-2.5 text-right">Ações</th>
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
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditando(v)}>Editar</Button>
                          <Button size="sm" variant="secondary" onClick={() => setSenhaAlvo(v)}>Senha</Button>
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
            {vendedores.map((v) => (
              <Card key={v.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-bold">{v.nome}</div>
                    <div className="text-xs text-ink-muted">
                      login <b className="text-accent-dark">{primeiroNome(v.nome)}</b> · {v.email}
                    </div>
                  </div>
                  <Tag tone={v.ativo ? 'good' : 'neutral'}>{v.ativo ? 'Ativo' : 'Inativo'}</Tag>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                  <div>
                    <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Comissão</dt>
                    <dd className="tabular-nums">{(v.taxa_comissao * 100).toLocaleString('pt-BR')}%</dd>
                  </div>
                  <div>
                    <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">Meta individual</dt>
                    <dd className="tabular-nums">{v.meta_individual.toLocaleString('pt-BR')}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex gap-2 border-t border-line pt-3">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditando(v)}>Editar</Button>
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => setSenhaAlvo(v)}>Senha</Button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <ModalNovoFuncionario aberto={modalNovo} onFechar={() => setModalNovo(false)} adminLogin={adminLogin} />
      <ModalEditarFuncionario alvo={editando} onFechar={() => setEditando(null)} />
      <ModalAlterarSenha alvo={senhaAlvo} onFechar={() => setSenhaAlvo(null)} adminLogin={adminLogin} />
    </div>
  );
}

function ModalNovoFuncionario({ aberto, onFechar, adminLogin }: { aberto: boolean; onFechar: () => void; adminLogin: string }) {
  const criarFuncionario = useDataStore((s) => s.criarFuncionario);
  const [form, setForm] = useState(FUNCIONARIO_INICIAL);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const set = (campo: keyof typeof FUNCIONARIO_INICIAL) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const fechar = () => {
    setForm(FUNCIONARIO_INICIAL);
    setErro(null);
    onFechar();
  };

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
        adminLogin,
        adminSenha: form.senhaAdmin,
      });
      fechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível cadastrar o funcionário.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo="Cadastrar Novo Funcionário" onFechar={fechar}>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">E-mail (contato)</label>
            <input className="field" type="email" value={form.email} onChange={set('email')} placeholder="nome@padaria.com" required />
          </div>
          <div>
            <label className="field-label">Senha provisória</label>
            <input className="field" type="text" value={form.senha} onChange={set('senha')} placeholder="Definida pelo gestor" required />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Comissão sobre a margem (%)</label>
            <input className="field" type="number" min={0} max={100} value={form.taxa_comissao} onChange={set('taxa_comissao')} required />
          </div>
          <div>
            <label className="field-label">Meta individual do período (R$)</label>
            <input className="field" type="number" min={0} value={form.meta_individual} onChange={set('meta_individual')} required />
          </div>
        </div>
        <div>
          <label className="field-label">Confirme sua senha de admin</label>
          <input className="field" type="password" value={form.senhaAdmin} onChange={set('senhaAdmin')} required />
        </div>
        {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Cadastrar Funcionário'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalEditarFuncionario({ alvo, onFechar }: { alvo: Usuario | null; onFechar: () => void }) {
  const atualizarFuncionario = useDataStore((s) => s.atualizarFuncionario);
  const [taxa, setTaxa] = useState('');
  const [meta, setMeta] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Preenche os campos toda vez que um alvo novo é aberto.
  useEffect(() => {
    if (alvo) {
      setTaxa(fracaoParaPct(alvo.taxa_comissao));
      setMeta(String(alvo.meta_individual));
    }
  }, [alvo]);

  const fechar = () => {
    onFechar();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alvo) return;
    setSalvando(true);
    try {
      await atualizarFuncionario(alvo.id, {
        taxa_comissao: (Number(taxa) || 0) / 100,
        meta_individual: Number(meta) || 0,
      });
      fechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={alvo !== null} titulo={alvo ? `Editar ${primeiroNome(alvo.nome)}` : ''} onFechar={fechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label">Comissão sobre a margem (%)</label>
            <input className="field" type="number" min={0} max={100} value={taxa} onChange={(e) => setTaxa(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Meta individual do período (R$)</label>
            <input className="field" type="number" min={0} value={meta} onChange={(e) => setMeta(e.target.value)} required />
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar Alterações'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ModalAlterarSenha({ alvo, onFechar, adminLogin }: { alvo: Usuario | null; onFechar: () => void; adminLogin: string }) {
  const alterarSenha = useDataStore((s) => s.alterarSenha);
  const [nova, setNova] = useState('');
  const [admin, setAdmin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const fechar = () => {
    setNova('');
    setAdmin('');
    setErro(null);
    onFechar();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alvo) return;
    setErro(null);
    setSalvando(true);
    try {
      await alterarSenha(primeiroNome(alvo.nome), nova, adminLogin, admin);
      fechar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível alterar a senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal aberto={alvo !== null} titulo={alvo ? `Nova senha para ${primeiroNome(alvo.nome)}` : ''} onFechar={fechar}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div>
          <label className="field-label">Nova senha</label>
          <input className="field" type="password" value={nova} onChange={(e) => setNova(e.target.value)} required />
        </div>
        <div>
          <label className="field-label">Confirme sua senha de admin</label>
          <input className="field" type="password" value={admin} onChange={(e) => setAdmin(e.target.value)} required />
        </div>
        {erro && <div className="rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">{erro}</div>}
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button type="button" variant="ghost" onClick={fechar}>Cancelar</Button>
          <Button type="submit" disabled={salvando || !nova || !admin}>{salvando ? 'Salvando…' : 'Alterar Senha'}</Button>
        </div>
      </form>
    </Modal>
  );
}
