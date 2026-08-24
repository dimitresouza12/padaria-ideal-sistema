import type { Periodicidade } from '@/types';

export const toISO = (d: Date): string => d.toISOString().slice(0, 10);

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

/**
 * Seletor de período do Dashboard/Comissões — independente das Metas (que têm
 * sua própria janela de datas). Um "mês" aqui é um `YYYY-MM` (ano-mês do
 * calendário), a granularidade que o negócio usa para fechar comissão e
 * comparar faturamento mês a mês.
 */

/** Ano-mês (`YYYY-MM`) de hoje, no fuso local. */
export const mesAtualISO = (): string => toISO(new Date()).slice(0, 7);

/** Dias corridos entre `dataISO` (YYYY-MM-DD) e hoje — usado pelo indicador de recompra. */
export function diasDesde(dataISO: string): number {
  const hoje = new Date(toISO(new Date()) + 'T00:00:00');
  const data = new Date(dataISO + 'T00:00:00');
  return Math.round((hoje.getTime() - data.getTime()) / 86_400_000);
}

/** Intervalo [data_inicio, data_fim] (inclusive) do mês `YYYY-MM` informado. */
export function rangeDoMes(anoMes: string): { data_inicio: string; data_fim: string } {
  const [ano, mes] = anoMes.split('-').map(Number);
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0);
  return { data_inicio: toISO(inicio), data_fim: toISO(fim) };
}

/** `true` se `dataISO` (YYYY-MM-DD) cai dentro do intervalo informado. */
export const noPeriodo = (dataISO: string, p: { data_inicio: string; data_fim: string }): boolean =>
  dataISO >= p.data_inicio && dataISO <= p.data_fim;

export const mesAnterior = (anoMes: string): string => {
  const [ano, mes] = anoMes.split('-').map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const mesSeguinte = (anoMes: string): string => {
  const [ano, mes] = anoMes.split('-').map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const NOMES_MES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Ex.: "Ago/26" — usado nos pontos do gráfico de evolução mensal. */
export const rotuloMesAbrev = (anoMes: string): string => {
  const [ano, mes] = anoMes.split('-').map(Number);
  return `${NOMES_MES_ABREV[mes - 1]}/${String(ano).slice(2)}`;
};

/** Ex.: "Agosto de 2026" — usado nos títulos de seção do Dashboard/Comissões. */
export const rotuloMesExtenso = (anoMes: string): string => {
  const [ano, mes] = anoMes.split('-').map(Number);
  return `${NOMES_MES[mes - 1]} de ${ano}`;
};
