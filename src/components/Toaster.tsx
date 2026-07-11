import { useToastStore, type ToastTom } from '@/store/useToastStore';

const bordaPorTom: Record<ToastTom, string> = {
  good: 'border-l-good',
  bad: 'border-l-bad-strong',
  neutral: 'border-l-accent',
};

/** Pilha de notificações no canto inferior direito. Montada uma vez na raiz. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remover = useToastStore((s) => s.remover);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[200] flex w-[320px] max-w-[calc(100vw-2.5rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast-in pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-l-[3px] border-line bg-surface px-4 py-3 shadow-cardlg ${bordaPorTom[t.tom]}`}
        >
          <span className="text-[13px] font-semibold text-ink">{t.mensagem}</span>
          <button
            type="button"
            onClick={() => remover(t.id)}
            className="text-[11px] font-bold uppercase tracking-wider text-ink-muted transition hover:text-ink"
          >
            Fechar
          </button>
        </div>
      ))}
    </div>
  );
}
