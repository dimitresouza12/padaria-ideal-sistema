export const fmtBRL = (v: number): string =>
  'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtBRLCompact = (v: number): string =>
  'R$ ' + Math.round(v || 0).toLocaleString('pt-BR');

export const fmtPct = (v: number): string =>
  (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';

export const fmtData = (iso: string | null): string => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/** Iniciais para o avatar do usuário no header. */
export const iniciais = (nome: string): string =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** Primeiro nome — usado como identificador de login e em saudações. */
export const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] ?? nome;
