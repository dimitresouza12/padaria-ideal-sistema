/**
 * Primitivos de UI do design system "Padaria Premium".
 * Componentes pequenos, sem estado, reutilizados por todas as telas.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* ---------------- Card ---------------- */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>
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
