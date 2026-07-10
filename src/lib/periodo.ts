import type { Periodicidade } from '@/types';

const toISO = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Calcula data_inicio/data_fim para uma periodicidade, ancorada em `referencia`
 * (o "hoje" do sistema). Usada para pré-preencher o formulário de nova meta —
 * o gestor ainda pode ajustar manualmente antes de salvar.
 */
export function rangeParaPeriodicidade(
  periodicidade: Periodicidade,
  referencia: string,
): { data_inicio: string; data_fim: string } {
  const ref = new Date(referencia + 'T00:00:00');

  if (periodicidade === 'semanal') {
    // Semana de segunda a domingo contendo a referência.
    const diaSemana = ref.getDay(); // 0=domingo
    const deltaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
    const inicio = new Date(ref);
    inicio.setDate(ref.getDate() + deltaSegunda);
    const fim = new Date(inicio);
    fim.setDate(inicio.getDate() + 6);
    return { data_inicio: toISO(inicio), data_fim: toISO(fim) };
  }

  if (periodicidade === 'mensal') {
    const inicio = new Date(ref.getFullYear(), ref.getMonth(), 1);
    const fim = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    return { data_inicio: toISO(inicio), data_fim: toISO(fim) };
  }

  if (periodicidade === 'trimestral') {
    const trimestreInicio = Math.floor(ref.getMonth() / 3) * 3;
    const inicio = new Date(ref.getFullYear(), trimestreInicio, 1);
    const fim = new Date(ref.getFullYear(), trimestreInicio + 3, 0);
    return { data_inicio: toISO(inicio), data_fim: toISO(fim) };
  }

  // 'personalizado' — sem sugestão automática; o gestor escolhe as duas datas.
  return { data_inicio: referencia, data_fim: referencia };
}

export const LABEL_PERIODICIDADE: Record<Periodicidade, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  personalizado: 'Personalizado',
};
