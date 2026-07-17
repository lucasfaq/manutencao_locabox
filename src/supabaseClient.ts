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

export type Contrato = {
  idContrato: number;
  idCliente: number;
  clienteNome: string;
  idEmpresa: number;
  empresaNome: string;
  numeroContrato: string;
  objeto: string;
  statusCodigo: string;
  dataInicio: string;
  dataFim: string;
  valorTotal: number | null;
  ativo: boolean;
};

export type StatusCatalogo = {
  codigo: string;
  descricao: string;
};

export type Projeto = {
  idProjeto: number;
  idContrato: number;
  contratoNumero: string;
  nome: string;
  municipio: string;
  uf: string;
  ativo: boolean;
};

export type UnidadeInstalada = {
  idUnidade: number;
  idProjeto: number;
  projetoNome: string;
  codigo: string;
  nome: string;
  estado: string;
  cidade: string;
  bairro: string;
  rua: string;
  googleMapsUrl: string;
  statusCodigo: string;
  ativo: boolean;
};

export type Colaborador = {
  idColaborador: number;
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  ativo: boolean;
};

export type Terceirizado = {
  idTerceira: number;
  nome: string;
  empresa: string;
  documento: string;
  telefone: string;
  ativo: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  createdAt: string;
  bannedUntil: string | null;
  profile: {
    id: string;
    nome: string;
    perfil: "tecnico" | "gestor";
    ativo: boolean;
    id_colaborador: number | null;
    updated_at: string;
  } | null;
};

export type MaterialEstoque = {
  idMaterial: number;
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeMedida: string;
  estoqueMinimo: number;
  estoqueAtual: number;
  nivelServico: number | null;
  janelaHistoricaDias: number | null;
  leadTimeDias: number | null;
  desvioLeadTimeDias: number | null;
  periodoRevisaoDias: number | null;
  loteMinimo: number;
  multiploCompra: number;
  critico: boolean;
  ativo: boolean;
};

export type EstoqueConfiguracao = {
  nivelServico: number;
  janelaHistoricaDias: number;
  leadTimeDias: number;
  desvioLeadTimeDias: number;
  periodoRevisaoDias: number;
  minimoObservacoes: number;
};

export type EstoquePlanejamento = {
  idMaterial: number;
  codigo: string;
  descricao: string;
  categoria: string;
  unidadeMedida: string;
  estoqueAtual: number;
  critico: boolean;
  nivelServico: number;
  fatorServico: number;
  janelaHistoricaDias: number;
  leadTimeDias: number;
  diasComConsumo: number;
  consumoPeriodo: number;
  demandaMedia: number;
  desvioDemanda: number;
  estoqueSeguranca: number;
  pontoRessuprimento: number;
  estoqueAlvo: number;
  coberturaDias: number | null;
  sugestaoCompra: number;
  situacao: "sem_historico" | "ruptura" | "comprar" | "atencao" | "normal";
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

function mapContrato(row: any): Contrato {
  return {
    idContrato: Number(row.id_contrato),
    idCliente: Number(row.id_cliente),
    clienteNome: row.clientes?.nome || "",
    idEmpresa: Number(row.id_empresa),
    empresaNome: row.empresas?.nome_fantasia || row.empresas?.razao_social || "",
    numeroContrato: row.numero_contrato,
    objeto: row.objeto || "",
    statusCodigo: row.status_codigo,
    dataInicio: row.data_inicio || "",
    dataFim: row.data_fim || "",
    valorTotal: row.valor_total === null ? null : Number(row.valor_total),
    ativo: Boolean(row.ativo)
  };
}

const contratoFields = "id_contrato, id_cliente, id_empresa, numero_contrato, objeto, status_codigo, data_inicio, data_fim, valor_total, ativo, clientes(nome), empresas(razao_social, nome_fantasia)";

export async function loadSupabaseContratos(): Promise<Contrato[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("contratos")
    .select(contratoFields)
    .order("ativo", { ascending: false })
    .order("numero_contrato");

  if (error) throw error;
  return (data || []).map(mapContrato);
}

export async function loadStatusContratos(): Promise<StatusCatalogo[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("status_contrato").select("codigo, descricao").order("ordem");
  if (error) throw error;
  return data || [];
}

function contratoPayload(payload: Record<string, FormDataEntryValue>) {
  const valor = String(payload.valorTotal || "").trim();
  return {
    id_cliente: Number(payload.idCliente),
    id_empresa: Number(payload.idEmpresa),
    numero_contrato: String(payload.numeroContrato || "").trim(),
    objeto: String(payload.objeto || "").trim(),
    status_codigo: String(payload.statusCodigo || "ativo"),
    data_inicio: String(payload.dataInicio || "").trim() || null,
    data_fim: String(payload.dataFim || "").trim() || null,
    valor_total: valor ? Number(valor) : null,
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseContrato(payload: Record<string, FormDataEntryValue>): Promise<Contrato> {
  const client = requireSupabase();
  const { data, error } = await client.from("contratos").insert(contratoPayload(payload)).select(contratoFields).single();
  if (error) throw error;
  return mapContrato(data);
}

export async function updateSupabaseContrato(idContrato: number, payload: Record<string, FormDataEntryValue>): Promise<Contrato> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("contratos")
    .update(contratoPayload(payload))
    .eq("id_contrato", idContrato)
    .select(contratoFields)
    .single();
  if (error) throw error;
  return mapContrato(data);
}

export async function setSupabaseContratoAtivo(idContrato: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("contratos").update({ ativo }).eq("id_contrato", idContrato);
  if (error) throw error;
}

const projetoFields = "id_projeto, id_contrato, nome, municipio, uf, ativo, contratos(numero_contrato)";

function mapProjeto(row: any): Projeto {
  return {
    idProjeto: Number(row.id_projeto),
    idContrato: Number(row.id_contrato),
    contratoNumero: row.contratos?.numero_contrato || "",
    nome: row.nome,
    municipio: row.municipio || "",
    uf: row.uf || "",
    ativo: Boolean(row.ativo)
  };
}

export async function loadSupabaseProjetos(): Promise<Projeto[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("projetos").select(projetoFields).order("ativo", { ascending: false }).order("nome");
  if (error) throw error;
  return (data || []).map(mapProjeto);
}

function projetoPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    id_contrato: Number(payload.idContrato),
    nome: String(payload.nome || "").trim(),
    municipio: String(payload.municipio || "").trim(),
    uf: String(payload.uf || "").trim().toUpperCase(),
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseProjeto(payload: Record<string, FormDataEntryValue>): Promise<Projeto> {
  const client = requireSupabase();
  const { data, error } = await client.from("projetos").insert(projetoPayload(payload)).select(projetoFields).single();
  if (error) throw error;
  return mapProjeto(data);
}

export async function updateSupabaseProjeto(idProjeto: number, payload: Record<string, FormDataEntryValue>): Promise<Projeto> {
  const client = requireSupabase();
  const { data, error } = await client.from("projetos").update(projetoPayload(payload)).eq("id_projeto", idProjeto).select(projetoFields).single();
  if (error) throw error;
  return mapProjeto(data);
}

export async function setSupabaseProjetoAtivo(idProjeto: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("projetos").update({ ativo }).eq("id_projeto", idProjeto);
  if (error) throw error;
}

const unidadeInstaladaFields = "id_unidade, id_projeto, codigo, nome, estado, cidade, bairro, rua, google_maps_url, status_codigo, ativo, projetos(nome)";

function mapUnidadeInstalada(row: any): UnidadeInstalada {
  return {
    idUnidade: Number(row.id_unidade),
    idProjeto: Number(row.id_projeto),
    projetoNome: row.projetos?.nome || "",
    codigo: row.codigo,
    nome: row.nome,
    estado: row.estado || "",
    cidade: row.cidade || "",
    bairro: row.bairro || "",
    rua: row.rua || "",
    googleMapsUrl: row.google_maps_url || "",
    statusCodigo: row.status_codigo,
    ativo: Boolean(row.ativo)
  };
}

export async function loadSupabaseUnidadesInstaladas(): Promise<UnidadeInstalada[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("unidades_instaladas")
    .select(unidadeInstaladaFields)
    .order("ativo", { ascending: false })
    .order("nome");
  if (error) throw error;
  return (data || []).map(mapUnidadeInstalada);
}

export async function loadStatusUnidades(): Promise<StatusCatalogo[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("status_unidade").select("codigo, descricao").order("ordem");
  if (error) throw error;
  return data || [];
}

function unidadeInstaladaPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    id_projeto: Number(payload.idProjeto),
    codigo: String(payload.codigo || "").trim(),
    nome: String(payload.nome || "").trim(),
    estado: String(payload.estado || "").trim(),
    cidade: String(payload.cidade || "").trim(),
    bairro: String(payload.bairro || "").trim(),
    rua: String(payload.rua || "").trim(),
    google_maps_url: String(payload.googleMapsUrl || "").trim(),
    status_codigo: String(payload.statusCodigo || "instalada"),
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseUnidadeInstalada(payload: Record<string, FormDataEntryValue>): Promise<UnidadeInstalada> {
  const client = requireSupabase();
  const { data, error } = await client.from("unidades_instaladas").insert(unidadeInstaladaPayload(payload)).select(unidadeInstaladaFields).single();
  if (error) throw error;
  return mapUnidadeInstalada(data);
}

export async function updateSupabaseUnidadeInstalada(idUnidade: number, payload: Record<string, FormDataEntryValue>): Promise<UnidadeInstalada> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("unidades_instaladas")
    .update(unidadeInstaladaPayload(payload))
    .eq("id_unidade", idUnidade)
    .select(unidadeInstaladaFields)
    .single();
  if (error) throw error;
  return mapUnidadeInstalada(data);
}

export async function setSupabaseUnidadeInstaladaAtiva(idUnidade: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("unidades_instaladas").update({ ativo }).eq("id_unidade", idUnidade);
  if (error) throw error;
}

const colaboradorFields = "id_colaborador, nome, cargo, email, telefone, ativo";
const terceirizadoFields = "id_terceira, nome, empresa, documento, telefone, ativo";

function mapColaborador(row: any): Colaborador {
  return {
    idColaborador: Number(row.id_colaborador),
    nome: row.nome,
    cargo: row.cargo || "",
    email: row.email || "",
    telefone: row.telefone || "",
    ativo: Boolean(row.ativo)
  };
}

function mapTerceirizado(row: any): Terceirizado {
  return {
    idTerceira: Number(row.id_terceira),
    nome: row.nome,
    empresa: row.empresa || "",
    documento: row.documento || "",
    telefone: row.telefone || "",
    ativo: Boolean(row.ativo)
  };
}

export async function loadSupabaseColaboradores(): Promise<Colaborador[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("colaboradores").select(colaboradorFields).order("ativo", { ascending: false }).order("nome");
  if (error) throw error;
  return (data || []).map(mapColaborador);
}

export async function loadSupabaseTerceirizados(): Promise<Terceirizado[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("terceirizados").select(terceirizadoFields).order("ativo", { ascending: false }).order("nome");
  if (error) throw error;
  return (data || []).map(mapTerceirizado);
}

function colaboradorPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    nome: String(payload.nome || "").trim(),
    cargo: String(payload.cargo || "").trim() || null,
    email: String(payload.email || "").trim() || null,
    telefone: String(payload.telefone || "").trim() || null,
    ativo: payload.ativo === "on"
  };
}

function terceirizadoPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    nome: String(payload.nome || "").trim(),
    empresa: String(payload.empresa || "").trim() || null,
    documento: String(payload.documento || "").trim() || null,
    telefone: String(payload.telefone || "").trim() || null,
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseColaborador(payload: Record<string, FormDataEntryValue>): Promise<Colaborador> {
  const client = requireSupabase();
  const { data, error } = await client.from("colaboradores").insert(colaboradorPayload(payload)).select(colaboradorFields).single();
  if (error) throw error;
  return mapColaborador(data);
}

export async function updateSupabaseColaborador(id: number, payload: Record<string, FormDataEntryValue>): Promise<Colaborador> {
  const client = requireSupabase();
  const { data, error } = await client.from("colaboradores").update(colaboradorPayload(payload)).eq("id_colaborador", id).select(colaboradorFields).single();
  if (error) throw error;
  return mapColaborador(data);
}

export async function setSupabaseColaboradorAtivo(id: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("colaboradores").update({ ativo }).eq("id_colaborador", id);
  if (error) throw error;
}

export async function createSupabaseTerceirizado(payload: Record<string, FormDataEntryValue>): Promise<Terceirizado> {
  const client = requireSupabase();
  const { data, error } = await client.from("terceirizados").insert(terceirizadoPayload(payload)).select(terceirizadoFields).single();
  if (error) throw error;
  return mapTerceirizado(data);
}

export async function updateSupabaseTerceirizado(id: number, payload: Record<string, FormDataEntryValue>): Promise<Terceirizado> {
  const client = requireSupabase();
  const { data, error } = await client.from("terceirizados").update(terceirizadoPayload(payload)).eq("id_terceira", id).select(terceirizadoFields).single();
  if (error) throw error;
  return mapTerceirizado(data);
}

export async function setSupabaseTerceirizadoAtivo(id: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("terceirizados").update({ ativo }).eq("id_terceira", id);
  if (error) throw error;
}

async function invokeAdminUsers<T>(body: Record<string, unknown>): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke("admin-users", { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
}

export async function loadAdminUsers(): Promise<AdminUser[]> {
  const data = await invokeAdminUsers<{ users: AdminUser[] }>({ action: "list" });
  return data.users;
}

export async function createAdminUser(payload: Record<string, FormDataEntryValue>): Promise<void> {
  await invokeAdminUsers({
    action: "create",
    nome: String(payload.nome || ""),
    email: String(payload.email || ""),
    password: String(payload.password || ""),
    perfil: String(payload.perfil || "tecnico"),
    idColaborador: String(payload.idColaborador || "") || null
  });
}

export async function updateAdminUser(
  user: AdminUser,
  payload: Record<string, FormDataEntryValue>
): Promise<void> {
  const nome = String(payload.nome || "");
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");

  await invokeAdminUsers({
    action: "update_access",
    userId: user.id,
    nome,
    perfil: String(payload.perfil || "tecnico"),
    ativo: payload.ativo === "on",
    idColaborador: String(payload.idColaborador || "") || null
  });

  if (email && email !== user.email.toLowerCase()) {
    await invokeAdminUsers({ action: "update_email", userId: user.id, email });
  }

  if (password) {
    await invokeAdminUsers({ action: "set_password", userId: user.id, password });
  }
}

export async function updateOwnPassword(password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw error;
}

const materialFields = "id_material, codigo, descricao, categoria, unidade_medida, estoque_minimo, estoque_atual, nivel_servico, janela_historica_dias, lead_time_dias, desvio_lead_time_dias, periodo_revisao_dias, lote_minimo, multiplo_compra, critico, ativo";

function mapMaterial(row: any): MaterialEstoque {
  return {
    idMaterial: Number(row.id_material),
    codigo: row.codigo || "",
    descricao: row.descricao,
    categoria: row.categoria || "",
    unidadeMedida: row.unidade_medida,
    estoqueMinimo: Number(row.estoque_minimo),
    estoqueAtual: Number(row.estoque_atual),
    nivelServico: row.nivel_servico == null ? null : Number(row.nivel_servico),
    janelaHistoricaDias: row.janela_historica_dias == null ? null : Number(row.janela_historica_dias),
    leadTimeDias: row.lead_time_dias == null ? null : Number(row.lead_time_dias),
    desvioLeadTimeDias: row.desvio_lead_time_dias == null ? null : Number(row.desvio_lead_time_dias),
    periodoRevisaoDias: row.periodo_revisao_dias == null ? null : Number(row.periodo_revisao_dias),
    loteMinimo: Number(row.lote_minimo),
    multiploCompra: Number(row.multiplo_compra),
    critico: Boolean(row.critico),
    ativo: Boolean(row.ativo)
  };
}

export async function loadSupabaseMateriais(): Promise<MaterialEstoque[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("estoque_materiais").select(materialFields).order("ativo", { ascending: false }).order("descricao");
  if (error) throw error;
  return (data || []).map(mapMaterial);
}

function materialPayload(payload: Record<string, FormDataEntryValue>) {
  return {
    codigo: String(payload.codigo || "").trim() || null,
    descricao: String(payload.descricao || "").trim(),
    categoria: String(payload.categoria || "").trim(),
    unidade_medida: String(payload.unidadeMedida || "un").trim(),
    estoque_minimo: Number(payload.estoqueMinimo || 0),
    nivel_servico: payload.nivelServico ? Number(payload.nivelServico) / 100 : null,
    janela_historica_dias: payload.janelaHistoricaDias ? Number(payload.janelaHistoricaDias) : null,
    lead_time_dias: payload.leadTimeDias ? Number(payload.leadTimeDias) : null,
    desvio_lead_time_dias: payload.desvioLeadTimeDias ? Number(payload.desvioLeadTimeDias) : null,
    periodo_revisao_dias: payload.periodoRevisaoDias ? Number(payload.periodoRevisaoDias) : null,
    lote_minimo: Number(payload.loteMinimo || 0),
    multiplo_compra: Number(payload.multiploCompra || 1),
    critico: payload.critico === "on",
    ativo: payload.ativo === "on"
  };
}

export async function createSupabaseMaterial(payload: Record<string, FormDataEntryValue>): Promise<MaterialEstoque> {
  const client = requireSupabase();
  const { data, error } = await client.from("estoque_materiais").insert(materialPayload(payload)).select(materialFields).single();
  if (error) throw error;
  return mapMaterial(data);
}

export async function updateSupabaseMaterial(id: number, payload: Record<string, FormDataEntryValue>): Promise<MaterialEstoque> {
  const client = requireSupabase();
  const { data, error } = await client.from("estoque_materiais").update(materialPayload(payload)).eq("id_material", id).select(materialFields).single();
  if (error) throw error;
  return mapMaterial(data);
}

export async function setSupabaseMaterialAtivo(id: number, ativo: boolean): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("estoque_materiais").update({ ativo }).eq("id_material", id);
  if (error) throw error;
}

export async function loadEstoqueConfiguracao(): Promise<EstoqueConfiguracao> {
  const client = requireSupabase();
  const { data, error } = await client.from("estoque_configuracoes").select("*").eq("id_configuracao", 1).single();
  if (error) throw error;
  return {
    nivelServico: Number(data.nivel_servico),
    janelaHistoricaDias: Number(data.janela_historica_dias),
    leadTimeDias: Number(data.lead_time_dias),
    desvioLeadTimeDias: Number(data.desvio_lead_time_dias),
    periodoRevisaoDias: Number(data.periodo_revisao_dias),
    minimoObservacoes: Number(data.minimo_observacoes)
  };
}

export async function updateEstoqueConfiguracao(payload: Record<string, FormDataEntryValue>): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from("estoque_configuracoes").update({
    nivel_servico: Number(payload.nivelServico) / 100,
    janela_historica_dias: Number(payload.janelaHistoricaDias),
    lead_time_dias: Number(payload.leadTimeDias),
    desvio_lead_time_dias: Number(payload.desvioLeadTimeDias),
    periodo_revisao_dias: Number(payload.periodoRevisaoDias),
    minimo_observacoes: Number(payload.minimoObservacoes),
    atualizado_em: new Date().toISOString()
  }).eq("id_configuracao", 1);
  if (error) throw error;
}

export async function loadEstoquePlanejamento(): Promise<EstoquePlanejamento[]> {
  const client = requireSupabase();
  const { data, error } = await client.from("vw_estoque_planejamento").select("*").order("situacao").order("descricao");
  if (error) throw error;
  return (data || []).map((row: any) => ({
    idMaterial: Number(row.id_material),
    codigo: row.codigo || "",
    descricao: row.descricao,
    categoria: row.categoria || "",
    unidadeMedida: row.unidade_medida,
    estoqueAtual: Number(row.estoque_atual),
    critico: Boolean(row.critico),
    nivelServico: Number(row.nivel_servico),
    fatorServico: Number(row.fator_servico),
    janelaHistoricaDias: Number(row.janela_historica_dias),
    leadTimeDias: Number(row.lead_time_dias),
    diasComConsumo: Number(row.dias_com_consumo),
    consumoPeriodo: Number(row.consumo_periodo),
    demandaMedia: Number(row.demanda_media),
    desvioDemanda: Number(row.desvio_demanda),
    estoqueSeguranca: Number(row.estoque_seguranca),
    pontoRessuprimento: Number(row.ponto_ressuprimento),
    estoqueAlvo: Number(row.estoque_alvo),
    coberturaDias: row.cobertura_dias == null ? null : Number(row.cobertura_dias),
    sugestaoCompra: Number(row.sugestao_compra),
    situacao: row.situacao
  }));
}

export async function createEstoqueMovimentacao(payload: Record<string, FormDataEntryValue>): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.rpc("registrar_movimentacao_estoque", {
    p_id_material: Number(payload.idMaterial),
    p_tipo_codigo: String(payload.tipoCodigo),
    p_quantidade: Number(payload.quantidade),
    p_data_movimentacao: new Date(String(payload.dataMovimentacao)).toISOString(),
    p_origem: String(payload.origem || "").trim(),
    p_observacao: String(payload.observacao || "").trim()
  });
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
