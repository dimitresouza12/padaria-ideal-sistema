/**
 * Primitivos de UI do design system "Padaria Premium".
 * Componentes pequenos, sem estado, reutilizados por todas as telas.
 */
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* ---------------- Card ---------------- */
export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}

/* ---------------- Botão ---------------- */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'good' | 'danger';
const btnStyles: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-dark',
  secondary: 'bg-white text-ink border border-line-strong hover:bg-plane',
  ghost: 'bg-transparent text-ink-soft border border-line-strong hover:bg-plane',
  good: 'bg-good text-white hover:opacity-90',
  danger: 'bg-bad-strong text-white hover:opacity-90',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs rounded-lg' : 'px-4 py-2.5 text-[13px] rounded-lg';
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold transition disabled:opacity-50 ${sz} ${btnStyles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* ---------------- Tag / status ---------------- */
type TagTone = 'good' | 'bad' | 'warn' | 'neutral' | 'accent';
const tagStyles: Record<TagTone, string> = {
  good: 'bg-good-tint text-good',
  bad: 'bg-bad-tint text-bad',
  warn: 'bg-warn-tint text-warn',
  neutral: 'bg-plane text-ink-soft',
  accent: 'bg-accent-wash text-accent-dark',
};

export function Tag({ tone = 'neutral', children }: { tone?: TagTone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-bold ${tagStyles[tone]}`}>
      {children}
    </span>
  );
}

/* ---------------- KPI / Stat card ---------------- */
export function StatCard({
  rotulo,
  valor,
  contexto,
  faixa = 'accent',
}: {
  rotulo: string;
  valor: string;
  contexto?: ReactNode;
  faixa?: 'good' | 'bad' | 'accent';
}) {
  const borda =
    faixa === 'good' ? 'border-l-good' : faixa === 'bad' ? 'border-l-bad-strong' : 'border-l-accent';
  return (
    <Card className={`border-l-[3px] p-4 ${borda}`}>
      <div className="text-xs font-semibold text-ink-soft">{rotulo}</div>
      <div className="mt-1.5 text-[27px] font-extrabold tracking-tight">{valor}</div>
      {contexto && <div className="mt-2 text-xs text-ink-muted">{contexto}</div>}
    </Card>
  );
}

/* ---------------- Barra de progresso ---------------- */
export function ProgressBar({ pct, tone = 'accent' }: { pct: number; tone?: 'accent' | 'good' | 'bad' }) {
  const cor = tone === 'good' ? 'bg-good' : tone === 'bad' ? 'bg-bad-strong' : 'bg-accent';
  return (
    <div className="h-4 overflow-hidden rounded-full bg-[#eceae3]">
      <div className={`h-full rounded-full transition-all ${cor}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

/* ---------------- Título de seção ---------------- */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">{children}</div>;
}

/* ---------------- Estado vazio ---------------- */
export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-ink-muted">{children}</div>;
}

/* ---------------- Sub-navegação (abas internas de uma tela) ---------------- */
export interface SubTab {
  id: string;
  titulo: string;
  badge?: number;
}
export function SubTabs({
  abas,
  ativa,
  onSelecionar,
}: {
  abas: SubTab[];
  ativa: string;
  onSelecionar: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 shadow-card">
      {abas.map((aba) => {
        const sel = aba.id === ativa;
        return (
          <button
            key={aba.id}
            type="button"
            onClick={() => onSelecionar(aba.id)}
            className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-bold transition ${
              sel ? 'bg-accent-wash text-accent-dark' : 'text-ink-soft hover:bg-plane hover:text-ink'
            }`}
          >
            {aba.titulo}
            {aba.badge != null && aba.badge > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-bad-strong px-1 text-[10px] font-extrabold text-white">
                {aba.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Modal ---------------- */
export function Modal({
  aberto,
  titulo,
  onFechar,
  children,
}: {
  aberto: boolean;
  titulo: ReactNode;
  onFechar: () => void;
  children: ReactNode;
}) {
  const corpoRef = useRef<HTMLDivElement>(null);
  const [podeRolar, setPodeRolar] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aberto, onFechar]);

  // Mostra o indicador de rolagem sempre que houver mais conteúdo abaixo da
  // área visível; some sozinho ao chegar no fim. ResizeObserver cobre trocas
  // de conteúdo (ex.: alternar entre ver/editar) sem precisar de mais deps.
  useEffect(() => {
    if (!aberto) return;
    const el = corpoRef.current;
    if (!el) return;
    const verificar = () => setPodeRolar(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
    verificar();
    const obs = new ResizeObserver(verificar);
    obs.observe(el);
    return () => obs.disconnect();
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onFechar} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-cardlg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="text-[14px] font-bold">{titulo}</div>
          <button
            type="button"
            onClick={onFechar}
            className="text-[11px] font-bold uppercase tracking-wider text-ink-muted transition hover:text-ink"
          >
            Fechar
          </button>
        </div>
        <div
          ref={corpoRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            setPodeRolar(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
          }}
          className="max-h-[70vh] overflow-y-auto p-5"
        >
          {children}
        </div>
        {podeRolar && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center rounded-b-2xl bg-gradient-to-t from-surface via-surface/80 to-transparent pb-1.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Modal de confirmação para ações destrutivas (excluir/remover) — substitui
 * o `confirm()` nativo do navegador em todo o app, para ficar consistente
 * com o resto da UI (e funcionar em qualquer navegador/dispositivo do mesmo
 * jeito).
 */
export function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  onConfirmar,
  onCancelar,
  confirmando = false,
  textoConfirmar = 'Remover',
}: {
  aberto: boolean;
  titulo: string;
  mensagem: ReactNode;
  onConfirmar: () => void;
  onCancelar: () => void;
  confirmando?: boolean;
  textoConfirmar?: string;
}) {
  return (
    <Modal aberto={aberto} titulo={titulo} onFechar={onCancelar}>
      <div className="text-[13px] leading-relaxed text-ink-soft">{mensagem}</div>
      <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" onClick={onCancelar}>Cancelar</Button>
        <Button type="button" variant="danger" onClick={onConfirmar} disabled={confirmando}>
          {confirmando ? 'Removendo…' : textoConfirmar}
        </Button>
      </div>
    </Modal>
  );
}
