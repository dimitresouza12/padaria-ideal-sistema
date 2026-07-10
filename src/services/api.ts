/**
 * PONTO DE VIRADA (seam de migração).
 *
 * Todos os componentes/stores importam `api` daqui — nunca do mock diretamente.
 * Hoje `api` é a implementação mock. Amanhã, basta criar
 * `services/supabase/supabaseApi.ts` implementando a MESMA interface `DataApi`
 * (as assinaturas abaixo) e trocar a linha do export. Zero alteração no resto
 * do código.
 *
 * Exemplo futuro:
 *   import { supabaseApi } from './supabase/supabaseApi';
 *   export const api: DataApi = supabaseApi;
 */

import { mockApi, type MockApi } from './mock/mockData';

/**
 * A interface que qualquer backend (mock ou Supabase) precisa satisfazer.
 * Derivada da API mock para manter as duas em sincronia por construção.
 */
export type DataApi = MockApi;

export const api: DataApi = mockApi;
