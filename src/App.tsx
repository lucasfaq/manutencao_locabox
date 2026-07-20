import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MapPin,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Power,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  Wrench
} from "lucide-react";
import L, { LatLngBoundsExpression } from "leaflet";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import {
  AdminUser,
  Atendimento,
  AtendimentoMaterialUso,
  AtendimentoMovimentacao,
  Bootstrap,
  Cliente,
  Colaborador,
  Contrato,
  createAdminUser,
  createEstoqueMovimentacao,
  createSupabaseCliente,
  createSupabaseColaborador,
  createSupabaseContrato,
  createSupabaseEmpresa,
  createSupabaseMaterial,
  createSupabaseAtendimento,
  createHistoricoUnidade,
  createSupabaseOrdem,
  createSupabasePendenciaPadrao,
  createSupabaseProjeto,
  createSupabaseTerceirizado,
  createSupabaseUnidadeInstalada,
  getCurrentSession,
  hasSupabaseConfig,
  Empresa,
  EstoqueConfiguracao,
  EstoquePlanejamento,
  loadPerfil,
  loadAdminUsers,
  loadEstoqueConfiguracao,
  loadEstoquePlanejamento,
  loadHistoricoUnidade,
  loadMapaUnidades,
  loadPendenciasPadrao,
  loadSupabaseMateriais,
  loadSupabaseClientes,
  loadSupabaseColaboradores,
  loadSupabaseContratos,
  loadSupabaseEmpresas,
  loadSupabaseProjetos,
  loadSupabaseTerceirizados,
  loadSupabaseUnidadesInstaladas,
  loadSupabaseBootstrap,
  loadStatusContratos,
  loadStatusUnidades,
  Ordem,
  HistoricoUnidadeEvento,
  MapaUnidade,
  MaterialEstoque,
  PendenciaPadrao,
  PerfilUsuario,
  Projeto,
  Session,
  StatusCatalogo,
  Terceirizado,
  setSupabaseClienteAtivo,
  setSupabaseColaboradorAtivo,
  setSupabaseContratoAtivo,
  setSupabaseEmpresaAtivo,
  setSupabaseMaterialAtivo,
  setSupabasePendenciaPadraoAtivo,
  setSupabaseProjetoAtivo,
  setSupabaseTerceirizadoAtivo,
  setSupabaseUnidadeInstaladaAtiva,
  signInWithPassword,
  signOut,
  supabase,
  resolveGoogleMapsLink,
  deleteSupabaseAtendimento,
  deleteSupabaseOrdem,
  estornarSupabaseAtendimentoMateriais,
  loadAtendimentoMovimentacoes,
  updateAdminUser,
  updateEstoqueConfiguracao,
  updateSupabaseMaterial,
  updateSupabaseCliente,
  updateSupabaseColaborador,
  updateSupabaseContrato,
  updateSupabaseEmpresa,
  updateSupabaseAtendimento,
  updateSupabaseOrdem,
  updateSupabasePendenciaPadrao,
  updateSupabaseProjeto,
  updateSupabaseTerceirizado,
  updateSupabaseUnidadeInstalada,
  updateOwnPassword,
  Unidade,
  UnidadeInstalada,
  withMetrics
} from "./supabaseClient";

type Page = "dashboard" | "clientes" | "empresas" | "contratos" | "projetos" | "pessoas" | "usuarios" | "pendencias" | "ordens" | "unidades" | "mapa" | "historico_unidade" | "atendimentos" | "estoque" | "relatorios";
type ActiveForm =
  | "cliente"
  | "empresa"
  | "contrato"
  | "projeto"
  | "colaborador"
  | "terceirizado"
  | "usuario"
  | "pendencia"
  | "ordem"
  | "unidade"
  | "atendimento"
  | "material"
  | "movimentacao"
  | "estoque-configuracao"
  | "own-password"
  | null;
type ResponsavelOption = { value: string; label: string; detail: string };

const initialData: Bootstrap = {
  unidades: [],
  ordens: [],
  atendimentos: [],
  estoque: [],
  metrics: { unidades: 0, ordensAbertas: 0, slaVencidas: 0, atendimentos: 0, atendimentosPorOs: 0, estoqueBaixo: 0 }
};

const navItems: Array<{ page: Page; label: string; icon: typeof LayoutDashboard; group: "operacao" | "consultas" | "cadastros" | "gestao" }> = [
  { page: "dashboard", label: "Painel", icon: LayoutDashboard, group: "operacao" },
  { page: "ordens", label: "OS", icon: ClipboardList, group: "operacao" },
  { page: "atendimentos", label: "Atendimentos", icon: Wrench, group: "operacao" },
  { page: "estoque", label: "Estoque", icon: Boxes, group: "operacao" },
  { page: "mapa", label: "Mapa", icon: MapPinned, group: "consultas" },
  { page: "historico_unidade", label: "Historico", icon: CalendarClock, group: "consultas" },
  { page: "relatorios", label: "Relatorios", icon: BarChart3, group: "consultas" },
  { page: "unidades", label: "Unidades", icon: MapPin, group: "cadastros" },
  { page: "clientes", label: "Clientes", icon: UserRound, group: "cadastros" },
  { page: "empresas", label: "Empresas", icon: Building2, group: "cadastros" },
  { page: "contratos", label: "Contratos", icon: ClipboardList, group: "cadastros" },
  { page: "projetos", label: "Projetos", icon: MapPin, group: "cadastros" },
  { page: "pessoas", label: "Pessoas", icon: UserRound, group: "cadastros" },
  { page: "pendencias", label: "Pendencias", icon: ClipboardList, group: "cadastros" },
  { page: "usuarios", label: "Usuarios", icon: ShieldCheck, group: "gestao" }
];

const navGroups: Array<{ id: "operacao" | "consultas" | "cadastros" | "gestao"; label: string }> = [
  { id: "operacao", label: "Operacao" },
  { id: "consultas", label: "Consultas" },
  { id: "cadastros", label: "Cadastros" },
  { id: "gestao", label: "Gestao" }
];

function findUnidade(unidades: Unidade[], ordem: Ordem) {
  return unidades.find((unidade) => unidade.id === ordem.unidadeId);
}

function getSla(ordem: Ordem) {
  if (ordem.status === "Concluida") return { label: "Concluida", tone: "ok" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${ordem.prazoSla}T00:00:00`);
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d vencida`, tone: "danger" };
  if (diff <= 2) return { label: `${diff}d restantes`, tone: "warn" };
  return { label: `${diff}d restantes`, tone: "ok" };
}

function summarizeMaterials(materiais: string[]) {
  if (!materiais.length) return "Sem material";
  if (materiais.length === 1) return materiais[0];
  return `${materiais[0]} + ${materiais.length - 1} item(ns)`;
}

function describeAttendanceBlockers(atendimentos: Atendimento[]) {
  const blocked = atendimentos.filter((atendimento) => atendimento.materiais.length > 0);
  if (!blocked.length) return "";
  return blocked
    .map((atendimento) => `#${atendimento.id}: ${atendimento.materiais.join("; ")}`)
    .join(" | ");
}

function formatMovementDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function parseLocalDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatDays(value: number | null) {
  if (value == null) return "n/d";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} dias`;
}

function formatPercent(value: number | null) {
  if (value == null) return "n/d";
  return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function StatusPill({ value }: { value: string }) {
  const tone = value === "Concluida" || value === "Executado" ? "ok" : value === "Pendente" || value === "Parcial" ? "warn" : "info";
  return <span className={`pill ${tone}`}>{value}</span>;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number | string; icon: typeof LayoutDashboard; tone?: string }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <div className="stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function App() {
  const [data, setData] = useState(initialData);
  const [page, setPage] = useState<Page>("dashboard");
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"supabase" | "api" | "static">("static");
  const [errorMessage, setErrorMessage] = useState("");
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [statusContratos, setStatusContratos] = useState<StatusCatalogo[]>([]);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [selectedProjeto, setSelectedProjeto] = useState<Projeto | null>(null);
  const [unidadesInstaladas, setUnidadesInstaladas] = useState<UnidadeInstalada[]>([]);
  const [mapaUnidades, setMapaUnidades] = useState<MapaUnidade[]>([]);
  const [selectedMapaUnidade, setSelectedMapaUnidade] = useState<MapaUnidade | null>(null);
  const [historicoUnidade, setHistoricoUnidade] = useState<HistoricoUnidadeEvento[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusUnidades, setStatusUnidades] = useState<StatusCatalogo[]>([]);
  const [selectedUnidadeInstalada, setSelectedUnidadeInstalada] = useState<UnidadeInstalada | null>(null);
  const [unitEstadoFilter, setUnitEstadoFilter] = useState("");
  const [unitCidadeFilter, setUnitCidadeFilter] = useState("");
  const [unitBairroFilter, setUnitBairroFilter] = useState("");
  const [unitRuaFilter, setUnitRuaFilter] = useState("");
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [terceirizados, setTerceirizados] = useState<Terceirizado[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [selectedTerceirizado, setSelectedTerceirizado] = useState<Terceirizado | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<AdminUser | null>(null);
  const [pendenciasPadrao, setPendenciasPadrao] = useState<PendenciaPadrao[]>([]);
  const [selectedPendenciaPadrao, setSelectedPendenciaPadrao] = useState<PendenciaPadrao | null>(null);
  const [materiais, setMateriais] = useState<MaterialEstoque[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialEstoque | null>(null);
  const [estoqueConfiguracao, setEstoqueConfiguracao] = useState<EstoqueConfiguracao | null>(null);
  const [estoquePlanejamento, setEstoquePlanejamento] = useState<EstoquePlanejamento[]>([]);
  const [selectedOrdem, setSelectedOrdem] = useState<Ordem | null>(null);
  const [selectedAtendimento, setSelectedAtendimento] = useState<Atendimento | null>(null);
  const [atendimentoMovimentacoes, setAtendimentoMovimentacoes] = useState<Record<number, AtendimentoMovimentacao[]>>({});
  const [activeForm, setActiveForm] = useState<ActiveForm>(null);

  const isGestor = perfil?.perfil === "gestor";
  const responsavelOptions = useMemo<ResponsavelOption[]>(
    () => [
      ...colaboradores
        .filter((item) => item.ativo)
        .map((item) => ({ value: `colaborador:${item.nome}`, label: item.nome, detail: item.cargo || "Colaborador" })),
      ...terceirizados
        .filter((item) => item.ativo)
        .map((item) => ({ value: `terceirizado:${item.nome}`, label: item.nome, detail: item.empresa || "Equipe terceirizada" }))
    ],
    [colaboradores, terceirizados]
  );
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isGestor || (!["clientes", "empresas", "contratos", "projetos", "pessoas", "usuarios", "pendencias", "relatorios"].includes(item.page))),
    [isGestor]
  );
  const visibleNavGroups = useMemo(
    () => navGroups
      .map((group) => ({ ...group, items: visibleNavItems.filter((item) => item.group === group.id) }))
      .filter((group) => group.items.length > 0),
    [visibleNavItems]
  );
  const pageTitle = page === "historico_unidade" ? "Historico da Unidade" : navItems.find((item) => item.page === page)?.label;
  const dashboardMetrics = useMemo(() => {
    if (!hasSupabaseConfig || !session) return data.metrics;
    return {
      ...data.metrics,
      unidades: unidadesInstaladas.length,
      estoqueBaixo: materiais.filter((item) => item.ativo && item.estoqueAtual <= item.estoqueMinimo).length
    };
  }, [data.metrics, materiais, session, unidadesInstaladas]);
  const maintenanceDashboard = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ordensAbertas = data.ordens.filter((ordem) => ordem.status !== "Concluida");
    const ordensUltimos15 = data.ordens.filter((ordem) => {
      const abertura = parseLocalDate(ordem.abertura);
      return abertura ? daysBetween(abertura, today) <= 15 : false;
    });
    const ordensAbertasMais15 = ordensAbertas.filter((ordem) => {
      const abertura = parseLocalDate(ordem.abertura);
      return abertura ? daysBetween(abertura, today) > 15 : false;
    });
    const atendimentosUltimos30 = data.atendimentos.filter((atendimento) => {
      const dataAtendimento = parseLocalDate(atendimento.data);
      return dataAtendimento ? daysBetween(dataAtendimento, today) <= 30 : false;
    });
    const atendimentoPorOrdem = new Map<number, Atendimento[]>();
    data.atendimentos.forEach((atendimento) => {
      atendimentoPorOrdem.set(atendimento.ordemId, [...(atendimentoPorOrdem.get(atendimento.ordemId) || []), atendimento]);
    });
    const mttaValues = data.ordens.flatMap((ordem) => {
      const abertura = parseLocalDate(ordem.abertura);
      const primeiroAtendimento = (atendimentoPorOrdem.get(ordem.id) || [])
        .map((atendimento) => parseLocalDate(atendimento.data))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return abertura && primeiroAtendimento ? [daysBetween(abertura, primeiroAtendimento)] : [];
    });
    const mttrValues = data.ordens.flatMap((ordem) => {
      if (ordem.status !== "Concluida") return [];
      const abertura = parseLocalDate(ordem.abertura);
      const ultimoAtendimento = (atendimentoPorOrdem.get(ordem.id) || [])
        .map((atendimento) => parseLocalDate(atendimento.data))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return abertura && ultimoAtendimento ? [daysBetween(abertura, ultimoAtendimento)] : [];
    });
    const aberturasOrdenadas = data.ordens
      .map((ordem) => parseLocalDate(ordem.abertura))
      .filter((date): date is Date => Boolean(date))
      .sort((a, b) => a.getTime() - b.getTime());
    const mtbfValues = aberturasOrdenadas.slice(1).map((date, index) => daysBetween(aberturasOrdenadas[index], date));
    const ordensComAtendimento = data.ordens.filter((ordem) => (atendimentoPorOrdem.get(ordem.id) || []).length > 0);
    const atendidasDentroPrazo = ordensComAtendimento.filter((ordem) => {
      const prazo = parseLocalDate(ordem.prazoSla);
      const primeiroAtendimento = (atendimentoPorOrdem.get(ordem.id) || [])
        .map((atendimento) => parseLocalDate(atendimento.data))
        .filter((date): date is Date => Boolean(date))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return prazo && primeiroAtendimento ? primeiroAtendimento.getTime() <= prazo.getTime() : false;
    });
    const pendencias = new Map<string, number>();
    data.ordens.forEach((ordem) => {
      const descricoes = ordem.pendenciasDetalhes.length ? ordem.pendenciasDetalhes.map((pendencia) => pendencia.descricao) : ordem.pendencias;
      descricoes.forEach((descricao) => {
        const key = descricao.trim();
        if (!key) return;
        pendencias.set(key, (pendencias.get(key) || 0) + 1);
      });
    });

    const topPendencias = [...pendencias.entries()]
      .map(([descricao, quantidade]) => ({ descricao, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade || a.descricao.localeCompare(b.descricao, "pt-BR"))
      .slice(0, 10);

    return {
      ordensAbertas: ordensAbertas.length,
      ordensUltimos15: ordensUltimos15.length,
      ordensAbertasMais15: ordensAbertasMais15.length,
      atendimentosUltimos30: atendimentosUltimos30.length,
      mtta: average(mttaValues),
      mttr: average(mttrValues),
      mtbf: average(mtbfValues),
      slaAtendidoPercentual: ordensComAtendimento.length ? (atendidasDentroPrazo.length / ordensComAtendimento.length) * 100 : null,
      topPendencias,
      topPendenciasMax: topPendencias[0]?.quantidade || 0
    };
  }, [data.atendimentos, data.ordens]);

  function closeActiveForm() {
    setActiveForm(null);
    setSelectedCliente(null);
    setSelectedEmpresa(null);
    setSelectedContrato(null);
    setSelectedProjeto(null);
    setSelectedColaborador(null);
    setSelectedTerceirizado(null);
    setSelectedUsuario(null);
    setSelectedPendenciaPadrao(null);
    setSelectedOrdem(null);
    setSelectedUnidadeInstalada(null);
    setSelectedAtendimento(null);
    setSelectedMaterial(null);
  }

  async function load() {
    setLoading(true);
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        const nextData = await loadSupabaseBootstrap();
        setData(nextData);
        setAtendimentoMovimentacoes(await loadAtendimentoMovimentacoes(nextData.atendimentos.map((atendimento) => atendimento.id)));
        setSource("supabase");
      } else {
        const response = await fetch("/api/bootstrap");
        if (!response.ok) throw new Error("API indisponivel");
        const nextData = (await response.json()) as Bootstrap;
        setData(nextData);
        setAtendimentoMovimentacoes({});
        setSource("api");
      }
    } catch (error) {
      if (hasSupabaseConfig) {
        setData(initialData);
        setAtendimentoMovimentacoes({});
        setSource("supabase");
        setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar dados do Supabase.");
        setLoading(false);
        return;
      }
      const response = await fetch(`${import.meta.env.BASE_URL}bootstrap.json`);
      const nextData = (await response.json()) as Bootstrap;
      setData(nextData);
      setAtendimentoMovimentacoes({});
      setSource("static");
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar dados dinamicos.");
    }
    setLoading(false);
  }

  async function loadClientes() {
    if (!hasSupabaseConfig || !isGestor) {
      setClientes([]);
      setSelectedCliente(null);
      return;
    }

    setClientes(await loadSupabaseClientes());
  }

  async function loadEmpresas() {
    if (!hasSupabaseConfig || !isGestor) {
      setEmpresas([]);
      setSelectedEmpresa(null);
      return;
    }

    setEmpresas(await loadSupabaseEmpresas());
  }

  async function loadContratos() {
    if (!hasSupabaseConfig || !isGestor) {
      setContratos([]);
      setStatusContratos([]);
      setSelectedContrato(null);
      return;
    }

    const [nextContratos, nextStatus] = await Promise.all([loadSupabaseContratos(), loadStatusContratos()]);
    setContratos(nextContratos);
    setStatusContratos(nextStatus);
  }

  async function loadProjetos() {
    if (!hasSupabaseConfig || !isGestor) {
      setProjetos([]);
      setSelectedProjeto(null);
      return;
    }
    setProjetos(await loadSupabaseProjetos());
  }

  async function loadUnidadesInstaladas() {
    if (!hasSupabaseConfig || !session) {
      setUnidadesInstaladas([]);
      setMapaUnidades([]);
      setStatusUnidades([]);
      setSelectedUnidadeInstalada(null);
      return;
    }
    const [nextUnidades, nextStatus, nextMapa] = await Promise.all([loadSupabaseUnidadesInstaladas(), loadStatusUnidades(), loadMapaUnidades()]);
    setUnidadesInstaladas(nextUnidades);
    setStatusUnidades(nextStatus);
    setMapaUnidades(nextMapa);
  }

  async function loadPessoas() {
    if (!hasSupabaseConfig || !session) {
      setColaboradores([]);
      setTerceirizados([]);
      setSelectedColaborador(null);
      setSelectedTerceirizado(null);
      return;
    }
    const [nextColaboradores, nextTerceirizados] = await Promise.all([loadSupabaseColaboradores(), loadSupabaseTerceirizados()]);
    setColaboradores(nextColaboradores);
    setTerceirizados(nextTerceirizados);
  }

  async function loadUsuarios() {
    if (!hasSupabaseConfig || !isGestor) {
      setUsuarios([]);
      setSelectedUsuario(null);
      return;
    }
    setUsuarios(await loadAdminUsers());
  }

  async function loadMateriais() {
    if (!hasSupabaseConfig || !session) {
      setMateriais([]);
      setSelectedMaterial(null);
      setEstoqueConfiguracao(null);
      setEstoquePlanejamento([]);
      return;
    }
    const [nextMateriais, nextConfiguracao, nextPlanejamento] = await Promise.all([
      loadSupabaseMateriais(),
      loadEstoqueConfiguracao(),
      loadEstoquePlanejamento()
    ]);
    setMateriais(nextMateriais);
    setEstoqueConfiguracao(nextConfiguracao);
    setEstoquePlanejamento(nextPlanejamento);
  }

  async function loadPendencias() {
    if (!hasSupabaseConfig || !session) {
      setPendenciasPadrao([]);
      return;
    }
    setPendenciasPadrao(await loadPendenciasPadrao(isGestor));
  }

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setAuthReady(true);
      return;
    }

    getCurrentSession()
      .then((nextSession) => setSession(nextSession))
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar sessao."))
      .finally(() => setAuthReady(true));

    const subscription = supabase?.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription?.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (hasSupabaseConfig && !session) {
      setData(initialData);
      setAtendimentoMovimentacoes({});
      setPerfil(null);
      setSource("supabase");
      setLoading(false);
      return;
    }

    load().catch((error) => {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar dados.");
      setLoading(false);
    });
  }, [authReady, session?.access_token]);

  useEffect(() => {
    if (!hasSupabaseConfig || !session) {
      setPerfil(null);
      return;
    }

    loadPerfil()
      .then((nextPerfil) => setPerfil(nextPerfil))
      .catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar perfil."));
  }, [session?.user.id]);

  useEffect(() => {
    if ((page === "clientes" || page === "empresas" || page === "contratos" || page === "projetos" || page === "pessoas" || page === "usuarios" || page === "pendencias" || page === "relatorios") && !isGestor) {
      setPage("dashboard");
    }
  }, [isGestor, page]);

  useEffect(() => {
    loadClientes().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar clientes."));
    loadEmpresas().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar empresas."));
    loadContratos().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar contratos."));
    loadProjetos().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar projetos."));
    loadUnidadesInstaladas().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar unidades instaladas."));
    loadPessoas().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar pessoas."));
    loadPendencias().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar pendencias padrao."));
    loadMateriais().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar materiais."));
  }, [isGestor, session?.access_token]);

  useEffect(() => {
    if (page !== "usuarios" || !isGestor) return;
    loadUsuarios().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar usuarios."));
  }, [page, isGestor, session?.access_token]);

  const filteredOrdens = useMemo(() => {
    const text = query.toLowerCase();
    return data.ordens.filter((ordem) => {
      const unidade = findUnidade(data.unidades, ordem);
      return [ordem.protocolo, ordem.status, ordem.prioridade, ordem.responsavel, unidade?.nome, unidade?.cliente, unidade?.municipio]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  }, [data.ordens, data.unidades, query]);

  const filteredClientes = useMemo(() => {
    const text = query.toLowerCase();
    return clientes.filter((cliente) =>
      [cliente.nome, cliente.documento, cliente.email, cliente.telefone, cliente.ativo ? "ativo" : "inativo"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [clientes, query]);

  const filteredEmpresas = useMemo(() => {
    const text = query.toLowerCase();
    return empresas.filter((empresa) =>
      [empresa.razaoSocial, empresa.nomeFantasia, empresa.cnpj, empresa.ativo ? "ativo" : "inativo"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [empresas, query]);

  const filteredContratos = useMemo(() => {
    const text = query.toLowerCase();
    return contratos.filter((contrato) =>
      [contrato.numeroContrato, contrato.clienteNome, contrato.empresaNome, contrato.objeto, contrato.statusCodigo, contrato.ativo ? "ativo" : "inativo"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [contratos, query]);

  const filteredProjetos = useMemo(() => {
    const text = query.toLowerCase();
    return projetos.filter((projeto) =>
      [projeto.nome, projeto.contratoNumero, projeto.municipio, projeto.uf, projeto.ativo ? "ativo" : "inativo"].join(" ").toLowerCase().includes(text)
    );
  }, [projetos, query]);

  const filteredUnidadesInstaladas = useMemo(() => {
    const text = query.toLowerCase();
    return unidadesInstaladas.filter((unidade) => {
      const matchesText = [
        unidade.codigo, unidade.nome, unidade.projetoNome, unidade.estado, unidade.cidade,
        unidade.bairro, unidade.rua, unidade.statusCodigo, unidade.ativo ? "ativo" : "inativo"
      ].join(" ").toLowerCase().includes(text);
      return matchesText
        && (!unitEstadoFilter || unidade.estado === unitEstadoFilter)
        && (!unitCidadeFilter || unidade.cidade === unitCidadeFilter)
        && (!unitBairroFilter || unidade.bairro === unitBairroFilter)
        && (!unitRuaFilter || unidade.rua === unitRuaFilter);
    });
  }, [unidadesInstaladas, query, unitEstadoFilter, unitCidadeFilter, unitBairroFilter, unitRuaFilter]);

  const unitFilterOptions = useMemo(() => {
    const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    const byEstado = unidadesInstaladas.filter((item) => !unitEstadoFilter || item.estado === unitEstadoFilter);
    const byCidade = byEstado.filter((item) => !unitCidadeFilter || item.cidade === unitCidadeFilter);
    const byBairro = byCidade.filter((item) => !unitBairroFilter || item.bairro === unitBairroFilter);
    return {
      estados: unique(unidadesInstaladas.map((item) => item.estado)),
      cidades: unique(byEstado.map((item) => item.cidade)),
      bairros: unique(byCidade.map((item) => item.bairro)),
      ruas: unique(byBairro.map((item) => item.rua))
    };
  }, [unidadesInstaladas, unitEstadoFilter, unitCidadeFilter, unitBairroFilter]);

  const filteredMapaUnidades = useMemo(() => {
    const text = query.toLowerCase();
    return mapaUnidades.filter((unidade) => {
      const matchesText = [
        unidade.codigo, unidade.nome, unidade.projetoNome, unidade.contratoNumero, unidade.estado, unidade.cidade,
        unidade.bairro, unidade.rua, unidade.statusCodigo, unidade.ativo ? "ativo" : "inativo"
      ].join(" ").toLowerCase().includes(text);
      return matchesText
        && (!unitEstadoFilter || unidade.estado === unitEstadoFilter)
        && (!unitCidadeFilter || unidade.cidade === unitCidadeFilter)
        && (!unitBairroFilter || unidade.bairro === unitBairroFilter)
        && (!unitRuaFilter || unidade.rua === unitRuaFilter);
    });
  }, [mapaUnidades, query, unitEstadoFilter, unitCidadeFilter, unitBairroFilter, unitRuaFilter]);

  const filteredColaboradores = useMemo(() => {
    const text = query.toLowerCase();
    return colaboradores.filter((item) => [item.nome, item.cargo, item.email, item.telefone].join(" ").toLowerCase().includes(text));
  }, [colaboradores, query]);

  const filteredTerceirizados = useMemo(() => {
    const text = query.toLowerCase();
    return terceirizados.filter((item) => [item.nome, item.empresa, item.documento, item.telefone].join(" ").toLowerCase().includes(text));
  }, [terceirizados, query]);

  const filteredUsuarios = useMemo(() => {
    const text = query.toLowerCase();
    return usuarios.filter((item) =>
      [item.email, item.profile?.nome, item.profile?.perfil, item.profile?.ativo ? "ativo" : "inativo"]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text)
    );
  }, [usuarios, query]);

  const filteredMateriais = useMemo(() => {
    const text = query.toLowerCase();
    return materiais.filter((item) => [item.codigo, item.descricao, item.categoria, item.unidadeMedida].join(" ").toLowerCase().includes(text));
  }, [materiais, query]);

  const filteredPendenciasPadrao = useMemo(() => {
    const text = query.toLowerCase();
    return pendenciasPadrao.filter((item) =>
      [item.codigo, item.descricao, item.ativo ? "ativo" : "inativo"].join(" ").toLowerCase().includes(text)
    );
  }, [pendenciasPadrao, query]);

  const filteredEstoquePlanejamento = useMemo(() => {
    const text = query.toLowerCase();
    return estoquePlanejamento.filter((item) =>
      [item.codigo, item.descricao, item.categoria, item.situacao].join(" ").toLowerCase().includes(text)
    );
  }, [estoquePlanejamento, query]);

  async function submitCliente(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    setErrorMessage("");

    try {
      if (selectedCliente) {
        await updateSupabaseCliente(selectedCliente.idCliente, payload);
      } else {
        await createSupabaseCliente(payload);
      }
      setSelectedCliente(null);
      setActiveForm(null);
      formElement.reset();
      await loadClientes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar cliente.");
    }
  }

  async function toggleClienteAtivo(cliente: Cliente) {
    const nextAtivo = !cliente.ativo;
    const action = nextAtivo ? "reativar" : "inativar";
    if (!window.confirm(`Confirmar ${action} cliente ${cliente.nome}?`)) return;

    setErrorMessage("");
    try {
      await setSupabaseClienteAtivo(cliente.idCliente, nextAtivo);
      if (selectedCliente?.idCliente === cliente.idCliente) {
        setSelectedCliente({ ...cliente, ativo: nextAtivo });
      }
      await loadClientes();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status do cliente.");
    }
  }

  async function submitEmpresa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");

    try {
      if (selectedEmpresa) {
        await updateSupabaseEmpresa(selectedEmpresa.idEmpresa, payload);
      } else {
        await createSupabaseEmpresa(payload);
      }
      setSelectedEmpresa(null);
      setActiveForm(null);
      formElement.reset();
      await loadEmpresas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar empresa.");
    }
  }

  async function toggleEmpresaAtivo(empresa: Empresa) {
    const nextAtivo = !empresa.ativo;
    const action = nextAtivo ? "reativar" : "inativar";
    if (!window.confirm(`Confirmar ${action} empresa ${empresa.nomeFantasia || empresa.razaoSocial}?`)) return;

    setErrorMessage("");
    try {
      await setSupabaseEmpresaAtivo(empresa.idEmpresa, nextAtivo);
      if (selectedEmpresa?.idEmpresa === empresa.idEmpresa) {
        setSelectedEmpresa({ ...empresa, ativo: nextAtivo });
      }
      await loadEmpresas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status da empresa.");
    }
  }

  async function submitContrato(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedContrato) await updateSupabaseContrato(selectedContrato.idContrato, payload);
      else await createSupabaseContrato(payload);
      setSelectedContrato(null);
      setActiveForm(null);
      formElement.reset();
      await loadContratos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar contrato.");
    }
  }

  async function toggleContratoAtivo(contrato: Contrato) {
    const nextAtivo = !contrato.ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} contrato ${contrato.numeroContrato}?`)) return;
    setErrorMessage("");
    try {
      await setSupabaseContratoAtivo(contrato.idContrato, nextAtivo);
      if (selectedContrato?.idContrato === contrato.idContrato) setSelectedContrato({ ...contrato, ativo: nextAtivo });
      await loadContratos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status do contrato.");
    }
  }

  async function submitProjeto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedProjeto) await updateSupabaseProjeto(selectedProjeto.idProjeto, payload);
      else await createSupabaseProjeto(payload);
      setSelectedProjeto(null);
      setActiveForm(null);
      formElement.reset();
      await loadProjetos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar projeto.");
    }
  }

  async function toggleProjetoAtivo(projeto: Projeto) {
    const nextAtivo = !projeto.ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} projeto ${projeto.nome}?`)) return;
    setErrorMessage("");
    try {
      await setSupabaseProjetoAtivo(projeto.idProjeto, nextAtivo);
      if (selectedProjeto?.idProjeto === projeto.idProjeto) setSelectedProjeto({ ...projeto, ativo: nextAtivo });
      await loadProjetos();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status do projeto.");
    }
  }

  async function submitUnidadeInstalada(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      const googleMapsUrl = String(payload.googleMapsUrl || "").trim();
      if (googleMapsUrl) {
        const currentUrl = selectedUnidadeInstalada?.googleMapsUrl || "";
        const hasCoordinates = String(payload.latitude || "") && String(payload.longitude || "");
        if (!hasCoordinates || googleMapsUrl !== currentUrl) {
          const coordinates = await resolveGoogleMapsLink(googleMapsUrl);
          payload.latitude = String(coordinates.latitude);
          payload.longitude = String(coordinates.longitude);
          payload.googleMapsUrl = coordinates.resolvedUrl;
        }
      } else {
        payload.latitude = "";
        payload.longitude = "";
      }

      if (selectedUnidadeInstalada) await updateSupabaseUnidadeInstalada(selectedUnidadeInstalada.idUnidade, payload);
      else await createSupabaseUnidadeInstalada(payload);
      setSelectedUnidadeInstalada(null);
      setActiveForm(null);
      formElement.reset();
      await loadUnidadesInstaladas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar unidade instalada.");
    }
  }

  async function openHistoricoUnidade(unidade: MapaUnidade) {
    setSelectedMapaUnidade(unidade);
    setHistoricoUnidade([]);
    setHistoryLoading(true);
    setPage("historico_unidade");
    setErrorMessage("");
    try {
      setHistoricoUnidade(await loadHistoricoUnidade(unidade.idUnidade));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar historico da unidade.");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function selectHistoricoUnidade(idUnidade: number) {
    const unidade = mapaUnidades.find((item) => item.idUnidade === idUnidade);
    if (unidade) await openHistoricoUnidade(unidade);
  }

  async function toggleUnidadeInstaladaAtiva(unidade: UnidadeInstalada) {
    const nextAtivo = !unidade.ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} unidade ${unidade.nome}?`)) return;
    setErrorMessage("");
    try {
      await setSupabaseUnidadeInstaladaAtiva(unidade.idUnidade, nextAtivo);
      if (selectedUnidadeInstalada?.idUnidade === unidade.idUnidade) setSelectedUnidadeInstalada({ ...unidade, ativo: nextAtivo });
      await loadUnidadesInstaladas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status da unidade.");
    }
  }

  async function submitColaborador(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedColaborador) await updateSupabaseColaborador(selectedColaborador.idColaborador, payload);
      else await createSupabaseColaborador(payload);
      setSelectedColaborador(null);
      setActiveForm(null);
      formElement.reset();
      await loadPessoas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar colaborador.");
    }
  }

  async function submitTerceirizado(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedTerceirizado) await updateSupabaseTerceirizado(selectedTerceirizado.idTerceira, payload);
      else await createSupabaseTerceirizado(payload);
      setSelectedTerceirizado(null);
      setActiveForm(null);
      formElement.reset();
      await loadPessoas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar terceirizado.");
    }
  }

  async function togglePessoaAtiva(tipo: "colaborador" | "terceirizado", id: number, nome: string, ativo: boolean) {
    const nextAtivo = !ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} ${nome}?`)) return;
    setErrorMessage("");
    try {
      if (tipo === "colaborador") await setSupabaseColaboradorAtivo(id, nextAtivo);
      else await setSupabaseTerceirizadoAtivo(id, nextAtivo);
      await loadPessoas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status.");
    }
  }

  async function submitUsuario(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedUsuario) await updateAdminUser(selectedUsuario, payload);
      else await createAdminUser(payload);
      setSelectedUsuario(null);
      setActiveForm(null);
      formElement.reset();
      await loadUsuarios();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar usuario.");
    }
  }

  async function submitPendenciaPadrao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedPendenciaPadrao) await updateSupabasePendenciaPadrao(selectedPendenciaPadrao.idPendencia, payload);
      else await createSupabasePendenciaPadrao(payload);
      setSelectedPendenciaPadrao(null);
      setActiveForm(null);
      formElement.reset();
      await loadPendencias();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar pendencia padrao.");
    }
  }

  async function togglePendenciaPadraoAtivo(pendencia: PendenciaPadrao) {
    const nextAtivo = !pendencia.ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} pendencia ${pendencia.descricao}?`)) return;
    setErrorMessage("");
    try {
      await setSupabasePendenciaPadraoAtivo(pendencia.idPendencia, nextAtivo);
      if (selectedPendenciaPadrao?.idPendencia === pendencia.idPendencia) {
        setSelectedPendenciaPadrao({ ...pendencia, ativo: nextAtivo });
      }
      await loadPendencias();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status da pendencia.");
    }
  }

  async function submitOwnPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get("ownPassword") || "");
    setErrorMessage("");
    try {
      await updateOwnPassword(password);
      setActiveForm(null);
      formElement.reset();
      window.alert("Sua senha foi alterada.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar sua senha.");
    }
  }

  async function submitMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      if (selectedMaterial) await updateSupabaseMaterial(selectedMaterial.idMaterial, payload);
      else await createSupabaseMaterial(payload);
      setSelectedMaterial(null);
      setActiveForm(null);
      formElement.reset();
      await loadMateriais();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar material.");
    }
  }

  async function submitEstoqueConfiguracao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    setErrorMessage("");
    try {
      await updateEstoqueConfiguracao(payload);
      setActiveForm(null);
      await loadMateriais();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar parametros de estoque.");
    }
  }

  async function submitEstoqueMovimentacao(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      await createEstoqueMovimentacao(payload);
      setActiveForm(null);
      formElement.reset();
      await loadMateriais();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao registrar movimentacao.");
    }
  }

  async function toggleMaterialAtivo(material: MaterialEstoque) {
    const nextAtivo = !material.ativo;
    if (!window.confirm(`Confirmar ${nextAtivo ? "reativar" : "inativar"} material ${material.descricao}?`)) return;
    setErrorMessage("");
    try {
      await setSupabaseMaterialAtivo(material.idMaterial, nextAtivo);
      await loadMateriais();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar status do material.");
    }
  }

  async function submitOrdem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    const responsaveis = form.getAll("responsaveis")
      .map(String)
      .map((item) => item.split(":").slice(1).join(":").trim())
      .filter(Boolean);
    payload.pendenciasIds = form.getAll("pendenciasIds").map(String).join(",");
    const editingOrdem = page === "ordens" ? selectedOrdem : null;
    payload.responsavel = responsaveis.join(", ") || editingOrdem?.responsavel || "A definir";
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        if (editingOrdem) await updateSupabaseOrdem(editingOrdem.id, payload);
        else await createSupabaseOrdem(payload);
        setSelectedOrdem(null);
        setActiveForm(null);
        formElement.reset();
        await load();
        setPage("ordens");
        return;
      } else {
        const response = await fetch("/api/ordens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("API indisponivel");
      }
    } catch (error) {
      if (hasSupabaseConfig) {
        setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar OS no Supabase.");
        return;
      }
      if (editingOrdem) {
        setData((current) => withMetrics({
          ...current,
          ordens: current.ordens.map((ordem) =>
            ordem.id === editingOrdem.id
              ? {
                  ...ordem,
                  unidadeId: Number(payload.unidadeId),
                  tipo: String(payload.tipo || "Corretiva"),
                  prioridade: (payload.prioridade as Ordem["prioridade"]) || "P3",
                  status: (payload.status as Ordem["status"]) || ordem.status,
                  prazoSla: String(payload.prazoSla),
                  responsavel: String(payload.responsavel || "A definir"),
                  descricao: String(payload.descricao || "")
                }
              : ordem
          )
        }));
        setSelectedOrdem(null);
        setActiveForm(null);
        formElement.reset();
        setPage("ordens");
        return;
      }
      const id = data.ordens.length ? Math.max(...data.ordens.map((ordem) => ordem.id)) + 1 : 1;
      const ordem: Ordem = {
        id,
        unidadeId: Number(payload.unidadeId),
        protocolo: `OS-${new Date().getFullYear()}-${String(id).padStart(4, "0")}`,
        tipo: String(payload.tipo || "Corretiva"),
        prioridade: (payload.prioridade as Ordem["prioridade"]) || "P3",
        status: "Aberta",
        abertura: new Date().toISOString().slice(0, 10),
        prazoSla: String(payload.prazoSla),
        responsavel: String(payload.responsavel || "A definir"),
        descricao: String(payload.descricao || ""),
        pendencias: String(payload.pendenciasIds || "")
          .split(",")
          .map((item) => pendenciasPadrao.find((pendencia) => pendencia.idPendencia === Number(item))?.descricao)
          .filter(Boolean) as string[],
        pendenciasDetalhes: String(payload.pendenciasIds || "")
          .split(",")
          .map((item) => pendenciasPadrao.find((pendencia) => pendencia.idPendencia === Number(item)))
          .filter(Boolean)
          .map((pendencia) => ({ id: 0, descricao: pendencia!.descricao, status: "Aberta" }))
      };
      setData((current) => withMetrics({ ...current, ordens: [ordem, ...current.ordens] }));
      setActiveForm(null);
      formElement.reset();
      setPage("ordens");
      return;
    }
    formElement.reset();
    await load();
    setActiveForm(null);
    setPage("ordens");
  }

  async function deleteOrdem(ordem: Ordem) {
    const atendimentosDaOrdem = data.atendimentos.filter((atendimento) => atendimento.ordemId === ordem.id);
    const bloqueios = describeAttendanceBlockers(atendimentosDaOrdem);
    if (bloqueios) {
      setErrorMessage(`Esta OS possui atendimento com material lancado. Vinculos: ${bloqueios}. Abra Atendimentos e use o botao de estorno do atendimento antes de excluir a OS.`);
      return;
    }
    const detail = atendimentosDaOrdem.length ? ` e ${atendimentosDaOrdem.length} atendimento(s) vinculado(s)` : "";
    if (!window.confirm(`Excluir a OS ${ordem.protocolo}${detail}?`)) return;
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) await deleteSupabaseOrdem(ordem);
      setData((current) => withMetrics({
        ...current,
        ordens: current.ordens.filter((item) => item.id !== ordem.id),
        atendimentos: current.atendimentos.filter((item) => item.ordemId !== ordem.id)
      }));
      if (selectedOrdem?.id === ordem.id) setSelectedOrdem(null);
      if (selectedAtendimento?.ordemId === ordem.id) setSelectedAtendimento(null);
      if (hasSupabaseConfig) await load();
    } catch (error) {
      console.error("Falha ao excluir OS", error);
      const message = error && typeof error === "object" && "message" in error ? String((error as { message?: unknown }).message) : "";
      const detail = error && typeof error === "object" && "details" in error ? String((error as { details?: unknown }).details) : "";
      if (`${message} ${detail}`.includes("permission denied for table pendencias_ordem")) {
        setErrorMessage("Falha ao excluir OS: permissao ausente em pendencias_ordem. Aplique as migrations 20260720005500_allow_order_delete_without_stock.sql e 20260720012000_app_crud_permissions.sql no Supabase remoto.");
        return;
      }
      setErrorMessage(message || detail ? `Falha ao excluir OS: ${message || detail}` : "Falha ao excluir OS.");
    }
  }

  async function submitHistoricoUnidade(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());
    setErrorMessage("");
    try {
      await createHistoricoUnidade(payload);
      formElement.reset();
      if (selectedMapaUnidade) {
        const [nextHistorico, nextMapa] = await Promise.all([loadHistoricoUnidade(selectedMapaUnidade.idUnidade), loadMapaUnidades()]);
        setHistoricoUnidade(nextHistorico);
        setMapaUnidades(nextMapa);
        setSelectedMapaUnidade(nextMapa.find((unidade) => unidade.idUnidade === selectedMapaUnidade.idUnidade) || selectedMapaUnidade);
      }
      await loadUnidadesInstaladas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao registrar historico da unidade.");
    }
  }

  async function submitAtendimento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    const atendimentoResponsaveis = form.getAll("atendimentoResponsaveis")
      .map(String)
      .map((item) => item.split(":").slice(1).join(":").trim())
      .filter(Boolean);
    payload.equipe = atendimentoResponsaveis.join(", ") || selectedAtendimento?.equipe || "Equipe interna";
    const materialIds = form.getAll("materialId").map(String);
    const quantidades = form.getAll("materialQuantidade").map(String);
    const tiposUso = form.getAll("materialTipoUso").map(String);
    const observacoes = form.getAll("materialObservacao").map(String);
    const materiaisUso: AtendimentoMaterialUso[] = materialIds
      .map((idMaterial, index) => ({
        idMaterial: Number(idMaterial),
        quantidade: Number(quantidades[index] || 0),
        tipoUso: (tiposUso[index] || "consumo") as AtendimentoMaterialUso["tipoUso"],
        observacao: observacoes[index] || ""
      }))
      .filter((item) => item.idMaterial > 0 && item.quantidade > 0);
    payload.materiaisJson = JSON.stringify(materiaisUso);
    const pendenciaIds = form.getAll("pendenciaId").map(String);
    const pendenciaStatus = form.getAll("pendenciaStatus").map(String);
    const pendenciaObservacao = form.getAll("pendenciaObservacao").map(String);
    const pendenciasAcompanhamento = pendenciaIds
      .map((idPendencia, index) => ({
        idPendencia: Number(idPendencia),
        status: pendenciaStatus[index] || "Pendente",
        observacao: pendenciaObservacao[index] || ""
      }))
      .filter((item) => item.idPendencia > 0);
    payload.pendenciasJson = JSON.stringify(pendenciasAcompanhamento);
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        if (selectedAtendimento) await updateSupabaseAtendimento(selectedAtendimento.id, payload);
        else await createSupabaseAtendimento(payload);
        setSelectedAtendimento(null);
        setActiveForm(null);
        formElement.reset();
        await load();
        setPage("atendimentos");
        return;
      } else {
        const response = await fetch("/api/atendimentos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error("API indisponivel");
      }
    } catch (error) {
      if (hasSupabaseConfig) {
        setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar atendimento no Supabase.");
        return;
      }
      if (selectedAtendimento) {
        setData((current) => withMetrics({
          ...current,
          atendimentos: current.atendimentos.map((atendimento) =>
            atendimento.id === selectedAtendimento.id
              ? {
                  ...atendimento,
                  ordemId: Number(payload.ordemId),
                  data: String(payload.data || atendimento.data),
                  equipe: String(payload.equipe || atendimento.equipe),
                  status: (payload.status as Atendimento["status"]) || atendimento.status,
                  relato: String(payload.relato || "")
                }
              : atendimento
          )
        }));
        setSelectedAtendimento(null);
        setActiveForm(null);
        formElement.reset();
        setPage("atendimentos");
        return;
      }
      const id = data.atendimentos.length ? Math.max(...data.atendimentos.map((atendimento) => atendimento.id)) + 1 : 1;
      const atendimento: Atendimento = {
        id,
        ordemId: Number(payload.ordemId),
        data: String(payload.data || new Date().toISOString().slice(0, 10)),
        equipe: String(payload.equipe || "Equipe interna"),
        status: (payload.status as Atendimento["status"]) || "Executado",
        relato: String(payload.relato || ""),
        materiais: materiaisUso.map((item) => {
          const material = materiais.find((candidate) => candidate.idMaterial === item.idMaterial);
          return `${material?.descricao || item.idMaterial} | qtd: ${item.quantidade} | ${item.tipoUso}`;
        })
      };
      setData((current) => withMetrics({
        ...current,
        atendimentos: [atendimento, ...current.atendimentos],
        ordens: current.ordens.map((ordem) => {
          if (ordem.id !== atendimento.ordemId) return ordem;
          const pendenciasDetalhes = ordem.pendenciasDetalhes.map((pendencia) => {
            const acompanhamento = pendenciasAcompanhamento.find((item) => item.idPendencia === pendencia.id);
            return acompanhamento ? { ...pendencia, status: acompanhamento.status as typeof pendencia.status } : pendencia;
          });
          const todasConcluidas = pendenciasDetalhes.length > 0 && pendenciasDetalhes.every((pendencia) => pendencia.status === "Concluida");
          return {
            ...ordem,
            pendenciasDetalhes,
            status: todasConcluidas || (pendenciasDetalhes.length === 0 && atendimento.status === "Executado") ? "Concluida" : "Pendente"
          };
        })
      }));
      setActiveForm(null);
      formElement.reset();
      setPage("atendimentos");
      return;
    }
    formElement.reset();
    await load();
    setActiveForm(null);
    setPage("atendimentos");
  }

  async function deleteAtendimento(atendimento: Atendimento) {
    if (atendimento.materiais.length > 0) {
      setErrorMessage(`Este atendimento possui material lancado: ${atendimento.materiais.join("; ")}. Em Atendimentos, na coluna Materiais deste registro, clique em "Estornar materiais"; depois exclua o atendimento.`);
      return;
    }
    if (!window.confirm(`Excluir atendimento #${atendimento.id}?`)) return;
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) await deleteSupabaseAtendimento(atendimento);
      setData((current) => withMetrics({
        ...current,
        atendimentos: current.atendimentos.filter((item) => item.id !== atendimento.id)
      }));
      if (selectedAtendimento?.id === atendimento.id) setSelectedAtendimento(null);
      if (hasSupabaseConfig) await load();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao excluir atendimento.");
    }
  }

  async function estornarAtendimentoMateriais(atendimento: Atendimento) {
    if (!atendimento.materiais.length) return;
    const detalhe = atendimento.materiais.join("; ");
    if (!window.confirm(`Estornar materiais do atendimento #${atendimento.id}? Isso registra entrada reversa no estoque e libera a exclusao do atendimento/OS. Materiais: ${detalhe}`)) return;
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        await estornarSupabaseAtendimentoMateriais(atendimento);
        await load();
        await loadMateriais();
        return;
      }
      setData((current) => withMetrics({
        ...current,
        atendimentos: current.atendimentos.map((item) => item.id === atendimento.id ? { ...item, materiais: [] } : item)
      }));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao estornar materiais do atendimento.");
    }
  }

  async function handleSignOut() {
    setErrorMessage("");
    try {
      await signOut();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao sair.");
    }
  }

  if (hasSupabaseConfig && !authReady) {
    return <LoadingScreen />;
  }

  if (hasSupabaseConfig && !session) {
    return <AuthScreen errorMessage={errorMessage} onError={setErrorMessage} />;
  }

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Wrench size={20} />
          </div>
          <div className="brand-copy">
            <strong>Locabox</strong>
            <span>Manutencao</span>
          </div>
          <button
            className="sidebar-toggle desktop-only"
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
        <nav>
          {visibleNavGroups.map((group) => (
            <div className="nav-group" key={group.id}>
              <span>{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.page}
                    className={page === item.page ? "active" : ""}
                    title={sidebarCollapsed ? item.label : undefined}
                    onClick={() => { setPage(item.page); setMenuOpen(false); }}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="source-box">
          <span>Origem atual</span>
          <strong>{source === "supabase" ? "Supabase online" : source === "api" ? "API local" : "JSON estatico"}</strong>
          <small>{source === "supabase" ? `Sessao ${perfil?.perfil || "autenticada"}` : "Fallback sem persistencia online"}</small>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button mobile-only" title="Menu" onClick={() => setMenuOpen((value) => !value)}>
            <Menu size={20} />
          </button>
          <div>
            <h1>{pageTitle}</h1>
            <p>Controle operacional dinamico de OS, unidades, atendimentos e estoque.</p>
          </div>
          <div className="topbar-actions">
            <span className={`source-pill ${source}`}>{source === "supabase" ? "Supabase" : source === "api" ? "API local" : "Estatico"}</span>
            {hasSupabaseConfig && (
              <span className="profile-pill" title={session?.user.email || "Usuario autenticado"}>
                <ShieldCheck size={15} />
                {perfil?.perfil || "perfil"}
              </span>
            )}
            <label className="search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, unidade, cliente" />
            </label>
            <button className="icon-button" title="Atualizar" onClick={load}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            {hasSupabaseConfig && (
              <button className="icon-button" title="Sair" onClick={handleSignOut}>
                <LogOut size={18} />
              </button>
            )}
          </div>
        </header>

        {errorMessage && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {page === "dashboard" && (
          <section className="content-grid">
            <div className="stats-row">
              <StatCard label="Unidades" value={dashboardMetrics.unidades} icon={MapPin} />
              <StatCard label="OS abertas" value={dashboardMetrics.ordensAbertas} icon={ClipboardList} />
              <StatCard label="OS ultimos 15 dias" value={maintenanceDashboard.ordensUltimos15} icon={CalendarClock} />
              <StatCard label="OS abertas > 15 dias" value={maintenanceDashboard.ordensAbertasMais15} icon={AlertTriangle} tone="danger" />
              <StatCard label="Atend. ultimos 30 dias" value={maintenanceDashboard.atendimentosUltimos30} icon={Wrench} />
              <StatCard label="MTTA" value={formatDays(maintenanceDashboard.mtta)} icon={CalendarClock} />
              <StatCard label="MTTR" value={formatDays(maintenanceDashboard.mttr)} icon={CheckCircle2} />
              <StatCard label="MTBF" value={formatDays(maintenanceDashboard.mtbf)} icon={BarChart3} />
              <StatCard label="SLA no prazo" value={formatPercent(maintenanceDashboard.slaAtendidoPercentual)} icon={ShieldCheck} />
              <StatCard label="SLA vencido" value={dashboardMetrics.slaVencidas} icon={AlertTriangle} tone="danger" />
              <StatCard label="Atend./OS" value={dashboardMetrics.atendimentosPorOs} icon={Wrench} />
              <StatCard label="Estoque baixo" value={dashboardMetrics.estoqueBaixo} icon={PackageSearch} tone="warn" />
            </div>

            <div className="two-columns">
              <section className="panel">
                <div className="panel-heading">
                  <h2>OS prioritarias</h2>
                  <div className="heading-actions">
                    <button onClick={() => setPage("ordens")}>Ver OS</button>
                    <button onClick={() => { setSelectedOrdem(null); setActiveForm("ordem"); }}>Nova OS</button>
                  </div>
                </div>
                <div className="order-list">
                  {filteredOrdens.slice(0, 5).map((ordem) => {
                    const unidade = findUnidade(data.unidades, ordem);
                    const sla = getSla(ordem);
                    return (
                      <article key={ordem.id} className="order-card">
                        <div>
                          <strong>{ordem.protocolo}</strong>
                          <span>{unidade?.nome} · {unidade?.municipio}</span>
                        </div>
                        <div className="card-meta">
                          <span className={`pill ${sla.tone}`}>{sla.label}</span>
                          <StatusPill value={ordem.status} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <div className="dashboard-side-stack">
                <section className="panel">
                  <div className="panel-heading"><h2>Consultas rapidas</h2><span>Use os menus para filtrar e abrir cadastros.</span></div>
                  <div className="quick-actions">
                    <button type="button" onClick={() => setPage("atendimentos")}><Wrench size={16} />Atendimentos</button>
                    <button type="button" onClick={() => setPage("estoque")}><Boxes size={16} />Estoque</button>
                    <button type="button" onClick={() => setPage("mapa")}><MapPinned size={16} />Mapa</button>
                  </div>
                </section>

                <section className="panel maintenance-ranking">
                  <div className="panel-heading">
                    <h2>Top 10 Manutencoes</h2>
                    <span>ABC das pendencias mais solicitadas</span>
                  </div>
                  <div className="ranking-list">
                    {maintenanceDashboard.topPendencias.map((item, index) => (
                      <article className="ranking-item" key={item.descricao}>
                        <span className="ranking-position">{index + 1}</span>
                        <div className="ranking-content">
                          <div className="ranking-row">
                            <strong>{item.descricao}</strong>
                            <span>{item.quantidade}</span>
                          </div>
                          <div className="ranking-track">
                            <span style={{ width: `${Math.max(8, (item.quantidade / maintenanceDashboard.topPendenciasMax) * 100)}%` }} />
                          </div>
                        </div>
                      </article>
                    ))}
                    {!maintenanceDashboard.topPendencias.length && (
                      <span className="empty-state">Nenhuma pendencia registrada.</span>
                    )}
                  </div>
                </section>
              </div>
            </div>
          </section>
        )}

        {page === "clientes" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Clientes</h2>
                <div className="heading-actions">
                  <span>{filteredClientes.length} registros</span>
                  <button onClick={() => { setSelectedCliente(null); setActiveForm("cliente"); }}>Novo cliente</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Contato</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClientes.map((cliente) => (
                      <tr key={cliente.idCliente}>
                        <td>
                          <strong>{cliente.nome}</strong>
                          <small>{cliente.documento || "Documento nao informado"}</small>
                        </td>
                        <td>
                          {cliente.email || "Email nao informado"}
                          <small>{cliente.telefone || "Telefone nao informado"}</small>
                        </td>
                        <td><StatusPill value={cliente.ativo ? "Ativo" : "Inativo"} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-button" title="Editar cliente" onClick={() => { setSelectedCliente(cliente); setActiveForm("cliente"); }}>
                              <Edit3 size={16} />
                            </button>
                            <button className="icon-button" title={cliente.ativo ? "Inativar cliente" : "Reativar cliente"} onClick={() => toggleClienteAtivo(cliente)}>
                              <Power size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredClientes.length && (
                      <tr>
                        <td colSpan={4}>
                          <span className="empty-state">Nenhum cliente encontrado.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "empresas" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Empresas</h2>
                <div className="heading-actions">
                  <span>{filteredEmpresas.length} registros</span>
                  <button onClick={() => { setSelectedEmpresa(null); setActiveForm("empresa"); }}>Nova empresa</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th>CNPJ</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmpresas.map((empresa) => (
                      <tr key={empresa.idEmpresa}>
                        <td>
                          <strong>{empresa.nomeFantasia || empresa.razaoSocial}</strong>
                          <small>{empresa.nomeFantasia ? empresa.razaoSocial : "Nome fantasia nao informado"}</small>
                        </td>
                        <td>{empresa.cnpj}</td>
                        <td><StatusPill value={empresa.ativo ? "Ativo" : "Inativo"} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-button" title="Editar empresa" onClick={() => { setSelectedEmpresa(empresa); setActiveForm("empresa"); }}>
                              <Edit3 size={16} />
                            </button>
                            <button className="icon-button" title={empresa.ativo ? "Inativar empresa" : "Reativar empresa"} onClick={() => toggleEmpresaAtivo(empresa)}>
                              <Power size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredEmpresas.length && (
                      <tr>
                        <td colSpan={4}>
                          <span className="empty-state">Nenhuma empresa encontrada.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "contratos" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Contratos</h2>
                <div className="heading-actions">
                  <span>{filteredContratos.length} registros</span>
                  <button onClick={() => { setSelectedContrato(null); setActiveForm("contrato"); }}>Novo contrato</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Contrato</th><th>Cliente / Empresa</th><th>Vigencia</th><th>Status</th><th>Acoes</th></tr>
                  </thead>
                  <tbody>
                    {filteredContratos.map((contrato) => (
                      <tr key={contrato.idContrato}>
                        <td><strong>{contrato.numeroContrato}</strong><small>{contrato.objeto || "Objeto nao informado"}</small></td>
                        <td>{contrato.clienteNome}<small>{contrato.empresaNome}</small></td>
                        <td>{contrato.dataInicio || "—"} a {contrato.dataFim || "—"}</td>
                        <td><StatusPill value={contrato.ativo ? contrato.statusCodigo : "Inativo"} /></td>
                        <td>
                          <div className="row-actions">
                            <button className="icon-button" title="Editar contrato" onClick={() => { setSelectedContrato(contrato); setActiveForm("contrato"); }}><Edit3 size={16} /></button>
                            <button className="icon-button" title={contrato.ativo ? "Inativar contrato" : "Reativar contrato"} onClick={() => toggleContratoAtivo(contrato)}><Power size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!filteredContratos.length && <tr><td colSpan={5}><span className="empty-state">Nenhum contrato encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "projetos" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading"><h2>Projetos</h2><div className="heading-actions"><span>{filteredProjetos.length} registros</span><button onClick={() => { setSelectedProjeto(null); setActiveForm("projeto"); }}>Novo projeto</button></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Projeto</th><th>Contrato</th><th>Localidade</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredProjetos.map((projeto) => (
                      <tr key={projeto.idProjeto}>
                        <td><strong>{projeto.nome}</strong></td>
                        <td>{projeto.contratoNumero}</td>
                        <td>{[projeto.municipio, projeto.uf].filter(Boolean).join(" / ") || "Nao informada"}</td>
                        <td><StatusPill value={projeto.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar projeto" onClick={() => { setSelectedProjeto(projeto); setActiveForm("projeto"); }}><Edit3 size={16} /></button>
                          <button className="icon-button" title={projeto.ativo ? "Inativar projeto" : "Reativar projeto"} onClick={() => toggleProjetoAtivo(projeto)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredProjetos.length && <tr><td colSpan={5}><span className="empty-state">Nenhum projeto encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "pessoas" && isGestor && (
          <section className="two-columns">
            <section className="panel">
              <div className="panel-heading"><h2>Colaboradores</h2><div className="heading-actions"><span>{filteredColaboradores.length} registros</span><button onClick={() => { setSelectedColaborador(null); setActiveForm("colaborador"); }}>Novo colaborador</button></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredColaboradores.map((item) => (
                      <tr key={item.idColaborador}>
                        <td><strong>{item.nome}</strong><small>{item.cargo || "Cargo nao informado"} · {item.telefone || "Sem telefone"}</small></td>
                        <td><StatusPill value={item.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar colaborador" onClick={() => { setSelectedColaborador(item); setActiveForm("colaborador"); }}><Edit3 size={16} /></button>
                          <button className="icon-button" title={item.ativo ? "Inativar colaborador" : "Reativar colaborador"} onClick={() => togglePessoaAtiva("colaborador", item.idColaborador, item.nome, item.ativo)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredColaboradores.length && <tr><td colSpan={3}><span className="empty-state">Nenhum colaborador encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading"><h2>Terceirizados</h2><div className="heading-actions"><span>{filteredTerceirizados.length} registros</span><button onClick={() => { setSelectedTerceirizado(null); setActiveForm("terceirizado"); }}>Novo terceirizado</button></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredTerceirizados.map((item) => (
                      <tr key={item.idTerceira}>
                        <td><strong>{item.nome}</strong><small>{item.empresa || "Empresa nao informada"} · {item.documento || "Sem documento"}</small></td>
                        <td><StatusPill value={item.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar terceirizado" onClick={() => { setSelectedTerceirizado(item); setActiveForm("terceirizado"); }}><Edit3 size={16} /></button>
                          <button className="icon-button" title={item.ativo ? "Inativar terceirizado" : "Reativar terceirizado"} onClick={() => togglePessoaAtiva("terceirizado", item.idTerceira, item.nome, item.ativo)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredTerceirizados.length && <tr><td colSpan={3}><span className="empty-state">Nenhum terceirizado encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "usuarios" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading"><h2>Usuarios e acessos</h2><div className="heading-actions"><span>{filteredUsuarios.length} contas</span><button onClick={() => { setSelectedUsuario(null); setActiveForm("usuario"); }}>Novo usuario</button><button onClick={() => setActiveForm("own-password")}>Alterar minha senha</button></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Usuario</th><th>Perfil</th><th>Ultimo acesso</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredUsuarios.map((usuario) => (
                      <tr key={usuario.id}>
                        <td><strong>{usuario.profile?.nome || usuario.email}</strong><small>{usuario.email}</small></td>
                        <td>{usuario.profile?.perfil || "Sem perfil"}</td>
                        <td>{usuario.lastSignInAt ? new Date(usuario.lastSignInAt).toLocaleString("pt-BR") : "Nunca acessou"}</td>
                        <td><StatusPill value={usuario.profile?.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><button className="icon-button" title="Editar usuario" onClick={() => { setSelectedUsuario(usuario); setActiveForm("usuario"); }}><Edit3 size={16} /></button></td>
                      </tr>
                    ))}
                    {!filteredUsuarios.length && <tr><td colSpan={5}><span className="empty-state">Nenhum usuario encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "pendencias" && isGestor && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading"><h2>Pendencias padrao</h2><div className="heading-actions"><span>{filteredPendenciasPadrao.length} registros</span><button onClick={() => { setSelectedPendenciaPadrao(null); setActiveForm("pendencia"); }}>Nova pendencia</button></div></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Pendencia</th><th>Codigo</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredPendenciasPadrao.map((pendencia) => (
                      <tr key={pendencia.idPendencia}>
                        <td><strong>{pendencia.descricao}</strong></td>
                        <td>{pendencia.codigo || "Sem codigo"}</td>
                        <td><StatusPill value={pendencia.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar pendencia" onClick={() => { setSelectedPendenciaPadrao(pendencia); setActiveForm("pendencia"); }}><Edit3 size={16} /></button>
                          <button className="icon-button" title={pendencia.ativo ? "Inativar pendencia" : "Reativar pendencia"} onClick={() => togglePendenciaPadraoAtivo(pendencia)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredPendenciasPadrao.length && <tr><td colSpan={4}><span className="empty-state">Nenhuma pendencia padrao encontrada.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "ordens" && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Ordens de servico</h2>
                <div className="heading-actions">
                  <span>{filteredOrdens.length} registros</span>
                  <button onClick={() => { setSelectedOrdem(null); setActiveForm("ordem"); }}>Nova OS</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>OS</th>
                      <th>Unidade</th>
                      <th>Prioridade</th>
                      <th>Status</th>
                      <th>SLA</th>
                      <th>Responsavel</th>
                      <th>Atend.</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrdens.map((ordem) => {
                      const unidade = findUnidade(data.unidades, ordem);
                      const sla = getSla(ordem);
                      const atendimentosDaOrdem = data.atendimentos.filter((atendimento) => atendimento.ordemId === ordem.id);
                      const totalAtendimentos = atendimentosDaOrdem.length;
                      const totalMateriais = atendimentosDaOrdem.reduce((sum, atendimento) => sum + atendimento.materiais.length, 0);
                      const bloqueios = describeAttendanceBlockers(atendimentosDaOrdem);
                      return (
                        <tr key={ordem.id}>
                          <td><strong>{ordem.protocolo}</strong><small>{ordem.tipo}</small></td>
                          <td>{unidade?.nome}<small>{unidade?.cliente}</small></td>
                          <td><span className="priority">{ordem.prioridade}</span></td>
                          <td><StatusPill value={ordem.status} /></td>
                          <td><span className={`pill ${sla.tone}`}>{sla.label}</span><small>{ordem.prazoSla}</small></td>
                          <td>{ordem.responsavel}</td>
                          <td>
                            <strong>{totalAtendimentos}</strong>
                            <small className={totalMateriais ? "relation-warning" : ""}>{totalMateriais ? `${totalMateriais} material(is) vinculado(s)` : "Sem material"}</small>
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="icon-button" title="Editar OS" onClick={() => { setSelectedOrdem(ordem); setActiveForm("ordem"); }}><Edit3 size={16} /></button>
                              <button className="icon-button" title={bloqueios ? `Exclusao bloqueada: ${bloqueios}` : "Excluir OS"} onClick={() => deleteOrdem(ordem)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "unidades" && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Unidades instaladas</h2>
                <div className="heading-actions">
                  <span>{filteredUnidadesInstaladas.length} registros</span>
                  {isGestor && <button onClick={() => { setSelectedUnidadeInstalada(null); setActiveForm("unidade"); }}>Nova unidade</button>}
                </div>
              </div>
              <div className="unit-filters">
                <label>Estado
                  <select value={unitEstadoFilter} onChange={(event) => {
                    setUnitEstadoFilter(event.target.value); setUnitCidadeFilter(""); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}>
                    <option value="">Todos</option>
                    {unitFilterOptions.estados.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Cidade
                  <select value={unitCidadeFilter} onChange={(event) => {
                    setUnitCidadeFilter(event.target.value); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}>
                    <option value="">Todas</option>
                    {unitFilterOptions.cidades.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Bairro
                  <select value={unitBairroFilter} onChange={(event) => {
                    setUnitBairroFilter(event.target.value); setUnitRuaFilter("");
                  }}>
                    <option value="">Todos</option>
                    {unitFilterOptions.bairros.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Rua
                  <select value={unitRuaFilter} onChange={(event) => setUnitRuaFilter(event.target.value)}>
                    <option value="">Todas</option>
                    {unitFilterOptions.ruas.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="clear-filters-button"
                  disabled={!unitEstadoFilter && !unitCidadeFilter && !unitBairroFilter && !unitRuaFilter}
                  onClick={() => {
                  setUnitEstadoFilter(""); setUnitCidadeFilter(""); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}
                >
                  <RefreshCw size={15} />
                  Limpar filtros
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Unidade</th><th>Projeto</th><th>Localizacao</th><th>Mapa</th><th>Status</th>{isGestor && <th>Acoes</th>}</tr></thead>
                  <tbody>
                    {filteredUnidadesInstaladas.map((unidade) => (
                      <tr key={unidade.idUnidade}>
                        <td><strong>{unidade.nome}</strong><small>{unidade.codigo}</small></td>
                        <td>{unidade.projetoNome}</td>
                        <td><strong>{unidade.rua || "Endereco nao informado"}</strong><small>{[unidade.bairro, unidade.cidade, unidade.estado].filter(Boolean).join(" · ")}</small></td>
                        <td>{unidade.googleMapsUrl ? <a className="map-link" href={unidade.googleMapsUrl} target="_blank" rel="noreferrer">Abrir mapa</a> : "—"}</td>
                        <td><StatusPill value={unidade.ativo ? unidade.statusCodigo : "Inativo"} /></td>
                        {isGestor && <td><div className="row-actions">
                          <button className="icon-button" title="Editar unidade" onClick={() => { setSelectedUnidadeInstalada(unidade); setActiveForm("unidade"); }}><Edit3 size={16} /></button>
                          <button className="icon-button" title={unidade.ativo ? "Inativar unidade" : "Reativar unidade"} onClick={() => toggleUnidadeInstaladaAtiva(unidade)}><Power size={16} /></button>
                        </div></td>}
                      </tr>
                    ))}
                    {!filteredUnidadesInstaladas.length && <tr><td colSpan={isGestor ? 6 : 5}><span className="empty-state">Nenhuma unidade instalada encontrada.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "mapa" && (
          <section className="map-page">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Mapa das unidades</h2>
                <span>{filteredMapaUnidades.filter((unidade) => unidade.latitude != null && unidade.longitude != null).length} no mapa</span>
              </div>
              <div className="unit-filters">
                <label>Estado
                  <select value={unitEstadoFilter} onChange={(event) => {
                    setUnitEstadoFilter(event.target.value); setUnitCidadeFilter(""); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}>
                    <option value="">Todos</option>
                    {unitFilterOptions.estados.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Cidade
                  <select value={unitCidadeFilter} onChange={(event) => {
                    setUnitCidadeFilter(event.target.value); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}>
                    <option value="">Todas</option>
                    {unitFilterOptions.cidades.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Bairro
                  <select value={unitBairroFilter} onChange={(event) => {
                    setUnitBairroFilter(event.target.value); setUnitRuaFilter("");
                  }}>
                    <option value="">Todos</option>
                    {unitFilterOptions.bairros.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Rua
                  <select value={unitRuaFilter} onChange={(event) => setUnitRuaFilter(event.target.value)}>
                    <option value="">Todas</option>
                    {unitFilterOptions.ruas.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="clear-filters-button"
                  disabled={!unitEstadoFilter && !unitCidadeFilter && !unitBairroFilter && !unitRuaFilter}
                  onClick={() => {
                    setUnitEstadoFilter(""); setUnitCidadeFilter(""); setUnitBairroFilter(""); setUnitRuaFilter("");
                  }}
                >
                  <RefreshCw size={15} />
                  Limpar filtros
                </button>
              </div>
              <UnidadesMap unidades={filteredMapaUnidades} onOpenHistory={openHistoricoUnidade} />
            </section>
          </section>
        )}

        {page === "historico_unidade" && (
          <HistoricoUnidadePage
            unidade={selectedMapaUnidade}
            unidades={mapaUnidades}
            eventos={historicoUnidade}
            projetos={projetos}
            loading={historyLoading}
            canEdit={isGestor}
            onBack={() => setPage("mapa")}
            onSelectUnidade={selectHistoricoUnidade}
            onSubmit={submitHistoricoUnidade}
          />
        )}

        {page === "atendimentos" && (
          <section className="catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Atendimentos</h2>
                <div className="heading-actions">
                  <span>{data.atendimentos.length} registros</span>
                  <button onClick={() => { setSelectedAtendimento(null); setActiveForm("atendimento"); }}>Registrar atendimento</button>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Atendimento</th>
                      <th>OS</th>
                      <th>Equipe</th>
                      <th>Status</th>
                      <th>Materiais</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.atendimentos.map((atendimento) => {
                      const ordem = data.ordens.find((item) => item.id === atendimento.ordemId);
                      const materiaisResumo = summarizeMaterials(atendimento.materiais);
                      const movimentacoes = atendimentoMovimentacoes[atendimento.id] || [];
                      return (
                        <tr key={atendimento.id}>
                          <td><strong>#{atendimento.id}</strong><small>{atendimento.data}</small></td>
                          <td>{ordem?.protocolo || "OS removida"}<small>{ordem?.descricao || "Sem descricao"}</small></td>
                          <td>{atendimento.equipe}</td>
                          <td><StatusPill value={atendimento.status} /></td>
                          <td title={atendimento.materiais.join(" | ") || "Sem material"}>
                            <strong>{atendimento.materiais.length}</strong>
                            <small className={atendimento.materiais.length ? "relation-warning" : ""}>{materiaisResumo}</small>
                            {isGestor && atendimento.materiais.length > 0 && (
                              <button className="material-reversal-button" type="button" onClick={() => estornarAtendimentoMateriais(atendimento)}>
                                <RefreshCw size={15} />
                                Estornar materiais
                              </button>
                            )}
                            {movimentacoes.length > 0 && (
                              <div className="movement-links">
                                {movimentacoes.map((movimentacao) => (
                                  <span key={`${movimentacao.idMovimentacao}-${movimentacao.material}-${movimentacao.tipoCodigo}`}>
                                    #{movimentacao.idMovimentacao} {movimentacao.tipoCodigo} - {movimentacao.material} - {movimentacao.quantidade.toLocaleString("pt-BR")} {movimentacao.unidadeMedida}
                                    <small>{formatMovementDate(movimentacao.dataMovimentacao)}</small>
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="row-actions">
                              <button className="icon-button" title="Editar atendimento" onClick={() => { setSelectedAtendimento(atendimento); setActiveForm("atendimento"); }}><Edit3 size={16} /></button>
                              <button className="icon-button" disabled={atendimento.materiais.length > 0} title={atendimento.materiais.length ? `Estorne os materiais antes de excluir: ${atendimento.materiais.join(" | ")}` : "Excluir atendimento"} onClick={() => deleteAtendimento(atendimento)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!data.atendimentos.length && <tr><td colSpan={6}><span className="empty-state">Nenhum atendimento registrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        {page === "estoque" && (
          <section className="inventory-planning-page">
            <section className="inventory-kpis">
              <article><span>Comprar</span><strong>{estoquePlanejamento.filter((item) => item.situacao === "comprar" || item.situacao === "ruptura").length}</strong><small>materiais prioritarios</small></article>
              <article><span>Sugestao total</span><strong>{estoquePlanejamento.reduce((sum, item) => sum + item.sugestaoCompra, 0).toLocaleString("pt-BR")}</strong><small>unidades para reposicao</small></article>
              <article><span>Sem historico</span><strong>{estoquePlanejamento.filter((item) => item.situacao === "sem_historico").length}</strong><small>aguardando consumo</small></article>
              <article><span>Criticos</span><strong>{estoquePlanejamento.filter((item) => item.critico).length}</strong><small>materiais classificados</small></article>
            </section>

            <section className="panel full">
              <div className="panel-heading">
                <h2>Planejamento de ressuprimento</h2>
                <div className="heading-actions">
                  <span>{filteredEstoquePlanejamento.length} itens</span>
                  {isGestor && <button onClick={() => { setSelectedMaterial(null); setActiveForm("material"); }}>Novo material</button>}
                  {isGestor && <button onClick={() => setActiveForm("movimentacao")}>Registrar movimentacao</button>}
                  {isGestor && <button onClick={() => setActiveForm("estoque-configuracao")}>Parametros</button>}
                </div>
              </div>
              <div className="table-wrap">
                <table className="planning-table">
                  <thead><tr><th>Material</th><th>Saldo</th><th>Consumo medio</th><th>Seguranca</th><th>Ponto de compra</th><th>Cobertura</th><th>Sugestao</th><th>Situacao</th>{isGestor && <th>Acoes</th>}</tr></thead>
                  <tbody>
                    {filteredEstoquePlanejamento.map((item) => {
                      const material = materiais.find((candidate) => candidate.idMaterial === item.idMaterial);
                      return <tr key={item.idMaterial}>
                        <td><strong>{item.descricao}{item.critico ? " ★" : ""}</strong><small>{item.codigo || "Sem codigo"} · {item.categoria || "Sem categoria"}</small></td>
                        <td>{item.estoqueAtual.toLocaleString("pt-BR")} {item.unidadeMedida}</td>
                        <td>{item.demandaMedia.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}/dia<small>{item.diasComConsumo} dias com consumo</small></td>
                        <td>{item.estoqueSeguranca.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                        <td>{item.pontoRessuprimento.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</td>
                        <td>{item.coberturaDias == null ? "—" : `${item.coberturaDias.toLocaleString("pt-BR")} dias`}</td>
                        <td><strong>{item.sugestaoCompra.toLocaleString("pt-BR")} {item.unidadeMedida}</strong><small>alvo {item.estoqueAlvo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}</small></td>
                        <td><span className={`inventory-status ${item.situacao}`}>{inventoryStatusLabel(item.situacao)}</span></td>
                        {isGestor && <td><div className="row-actions">
                          <button className="icon-button" title="Editar parametros do material" onClick={() => { setSelectedMaterial(material || null); setActiveForm("material"); }}><Edit3 size={16} /></button>
                          {material && <button className="icon-button" title={material.ativo ? "Inativar material" : "Reativar material"} onClick={() => toggleMaterialAtivo(material)}><Power size={16} /></button>}
                        </div></td>}
                      </tr>;
                    })}
                    {!filteredEstoquePlanejamento.length && <tr><td colSpan={isGestor ? 9 : 8}><span className="empty-state">Nenhum material encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            {isGestor && <section className="panel full">
              <div className="panel-heading"><h2>Materiais cadastrados</h2><span>{filteredMateriais.length} registros</span></div>
              <div className="inventory-catalog compact">
                {filteredMateriais.map((item) => (
                  <button type="button" key={item.idMaterial} onClick={() => { setSelectedMaterial(item); setActiveForm("material"); }}>
                    <span>{item.descricao}</span>
                    <small>{item.ativo ? "Ativo" : "Inativo"} - {item.codigo || "sem codigo"}</small>
                  </button>
                ))}
              </div>
            </section>}
          </section>
        )}

        {page === "relatorios" && (
          <section className="reports-grid">
            <ReportCard title="SLA" value={`${dashboardMetrics.slaVencidas} vencidas`} icon={AlertTriangle} />
            <ReportCard title="IPM operacional" value={`${Math.round((data.ordens.length / Math.max(dashboardMetrics.unidades, 1)) * 100) / 100} OS/unidade`} icon={BarChart3} />
            <ReportCard title="Atendimentos" value={`${dashboardMetrics.atendimentos} registros`} icon={CheckCircle2} />
            <ReportCard title="Estoque critico" value={`${dashboardMetrics.estoqueBaixo} itens`} icon={PackageSearch} />
          </section>
        )}

        {(activeForm === "cliente") && (
          <FormModal title={selectedCliente ? "Editar cliente" : "Novo cliente"} onClose={closeActiveForm}>
            <ClienteForm cliente={selectedCliente} onSubmit={submitCliente} />
          </FormModal>
        )}
        {(activeForm === "empresa") && (
          <FormModal title={selectedEmpresa ? "Editar empresa" : "Nova empresa"} onClose={closeActiveForm}>
            <EmpresaForm empresa={selectedEmpresa} onSubmit={submitEmpresa} />
          </FormModal>
        )}
        {(activeForm === "contrato") && (
          <FormModal title={selectedContrato ? "Editar contrato" : "Novo contrato"} onClose={closeActiveForm}>
            <ContratoForm contrato={selectedContrato} clientes={clientes} empresas={empresas} status={statusContratos} onSubmit={submitContrato} />
          </FormModal>
        )}
        {(activeForm === "projeto") && (
          <FormModal title={selectedProjeto ? "Editar projeto" : "Novo projeto"} onClose={closeActiveForm}>
            <ProjetoForm projeto={selectedProjeto} contratos={contratos} onSubmit={submitProjeto} />
          </FormModal>
        )}
        {(activeForm === "colaborador") && (
          <FormModal title={selectedColaborador ? "Editar colaborador" : "Novo colaborador"} onClose={closeActiveForm}>
            <ColaboradorForm colaborador={selectedColaborador} onSubmit={submitColaborador} />
          </FormModal>
        )}
        {(activeForm === "terceirizado") && (
          <FormModal title={selectedTerceirizado ? "Editar terceirizado" : "Novo terceirizado"} onClose={closeActiveForm}>
            <TerceirizadoForm terceirizado={selectedTerceirizado} onSubmit={submitTerceirizado} />
          </FormModal>
        )}
        {(activeForm === "usuario") && (
          <FormModal title={selectedUsuario ? "Editar usuario" : "Novo usuario"} onClose={closeActiveForm}>
            <UsuarioForm usuario={selectedUsuario} colaboradores={colaboradores} onSubmit={submitUsuario} />
          </FormModal>
        )}
        {(activeForm === "own-password") && (
          <FormModal title="Minha senha" onClose={closeActiveForm}>
            <form className="form-grid" onSubmit={submitOwnPassword}>
              <label className="wide">Nova senha<input name="ownPassword" type="password" required minLength={8} autoComplete="new-password" /></label>
              <button className="primary-button"><ShieldCheck size={16} />Alterar minha senha</button>
            </form>
          </FormModal>
        )}
        {(activeForm === "pendencia") && (
          <FormModal title={selectedPendenciaPadrao ? "Editar pendencia" : "Nova pendencia"} onClose={closeActiveForm}>
            <PendenciaPadraoForm pendencia={selectedPendenciaPadrao} onSubmit={submitPendenciaPadrao} />
          </FormModal>
        )}
        {(activeForm === "ordem") && (
          <FormModal title={selectedOrdem ? "Editar OS" : "Nova OS"} onClose={closeActiveForm} wide>
            <OrdemForm ordem={selectedOrdem} unidades={data.unidades} pendenciasPadrao={pendenciasPadrao.filter((item) => item.ativo)} responsavelOptions={responsavelOptions} onSubmit={submitOrdem} />
          </FormModal>
        )}
        {(activeForm === "unidade") && (
          <FormModal title={selectedUnidadeInstalada ? "Editar unidade" : "Nova unidade"} onClose={closeActiveForm} wide>
            <UnidadeInstaladaForm unidade={selectedUnidadeInstalada} projetos={projetos} status={statusUnidades} onSubmit={submitUnidadeInstalada} />
          </FormModal>
        )}
        {(activeForm === "atendimento") && (
          <FormModal title={selectedAtendimento ? "Editar atendimento" : "Registrar atendimento"} onClose={closeActiveForm} wide>
            <AtendimentoForm atendimento={selectedAtendimento} ordens={data.ordens.filter((ordem) => selectedAtendimento?.ordemId === ordem.id || ordem.status !== "Concluida")} materiais={materiais.filter((item) => item.ativo)} responsavelOptions={responsavelOptions} onSubmit={submitAtendimento} />
          </FormModal>
        )}
        {(activeForm === "material") && (
          <FormModal title={selectedMaterial ? "Editar material" : "Novo material"} onClose={closeActiveForm} wide>
            <MaterialForm material={selectedMaterial} configuracao={estoqueConfiguracao} onSubmit={submitMaterial} />
          </FormModal>
        )}
        {(activeForm === "movimentacao") && (
          <FormModal title="Registrar movimentacao" onClose={closeActiveForm} wide>
            <EstoqueMovimentacaoForm materiais={materiais.filter((item) => item.ativo)} onSubmit={submitEstoqueMovimentacao} />
          </FormModal>
        )}
        {(activeForm === "estoque-configuracao" && estoqueConfiguracao) && (
          <FormModal title="Parametros gerais de estoque" onClose={closeActiveForm} wide>
            <EstoqueConfiguracaoForm configuracao={estoqueConfiguracao} onSubmit={submitEstoqueConfiguracao} />
          </FormModal>
        )}
      </main>
    </div>
  );
}

function FormModal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`form-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" type="button" title="Fechar" onClick={onClose}>&times;</button>
        </div>
        {children}
      </section>
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function unitMarkerIcon(unidade: MapaUnidade) {
  const tone = !unidade.ativo ? "inactive" : unidade.statusCodigo.includes("manut") ? "warn" : "ok";
  return L.divIcon({
    className: `unit-marker ${tone}`,
    html: `<span></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function MapAutoBounds({ unidades }: { unidades: MapaUnidade[] }) {
  const map = useMap();
  useEffect(() => {
    const positions = unidades
      .filter((unidade) => unidade.latitude != null && unidade.longitude != null)
      .map((unidade) => [unidade.latitude as number, unidade.longitude as number] as [number, number]);

    if (!positions.length) return;
    if (positions.length === 1) {
      map.setView(positions[0], 14);
      return;
    }

    map.fitBounds(positions as LatLngBoundsExpression, { padding: [42, 42], maxZoom: 15 });
  }, [map, unidades]);

  return null;
}

function UnidadesMap({
  unidades,
  onOpenHistory
}: {
  unidades: MapaUnidade[];
  onOpenHistory: (unidade: MapaUnidade) => void;
}) {
  const located = unidades.filter((unidade) => unidade.latitude != null && unidade.longitude != null);
  const unlocated = unidades.filter((unidade) => unidade.latitude == null || unidade.longitude == null);

  return (
    <div className="map-layout">
      <div className="map-shell">
        {located.length ? (
          <MapContainer center={[-5.2, -39.5]} zoom={7} scrollWheelZoom className="units-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapAutoBounds unidades={located} />
            {located.map((unidade) => (
              <Marker
                key={unidade.idUnidade}
                position={[unidade.latitude as number, unidade.longitude as number]}
                icon={unitMarkerIcon(unidade)}
                eventHandlers={{ click: () => onOpenHistory(unidade) }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="map-tooltip">
                    <strong>{unidade.nome}</strong>
                    <span>Contrato: {unidade.contratoNumero || "Nao informado"}</span>
                    <span>Projeto: {unidade.projetoNome || "Nao informado"}</span>
                    <span>Status: {unidade.ativo ? unidade.statusCodigo : "Inativo"}</span>
                    <span>Ultima manutencao: {formatDateTime(unidade.ultimaManutencao)}</span>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>
        ) : (
          <div className="map-empty-state">
            <MapPinned size={28} />
            <strong>Nenhuma unidade com coordenadas</strong>
            <span>Cadastre um link valido do Google Maps na unidade para gerar o pin.</span>
          </div>
        )}
      </div>
      <aside className="map-side-panel">
        <article>
          <span>Unidades filtradas</span>
          <strong>{unidades.length}</strong>
        </article>
        <article>
          <span>Com pin</span>
          <strong>{located.length}</strong>
        </article>
        <article>
          <span>Sem coordenadas</span>
          <strong>{unlocated.length}</strong>
        </article>
        <div className="unlocated-list">
          <h3>Sem pin no mapa</h3>
          {unlocated.slice(0, 8).map((unidade) => (
            <div key={unidade.idUnidade}>
              <strong>{unidade.nome}</strong>
              <small>{[unidade.cidade, unidade.estado].filter(Boolean).join(" / ") || "Localizacao nao informada"}</small>
            </div>
          ))}
          {!unlocated.length && <span className="empty-state">Todas as unidades filtradas possuem coordenadas.</span>}
        </div>
      </aside>
    </div>
  );
}

function HistoricoUnidadePage({
  unidade,
  unidades,
  eventos,
  projetos,
  loading,
  canEdit,
  onBack,
  onSelectUnidade,
  onSubmit
}: {
  unidade: MapaUnidade | null;
  unidades: MapaUnidade[];
  eventos: HistoricoUnidadeEvento[];
  projetos: Projeto[];
  loading: boolean;
  canEdit: boolean;
  onBack: () => void;
  onSelectUnidade: (idUnidade: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!unidade) {
    return (
      <section className="panel full">
        <div className="panel-heading">
          <h2>Historico das unidades</h2>
          <button onClick={onBack}><ArrowLeft size={16} />Voltar</button>
        </div>
        <form className="form-grid history-selector">
          <label className="wide">
            Unidade
            <select defaultValue="" onChange={(event) => event.target.value && onSelectUnidade(Number(event.target.value))}>
              <option value="" disabled>Selecione uma unidade</option>
              {unidades.map((item) => (
                <option key={item.idUnidade} value={item.idUnidade}>
                  {item.codigo} · {item.nome} · {item.contratoNumero || "Sem contrato"}
                </option>
              ))}
            </select>
          </label>
        </form>
        {!unidades.length && <span className="empty-state">Nenhuma unidade disponivel para consulta.</span>}
      </section>
    );
  }

  return (
    <section className="history-page">
      <section className="panel full">
        <div className="panel-heading">
          <div>
            <h2>{unidade.nome}</h2>
            <span>{unidade.codigo} · {unidade.projetoNome} · Contrato {unidade.contratoNumero || "nao informado"}</span>
          </div>
          <div className="row-actions">
            <select className="history-unit-select" value={unidade.idUnidade} onChange={(event) => onSelectUnidade(Number(event.target.value))}>
              {unidades.map((item) => (
                <option key={item.idUnidade} value={item.idUnidade}>{item.codigo} · {item.nome}</option>
              ))}
            </select>
            <button onClick={onBack}><ArrowLeft size={16} />Mapa</button>
          </div>
        </div>
        <div className="history-summary">
          <article><span>Status</span><strong>{unidade.ativo ? unidade.statusCodigo : "Inativo"}</strong></article>
          <article><span>Ultima manutencao</span><strong>{formatDateTime(unidade.ultimaManutencao)}</strong></article>
          <article><span>Localizacao</span><strong>{[unidade.rua, unidade.bairro, unidade.cidade, unidade.estado].filter(Boolean).join(" · ") || "Nao informada"}</strong></article>
          {unidade.googleMapsUrl && <a className="map-link" href={unidade.googleMapsUrl} target="_blank" rel="noreferrer">Abrir Google Maps</a>}
        </div>
      </section>
      {canEdit && (
        <section className="panel full">
          <div className="panel-heading"><h2>Registrar evento da unidade</h2></div>
          <form className="form-grid history-event-form" onSubmit={onSubmit}>
            <input type="hidden" name="idUnidade" value={unidade.idUnidade} />
            <label>
              Tipo
              <select name="tipoEvento" defaultValue="manutencao">
                <option value="manutencao">Manutencao</option>
                <option value="realocacao">Realocacao</option>
                <option value="reforma">Reforma</option>
                <option value="mudanca_contrato">Mudanca de contrato/projeto</option>
                <option value="registro">Registro geral</option>
              </select>
            </label>
            <label>
              Data
              <input name="dataEvento" type="datetime-local" />
            </label>
            <label className="wide">
              Novo projeto/contrato
              <select name="idProjetoNovo" defaultValue="">
                <option value="">Manter projeto atual</option>
                {projetos.filter((projeto) => projeto.ativo).map((projeto) => (
                  <option key={projeto.idProjeto} value={projeto.idProjeto}>
                    {projeto.nome} · {projeto.contratoNumero || "Contrato nao informado"}
                  </option>
                ))}
              </select>
            </label>
            <label className="wide">
              Descricao
              <textarea name="descricao" rows={3} required placeholder="Ex.: unidade reformada, realocada para novo endereco, alterada para outro contrato ou detalhe da manutencao" />
            </label>
            <button className="primary-button"><Plus size={16} />Registrar evento</button>
          </form>
        </section>
      )}
      <section className="panel full">
        <div className="panel-heading"><h2>Linha do tempo</h2><span>{eventos.length} eventos</span></div>
        <div className="history-timeline">
          {loading && <span className="empty-state">Carregando historico.</span>}
          {!loading && eventos.map((evento) => (
            <article key={evento.idEvento}>
              <div className={`history-dot ${evento.tipoEvento}`}></div>
              <div>
                <strong>{evento.titulo}</strong>
                <span>{formatDateTime(evento.dataEvento)} · {evento.tipoEvento}{evento.statusCodigo ? ` · ${evento.statusCodigo}` : ""}</span>
                {evento.descricao && <p>{evento.descricao}</p>}
              </div>
            </article>
          ))}
          {!loading && !eventos.length && <span className="empty-state">Nenhum evento historico encontrado para esta unidade.</span>}
        </div>
      </section>
    </section>
  );
}

function LoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <Wrench size={20} />
        </div>
        <h1>Locabox Manutencao</h1>
        <p>Carregando sessao.</p>
      </section>
    </main>
  );
}

function AuthScreen({
  errorMessage,
  onError
}: {
  errorMessage: string;
  onError: (message: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");

    onError("");
    setSubmitting(true);
    try {
      await signInWithPassword(email, password);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Falha ao entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <Wrench size={20} />
        </div>
        <h1>Locabox Manutencao</h1>
        <p>Acesso restrito a usuarios autorizados.</p>
        {errorMessage && (
          <div className="error-banner">
            <AlertTriangle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}
        <form className="form-grid auth-form" onSubmit={handleSubmit}>
          <label className="wide">
            Email
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label className="wide">
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" disabled={submitting}>
            <ShieldCheck size={16} />
            {submitting ? "Entrando" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

function OrdemForm({
  ordem,
  unidades,
  pendenciasPadrao,
  responsavelOptions,
  onSubmit
}: {
  ordem?: Ordem | null;
  unidades: Unidade[];
  pendenciasPadrao: PendenciaPadrao[];
  responsavelOptions: ResponsavelOption[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const responsaveisSelecionados = ordem?.responsavel.split(",").map((item) => item.trim()).filter(Boolean) || [];
  const pendenciasSelecionadas = new Set(ordem?.pendencias || []);

  return (
    <form key={ordem?.id || "new"} className="form-grid" onSubmit={onSubmit}>
      <label>
        Unidade
        <select name="unidadeId" defaultValue={ordem?.unidadeId || ""} required>
          <option value="" disabled>Selecione</option>
          {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
        </select>
      </label>
      <label>
        Tipo
        <select name="tipo" defaultValue={ordem?.tipo || "Corretiva"}>
          <option>Corretiva</option>
          <option>Preventiva</option>
          <option>Emergencial</option>
        </select>
      </label>
      <label>
        Prioridade
        <select name="prioridade" defaultValue={ordem?.prioridade || "P2"}>
          <option>P2</option>
          <option>P1</option>
          <option>P3</option>
          <option>P4</option>
        </select>
      </label>
      <label>
        Prazo SLA
        <input name="prazoSla" type="date" defaultValue={ordem?.prazoSla || ""} required />
      </label>
      {ordem && (
        <label>
          Status
          <select name="status" defaultValue={ordem.status}>
            <option>Aberta</option>
            <option>Agendada</option>
            <option>Em atendimento</option>
            <option>Pendente</option>
            <option>Concluida</option>
          </select>
        </label>
      )}
      <fieldset className="responsible-field wide">
        <legend>Responsavel</legend>
        <div>
          {responsavelOptions.map((responsavel) => (
            <label key={responsavel.value}>
              <input name="responsaveis" type="checkbox" value={responsavel.value} defaultChecked={responsaveisSelecionados.includes(responsavel.label)} />
              <span>{responsavel.label}<small>{responsavel.detail}</small></span>
            </label>
          ))}
          {!responsavelOptions.length && <span className="empty-state">Nenhum colaborador ou terceirizado ativo cadastrado.</span>}
        </div>
      </fieldset>
      <label className="wide">
        Descricao
        <textarea name="descricao" placeholder="Resumo da solicitacao" rows={3} defaultValue={ordem?.descricao || ""} />
      </label>
      <fieldset className="standard-pending-field wide">
        <legend>{ordem ? "Adicionar pendencias" : "Pendencias"}</legend>
        <div>
          {pendenciasPadrao.map((pendencia) => (
            <label key={pendencia.idPendencia}>
              <input name="pendenciasIds" type="checkbox" value={pendencia.idPendencia} defaultChecked={pendenciasSelecionadas.has(pendencia.descricao)} />
              <span>{pendencia.descricao}</span>
            </label>
          ))}
          {!pendenciasPadrao.length && <span className="empty-state">Nenhuma pendencia padrao cadastrada.</span>}
        </div>
      </fieldset>
      <button className="primary-button">
        {ordem ? <CheckCircle2 size={16} /> : <Plus size={16} />}
        {ordem ? "Salvar OS" : "Criar OS"}
      </button>
    </form>
  );
}

function AtendimentoForm({
  atendimento,
  ordens,
  materiais,
  responsavelOptions,
  onSubmit
}: {
  atendimento?: Atendimento | null;
  ordens: Ordem[];
  materiais: MaterialEstoque[];
  responsavelOptions: ResponsavelOption[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [materialRows, setMaterialRows] = useState<Array<{ id: number }>>([]);
  const [selectedOrdemId, setSelectedOrdemId] = useState(atendimento?.ordemId || ordens[0]?.id || 0);
  const selectedOrdem = ordens.find((ordem) => ordem.id === selectedOrdemId);
  const responsaveisSelecionados = atendimento?.equipe.split(",").map((item) => item.trim()).filter(Boolean) || [];

  useEffect(() => {
    if (atendimento) setSelectedOrdemId(atendimento.ordemId);
  }, [atendimento?.id, atendimento?.ordemId]);

  useEffect(() => {
    if (ordens.some((ordem) => ordem.id === selectedOrdemId)) return;
    setSelectedOrdemId(atendimento?.ordemId || ordens[0]?.id || 0);
  }, [atendimento?.ordemId, ordens, selectedOrdemId]);

  function addMaterialRow() {
    setMaterialRows((current) => [...current, { id: Date.now() + current.length }]);
  }

  function removeMaterialRow(id: number) {
    setMaterialRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <form key={atendimento?.id || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">
        OS
        <select name="ordemId" required value={selectedOrdemId || ""} onChange={(event) => setSelectedOrdemId(Number(event.target.value))}>
          <option value="" disabled>Selecione</option>
          {ordens.map((ordem) => <option key={ordem.id} value={ordem.id}>{ordem.protocolo} · {ordem.descricao}</option>)}
        </select>
      </label>
      <label>
        Data
        <input name="data" type="date" defaultValue={atendimento?.data || ""} />
      </label>
      <label>
        Status
        <select name="status" defaultValue={atendimento?.status || "Executado"}>
          <option>Executado</option>
          <option>Parcial</option>
          <option>Reagendado</option>
        </select>
      </label>
      <fieldset className="responsible-field wide">
        <legend>Equipe do atendimento</legend>
        <div>
          {responsavelOptions.map((responsavel) => (
            <label key={responsavel.value}>
              <input name="atendimentoResponsaveis" type="checkbox" value={responsavel.value} defaultChecked={responsaveisSelecionados.includes(responsavel.label)} />
              <span>{responsavel.label}<small>{responsavel.detail}</small></span>
            </label>
          ))}
          {!responsavelOptions.length && <span className="empty-state">Nenhum colaborador ou terceirizado ativo cadastrado.</span>}
        </div>
      </fieldset>
      {!atendimento && <fieldset className="attendance-pending-field wide">
        <legend>Pendencias da OS</legend>
        <div className="attendance-pending-list">
          {selectedOrdem?.pendenciasDetalhes.map((pendencia) => (
            <div className="attendance-pending-row" key={pendencia.id || pendencia.descricao}>
              <input type="hidden" name="pendenciaId" value={pendencia.id} />
              <div>
                <strong>{pendencia.descricao}</strong>
                <StatusPill value={pendencia.status} />
              </div>
              <label>
                Status
                <select name="pendenciaStatus" defaultValue={pendencia.status === "Concluida" ? "Concluida" : "Pendente"}>
                  <option value="Aberta">Aberta</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Concluida">Concluida</option>
                </select>
              </label>
              <label>
                Observacao
                <input name="pendenciaObservacao" maxLength={180} placeholder="Andamento desta pendencia" />
              </label>
            </div>
          ))}
          {selectedOrdem && !selectedOrdem.pendenciasDetalhes.length && <span className="empty-state">Esta OS nao possui pendencias cadastradas.</span>}
          {!selectedOrdem && <span className="empty-state">Selecione uma OS para ver as pendencias.</span>}
        </div>
      </fieldset>}
      <label className="wide">
        Relato
        <textarea name="relato" rows={4} placeholder="O que foi executado, evidencias e pendencias" defaultValue={atendimento?.relato || ""} />
      </label>
      {!atendimento && <fieldset className="attendance-materials-field wide">
        <legend>Materiais e equipamentos</legend>
        <div className="attendance-materials-list">
          {materialRows.map((row) => (
            <div className="attendance-material-row" key={row.id}>
              <label>
                Material
                <select name="materialId" required>
                  <option value="">Selecione</option>
                  {materiais.map((material) => (
                    <option key={material.idMaterial} value={material.idMaterial}>
                      {material.descricao} · saldo {material.estoqueAtual.toLocaleString("pt-BR")} {material.unidadeMedida}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Quantidade
                <input name="materialQuantidade" type="number" min="0.01" step="0.01" required />
              </label>
              <label>
                Lancamento
                <select name="materialTipoUso" defaultValue="consumo" required>
                  <option value="consumo">Consumo</option>
                  <option value="emprestimo_ferramenta">Emprestimo de ferramenta</option>
                  <option value="perda_avaria">Perda ou avaria</option>
                </select>
              </label>
              <label>
                Observacao
                <input name="materialObservacao" maxLength={160} placeholder="Equipe, avaria ou detalhe" />
              </label>
              <button className="icon-button" type="button" title="Remover material" onClick={() => removeMaterialRow(row.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {!materialRows.length && <span className="empty-state">Nenhum material informado.</span>}
        </div>
        <button className="secondary-button" type="button" onClick={addMaterialRow} disabled={!materiais.length}>
          <Plus size={16} />
          Adicionar material
        </button>
      </fieldset>}
      <button className="primary-button">
        {atendimento ? <Edit3 size={16} /> : <CheckCircle2 size={16} />}
        {atendimento ? "Salvar atendimento" : "Registrar"}
      </button>
    </form>
  );
}

function ClienteForm({ cliente, onSubmit }: { cliente: Cliente | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form key={cliente?.idCliente || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">
        Nome
        <input name="nome" defaultValue={cliente?.nome || ""} required maxLength={160} />
      </label>
      <label className="wide">
        Documento
        <input name="documento" defaultValue={cliente?.documento || ""} maxLength={40} />
      </label>
      <label className="wide">
        Email
        <input name="email" type="email" defaultValue={cliente?.email || ""} maxLength={160} />
      </label>
      <label className="wide">
        Telefone
        <input name="telefone" defaultValue={cliente?.telefone || ""} maxLength={40} />
      </label>
      <label className="checkbox-field wide">
        <input name="ativo" type="checkbox" defaultChecked={cliente?.ativo ?? true} />
        <span>Ativo</span>
      </label>
      <button className="primary-button">
        <CheckCircle2 size={16} />
        {cliente ? "Salvar cliente" : "Criar cliente"}
      </button>
    </form>
  );
}

function EmpresaForm({ empresa, onSubmit }: { empresa: Empresa | null; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form key={empresa?.idEmpresa || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">
        Razao social
        <input name="razaoSocial" defaultValue={empresa?.razaoSocial || ""} required maxLength={200} />
      </label>
      <label className="wide">
        Nome fantasia
        <input name="nomeFantasia" defaultValue={empresa?.nomeFantasia || ""} maxLength={160} />
      </label>
      <label className="wide">
        CNPJ
        <input name="cnpj" defaultValue={empresa?.cnpj || ""} required maxLength={40} />
      </label>
      <label className="checkbox-field wide">
        <input name="ativo" type="checkbox" defaultChecked={empresa?.ativo ?? true} />
        <span>Ativa</span>
      </label>
      <button className="primary-button">
        <CheckCircle2 size={16} />
        {empresa ? "Salvar empresa" : "Criar empresa"}
      </button>
    </form>
  );
}

function ContratoForm({
  contrato, clientes, empresas, status, onSubmit
}: {
  contrato: Contrato | null;
  clientes: Cliente[];
  empresas: Empresa[];
  status: StatusCatalogo[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={contrato?.idContrato || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Numero do contrato<input name="numeroContrato" defaultValue={contrato?.numeroContrato || ""} required maxLength={100} /></label>
      <label className="wide">
        Cliente
        <select name="idCliente" defaultValue={contrato?.idCliente || ""} required>
          <option value="">Selecione</option>
          {clientes.map((cliente) => <option key={cliente.idCliente} value={cliente.idCliente}>{cliente.nome}</option>)}
        </select>
      </label>
      <label className="wide">
        Empresa
        <select name="idEmpresa" defaultValue={contrato?.idEmpresa || ""} required>
          <option value="">Selecione</option>
          {empresas.map((empresa) => <option key={empresa.idEmpresa} value={empresa.idEmpresa}>{empresa.nomeFantasia || empresa.razaoSocial}</option>)}
        </select>
      </label>
      <label className="wide">Objeto<textarea name="objeto" defaultValue={contrato?.objeto || ""} rows={3} /></label>
      <label>
        Status
        <select name="statusCodigo" defaultValue={contrato?.statusCodigo || "ativo"} required>
          {status.map((item) => <option key={item.codigo} value={item.codigo}>{item.descricao}</option>)}
        </select>
      </label>
      <label>Valor total<input name="valorTotal" type="number" min="0" step="0.01" defaultValue={contrato?.valorTotal ?? ""} /></label>
      <label>Inicio<input name="dataInicio" type="date" defaultValue={contrato?.dataInicio || ""} /></label>
      <label>Fim<input name="dataFim" type="date" defaultValue={contrato?.dataFim || ""} /></label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={contrato?.ativo ?? true} /><span>Ativo</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{contrato ? "Salvar contrato" : "Criar contrato"}</button>
    </form>
  );
}

function ProjetoForm({ projeto, contratos, onSubmit }: {
  projeto: Projeto | null;
  contratos: Contrato[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={projeto?.idProjeto || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Nome<input name="nome" defaultValue={projeto?.nome || ""} required maxLength={160} /></label>
      <label className="wide">
        Contrato
        <select name="idContrato" defaultValue={projeto?.idContrato || ""} required>
          <option value="">Selecione</option>
          {contratos.map((contrato) => <option key={contrato.idContrato} value={contrato.idContrato}>{contrato.numeroContrato} — {contrato.clienteNome}</option>)}
        </select>
      </label>
      <label>Municipio<input name="municipio" defaultValue={projeto?.municipio || ""} maxLength={120} /></label>
      <label>UF<input name="uf" defaultValue={projeto?.uf || ""} maxLength={2} /></label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={projeto?.ativo ?? true} /><span>Ativo</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{projeto ? "Salvar projeto" : "Criar projeto"}</button>
    </form>
  );
}

function UnidadeInstaladaForm({ unidade, projetos, status, onSubmit }: {
  unidade: UnidadeInstalada | null;
  projetos: Projeto[];
  status: StatusCatalogo[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={unidade?.idUnidade || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Codigo<input name="codigo" defaultValue={unidade?.codigo || ""} required maxLength={80} /></label>
      <label className="wide">Nome<input name="nome" defaultValue={unidade?.nome || ""} required maxLength={160} /></label>
      <label>Estado/UF<input name="estado" defaultValue={unidade?.estado || ""} required maxLength={60} /></label>
      <label>Cidade<input name="cidade" defaultValue={unidade?.cidade || ""} required maxLength={120} /></label>
      <label>Bairro<input name="bairro" defaultValue={unidade?.bairro || ""} required maxLength={120} /></label>
      <label>Rua<input name="rua" defaultValue={unidade?.rua || ""} required maxLength={180} /></label>
      <label className="wide">Link do Google Maps<input name="googleMapsUrl" type="url" defaultValue={unidade?.googleMapsUrl || ""} placeholder="https://maps.google.com/..." maxLength={500} /></label>
      <input type="hidden" name="latitude" defaultValue={unidade?.latitude ?? ""} />
      <input type="hidden" name="longitude" defaultValue={unidade?.longitude ?? ""} />
      <label className="wide">
        Projeto
        <select name="idProjeto" defaultValue={unidade?.idProjeto || ""} required>
          <option value="">Selecione</option>
          {projetos.map((projeto) => <option key={projeto.idProjeto} value={projeto.idProjeto}>{projeto.nome} — {projeto.contratoNumero}</option>)}
        </select>
      </label>
      <label className="wide">
        Status
        <select name="statusCodigo" defaultValue={unidade?.statusCodigo || "instalada"} required>
          {status.map((item) => <option key={item.codigo} value={item.codigo}>{item.descricao}</option>)}
        </select>
      </label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={unidade?.ativo ?? true} /><span>Ativa</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{unidade ? "Salvar unidade" : "Criar unidade"}</button>
      {unidade?.latitude != null && unidade?.longitude != null && <small className="wide">Coordenadas salvas: {unidade.latitude}, {unidade.longitude}</small>}
    </form>
  );
}

function ColaboradorForm({ colaborador, onSubmit }: {
  colaborador: Colaborador | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={colaborador?.idColaborador || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Nome<input name="nome" defaultValue={colaborador?.nome || ""} required maxLength={160} /></label>
      <label className="wide">Cargo<input name="cargo" defaultValue={colaborador?.cargo || ""} maxLength={120} /></label>
      <label className="wide">Email<input name="email" type="email" defaultValue={colaborador?.email || ""} maxLength={160} /></label>
      <label className="wide">Telefone<input name="telefone" defaultValue={colaborador?.telefone || ""} maxLength={40} /></label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={colaborador?.ativo ?? true} /><span>Ativo</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{colaborador ? "Salvar colaborador" : "Criar colaborador"}</button>
    </form>
  );
}

function TerceirizadoForm({ terceirizado, onSubmit }: {
  terceirizado: Terceirizado | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={terceirizado?.idTerceira || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Nome<input name="nome" defaultValue={terceirizado?.nome || ""} required maxLength={160} /></label>
      <label className="wide">Empresa<input name="empresa" defaultValue={terceirizado?.empresa || ""} maxLength={160} /></label>
      <label className="wide">Documento<input name="documento" defaultValue={terceirizado?.documento || ""} maxLength={60} /></label>
      <label className="wide">Telefone<input name="telefone" defaultValue={terceirizado?.telefone || ""} maxLength={40} /></label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={terceirizado?.ativo ?? true} /><span>Ativo</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{terceirizado ? "Salvar terceirizado" : "Criar terceirizado"}</button>
    </form>
  );
}

function UsuarioForm({ usuario, colaboradores, onSubmit }: {
  usuario: AdminUser | null;
  colaboradores: Colaborador[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={usuario?.id || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Nome<input name="nome" defaultValue={usuario?.profile?.nome || ""} required maxLength={160} /></label>
      <label className="wide">Email<input name="email" type="email" defaultValue={usuario?.email || ""} required maxLength={160} /></label>
      <label className="wide">
        Perfil
        <select name="perfil" defaultValue={usuario?.profile?.perfil || "tecnico"} required>
          <option value="tecnico">Tecnico</option>
          <option value="gestor">Gestor</option>
        </select>
      </label>
      <label className="wide">
        Colaborador vinculado
        <select name="idColaborador" defaultValue={usuario?.profile?.id_colaborador || ""}>
          <option value="">Sem vinculo</option>
          {colaboradores.map((item) => <option key={item.idColaborador} value={item.idColaborador}>{item.nome}</option>)}
        </select>
      </label>
      <label className="wide">
        {usuario ? "Nova senha temporaria (opcional)" : "Senha temporaria"}
        <input name="password" type="password" required={!usuario} minLength={8} autoComplete="new-password" />
      </label>
      <label className="checkbox-field wide">
        <input name="ativo" type="checkbox" defaultChecked={usuario?.profile?.ativo ?? true} disabled={!usuario} />
        <span>Usuario ativo</span>
      </label>
      <button className="primary-button"><ShieldCheck size={16} />{usuario ? "Salvar acesso" : "Criar usuario"}</button>
    </form>
  );
}

function PendenciaPadraoForm({ pendencia, onSubmit }: {
  pendencia: PendenciaPadrao | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={pendencia?.idPendencia || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">
        Descricao
        <input name="descricao" defaultValue={pendencia?.descricao || ""} required maxLength={180} />
      </label>
      <label className="wide">
        Codigo
        <input name="codigo" defaultValue={pendencia?.codigo || ""} maxLength={80} />
      </label>
      <label className="checkbox-field wide">
        <input name="ativo" type="checkbox" defaultChecked={pendencia?.ativo ?? true} />
        <span>Ativa</span>
      </label>
      <button className="primary-button"><CheckCircle2 size={16} />{pendencia ? "Salvar pendencia" : "Criar pendencia"}</button>
    </form>
  );
}

function inventoryStatusLabel(status: EstoquePlanejamento["situacao"]) {
  return {
    sem_historico: "Sem historico",
    ruptura: "Ruptura",
    comprar: "Comprar",
    atencao: "Atencao",
    normal: "Normal"
  }[status];
}

function MaterialForm({ material, configuracao, onSubmit }: {
  material: MaterialEstoque | null;
  configuracao: EstoqueConfiguracao | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={material?.idMaterial || "new"} className="form-grid" onSubmit={onSubmit}>
      <label className="wide">Codigo<input name="codigo" defaultValue={material?.codigo || ""} maxLength={80} /></label>
      <label className="wide">Descricao<input name="descricao" defaultValue={material?.descricao || ""} required maxLength={180} /></label>
      <label className="wide">Categoria<input name="categoria" defaultValue={material?.categoria || ""} maxLength={120} /></label>
      <label>Unidade<input name="unidadeMedida" defaultValue={material?.unidadeMedida || "un"} required maxLength={20} /></label>
      <label>Estoque minimo<input name="estoqueMinimo" type="number" min="0" step="0.01" defaultValue={material?.estoqueMinimo ?? 0} /></label>
      <label>Nivel de servico (%)<input name="nivelServico" type="number" min="50" max="99.99" step="0.01" defaultValue={material?.nivelServico ? material.nivelServico * 100 : ""} placeholder={configuracao ? String(configuracao.nivelServico * 100) : "95"} /></label>
      <label>Lead time (dias)<input name="leadTimeDias" type="number" min="1" max="365" defaultValue={material?.leadTimeDias ?? ""} placeholder={String(configuracao?.leadTimeDias || 5)} /></label>
      <label>Desvio do lead time<input name="desvioLeadTimeDias" type="number" min="0" step="0.01" defaultValue={material?.desvioLeadTimeDias ?? ""} placeholder={String(configuracao?.desvioLeadTimeDias || 1)} /></label>
      <label>Periodo de revisao<input name="periodoRevisaoDias" type="number" min="1" max="365" defaultValue={material?.periodoRevisaoDias ?? ""} placeholder={String(configuracao?.periodoRevisaoDias || 7)} /></label>
      <label>Janela historica<input name="janelaHistoricaDias" type="number" min="7" max="730" defaultValue={material?.janelaHistoricaDias ?? ""} placeholder={String(configuracao?.janelaHistoricaDias || 90)} /></label>
      <label>Lote minimo<input name="loteMinimo" type="number" min="0" step="0.01" defaultValue={material?.loteMinimo ?? 0} /></label>
      <label>Multiplo de compra<input name="multiploCompra" type="number" min="0.01" step="0.01" defaultValue={material?.multiploCompra ?? 1} required /></label>
      <label className="checkbox-field wide"><input name="critico" type="checkbox" defaultChecked={material?.critico ?? false} /><span>Material critico</span></label>
      <label className="checkbox-field wide"><input name="ativo" type="checkbox" defaultChecked={material?.ativo ?? true} /><span>Ativo</span></label>
      <button className="primary-button"><CheckCircle2 size={16} />{material ? "Salvar material" : "Criar material"}</button>
      {material && <small>O estoque atual e alterado somente por movimentacoes, preservando o historico.</small>}
    </form>
  );
}

function EstoqueConfiguracaoForm({ configuracao, onSubmit }: {
  configuracao: EstoqueConfiguracao;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form key={`${configuracao.nivelServico}-${configuracao.janelaHistoricaDias}`} className="form-grid" onSubmit={onSubmit}>
      <label>Nivel de servico (%)<input name="nivelServico" type="number" min="50" max="99.99" step="0.01" defaultValue={configuracao.nivelServico * 100} required /></label>
      <label>Janela historica (dias)<input name="janelaHistoricaDias" type="number" min="7" max="730" defaultValue={configuracao.janelaHistoricaDias} required /></label>
      <label>Lead time padrao<input name="leadTimeDias" type="number" min="1" max="365" defaultValue={configuracao.leadTimeDias} required /></label>
      <label>Desvio do lead time<input name="desvioLeadTimeDias" type="number" min="0" step="0.01" defaultValue={configuracao.desvioLeadTimeDias} required /></label>
      <label>Periodo de revisao<input name="periodoRevisaoDias" type="number" min="1" max="365" defaultValue={configuracao.periodoRevisaoDias} required /></label>
      <label>Minimo de dias com consumo<input name="minimoObservacoes" type="number" min="2" max="365" defaultValue={configuracao.minimoObservacoes} required /></label>
      <button className="primary-button"><CheckCircle2 size={16} />Salvar parametros</button>
      <small className="wide">Os materiais sem parametro proprio herdam estes valores. O sistema nao gera compras automaticamente.</small>
    </form>
  );
}

function EstoqueMovimentacaoForm({ materiais, onSubmit }: {
  materiais: MaterialEstoque[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  return (
    <form className="form-grid movement-form" onSubmit={onSubmit}>
      <label className="wide">Material
        <select name="idMaterial" required defaultValue="">
          <option value="">Selecione</option>
          {materiais.map((item) => <option key={item.idMaterial} value={item.idMaterial}>{item.descricao} — {item.codigo || "sem codigo"}</option>)}
        </select>
      </label>
      <label>Tipo
        <select name="tipoCodigo" defaultValue="entrada" required>
          <option value="entrada">Entrada</option>
          <option value="saida">Saida</option>
        </select>
      </label>
      <label>Quantidade<input name="quantidade" type="number" min="0.01" step="0.01" required /></label>
      <label>Data e hora<input name="dataMovimentacao" type="datetime-local" defaultValue={localDateTime} required /></label>
      <label>Origem<input name="origem" maxLength={120} placeholder="Compra, inventario, consumo..." /></label>
      <label className="wide">Observacao<textarea name="observacao" rows={2} maxLength={500} /></label>
      <button className="primary-button"><CheckCircle2 size={16} />Registrar movimentacao</button>
    </form>
  );
}

function ReportCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof AlertTriangle }) {
  return (
    <article className="report-card">
      <Icon size={22} />
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
