import { create } from 'zustand';

/**
 * Notificações efêmeras ("toasts") — feedback de ações como excluir/cadastrar.
 * Some sozinho após alguns segundos; qualquer tela chama `notificar(...)`.
 */
export type ToastTom = 'good' | 'bad' | 'neutral';

export interface ToastAcao {
  rotulo: string;
  aoClicar: () => void;
}

export interface Toast {
  id: number;
  mensagem: string;
  tom: ToastTom;
  acao?: ToastAcao;
}

interface ToastOpcoes {
  /** Botão extra no toast (ex.: "Desfazer") — clicar nele já fecha o toast. */
  acao?: ToastAcao;
  /** Tempo até sumir sozinho, em ms. Padrão 3500. */
  duracaoMs?: number;
}

interface ToastState {
  toasts: Toast[];
  notificar: (mensagem: string, tom?: ToastTom, opcoes?: ToastOpcoes) => void;
  remover: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notificar: (mensagem, tom = 'good', opcoes) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, mensagem, tom, acao: opcoes?.acao }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), opcoes?.duracaoMs ?? 3500);
  },
  remover: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
