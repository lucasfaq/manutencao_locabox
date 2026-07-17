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
  Atendimento,
  Bootstrap,
  Cliente,
  Contrato,
  createSupabaseCliente,
  createSupabaseContrato,
  createSupabaseEmpresa,
  createSupabaseAtendimento,
  createSupabaseOrdem,
  getCurrentSession,
  hasSupabaseConfig,
  Empresa,
  loadPerfil,
  loadSupabaseClientes,
  loadSupabaseContratos,
  loadSupabaseEmpresas,
  loadSupabaseBootstrap,
  loadStatusContratos,
  Ordem,
  PerfilUsuario,
  Session,
  StatusCatalogo,
  setSupabaseClienteAtivo,
  setSupabaseContratoAtivo,
  setSupabaseEmpresaAtivo,
  signInWithPassword,
  signOut,
  supabase,
  updateSupabaseCliente,
  updateSupabaseContrato,
  updateSupabaseEmpresa,
  Unidade,
  withMetrics
} from "./supabaseClient";

type Page = "dashboard" | "clientes" | "empresas" | "contratos" | "ordens" | "unidades" | "atendimentos" | "estoque" | "relatorios";

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

  const isGestor = perfil?.perfil === "gestor";
  const visibleNavItems = useMemo(
    () => navItems.filter((item) => isGestor || (!["clientes", "empresas", "contratos", "relatorios"].includes(item.page))),
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
    if ((page === "clientes" || page === "empresas" || page === "contratos") && !isGestor) {
      setPage("dashboard");
    }
  }, [isGestor, page]);

  useEffect(() => {
    loadClientes().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar clientes."));
    loadEmpresas().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar empresas."));
    loadContratos().catch((error) => setErrorMessage(error instanceof Error ? error.message : "Falha ao carregar contratos."));
  }, [isGestor, session?.access_token]);

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
          <section className="unit-grid">
            {data.unidades.map((unidade) => {
              const ordens = data.ordens.filter((ordem) => ordem.unidadeId === unidade.id && ordem.status !== "Concluida");
              return (
                <article key={unidade.id} className="unit-card">
                  <div className="unit-top">
                    <span>{unidade.codigo}</span>
                    <StatusPill value={unidade.status} />
                  </div>
                  <h2>{unidade.nome}</h2>
                  <p>{unidade.cliente} · {unidade.municipio}</p>
                  <div className="unit-footer">
                    <span>{unidade.contrato}</span>
                    <strong>{ordens.length} OS aberta(s)</strong>
                  </div>
                </article>
              );
            })}
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

function ReportCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof AlertTriangle }) {
  return (
    <article className="report-card">
      <Icon size={22} />
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
