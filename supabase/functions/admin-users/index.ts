import { createClient } from "npm:@supabase/supabase-js@2.110.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Metodo nao permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json({ error: "Configuracao ou autenticacao ausente." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const token = authorization.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authData.user) return json({ error: "Sessao invalida." }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("perfis")
    .select("id, perfil, ativo")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError || callerProfile?.perfil !== "gestor" || !callerProfile.ativo) {
    return json({ error: "Acesso restrito a gestor ativo." }, 403);
  }

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Corpo JSON invalido." }, 400);
  }

  const action = String(input.action || "");

  if (action === "list") {
    const { data: usersData, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return json({ error: usersError.message }, 400);

    const { data: profiles, error: profilesError } = await adminClient
      .from("perfis")
      .select("id, nome, perfil, ativo, id_colaborador, updated_at");
    if (profilesError) return json({ error: profilesError.message }, 400);

    const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return json({
      users: usersData.users.map((user) => ({
        id: user.id,
        email: user.email || "",
        emailConfirmedAt: user.email_confirmed_at || null,
        lastSignInAt: user.last_sign_in_at || null,
        createdAt: user.created_at,
        bannedUntil: user.banned_until || null,
        profile: profileById.get(user.id) || null
      }))
    });
  }

  if (action === "create") {
    const email = String(input.email || "").trim().toLowerCase();
    const password = String(input.password || "");
    const nome = String(input.nome || "").trim();
    const perfil = input.perfil === "gestor" ? "gestor" : "tecnico";
    const idColaborador = input.idColaborador ? Number(input.idColaborador) : null;

    if (!email || password.length < 8 || !nome) {
      return json({ error: "Informe nome, email e senha temporaria com ao menos 8 caracteres." }, 400);
    }

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    });
    if (error || !data.user) return json({ error: error?.message || "Usuario nao criado." }, 400);

    const { error: upsertError } = await adminClient.from("perfis").upsert({
      id: data.user.id,
      nome,
      perfil,
      ativo: true,
      id_colaborador: idColaborador
    });
    if (upsertError) {
      await adminClient.auth.admin.deleteUser(data.user.id);
      return json({ error: upsertError.message }, 400);
    }
    return json({ ok: true, id: data.user.id }, 201);
  }

  const userId = String(input.userId || "");
  if (!userId) return json({ error: "Usuario nao informado." }, 400);

  if (action === "update_access") {
    const perfil = input.perfil === "gestor" ? "gestor" : "tecnico";
    const ativo = input.ativo === true;
    const nome = String(input.nome || "").trim();
    const idColaborador = input.idColaborador ? Number(input.idColaborador) : null;

    if (userId === authData.user.id && (!ativo || perfil !== "gestor")) {
      return json({ error: "O gestor nao pode desativar ou rebaixar a propria conta." }, 400);
    }

    const { error: updateError } = await adminClient
      .from("perfis")
      .update({ nome, perfil, ativo, id_colaborador: idColaborador })
      .eq("id", userId);
    if (updateError) return json({ error: updateError.message }, 400);

    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: ativo ? "none" : "876000h"
    });
    if (banError) return json({ error: banError.message }, 400);
    return json({ ok: true });
  }

  if (action === "set_password") {
    const password = String(input.password || "");
    if (password.length < 8) return json({ error: "A senha deve ter ao menos 8 caracteres." }, 400);
    const { error } = await adminClient.auth.admin.updateUserById(userId, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "update_email") {
    const email = String(input.email || "").trim().toLowerCase();
    if (!email) return json({ error: "Email invalido." }, 400);
    const { error } = await adminClient.auth.admin.updateUserById(userId, { email, email_confirm: true });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Acao desconhecida." }, 400);
});
