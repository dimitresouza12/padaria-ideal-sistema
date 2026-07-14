// Edge Function `admin-acoes` — única peça de "servidor" do projeto.
//
// Substitui as antigas RPCs criar_funcionario/aprovar_solicitacao/
// recusar_solicitacao/alterar_senha, que reconfirmavam login+senha do admin
// dentro da própria função porque a anon key não carregava identidade
// nenhuma. Agora a identidade vem do JWT do Supabase Auth: valida-se que o
// chamador é um admin ativo (via `usuarios.auth_user_id` + `perfil` +
// `ativo`) e a partir daí a ação é executada com a `service_role` key —
// necessária porque criar/alterar usuários no Auth exige a Admin API, que só
// funciona no servidor, nunca no navegador.
import { createClient } from 'npm:@supabase/supabase-js@2.110.2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// O navegador manda um preflight OPTIONS antes do POST de verdade (origem
// localhost:5173/produção != origem da função) — sem responder isso com os
// headers de CORS corretos, o supabase-js nunca chega a enviar o POST.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0].toLowerCase();
}

async function checarLoginDisponivel(admin: ReturnType<typeof createClient>, nome: string) {
  const login = primeiroNome(nome);
  const { data, error } = await admin.from('usuarios').select('nome').eq('ativo', true);
  if (error) throw new Error(error.message);
  const emUso = (data ?? []).some((u: { nome: string }) => primeiroNome(u.nome) === login);
  if (emUso) {
    throw new Error(
      `Já existe um funcionário com o login "${login}". Ajuste o nome (ex.: acrescente o sobrenome) para diferenciar.`,
    );
  }
}

async function criarFuncionario(admin: ReturnType<typeof createClient>, body: any) {
  const { nome, email, senha, taxa_comissao, meta_individual } = body;
  if (!nome?.trim() || !email?.trim() || !senha) {
    throw new Error('Nome, e-mail e senha são obrigatórios.');
  }
  await checarLoginDisponivel(admin, nome);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password: senha,
    email_confirm: true,
  });
  if (createErr) throw new Error(createErr.message);

  const { data: usuario, error: insertErr } = await admin
    .from('usuarios')
    .insert({
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      perfil: 'vendedor',
      taxa_comissao,
      meta_individual,
      ativo: true,
      auth_user_id: created.user.id,
    })
    .select('*')
    .single();
  if (insertErr) throw new Error(insertErr.message);
  return { usuario };
}

async function aprovarSolicitacao(admin: ReturnType<typeof createClient>, body: any) {
  const { id, taxa_comissao, meta_individual } = body;
  const { data: sol, error: solErr } = await admin
    .from('solicitacoes_acesso')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (solErr) throw new Error(solErr.message);
  if (!sol) throw new Error('Solicitação não encontrada');
  if (sol.status !== 'pendente') throw new Error('Solicitação já foi processada.');

  await checarLoginDisponivel(admin, sol.nome);

  // A senha que a pessoa escolheu no pedido de acesso virou um hash bcrypt
  // (solicitacoes_acesso.senha_hash) e não pode ser recuperada em texto puro
  // para virar a senha real no Supabase Auth — geramos uma nova senha
  // provisória e devolvemos ao admin para repassar.
  const senhaTemporaria = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: sol.email,
    password: senhaTemporaria,
    email_confirm: true,
  });
  if (createErr) throw new Error(createErr.message);

  const { data: usuario, error: insertErr } = await admin
    .from('usuarios')
    .insert({
      nome: sol.nome,
      email: sol.email,
      perfil: 'vendedor',
      taxa_comissao,
      meta_individual,
      ativo: true,
      auth_user_id: created.user.id,
    })
    .select('*')
    .single();
  if (insertErr) throw new Error(insertErr.message);

  await admin.from('solicitacoes_acesso').update({ status: 'aprovado' }).eq('id', id);
  return { usuario, senhaTemporaria };
}

async function recusarSolicitacao(admin: ReturnType<typeof createClient>, body: any) {
  const { id } = body;
  const { data: sol } = await admin.from('solicitacoes_acesso').select('id').eq('id', id).maybeSingle();
  if (!sol) throw new Error('Solicitação não encontrada');
  await admin.from('solicitacoes_acesso').update({ status: 'recusado' }).eq('id', id);
  return {};
}

async function alterarSenhaFuncionario(admin: ReturnType<typeof createClient>, body: any) {
  const { usuarioId, senhaNova } = body;
  if (!senhaNova || String(senhaNova).length < 4) throw new Error('Senha inválida.');
  const { data: alvo, error } = await admin
    .from('usuarios')
    .select('auth_user_id')
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!alvo?.auth_user_id) throw new Error('Funcionário não encontrado');
  const { error: updErr } = await admin.auth.admin.updateUserById(alvo.auth_user_id, { password: senhaNova });
  if (updErr) throw new Error(updErr.message);
  return {};
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json({ error: 'Não autenticado' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return json({ error: 'Sessão inválida' }, 401);

  const { data: chamador, error: chamadorErr } = await admin
    .from('usuarios')
    .select('perfil, ativo')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();
  if (chamadorErr) return json({ error: chamadorErr.message }, 500);
  if (!chamador || chamador.perfil !== 'admin' || !chamador.ativo) {
    return json({ error: 'Não autorizado' }, 403);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Corpo inválido' }, 400);
  }

  try {
    switch (body.action) {
      case 'criar_funcionario':
        return json(await criarFuncionario(admin, body));
      case 'aprovar_solicitacao':
        return json(await aprovarSolicitacao(admin, body));
      case 'recusar_solicitacao':
        return json(await recusarSolicitacao(admin, body));
      case 'alterar_senha_funcionario':
        return json(await alterarSenhaFuncionario(admin, body));
      default:
        return json({ error: 'Ação desconhecida' }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 400);
  }
});
