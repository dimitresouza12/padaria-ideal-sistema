import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/services/api';
import { IconAlerta, IconTrigo } from '@/components/icons';

type Modo = 'login' | 'solicitar' | 'solicitado';

export function LoginScreen() {
  const [modo, setModo] = useState<Modo>('login');

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{
        background:
          'radial-gradient(1100px 520px at 50% -8%, #fffdf8 0%, rgba(255,253,248,0) 60%), radial-gradient(900px 500px at 92% 108%, #f5ecdc 0%, rgba(245,236,220,0) 55%), #faf8f5',
      }}
    >
      <div className="relative w-full max-w-[428px] overflow-hidden rounded-[20px] border border-line bg-surface px-10 pb-8 pt-11 shadow-cardlg">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold via-accent to-accent-dark" />
        <Logo />

        {modo === 'login' && <FormLogin onSolicitarAcesso={() => setModo('solicitar')} />}
        {modo === 'solicitar' && (
          <FormSolicitarAcesso onVoltar={() => setModo('login')} onEnviado={() => setModo('solicitado')} />
        )}
        {modo === 'solicitado' && <SolicitacaoEnviada onVoltar={() => setModo('login')} />}
      </div>
    </div>
  );
}

function Logo() {
  const [logoFalhou, setLogoFalhou] = useState(false);
  return (
    <div className="mb-6 flex h-[78px] items-center justify-center">
      {!logoFalhou ? (
        <img
          src="/logoIdeal.PNG"
          alt="Logotipo Padaria Ideal"
          className="max-h-[78px] w-auto max-w-[210px] object-contain"
          onError={() => setLogoFalhou(true)}
        />
      ) : (
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-line-strong bg-accent-wash text-accent">
            <IconTrigo size={26} />
          </div>
          <div className="font-serif text-[25px] font-bold leading-tight text-ink">Padaria Ideal</div>
          <div className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.28em] text-accent">
            Atacado &amp; Distribuição
          </div>
        </div>
      )}
    </div>
  );
}

function FormLogin({ onSolicitarAcesso }: { onSolicitarAcesso: () => void }) {
  const login = useAuthStore((s) => s.login);
  const carregando = useAuthStore((s) => s.carregando);
  const erro = useAuthStore((s) => s.erro);

  const [usuarioLogin, setUsuarioLogin] = useState('');
  const [senha, setSenha] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await login(usuarioLogin, senha);
    if (!ok) setSenha('');
  };

  return (
    <>
      <h1 className="text-center text-[19px] font-bold tracking-tight text-ink">Acesso ao Sistema de Vendas</h1>
      <p className="mb-6 mt-1.5 text-center text-[13px] text-ink-muted">Informe suas credenciais para continuar</p>

      <form onSubmit={onSubmit} autoComplete="off">
        <div className="mb-4">
          <label className="field-label">Usuário</label>
          <input
            type="text"
            className="field"
            placeholder="Seu primeiro nome"
            value={usuarioLogin}
            onChange={(e) => setUsuarioLogin(e.target.value)}
            required
          />
        </div>
        <div className="mb-4">
          <label className="field-label">Senha</label>
          <input
            type="password"
            className="field"
            placeholder="Sua senha de acesso"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">
            <IconAlerta size={15} />
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-[10px] bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-dark disabled:opacity-60"
        >
          {carregando ? 'Verificando…' : 'Acessar Painel'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onSolicitarAcesso}
          className="text-[12.5px] font-bold text-accent hover:text-accent-dark"
        >
          Ainda não tem acesso? Solicitar cadastro
        </button>
      </div>

      <div className="mt-[18px] border-t border-line pt-[18px] text-[11.5px] leading-[1.7] text-ink-muted">
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em]">
          Ambiente de demonstração
        </span>
        Administrador — <b className="text-ink-soft">Roberto</b> /{' '}
        <b className="text-ink-soft">admin123</b>
        <br />
        Vendedor — <b className="text-ink-soft">Ana</b> /{' '}
        <b className="text-ink-soft">venda123</b>
      </div>
    </>
  );
}

function FormSolicitarAcesso({ onVoltar, onEnviado }: { onVoltar: () => void; onEnviado: () => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api.solicitarAcesso(nome, email, senha);
      onEnviado();
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível enviar a solicitação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <h1 className="text-center text-[19px] font-bold tracking-tight text-ink">Solicitar Acesso</h1>
      <p className="mb-6 mt-1.5 text-center text-[13px] text-ink-muted">
        Seu cadastro fica pendente até o gestor aprovar.
      </p>

      <form onSubmit={onSubmit} autoComplete="off">
        <div className="mb-4">
          <label className="field-label">Nome completo</label>
          <input className="field" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" required />
          {nome.trim() && (
            <div className="mt-1.5 text-[11px] text-ink-muted">
              Seu login de acesso será <b className="text-ink-soft">{nome.trim().split(/\s+/)[0]}</b>
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className="field-label">E-mail</label>
          <input
            type="email"
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@padaria.com"
            required
          />
        </div>
        <div className="mb-4">
          <label className="field-label">Senha desejada</label>
          <input
            type="password"
            className="field"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Escolha uma senha"
            required
          />
        </div>

        {erro && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-bad-tint px-3 py-2.5 text-[12.5px] font-semibold text-bad">
            <IconAlerta size={15} />
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-[10px] bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-dark disabled:opacity-60"
        >
          {enviando ? 'Enviando…' : 'Enviar Solicitação'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <button type="button" onClick={onVoltar} className="text-[12.5px] font-bold text-ink-muted hover:text-ink">
          Voltar para o login
        </button>
      </div>
    </>
  );
}

function SolicitacaoEnviada({ onVoltar }: { onVoltar: () => void }) {
  return (
    <div className="py-2 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-good-tint text-good">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h1 className="text-[17px] font-bold text-ink">Solicitação enviada</h1>
      <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-relaxed text-ink-muted">
        Seu pedido de acesso foi enviado ao gestor. Você poderá entrar assim que ele for aprovado em Configurações.
      </p>
      <button
        type="button"
        onClick={onVoltar}
        className="mt-6 w-full rounded-[10px] bg-accent py-3 text-sm font-bold text-white transition hover:bg-accent-dark"
      >
        Voltar para o login
      </button>
    </div>
  );
}
