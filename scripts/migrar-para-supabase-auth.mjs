/**
 * Migração one-off: cria um usuário no Supabase Auth (auth.users) para cada
 * linha existente em public.usuarios, e liga as duas tabelas via a nova
 * coluna usuarios.auth_user_id.
 *
 * Por que rodar isso localmente, e não como uma migration do Postgres: criar
 * usuários no Auth exige a Admin API do Supabase, que só funciona com a
 * `service_role` key — uma chave que nunca deve passar por um assistente de
 * IA, por MCP, nem ser commitada no repositório. Rode este script você
 * mesmo, na sua máquina.
 *
 * Como rodar:
 *   1. Painel do Supabase → Project Settings → API → copie a "service_role" key
 *      (NÃO é a mesma que VITE_SUPABASE_ANON_KEY do .env.local).
 *   2. No terminal, na raiz do projeto:
 *        SUPABASE_SERVICE_ROLE_KEY="cole-a-chave-aqui" node scripts/migrar-para-supabase-auth.mjs
 *      (a chave só fica na variável de ambiente da sua sessão de terminal —
 *      não escreva ela em nenhum arquivo do repositório)
 *
 * O script é idempotente: só processa usuários com auth_user_id ainda nulo,
 * então pode ser rodado de novo com segurança se cair no meio.
 *
 * Ao final, imprime a senha provisória gerada para cada funcionário — anote
 * e repasse para cada um trocar em "Configurações → Minha Conta" no primeiro
 * acesso. Essa lista NÃO é salva em nenhum arquivo.
 */
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? 'https://audtpilnovrzwszeubkz.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    'Faltou a variável SUPABASE_SERVICE_ROLE_KEY. Veja o cabeçalho deste arquivo para como rodar.',
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function gerarSenhaTemporaria() {
  return randomBytes(9).toString('base64url'); // 12 chars, url-safe
}

async function buscarAuthUserPorEmail(email) {
  // A Admin API não tem "getUserByEmail" direto no SDK JS; varre listUsers.
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const achado = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (achado) return achado;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const { data: usuarios, error: errUsuarios } = await admin
    .from('usuarios')
    .select('id, nome, email, auth_user_id')
    .is('auth_user_id', null);
  if (errUsuarios) throw errUsuarios;

  if (usuarios.length === 0) {
    console.log('Nenhum usuário pendente — todos já têm auth_user_id. Nada a fazer.');
    return;
  }

  console.log(`Migrando ${usuarios.length} usuário(s)...\n`);
  const senhasGeradas = [];

  for (const u of usuarios) {
    let authUser;
    const senhaTemporaria = gerarSenhaTemporaria();
    const { data: criado, error: errCriar } = await admin.auth.admin.createUser({
      email: u.email,
      password: senhaTemporaria,
      email_confirm: true,
    });

    if (errCriar) {
      if (errCriar.message?.toLowerCase().includes('already been registered')) {
        authUser = await buscarAuthUserPorEmail(u.email);
        if (!authUser) throw new Error(`E-mail ${u.email} já registrado no Auth, mas não encontrado via listUsers.`);
        console.log(`  ${u.nome} <${u.email}>: já existia no Auth, reaproveitando (sem nova senha).`);
      } else {
        throw errCriar;
      }
    } else {
      authUser = criado.user;
      senhasGeradas.push({ nome: u.nome, email: u.email, senha: senhaTemporaria });
      console.log(`  ${u.nome} <${u.email}>: criado no Auth.`);
    }

    const { error: errUpdate } = await admin
      .from('usuarios')
      .update({ auth_user_id: authUser.id })
      .eq('id', u.id);
    if (errUpdate) throw errUpdate;
  }

  const { count: totalUsuarios } = await admin.from('usuarios').select('id', { count: 'exact', head: true });
  const { data: totalAuth } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  console.log('\n--- Concluído ---');
  console.log(`usuarios: ${totalUsuarios} linha(s) · auth.users: ${totalAuth.users.length} usuário(s)`);

  if (senhasGeradas.length > 0) {
    console.log('\nSenhas provisórias geradas (anote e repasse — não ficam salvas em lugar nenhum):');
    for (const s of senhasGeradas) {
      console.log(`  ${s.nome.padEnd(24)} ${s.email.padEnd(28)} ${s.senha}`);
    }
    console.log(
      '\nCada pessoa deve trocar a própria senha em Configurações → Minha Conta no primeiro acesso.',
    );
  }
}

main().catch((err) => {
  console.error('\nFalhou:', err.message ?? err);
  process.exit(1);
});
