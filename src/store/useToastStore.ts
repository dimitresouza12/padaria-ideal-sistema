import { create } from 'zustand';

/**
 * Notificações efêmeras ("toasts") — feedback de ações como excluir/cadastrar.
 * Some sozinho após alguns segundos; qualquer tela chama `notificar(...)`.
 */
export type ToastTom = 'good' | 'bad' | 'neutral';

export interface Toast {
  id: number;
  mensagem: string;
  tom: ToastTom;
}

interface ToastState {
  toasts: Toast[];
  notificar: (mensagem: string, tom?: ToastTom) => void;
  remover: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notificar: (mensagem, tom = 'good') => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, mensagem, tom }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  remover: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
