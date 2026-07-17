import {
  AlertTriangle,
  BarChart3,
  Building2,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Edit3,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  PackageSearch,
  Power,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  Wrench
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  AdminUser,
  Atendimento,
  Bootstrap,
  Cliente,
  Colaborador,
  Contrato,
  createAdminUser,
  createSupabaseCliente,
  createSupabaseColaborador,
  createSupabaseContrato,
  createSupabaseEmpresa,
  createSupabaseAtendimento,
  createSupabaseOrdem,
  createSupabaseProjeto,
  createSupabaseTerceirizado,
  createSupabaseUnidadeInstalada,
  getCurrentSession,
  hasSupabaseConfig,
  Empresa,
  loadPerfil,
  loadAdminUsers,
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
  PerfilUsuario,
  Projeto,
  Session,
  StatusCatalogo,
  Terceirizado,
  setSupabaseClienteAtivo,
  setSupabaseColaboradorAtivo,
  setSupabaseContratoAtivo,
  setSupabaseEmpresaAtivo,
  setSupabaseProjetoAtivo,
  setSupabaseTerceirizadoAtivo,
  setSupabaseUnidadeInstaladaAtiva,
  signInWithPassword,
  signOut,
  supabase,
  updateAdminUser,
  updateSupabaseCliente,
  updateSupabaseColaborador,
  updateSupabaseContrato,
  updateSupabaseEmpresa,
  updateSupabaseProjeto,
  updateSupabaseTerceirizado,
  updateSupabaseUnidadeInstalada,
  updateOwnPassword,
  Unidade,
  UnidadeInstalada,
  withMetrics
} from "./supabaseClient";

type Page = "dashboard" | "clientes" | "empresas" | "contratos" | "projetos" | "pessoas" | "usuarios" | "ordens" | "unidades" | "atendimentos" | "estoque" | "relatorios";

const initialData: Bootstrap = {
  unidades: [],
  ordens: [],
  atendimentos: [],
  estoque: [],
  metrics: { unidades: 0, ordensAbertas: 0, slaVencidas: 0, atendimentos: 0, estoqueBaixo: 0 }
};

const navItems: Array<{ page: Page; label: string; icon: typeof LayoutDashboard }> = [
  { page: "dashboard", label: "Painel", icon: LayoutDashboard },
  { page: "clientes", label: "Clientes", icon: UserRound },
  { page: "empresas", label: "Empresas", icon: Building2 },
  { page: "contratos", label: "Contratos", icon: ClipboardList },
  { page: "projetos", label: "Projetos", icon: MapPin },
  { page: "pessoas", label: "Pessoas", icon: UserRound },
  { page: "usuarios", label: "Usuarios", icon: ShieldCheck },
  { page: "ordens", label: "OS", icon: ClipboardList },
  { page: "unidades", label: "Unidades", icon: MapPin },
  { page: "atendimentos", label: "Atendimentos", icon: Wrench },
  { page: "estoque", label: "Estoque", icon: Boxes },
  { page: "relatorios", label: "Relatorios", icon: BarChart3 }
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
  const [statusUnidades, setStatusUnidades] = useState<StatusCatalogo[]>([]);
  const [selectedUnidadeInstalada, setSelectedUnidadeInstalada] = useState<UnidadeInstalada | null>(null);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [terceirizados, setTerceirizados] = useState<Terceirizado[]>([]);
  const [selectedColaborador, setSelectedColaborador] = useState<Colaborador | null>(null);
  const [selectedTerceirizado, setSelectedTerceirizado] = useState<Terceirizado | null>(null);
  const [usuarios, setUsuarios] = useState<AdminUser[]>([]);
  const [selectedUsuario, setSelectedUsuario] = useState<AdminUser | null>(null);

  const isGestor = perfil?.perfil === "gestor";
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isGestor || (!["clientes", "empresas", "contratos", "projetos", "pessoas", "usuarios", "relatorios"].includes(item.page))),
    [isGestor]
  );

  async function load() {
    setLoading(true);
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        setData(await loadSupabaseBootstrap());
        setSource("supabase");
      } else {
        const response = await fetch("/api/bootstrap");
        if (!response.ok) throw new Error("API indisponivel");
        const nextData = (await response.json()) as Bootstrap;
        setData(nextData);
        setSource("api");
      }
    } catch (error) {
      const response = await fetch(`${import.meta.env.BASE_URL}bootstrap.json`);
      const nextData = (await response.json()) as Bootstrap;
      setData(nextData);
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
      setStatusUnidades([]);
      setSelectedUnidadeInstalada(null);
      return;
    }
    const [nextUnidades, nextStatus] = await Promise.all([loadSupabaseUnidadesInstaladas(), loadStatusUnidades()]);
    setUnidadesInstaladas(nextUnidades);
    setStatusUnidades(nextStatus);
  }

  async function loadPessoas() {
    if (!hasSupabaseConfig || !isGestor) {
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
    if ((page === "clientes" || page === "empresas" || page === "contratos" || page === "projetos" || page === "pessoas" || page === "usuarios") && !isGestor) {
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
    return unidadesInstaladas.filter((unidade) =>
      [unidade.codigo, unidade.nome, unidade.projetoNome, unidade.statusCodigo, unidade.ativo ? "ativo" : "inativo"].join(" ").toLowerCase().includes(text)
    );
  }, [unidadesInstaladas, query]);

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
      if (selectedUnidadeInstalada) await updateSupabaseUnidadeInstalada(selectedUnidadeInstalada.idUnidade, payload);
      else await createSupabaseUnidadeInstalada(payload);
      setSelectedUnidadeInstalada(null);
      formElement.reset();
      await loadUnidadesInstaladas();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar unidade instalada.");
    }
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
      formElement.reset();
      await loadUsuarios();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao salvar usuario.");
    }
  }

  async function submitOwnPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const password = String(new FormData(formElement).get("ownPassword") || "");
    setErrorMessage("");
    try {
      await updateOwnPassword(password);
      formElement.reset();
      window.alert("Sua senha foi alterada.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Falha ao alterar sua senha.");
    }
  }

  async function createOrdem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        await createSupabaseOrdem(payload);
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
        setErrorMessage(error instanceof Error ? error.message : "Falha ao gravar OS no Supabase.");
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
        pendencias: String(payload.pendencias || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      };
      setData((current) => withMetrics({ ...current, ordens: [ordem, ...current.ordens] }));
      formElement.reset();
      setPage("ordens");
      return;
    }
    formElement.reset();
    await load();
    setPage("ordens");
  }

  async function createAtendimento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = Object.fromEntries(form.entries());
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        await createSupabaseAtendimento(payload);
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
        setErrorMessage(error instanceof Error ? error.message : "Falha ao gravar atendimento no Supabase.");
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
        materiais: String(payload.materiais || "")
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      };
      setData((current) => withMetrics({
        ...current,
        atendimentos: [atendimento, ...current.atendimentos],
        ordens: current.ordens.map((ordem) =>
          ordem.id === atendimento.ordemId
            ? { ...ordem, status: atendimento.status === "Executado" ? "Concluida" : "Pendente" }
            : ordem
        )
      }));
      formElement.reset();
      setPage("atendimentos");
      return;
    }
    formElement.reset();
    await load();
    setPage("atendimentos");
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
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <Wrench size={20} />
          </div>
          <div>
            <strong>Locabox</strong>
            <span>Manutencao</span>
          </div>
        </div>
        <nav>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.page} className={page === item.page ? "active" : ""} onClick={() => { setPage(item.page); setMenuOpen(false); }}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
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
            <h1>{navItems.find((item) => item.page === page)?.label}</h1>
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
              <StatCard label="Unidades" value={data.metrics.unidades} icon={MapPin} />
              <StatCard label="OS abertas" value={data.metrics.ordensAbertas} icon={ClipboardList} />
              <StatCard label="SLA vencido" value={data.metrics.slaVencidas} icon={AlertTriangle} tone="danger" />
              <StatCard label="Estoque baixo" value={data.metrics.estoqueBaixo} icon={PackageSearch} tone="warn" />
            </div>

            <div className="two-columns">
              <section className="panel">
                <div className="panel-heading">
                  <h2>OS prioritarias</h2>
                  <button onClick={() => setPage("ordens")}>Ver OS</button>
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

              <section className="panel">
                <div className="panel-heading">
                  <h2>Nova OS</h2>
                </div>
                <OrdemForm unidades={data.unidades} onSubmit={createOrdem} />
              </section>
            </div>
          </section>
        )}

        {page === "clientes" && isGestor && (
          <section className="two-columns catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Clientes</h2>
                <span>{filteredClientes.length} registros</span>
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
                            <button className="icon-button" title="Editar cliente" onClick={() => setSelectedCliente(cliente)}>
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
            <section className="panel">
              <div className="panel-heading">
                <h2>{selectedCliente ? "Editar cliente" : "Novo cliente"}</h2>
                {selectedCliente && <button onClick={() => setSelectedCliente(null)}>Novo</button>}
              </div>
              <ClienteForm cliente={selectedCliente} onSubmit={submitCliente} />
            </section>
          </section>
        )}

        {page === "empresas" && isGestor && (
          <section className="two-columns catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Empresas</h2>
                <span>{filteredEmpresas.length} registros</span>
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
                            <button className="icon-button" title="Editar empresa" onClick={() => setSelectedEmpresa(empresa)}>
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
            <section className="panel">
              <div className="panel-heading">
                <h2>{selectedEmpresa ? "Editar empresa" : "Nova empresa"}</h2>
                {selectedEmpresa && <button onClick={() => setSelectedEmpresa(null)}>Nova</button>}
              </div>
              <EmpresaForm empresa={selectedEmpresa} onSubmit={submitEmpresa} />
            </section>
          </section>
        )}

        {page === "contratos" && isGestor && (
          <section className="two-columns catalog-layout">
            <section className="panel full">
              <div className="panel-heading">
                <h2>Contratos</h2>
                <span>{filteredContratos.length} registros</span>
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
                            <button className="icon-button" title="Editar contrato" onClick={() => setSelectedContrato(contrato)}><Edit3 size={16} /></button>
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
            <section className="panel">
              <div className="panel-heading">
                <h2>{selectedContrato ? "Editar contrato" : "Novo contrato"}</h2>
                {selectedContrato && <button onClick={() => setSelectedContrato(null)}>Novo</button>}
              </div>
              <ContratoForm contrato={selectedContrato} clientes={clientes} empresas={empresas} status={statusContratos} onSubmit={submitContrato} />
            </section>
          </section>
        )}

        {page === "projetos" && isGestor && (
          <section className="two-columns catalog-layout">
            <section className="panel full">
              <div className="panel-heading"><h2>Projetos</h2><span>{filteredProjetos.length} registros</span></div>
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
                          <button className="icon-button" title="Editar projeto" onClick={() => setSelectedProjeto(projeto)}><Edit3 size={16} /></button>
                          <button className="icon-button" title={projeto.ativo ? "Inativar projeto" : "Reativar projeto"} onClick={() => toggleProjetoAtivo(projeto)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredProjetos.length && <tr><td colSpan={5}><span className="empty-state">Nenhum projeto encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="panel-heading"><h2>{selectedProjeto ? "Editar projeto" : "Novo projeto"}</h2>{selectedProjeto && <button onClick={() => setSelectedProjeto(null)}>Novo</button>}</div>
              <ProjetoForm projeto={selectedProjeto} contratos={contratos} onSubmit={submitProjeto} />
            </section>
          </section>
        )}

        {page === "pessoas" && isGestor && (
          <section className="two-columns">
            <section className="panel">
              <div className="panel-heading"><h2>Colaboradores</h2><span>{filteredColaboradores.length} registros</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredColaboradores.map((item) => (
                      <tr key={item.idColaborador}>
                        <td><strong>{item.nome}</strong><small>{item.cargo || "Cargo nao informado"} · {item.telefone || "Sem telefone"}</small></td>
                        <td><StatusPill value={item.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar colaborador" onClick={() => setSelectedColaborador(item)}><Edit3 size={16} /></button>
                          <button className="icon-button" title={item.ativo ? "Inativar colaborador" : "Reativar colaborador"} onClick={() => togglePessoaAtiva("colaborador", item.idColaborador, item.nome, item.ativo)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredColaboradores.length && <tr><td colSpan={3}><span className="empty-state">Nenhum colaborador encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="panel-heading"><h2>{selectedColaborador ? "Editar colaborador" : "Novo colaborador"}</h2>{selectedColaborador && <button onClick={() => setSelectedColaborador(null)}>Novo</button>}</div>
              <ColaboradorForm colaborador={selectedColaborador} onSubmit={submitColaborador} />
            </section>
            <section className="panel">
              <div className="panel-heading"><h2>Terceirizados</h2><span>{filteredTerceirizados.length} registros</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Nome</th><th>Status</th><th>Acoes</th></tr></thead>
                  <tbody>
                    {filteredTerceirizados.map((item) => (
                      <tr key={item.idTerceira}>
                        <td><strong>{item.nome}</strong><small>{item.empresa || "Empresa nao informada"} · {item.documento || "Sem documento"}</small></td>
                        <td><StatusPill value={item.ativo ? "Ativo" : "Inativo"} /></td>
                        <td><div className="row-actions">
                          <button className="icon-button" title="Editar terceirizado" onClick={() => setSelectedTerceirizado(item)}><Edit3 size={16} /></button>
                          <button className="icon-button" title={item.ativo ? "Inativar terceirizado" : "Reativar terceirizado"} onClick={() => togglePessoaAtiva("terceirizado", item.idTerceira, item.nome, item.ativo)}><Power size={16} /></button>
                        </div></td>
                      </tr>
                    ))}
                    {!filteredTerceirizados.length && <tr><td colSpan={3}><span className="empty-state">Nenhum terceirizado encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="panel-heading"><h2>{selectedTerceirizado ? "Editar terceirizado" : "Novo terceirizado"}</h2>{selectedTerceirizado && <button onClick={() => setSelectedTerceirizado(null)}>Novo</button>}</div>
              <TerceirizadoForm terceirizado={selectedTerceirizado} onSubmit={submitTerceirizado} />
            </section>
          </section>
        )}

        {page === "usuarios" && isGestor && (
          <section className="two-columns catalog-layout">
            <section className="panel full">
              <div className="panel-heading"><h2>Usuarios e acessos</h2><span>{filteredUsuarios.length} contas</span></div>
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
                        <td><button className="icon-button" title="Editar usuario" onClick={() => setSelectedUsuario(usuario)}><Edit3 size={16} /></button></td>
                      </tr>
                    ))}
                    {!filteredUsuarios.length && <tr><td colSpan={5}><span className="empty-state">Nenhum usuario encontrado.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <div>
              <section className="panel">
                <div className="panel-heading"><h2>{selectedUsuario ? "Editar usuario" : "Novo usuario"}</h2>{selectedUsuario && <button onClick={() => setSelectedUsuario(null)}>Novo</button>}</div>
                <UsuarioForm usuario={selectedUsuario} colaboradores={colaboradores} onSubmit={submitUsuario} />
              </section>
              <section className="panel account-password-panel">
                <div className="panel-heading"><h2>Minha senha</h2></div>
                <form className="form-grid" onSubmit={submitOwnPassword}>
                  <label className="wide">Nova senha<input name="ownPassword" type="password" required minLength={8} autoComplete="new-password" /></label>
                  <button className="primary-button"><ShieldCheck size={16} />Alterar minha senha</button>
                </form>
              </section>
            </div>
          </section>
        )}

        {page === "ordens" && (
          <section className="panel full">
            <div className="panel-heading">
              <h2>Ordens de servico</h2>
              <span>{filteredOrdens.length} registros</span>
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
                  </tr>
                </thead>
                <tbody>
                  {filteredOrdens.map((ordem) => {
                    const unidade = findUnidade(data.unidades, ordem);
                    const sla = getSla(ordem);
                    return (
                      <tr key={ordem.id}>
                        <td><strong>{ordem.protocolo}</strong><small>{ordem.tipo}</small></td>
                        <td>{unidade?.nome}<small>{unidade?.cliente}</small></td>
                        <td><span className="priority">{ordem.prioridade}</span></td>
                        <td><StatusPill value={ordem.status} /></td>
                        <td><span className={`pill ${sla.tone}`}>{sla.label}</span><small>{ordem.prazoSla}</small></td>
                        <td>{ordem.responsavel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {page === "unidades" && (
          <section className={isGestor ? "two-columns catalog-layout" : "panel full"}>
            <section className="panel full">
              <div className="panel-heading"><h2>Unidades instaladas</h2><span>{filteredUnidadesInstaladas.length} registros</span></div>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Unidade</th><th>Projeto</th><th>Status</th>{isGestor && <th>Acoes</th>}</tr></thead>
                  <tbody>
                    {filteredUnidadesInstaladas.map((unidade) => (
                      <tr key={unidade.idUnidade}>
                        <td><strong>{unidade.nome}</strong><small>{unidade.codigo}</small></td>
                        <td>{unidade.projetoNome}</td>
                        <td><StatusPill value={unidade.ativo ? unidade.statusCodigo : "Inativo"} /></td>
                        {isGestor && <td><div className="row-actions">
                          <button className="icon-button" title="Editar unidade" onClick={() => setSelectedUnidadeInstalada(unidade)}><Edit3 size={16} /></button>
                          <button className="icon-button" title={unidade.ativo ? "Inativar unidade" : "Reativar unidade"} onClick={() => toggleUnidadeInstaladaAtiva(unidade)}><Power size={16} /></button>
                        </div></td>}
                      </tr>
                    ))}
                    {!filteredUnidadesInstaladas.length && <tr><td colSpan={isGestor ? 4 : 3}><span className="empty-state">Nenhuma unidade instalada encontrada.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            {isGestor && <section className="panel">
              <div className="panel-heading"><h2>{selectedUnidadeInstalada ? "Editar unidade" : "Nova unidade"}</h2>{selectedUnidadeInstalada && <button onClick={() => setSelectedUnidadeInstalada(null)}>Nova</button>}</div>
              <UnidadeInstaladaForm unidade={selectedUnidadeInstalada} projetos={projetos} status={statusUnidades} onSubmit={submitUnidadeInstalada} />
            </section>}
          </section>
        )}

        {page === "atendimentos" && (
          <section className="two-columns">
            <section className="panel">
              <div className="panel-heading">
                <h2>Registrar atendimento</h2>
              </div>
              <AtendimentoForm ordens={data.ordens.filter((ordem) => ordem.status !== "Concluida")} onSubmit={createAtendimento} />
            </section>
            <section className="panel">
              <div className="panel-heading">
                <h2>Historico recente</h2>
              </div>
              <div className="timeline">
                {data.atendimentos.map((atendimento) => {
                  const ordem = data.ordens.find((item) => item.id === atendimento.ordemId);
                  return (
                    <article key={atendimento.id}>
                      <CalendarClock size={18} />
                      <div>
                        <strong>{ordem?.protocolo} · {atendimento.equipe}</strong>
                        <span>{atendimento.data} · {atendimento.status}</span>
                        <p>{atendimento.relato}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </section>
        )}

        {page === "estoque" && (
          <section className="panel full">
            <div className="panel-heading">
              <h2>Estoque operacional</h2>
              <span>{data.estoque.length} itens</span>
            </div>
            <div className="inventory-grid">
              {data.estoque.map((item) => {
                const baixo = item.quantidade <= item.minimo;
                return (
                  <article key={item.id} className={`inventory-card ${baixo ? "low" : ""}`}>
                    <PackageSearch size={20} />
                    <div>
                      <strong>{item.item}</strong>
                      <span>{item.categoria} · minimo {item.minimo} {item.unidade}</span>
                    </div>
                    <b>{item.quantidade}</b>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {page === "relatorios" && (
          <section className="reports-grid">
            <ReportCard title="SLA" value={`${data.metrics.slaVencidas} vencidas`} icon={AlertTriangle} />
            <ReportCard title="IPM operacional" value={`${Math.round((data.ordens.length / Math.max(data.unidades.length, 1)) * 100) / 100} OS/unidade`} icon={BarChart3} />
            <ReportCard title="Atendimentos" value={`${data.metrics.atendimentos} registros`} icon={CheckCircle2} />
            <ReportCard title="Estoque critico" value={`${data.metrics.estoqueBaixo} itens`} icon={PackageSearch} />
          </section>
        )}
      </main>
    </div>
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

function OrdemForm({ unidades, onSubmit }: { unidades: Unidade[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Unidade
        <select name="unidadeId" required>
          {unidades.map((unidade) => <option key={unidade.id} value={unidade.id}>{unidade.nome}</option>)}
        </select>
      </label>
      <label>
        Tipo
        <select name="tipo">
          <option>Corretiva</option>
          <option>Preventiva</option>
          <option>Emergencial</option>
        </select>
      </label>
      <label>
        Prioridade
        <select name="prioridade">
          <option>P2</option>
          <option>P1</option>
          <option>P3</option>
          <option>P4</option>
        </select>
      </label>
      <label>
        Prazo SLA
        <input name="prazoSla" type="date" required />
      </label>
      <label>
        Responsavel
        <input name="responsavel" placeholder="Equipe ou tecnico" />
      </label>
      <label className="wide">
        Descricao
        <textarea name="descricao" placeholder="Resumo da solicitacao" rows={3} />
      </label>
      <label className="wide">
        Pendencias
        <textarea name="pendencias" placeholder="Uma pendencia por linha" rows={3} />
      </label>
      <button className="primary-button">
        <Plus size={16} />
        Criar OS
      </button>
    </form>
  );
}

function AtendimentoForm({ ordens, onSubmit }: { ordens: Ordem[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label className="wide">
        OS
        <select name="ordemId" required>
          {ordens.map((ordem) => <option key={ordem.id} value={ordem.id}>{ordem.protocolo} · {ordem.descricao}</option>)}
        </select>
      </label>
      <label>
        Data
        <input name="data" type="date" />
      </label>
      <label>
        Status
        <select name="status">
          <option>Executado</option>
          <option>Parcial</option>
          <option>Reagendado</option>
        </select>
      </label>
      <label className="wide">
        Equipe
        <input name="equipe" placeholder="Equipe responsavel" />
      </label>
      <label className="wide">
        Relato
        <textarea name="relato" rows={4} placeholder="O que foi executado, evidencias e pendencias" />
      </label>
      <label className="wide">
        Materiais
        <textarea name="materiais" rows={3} placeholder="Um material por linha" />
      </label>
      <button className="primary-button">
        <CheckCircle2 size={16} />
        Registrar
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

function ReportCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof AlertTriangle }) {
  return (
    <article className="report-card">
      <Icon size={22} />
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
