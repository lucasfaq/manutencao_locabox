import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  MapPin,
  Menu,
  PackageSearch,
  Plus,
  RefreshCw,
  Search,
  Wrench
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Atendimento,
  Bootstrap,
  createSupabaseAtendimento,
  createSupabaseOrdem,
  hasSupabaseConfig,
  loadSupabaseBootstrap,
  Ordem,
  Unidade,
  withMetrics
} from "./supabaseClient";

type Page = "dashboard" | "ordens" | "unidades" | "atendimentos" | "estoque" | "relatorios";

const initialData: Bootstrap = {
  unidades: [],
  ordens: [],
  atendimentos: [],
  estoque: [],
  metrics: { unidades: 0, ordensAbertas: 0, slaVencidas: 0, atendimentos: 0, estoqueBaixo: 0 }
};

const navItems: Array<{ page: Page; label: string; icon: typeof LayoutDashboard }> = [
  { page: "dashboard", label: "Painel", icon: LayoutDashboard },
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

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

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

  async function createOrdem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        await createSupabaseOrdem(payload);
        event.currentTarget.reset();
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
      event.currentTarget.reset();
      setPage("ordens");
      return;
    }
    event.currentTarget.reset();
    await load();
    setPage("ordens");
  }

  async function createAtendimento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    setErrorMessage("");
    try {
      if (hasSupabaseConfig) {
        await createSupabaseAtendimento(payload);
        event.currentTarget.reset();
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
      event.currentTarget.reset();
      setPage("atendimentos");
      return;
    }
    event.currentTarget.reset();
    await load();
    setPage("atendimentos");
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
          {navItems.map((item) => {
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
          <small>{source === "supabase" ? "Gravacao persistente ativa" : "Fallback sem persistencia online"}</small>
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
            <label className="search">
              <Search size={16} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar OS, unidade, cliente" />
            </label>
            <button className="icon-button" title="Atualizar" onClick={load}>
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
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

function ReportCard({ title, value, icon: Icon }: { title: string; value: string; icon: typeof AlertTriangle }) {
  return (
    <article className="report-card">
      <Icon size={22} />
      <span>{title}</span>
      <strong>{value}</strong>
    </article>
  );
}
