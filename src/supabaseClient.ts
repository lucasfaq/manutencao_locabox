import { createClient, Session } from "@supabase/supabase-js";

export type Status = "Aberta" | "Agendada" | "Em atendimento" | "Pendente" | "Concluida";
export type Prioridade = "P1" | "P2" | "P3" | "P4";

export type Unidade = {
  id: number;
  codigo: string;
  nome: string;
  cliente: string;
  contrato: string;
  projeto: string;
  municipio: string;
  status: string;
};

export type Ordem = {
  id: number;
  unidadeId: number;
  protocolo: string;
  tipo: string;
  prioridade: Prioridade;
  status: Status;
  abertura: string;
  prazoSla: string;
  responsavel: string;
  descricao: string;
  pendencias: string[];
};

export type Atendimento = {
  id: number;
  ordemId: number;
  data: string;
  equipe: string;
  status: "Executado" | "Parcial" | "Reagendado";
  relato: string;
  materiais: string[];
};

export type EstoqueItem = {
  id: number;
  item: string;
  categoria: string;
  unidade: string;
  quantidade: number;
  minimo: number;
};

export type PerfilUsuario = {
  id: string;
  nome: string;
  perfil: "tecnico" | "gestor";
  ativo: boolean;
};

export type Cliente = {
  idCliente: number;
  nome: string;
  documento: string;
  email: string;
  telefone: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type Empresa = {
  idEmpresa: number;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export type Bootstrap = {
  unidades: Unidade[];
  ordens: Ordem[];
  atendimentos: Atendimento[];
  estoque: EstoqueItem[];
  metrics: {
    unidades: number;
    ordensAbertas: number;
    slaVencidas: number;
    atendimentos: number;
    estoqueBaixo: number;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

export type { Session };

function getSlaTone(ordem: Ordem) {
  if (ordem.status === "Concluida") return "ok";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${ordem.prazoSla}T00:00:00`);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "danger";
  if (diff <= 2) return "warn";
  return "ok";
}

export function metricsFor(nextData: Omit<Bootstrap, "metrics">) {
  const abertas = nextData.ordens.filter((ordem) => ordem.status !== "Concluida");
  return {
    unidades: nextData.unidades.length,
    ordensAbertas: abertas.length,
    slaVencidas: abertas.filter((ordem) => getSlaTone(ordem) === "danger").length,
    atendimentos: nextData.atendimentos.length,
    estoqueBaixo: nextData.estoque.filter((item) => item.quantidade <= item.minimo).length
  };
}

export function withMetrics(nextData: Omit<Bootstrap, "metrics">): Bootstrap {
  return { ...nextData, metrics: metricsFor(nextData) };
}

function mapOrdem(row: any): Ordem {
  return {
    id: Number(row.id),
    unidadeId: Number(row.unidade_id),
    protocolo: row.protocolo,
    tipo: row.tipo,
    prioridade: row.prioridade,
    status: row.status,
    abertura: row.abertura,
    prazoSla: row.prazo_sla,
    responsavel: row.responsavel,
    descricao: row.descricao,
    pendencias: (row.pendencias_ordem || []).map((item: any) => item.descricao)
  };
}

function parseLines(value: unknown) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function requireSupabase() {
  if (!supabase) throw new Error("Supabase nao configurado");
  return supabase;
}

export async function getCurrentSession() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export async function loadPerfil(): Promise<PerfilUsuario | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("perfis")
    .select("id, nome, perfil, ativo")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    nome: data.nome,
    perfil: data.perfil,
    ativo: data.ativo
  };
}

function mapCliente(row: any): Cliente {
  return {
    idCliente: Number(row.id_cliente),
    nome: row.nome,
    documento: row.documento || "",
    email: row.email || "",
    telefone: row.telefone || "",
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

export async function loadSupabaseClientes(): Promise<Cliente[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("clientes")
    .select("id_cliente, nome, documento, email, telefone, ativo, criado_em, atualizado_em")
    .order("ativo", { ascending: false })
    .order("nome");

  if (error) throw error;
  return (data || []).map(mapCliente);
}

function clientePayload(payload: Record<string, FormDataEntryValue>) {
  return {
    nome: String(payload.nome || "").trim(),
    documento: String(payload.documento || "").trim() || null,
    email: String(payload.email || "").trim() || null,
    telefone: String(payload.telefone || "").trim() || null,
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseCliente(payload: Record<string, FormDataEntryValue>): Promise<Cliente> {
  const client = requireSupabase();
  const row = clientePayload(payload);
  const { data, error } = await client
    .from("clientes")
    .insert(row)
    .select("id_cliente, nome, documento, email, telefone, ativo, criado_em, atualizado_em")
    .single();

  if (error) throw error;
  return mapCliente(data);
}

export async function updateSupabaseCliente(idCliente: number, payload: Record<string, FormDataEntryValue>): Promise<Cliente> {
  const client = requireSupabase();
  const row = clientePayload(payload);
  const { data, error } = await client
    .from("clientes")
    .update(row)
    .eq("id_cliente", idCliente)
    .select("id_cliente, nome, documento, email, telefone, ativo, criado_em, atualizado_em")
    .single();

  if (error) throw error;
  return mapCliente(data);
}

export async function setSupabaseClienteAtivo(idCliente: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("clientes")
    .update({ ativo })
    .eq("id_cliente", idCliente);

  if (error) throw error;
}

function mapEmpresa(row: any): Empresa {
  return {
    idEmpresa: Number(row.id_empresa),
    razaoSocial: row.razao_social,
    nomeFantasia: row.nome_fantasia || "",
    cnpj: row.cnpj,
    ativo: Boolean(row.ativo),
    criadoEm: row.criado_em,
    atualizadoEm: row.atualizado_em
  };
}

const empresaFields = "id_empresa, razao_social, nome_fantasia, cnpj, ativo, criado_em, atualizado_em";

export async function loadSupabaseEmpresas(): Promise<Empresa[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("empresas")
    .select(empresaFields)
    .order("ativo", { ascending: false })
    .order("razao_social");

  if (error) throw error;
  return (data || []).map(mapEmpresa);
}

function empresaPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    razao_social: String(payload.razaoSocial || "").trim(),
    nome_fantasia: String(payload.nomeFantasia || "").trim() || null,
    cnpj: String(payload.cnpj || "").trim(),
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseEmpresa(payload: Record<string, FormDataEntryValue>): Promise<Empresa> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("empresas")
    .insert(empresaPayload(payload))
    .select(empresaFields)
    .single();

  if (error) throw error;
  return mapEmpresa(data);
}

export async function updateSupabaseEmpresa(idEmpresa: number, payload: Record<string, FormDataEntryValue>): Promise<Empresa> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("empresas")
    .update(empresaPayload(payload))
    .eq("id_empresa", idEmpresa)
    .select(empresaFields)
    .single();

  if (error) throw error;
  return mapEmpresa(data);
}

export async function setSupabaseEmpresaAtivo(idEmpresa: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from("empresas")
    .update({ ativo })
    .eq("id_empresa", idEmpresa);

  if (error) throw error;
}

export async function loadSupabaseBootstrap(): Promise<Bootstrap> {
  const client = requireSupabase();
  const [unidadesResult, ordensResult, atendimentosResult, estoqueResult] = await Promise.all([
    client.from("unidades").select("*").order("nome"),
    client.from("ordens").select("*, pendencias_ordem(descricao)").order("id", { ascending: false }),
    client.from("atendimentos").select("*, atendimento_materiais(descricao)").order("id", { ascending: false }),
    client.from("estoque").select("*").order("item")
  ]);

  if (unidadesResult.error) throw unidadesResult.error;
  if (ordensResult.error) throw ordensResult.error;
  if (atendimentosResult.error) throw atendimentosResult.error;
  if (estoqueResult.error) throw estoqueResult.error;

  return withMetrics({
    unidades: (unidadesResult.data || []).map((row: any) => ({
      id: Number(row.id),
      codigo: row.codigo,
      nome: row.nome,
      cliente: row.cliente,
      contrato: row.contrato,
      projeto: row.projeto,
      municipio: row.municipio,
      status: row.status
    })),
    ordens: (ordensResult.data || []).map(mapOrdem),
    atendimentos: (atendimentosResult.data || []).map((row: any) => ({
      id: Number(row.id),
      ordemId: Number(row.ordem_id),
      data: row.data,
      equipe: row.equipe,
      status: row.status,
      relato: row.relato,
      materiais: (row.atendimento_materiais || []).map((item: any) => item.descricao)
    })),
    estoque: (estoqueResult.data || []).map((row: any) => ({
      id: Number(row.id),
      item: row.item,
      categoria: row.categoria,
      unidade: row.unidade,
      quantidade: Number(row.quantidade),
      minimo: Number(row.minimo)
    }))
  });
}

export async function createSupabaseOrdem(payload: Record<string, FormDataEntryValue>): Promise<Ordem> {
  const client = requireSupabase();
  const { count, error: countError } = await client.from("ordens").select("id", { count: "exact", head: true });
  if (countError) throw countError;
  const sequence = Number(count || 0) + 1;
  const row = {
    unidade_id: Number(payload.unidadeId),
    protocolo: `OS-${new Date().getFullYear()}-${String(sequence).padStart(4, "0")}`,
    tipo: String(payload.tipo || "Corretiva"),
    prioridade: String(payload.prioridade || "P3"),
    status: "Aberta",
    abertura: new Date().toISOString().slice(0, 10),
    prazo_sla: String(payload.prazoSla),
    responsavel: String(payload.responsavel || "A definir"),
    descricao: String(payload.descricao || "")
  };
  const { data, error } = await client.from("ordens").insert(row).select("*").single();
  if (error) throw error;

  const pendencias = parseLines(payload.pendencias);
  if (pendencias.length) {
    const { error: pendenciaError } = await client.from("pendencias_ordem").insert(
      pendencias.map((descricao) => ({ ordem_id: data.id, descricao }))
    );
    if (pendenciaError) throw pendenciaError;
  }

  return mapOrdem({ ...data, pendencias_ordem: pendencias.map((descricao) => ({ descricao })) });
}

export async function createSupabaseAtendimento(payload: Record<string, FormDataEntryValue>): Promise<Atendimento> {
  const client = requireSupabase();
  const row = {
    ordem_id: Number(payload.ordemId),
    data: String(payload.data || new Date().toISOString().slice(0, 10)),
    equipe: String(payload.equipe || "Equipe interna"),
    status: String(payload.status || "Executado"),
    relato: String(payload.relato || "")
  };
  const { data, error } = await client.from("atendimentos").insert(row).select("*").single();
  if (error) throw error;

  const materiais = parseLines(payload.materiais);
  if (materiais.length) {
    const { error: materialError } = await client.from("atendimento_materiais").insert(
      materiais.map((descricao) => ({ atendimento_id: data.id, descricao }))
    );
    if (materialError) throw materialError;
  }

  const nextStatus = data.status === "Executado" ? "Concluida" : "Pendente";
  const { error: statusError } = await client.from("ordens").update({ status: nextStatus }).eq("id", data.ordem_id);
  if (statusError) throw statusError;

  return {
    id: Number(data.id),
    ordemId: Number(data.ordem_id),
    data: data.data,
    equipe: data.equipe,
    status: data.status,
    relato: data.relato,
    materiais
  };
}
