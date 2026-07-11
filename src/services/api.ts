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

import type { MockApi } from './mock/mockData';
import { supabaseApi } from './supabase/supabaseApi';

/**
 * A interface que qualquer backend (mock ou Supabase) precisa satisfazer.
 * Derivada da API mock para manter as duas em sincronia por construção — o
 * `import type` traz só o contrato, sem carregar o runtime do mock (localStorage).
 */
export type DataApi = MockApi;

// Backend ativo: Supabase (PostgreSQL). Para voltar ao mock em localStorage,
// troque por `import { mockApi } from './mock/mockData'` e `export const api = mockApi`.
export const api: DataApi = supabaseApi;
