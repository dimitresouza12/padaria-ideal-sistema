/**
 * Cliente único do Supabase.
 *
 * As credenciais vêm de variáveis de ambiente Vite (VITE_*), definidas em
 * `.env.local` (não versionado). Ver `.env.example` para o template.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local ' +
      '(veja .env.example).',
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    // O login do protótipo é próprio (tabela `credenciais`), não usa o Auth do
    // Supabase — então não persistimos nem renovamos sessão dele.
    persistSession: false,
    autoRefreshToken: false,
  },
});
